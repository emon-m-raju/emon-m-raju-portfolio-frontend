import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createOwnerCategory,
  createOwnerTag,
  deleteOwnerCategory,
  deleteOwnerTag,
  getOwnerCategories,
  getOwnerTags,
  updateOwnerCategory,
  updateOwnerTag,
} from '../api/axiosClient.js'
import { ApiError } from '../api/client.js'
import { useOwnerAuth } from '../auth/OwnerAuthContext.jsx'
import './owner-blog.css'

const configs = {
  categories: {
    label: 'Category',
    plural: 'Categories',
    queryName: 'owner-categories',
    maxName: 80,
    hasDescription: true,
  },
  tags: {
    label: 'Tag',
    plural: 'Tags',
    queryName: 'owner-tags',
    maxName: 60,
    hasDescription: false,
  },
}

function messageFromError(error, label) {
  if (error instanceof ApiError && error.status === 401) {
    return 'Your owner session has expired. Sign in again to continue.'
  }
  if (error instanceof ApiError && error.status === 403) {
    return `Only the portfolio owner can manage ${label.toLowerCase()}.`
  }
  if (error instanceof ApiError && error.status === 429) {
    return 'The API is rate-limiting requests. Wait a moment and try again.'
  }
  return error?.message || `The ${label.toLowerCase()} request could not be completed.`
}

function emptyValues(config) {
  return { name: '', slug: '', ...(config.hasDescription ? { description: '' } : {}) }
}

function OwnerTaxonomyManagement({ resource }) {
  const config = configs[resource]
  const { auth } = useOwnerAuth()
  const queryClient = useQueryClient()
  const queryKey = [config.queryName, auth?.user?.id]
  const [values, setValues] = useState(emptyValues(config))
  const [editingItem, setEditingItem] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [feedback, setFeedback] = useState(null)

  const itemsQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) => resource === 'categories'
      ? getOwnerCategories(auth.accessToken, { signal })
      : getOwnerTags(auth.accessToken, { signal }),
    enabled: Boolean(auth?.accessToken),
  })

  const createMutation = useMutation({
    mutationFn: (item) => resource === 'categories'
      ? createOwnerCategory(auth.accessToken, item)
      : createOwnerTag(auth.accessToken, item),
    onSuccess: async (createdItem) => {
      queryClient.setQueryData(queryKey, (items = []) => [...items, createdItem])
      setValues(emptyValues(config))
      setFieldErrors({})
      setFeedback({ type: 'success', message: `${config.label} “${createdItem.name}” created.` })
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => setFeedback({ type: 'error', message: messageFromError(error, config.plural) }),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, item }) => resource === 'categories'
      ? updateOwnerCategory(auth.accessToken, id, item)
      : updateOwnerTag(auth.accessToken, id, item),
    onSuccess: async (updatedItem) => {
      queryClient.setQueryData(queryKey, (items = []) =>
        items.map((item) => item.id === updatedItem.id ? updatedItem : item),
      )
      setEditingItem(null)
      setValues(emptyValues(config))
      setFieldErrors({})
      setFeedback({ type: 'success', message: `${config.label} “${updatedItem.name}” updated.` })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ['owner-posts', auth?.user?.id] }),
      ])
    },
    onError: (error) => setFeedback({ type: 'error', message: messageFromError(error, config.plural) }),
  })
  const deleteMutation = useMutation({
    mutationFn: (item) => resource === 'categories'
      ? deleteOwnerCategory(auth.accessToken, item.id)
      : deleteOwnerTag(auth.accessToken, item.id),
    onSuccess: async (_, deletedItem) => {
      queryClient.setQueryData(queryKey, (items = []) =>
        items.filter((item) => item.id !== deletedItem.id),
      )
      setPendingDelete(null)
      setFeedback({ type: 'success', message: `${config.label} “${deletedItem.name}” deleted.` })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ['owner-posts', auth?.user?.id] }),
      ])
    },
    onError: (error) => setFeedback({ type: 'error', message: messageFromError(error, config.plural) }),
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  function resetForm() {
    setEditingItem(null)
    setValues(emptyValues(config))
    setFieldErrors({})
    setFeedback(null)
    createMutation.reset()
    updateMutation.reset()
  }

  function editItem(item) {
    setEditingItem(item)
    setValues({
      name: item.name || '',
      slug: item.slug || '',
      ...(config.hasDescription ? { description: item.description || '' } : {}),
    })
    setFieldErrors({})
    setFeedback(null)
    updateMutation.reset()
  }

  function submit(event) {
    event.preventDefault()
    if (!itemsQuery.data || isSaving) return
    const errors = {}
    if (!values.name.trim()) errors.name = `${config.label} name is required.`
    else if (values.name.trim().length > config.maxName) {
      errors.name = `${config.label} name must be ${config.maxName} characters or fewer.`
    }
    if (!values.slug.trim()) errors.slug = 'Slug is required.'
    else if (values.slug.trim().length > 50) errors.slug = 'Slug must be 50 characters or fewer.'
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug.trim())) {
      errors.slug = 'Use lowercase letters, numbers, and single hyphens in the slug.'
    }
    setFieldErrors(errors)
    setFeedback(null)
    if (Object.keys(errors).length) {
      setFeedback({ type: 'error', message: 'Please correct the highlighted fields.' })
      return
    }
    const item = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      ...(config.hasDescription ? { description: values.description.trim() } : {}),
    }
    if (editingItem) updateMutation.mutate({ id: editingItem.id, item })
    else createMutation.mutate(item)
  }

  function changeField(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
    setFeedback(null)
  }

  return (
    <section className="owner-blog-page" aria-labelledby="owner-taxonomy-title">
      <header className="owner-page-heading">
        <div>
          <p className="owner-eyebrow">OWNER WORKSPACE / BLOG / {config.plural.toUpperCase()}</p>
          <h1 id="owner-taxonomy-title">{config.plural} management</h1>
          <p className="owner-page-heading__description">
            Manage the {config.plural.toLowerCase()} used to organize blog posts.
          </p>
        </div>
        <button
          className="owner-button owner-button--refresh"
          disabled={itemsQuery.isFetching}
          onClick={() => itemsQuery.refetch()}
          type="button"
        >
          <span aria-hidden="true">↻</span>
          {itemsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <div className="owner-taxonomy-layout">
        <section className="owner-panel owner-taxonomy-list" aria-labelledby="owner-taxonomy-list-title">
          <div className="owner-panel__heading">
            <div>
              <p className="owner-eyebrow">PORTFOLIO DATA</p>
              <h2 id="owner-taxonomy-list-title">All {config.plural.toLowerCase()}</h2>
            </div>
            {itemsQuery.data && <span className="owner-panel__count">{itemsQuery.data.length}</span>}
          </div>
          {itemsQuery.isPending && <div className="owner-state" role="status"><span className="owner-spinner" /> Loading {config.plural.toLowerCase()}…</div>}
          {itemsQuery.isError && (
            <div className="owner-notice owner-notice--error" role="alert">
              <strong>{config.plural} could not be loaded.</strong>
              <p>{messageFromError(itemsQuery.error, config.label)}</p>
              <button className="owner-button" disabled={itemsQuery.isFetching} onClick={() => itemsQuery.refetch()} type="button">
                {itemsQuery.isFetching ? 'Retrying…' : 'Retry'}
              </button>
            </div>
          )}
          {itemsQuery.isSuccess && itemsQuery.data.length === 0 && (
            <div className="owner-blog-empty"><span aria-hidden="true">◫</span><strong>No {config.plural.toLowerCase()} yet</strong></div>
          )}
          {itemsQuery.isSuccess && itemsQuery.data.length > 0 && (
            <ul className="owner-taxonomy-items">
              {itemsQuery.data.map((item) => (
                <li className="owner-taxonomy-item" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>/{item.slug}</span>
                    {config.hasDescription && item.description && <p>{item.description}</p>}
                    <small>{item.posts_count || 0} published posts</small>
                  </div>
                  <div className="owner-project-row__actions">
                    <button aria-label={`Edit ${config.label} ${item.name}`} className="owner-skill-action" disabled={isSaving || deleteMutation.isPending} onClick={() => editItem(item)} type="button">Edit</button>
                    <button aria-label={`Delete ${config.label} ${item.name}`} className="owner-skill-action owner-skill-action--delete" disabled={isSaving || deleteMutation.isPending} onClick={() => { setPendingDelete(item); setFeedback(null) }} type="button">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="owner-panel owner-taxonomy-form-panel" aria-labelledby="owner-taxonomy-form-title">
          <div className="owner-panel__heading">
            <div>
              <p className="owner-eyebrow">{editingItem ? `EDIT ${config.label.toUpperCase()}` : 'NEW ENTRY'}</p>
              <h2 id="owner-taxonomy-form-title">{editingItem ? `Update ${config.label.toLowerCase()}` : `Add a ${config.label.toLowerCase()}`}</h2>
            </div>
            <span className="owner-blog-form-icon" aria-hidden="true">{editingItem ? '↗' : '+'}</span>
          </div>
          {itemsQuery.isSuccess && (
            <form className="owner-blog-form" onSubmit={submit} noValidate>
              <label className="owner-profile-field" htmlFor="owner-taxonomy-name">
                <span>Name <span aria-hidden="true">*</span></span>
                <input aria-describedby={fieldErrors.name ? 'owner-taxonomy-name-error' : undefined} aria-invalid={Boolean(fieldErrors.name)} disabled={isSaving} id="owner-taxonomy-name" maxLength={config.maxName} name="name" onChange={changeField} value={values.name} />
                {fieldErrors.name && <span className="owner-profile-field__error" id="owner-taxonomy-name-error">{fieldErrors.name}</span>}
              </label>
              <label className="owner-profile-field" htmlFor="owner-taxonomy-slug">
                <span>Slug <span aria-hidden="true">*</span></span>
                <input aria-describedby={fieldErrors.slug ? 'owner-taxonomy-slug-error' : undefined} aria-invalid={Boolean(fieldErrors.slug)} disabled={isSaving} id="owner-taxonomy-slug" maxLength={50} name="slug" onChange={changeField} value={values.slug} />
                {fieldErrors.slug && <span className="owner-profile-field__error" id="owner-taxonomy-slug-error">{fieldErrors.slug}</span>}
              </label>
              {config.hasDescription && (
                <label className="owner-profile-field" htmlFor="owner-taxonomy-description">
                  <span>Description</span>
                  <textarea disabled={isSaving} id="owner-taxonomy-description" name="description" onChange={changeField} rows={5} value={values.description} />
                </label>
              )}
              <div className="owner-project-form__actions">
                {editingItem && <button className="owner-button" disabled={isSaving} onClick={resetForm} type="button">Cancel</button>}
                <button className="owner-button owner-button--save" disabled={isSaving} type="submit">
                  {isSaving ? <><span className="owner-spinner owner-spinner--small" /> Saving…</> : editingItem ? 'Save changes' : `Add ${config.label.toLowerCase()}`}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {feedback && <p className={`owner-notice owner-notice--${feedback.type} owner-blog-feedback`} role={feedback.type === 'error' ? 'alert' : 'status'} aria-live="polite">{feedback.message}</p>}

      {pendingDelete && (
        <div className="owner-confirm-backdrop">
          <section aria-labelledby="owner-taxonomy-delete-title" aria-modal="true" className="owner-confirm-dialog" role="dialog">
            <span className="owner-confirm-dialog__icon" aria-hidden="true">!</span>
            <h2 id="owner-taxonomy-delete-title">Delete {config.label.toLowerCase()} “{pendingDelete.name}”?</h2>
            <p>{resource === 'categories'
              ? 'The API may reject this request if posts are assigned to this category.'
              : 'Posts using this tag will no longer have this tag if the API allows deletion.'}</p>
            {deleteMutation.isError && <p className="owner-notice owner-notice--error" role="alert">{messageFromError(deleteMutation.error, config.label)}</p>}
            <div className="owner-confirm-dialog__actions">
              <button className="owner-button" disabled={deleteMutation.isPending} onClick={() => { setPendingDelete(null); deleteMutation.reset() }} type="button">Cancel</button>
              <button className="owner-button owner-button--danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(pendingDelete)} type="button">
                {deleteMutation.isPending ? 'Deleting…' : `Delete ${config.label.toLowerCase()}`}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default OwnerTaxonomyManagement
