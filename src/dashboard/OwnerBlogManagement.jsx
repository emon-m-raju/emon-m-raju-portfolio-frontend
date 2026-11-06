import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createOwnerPost,
  deleteOwnerPost,
  getOwnerCategories,
  getOwnerPosts,
  getOwnerTags,
  updateOwnerPost,
} from '../api/axiosClient.js'
import { ApiError } from '../api/client.js'
import { useOwnerAuth } from '../auth/OwnerAuthContext.jsx'
import './owner-blog.css'

const emptyPost = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  category: '',
  tags: [],
  status: 'DRAFT',
  is_featured: false,
}

function getErrorMessage(error, resource = 'blog data') {
  if (error instanceof ApiError && error.status === 401) {
    return 'Your owner session has expired. Sign in again to continue.'
  }
  if (error instanceof ApiError && error.status === 403) {
    return `The API denied access. Only the portfolio owner can manage ${resource}.`
  }
  if (error instanceof ApiError && error.status === 429) {
    return 'The API is rate-limiting requests. Wait a moment and try again.'
  }
  return error?.message || `The ${resource} request could not be completed.`
}

function validatePost(post) {
  const errors = {}
  const title = post.title.trim()
  const excerpt = post.excerpt.trim()
  const content = post.content.trim()

  if (!title) errors.title = 'Title is required.'
  else if (title.length < 5) errors.title = 'Title must be at least 5 characters.'
  else if (title.length > 200) errors.title = 'Title must be 200 characters or fewer.'
  if (!excerpt) errors.excerpt = 'Excerpt is required.'
  else if (excerpt.length > 300) errors.excerpt = 'Excerpt must be 300 characters or fewer.'
  if (!content) errors.content = 'Content is required.'
  if (!post.category) errors.category = 'Choose a category.'
  if (!['DRAFT', 'PUBLISHED'].includes(post.status)) errors.status = 'Choose a valid publication status.'
  if (post.status === 'PUBLISHED' && content.split(/\s+/).filter(Boolean).length < 300) {
    errors.content = 'Published posts need at least 300 words.'
  }
  if (post.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) {
    errors.slug = 'Use lowercase letters, numbers, and single hyphens in the slug.'
  }
  return errors
}

function postValues(post) {
  return {
    title: post.title || '',
    slug: post.slug || '',
    excerpt: post.excerpt || '',
    content: post.content || '',
    category: post.category == null ? '' : String(post.category),
    tags: Array.isArray(post.tags) ? post.tags.map((tag) => String(
      tag && typeof tag === 'object' ? tag.id : tag,
    )) : [],
    status: post.status || 'DRAFT',
    is_featured: post.is_featured === true,
  }
}

function postPayload(post) {
  return {
    title: post.title.trim(),
    slug: post.slug.trim(),
    excerpt: post.excerpt.trim(),
    content: post.content.trim(),
    category: Number(post.category),
    tags: post.tags.map(Number),
    status: post.status,
    is_featured: post.is_featured,
  }
}

function OwnerBlogManagement() {
  const { auth } = useOwnerAuth()
  const queryClient = useQueryClient()
  const ownerId = auth?.user?.id
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [values, setValues] = useState(emptyPost)
  const [editingPost, setEditingPost] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [feedback, setFeedback] = useState(null)

  const postsQueryKey = ['owner-posts', ownerId, page, search, status]
  const postsQuery = useQuery({
    queryKey: postsQueryKey,
    queryFn: ({ signal }) => getOwnerPosts(auth.accessToken, { page, search, status, signal }),
    enabled: Boolean(auth?.accessToken),
  })
  const categoriesQuery = useQuery({
    queryKey: ['owner-categories', ownerId],
    queryFn: ({ signal }) => getOwnerCategories(auth.accessToken, { signal }),
    enabled: Boolean(auth?.accessToken),
  })
  const tagsQuery = useQuery({
    queryKey: ['owner-tags', ownerId],
    queryFn: ({ signal }) => getOwnerTags(auth.accessToken, { signal }),
    enabled: Boolean(auth?.accessToken),
  })

  const refreshPosts = () => queryClient.invalidateQueries({ queryKey: ['owner-posts', ownerId] })
  const refreshCategories = () => queryClient.invalidateQueries({ queryKey: ['owner-categories', ownerId] })
  const refreshTags = () => queryClient.invalidateQueries({ queryKey: ['owner-tags', ownerId] })

  const createMutation = useMutation({
    mutationFn: (post) => createOwnerPost(auth.accessToken, post),
    onSuccess: async (createdPost) => {
      setValues(emptyPost)
      setFieldErrors({})
      setFeedback({ type: 'success', message: `${createdPost.title} was created as ${createdPost.status}.` })
      if (page !== 1) setPage(1)
      await refreshPosts()
    },
    onError: (error) => setFeedback({ type: 'error', message: getErrorMessage(error, 'posts') }),
  })
  const updateMutation = useMutation({
    mutationFn: ({ slug, post }) => updateOwnerPost(auth.accessToken, slug, post),
    onSuccess: async (updatedPost) => {
      setEditingPost(null)
      setValues(emptyPost)
      setFieldErrors({})
      setFeedback({ type: 'success', message: `${updatedPost.title} was updated.` })
      await refreshPosts()
    },
    onError: (error) => setFeedback({ type: 'error', message: getErrorMessage(error, 'posts') }),
  })
  const deleteMutation = useMutation({
    mutationFn: (post) => deleteOwnerPost(auth.accessToken, post.slug),
    onSuccess: async (_, deletedPost) => {
      setPendingDelete(null)
      setFeedback({ type: 'success', message: `${deletedPost.title} was deleted.` })
      if (postsQuery.data?.results?.length === 1 && page > 1) setPage((current) => current - 1)
      await refreshPosts()
    },
    onError: (error) => setFeedback({ type: 'error', message: getErrorMessage(error, 'posts') }),
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  function resetForm() {
    setEditingPost(null)
    setValues(emptyPost)
    setFieldErrors({})
    setFeedback(null)
    createMutation.reset()
    updateMutation.reset()
  }

  function startEditing(post) {
    setEditingPost(post)
    setValues(postValues(post))
    setFieldErrors({})
    setFeedback(null)
    createMutation.reset()
    updateMutation.reset()
  }

  function changeField(event) {
    const { name, value, options, type, checked } = event.target
    const nextValue = type === 'checkbox'
      ? checked
      : name === 'tags'
        ? Array.from(options).filter((option) => option.selected).map((option) => option.value)
        : value
    setValues((current) => ({ ...current, [name]: nextValue }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
    setFeedback(null)
  }

  function submitPost(event) {
    event.preventDefault()
    if (!categoriesQuery.data || !tagsQuery.data || isSaving) return
    const errors = validatePost(values)
    setFieldErrors(errors)
    setFeedback(null)
    if (Object.keys(errors).length) {
      setFeedback({ type: 'error', message: 'Please correct the highlighted fields.' })
      return
    }

    const post = postPayload(values)
    if (editingPost) updateMutation.mutate({ slug: editingPost.slug, post })
    else createMutation.mutate(post)
  }

  function applySearch(event) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  return (
    <section className="owner-blog-page" aria-labelledby="owner-blog-title">
      <header className="owner-page-heading">
        <div>
          <p className="owner-eyebrow">OWNER WORKSPACE / BLOG</p>
          <h1 id="owner-blog-title">Blog management</h1>
          <p className="owner-page-heading__description">
            Manage post content, categories, tags, and publication status.
          </p>
        </div>
        <button
          className="owner-button owner-button--refresh"
          disabled={postsQuery.isFetching}
          onClick={() => postsQuery.refetch()}
          type="button"
        >
          <span aria-hidden="true">↻</span>
          {postsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <section className="owner-panel owner-blog-list" aria-labelledby="owner-blog-list-title">
        <div className="owner-panel__heading">
          <div>
            <p className="owner-eyebrow">PORTFOLIO DATA</p>
            <h2 id="owner-blog-list-title">Posts</h2>
          </div>
          {postsQuery.data && <span className="owner-panel__count">{postsQuery.data.count}</span>}
        </div>

        <div className="owner-blog-filters">
          <form className="owner-blog-search" onSubmit={applySearch} role="search">
            <label className="owner-profile-field" htmlFor="owner-blog-search">
              <span>Search posts</span>
              <input
                id="owner-blog-search"
                name="search"
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Title, excerpt, or content"
                value={searchInput}
              />
            </label>
            <button className="owner-button" type="submit">Search</button>
          </form>
          <label className="owner-profile-field owner-blog-status-filter" htmlFor="owner-blog-status-filter">
            <span>Status</span>
            <select
              id="owner-blog-status-filter"
              onChange={(event) => {
                setPage(1)
                setStatus(event.target.value)
              }}
              value={status}
            >
              <option value="all">All statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </label>
        </div>

        {postsQuery.isPending && (
          <div className="owner-state" role="status"><span className="owner-spinner" /> Loading posts…</div>
        )}
        {postsQuery.isError && (
          <div className="owner-notice owner-notice--error" role="alert">
            <strong>Posts could not be loaded.</strong>
            <p>{getErrorMessage(postsQuery.error, 'posts')}</p>
            <button className="owner-button" disabled={postsQuery.isFetching} onClick={() => postsQuery.refetch()} type="button">
              {postsQuery.isFetching ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        )}
        {postsQuery.isSuccess && postsQuery.data.results.length === 0 && (
          <div className="owner-blog-empty">
            <span aria-hidden="true">▤</span>
            <strong>No posts match these filters</strong>
            <p>Try a different search or status filter.</p>
          </div>
        )}
        {postsQuery.isSuccess && postsQuery.data.results.length > 0 && (
          <ul className="owner-blog-post-list">
            {postsQuery.data.results.map((post) => (
              <li className="owner-blog-post" key={post.slug}>
                <div className="owner-blog-post__main">
                  <div className="owner-blog-post__title-row">
                    <h3>{post.title}</h3>
                    <span className={`owner-blog-status owner-blog-status--${post.status.toLowerCase()}`}>
                      {post.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                    </span>
                    {post.is_featured && <span className="owner-blog-featured">Featured</span>}
                  </div>
                  <p>{post.excerpt}</p>
                  <div className="owner-blog-post__meta">
                    <span>{post.category_name || categoriesQuery.data?.find((category) => category.id === post.category)?.name || 'Category unavailable'}</span>
                    <span>/{post.slug}</span>
                    {post.published_at && <time dateTime={post.published_at}>{new Date(post.published_at).toLocaleDateString()}</time>}
                  </div>
                  {Array.isArray(post.tags) && post.tags.length > 0 && (
                    <ul className="owner-blog-tag-list" aria-label="Post tags">
                      {post.tags.map((tag) => {
                        const tagId = typeof tag === 'object' ? tag.id : tag
                        const label = typeof tag === 'object'
                          ? tag.name
                          : tagsQuery.data?.find((item) => item.id === tagId)?.name
                        return <li key={tagId}>{label || `Tag #${tagId}`}</li>
                      })}
                    </ul>
                  )}
                </div>
                <div className="owner-blog-post__actions">
                  <button aria-label={`Edit ${post.title}`} className="owner-skill-action" disabled={isSaving || deleteMutation.isPending} onClick={() => startEditing(post)} type="button">Edit</button>
                  <button aria-label={`Delete ${post.title}`} className="owner-skill-action owner-skill-action--delete" disabled={isSaving || deleteMutation.isPending} onClick={() => { setPendingDelete(post); setFeedback(null) }} type="button">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {postsQuery.isSuccess && (postsQuery.data.next || postsQuery.data.previous) && (
          <nav className="owner-blog-pagination" aria-label="Post list pages">
            <button
              className="owner-button"
              disabled={!postsQuery.data.previous || postsQuery.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              className="owner-button"
              disabled={!postsQuery.data.next || postsQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Next
            </button>
          </nav>
        )}
      </section>

      <section className="owner-panel owner-blog-form-panel" aria-labelledby="owner-blog-form-title">
        <div className="owner-panel__heading">
          <div>
            <p className="owner-eyebrow">{editingPost ? 'EDIT POST' : 'NEW ENTRY'}</p>
            <h2 id="owner-blog-form-title">{editingPost ? 'Update post' : 'Add a post'}</h2>
          </div>
          <span className="owner-blog-form-icon" aria-hidden="true">{editingPost ? '↗' : '+'}</span>
        </div>

        {categoriesQuery.isPending || tagsQuery.isPending ? (
          <div className="owner-state" role="status"><span className="owner-spinner" /> Loading categories and tags…</div>
        ) : categoriesQuery.isError || tagsQuery.isError ? (
          <div className="owner-notice owner-notice--error" role="alert">
            <strong>Post form options could not be loaded.</strong>
            {categoriesQuery.isError && <p>{getErrorMessage(categoriesQuery.error, 'categories')}</p>}
            {tagsQuery.isError && <p>{getErrorMessage(tagsQuery.error, 'tags')}</p>}
            <button className="owner-button" onClick={() => { categoriesQuery.refetch(); tagsQuery.refetch() }} type="button">Retry options</button>
          </div>
        ) : categoriesQuery.data.length === 0 ? (
          <div className="owner-blog-empty"><strong>Create a category before adding posts.</strong></div>
        ) : (
          <form className="owner-blog-form" onSubmit={submitPost} noValidate>
            <label className="owner-profile-field" htmlFor="owner-post-title">
              <span>Title <span aria-hidden="true">*</span></span>
              <input aria-describedby={fieldErrors.title ? 'owner-post-title-error' : undefined} aria-invalid={Boolean(fieldErrors.title)} disabled={isSaving} id="owner-post-title" maxLength={200} name="title" onChange={changeField} value={values.title} />
              {fieldErrors.title && <span className="owner-profile-field__error" id="owner-post-title-error">{fieldErrors.title}</span>}
            </label>
            <label className="owner-profile-field" htmlFor="owner-post-slug">
              <span>Slug <span className="owner-blog-optional">(optional; generated if blank)</span></span>
              <input aria-describedby={fieldErrors.slug ? 'owner-post-slug-error' : undefined} aria-invalid={Boolean(fieldErrors.slug)} disabled={isSaving} id="owner-post-slug" maxLength={50} name="slug" onChange={changeField} value={values.slug} />
              {fieldErrors.slug && <span className="owner-profile-field__error" id="owner-post-slug-error">{fieldErrors.slug}</span>}
            </label>
            <label className="owner-profile-field" htmlFor="owner-post-excerpt">
              <span>Excerpt <span aria-hidden="true">*</span></span>
              <textarea aria-describedby={fieldErrors.excerpt ? 'owner-post-excerpt-error' : undefined} aria-invalid={Boolean(fieldErrors.excerpt)} disabled={isSaving} id="owner-post-excerpt" maxLength={300} name="excerpt" onChange={changeField} rows={3} value={values.excerpt} />
              {fieldErrors.excerpt && <span className="owner-profile-field__error" id="owner-post-excerpt-error">{fieldErrors.excerpt}</span>}
            </label>
            <label className="owner-profile-field" htmlFor="owner-post-content">
              <span>Content <span aria-hidden="true">*</span></span>
              <textarea aria-describedby={fieldErrors.content ? 'owner-post-content-error' : 'owner-post-content-hint'} aria-invalid={Boolean(fieldErrors.content)} disabled={isSaving} id="owner-post-content" name="content" onChange={changeField} rows={12} value={values.content} />
              {fieldErrors.content
                ? <span className="owner-profile-field__error" id="owner-post-content-error">{fieldErrors.content}</span>
                : values.status === 'PUBLISHED' && <span className="owner-blog-form-hint" id="owner-post-content-hint">Published posts need at least 300 words.</span>}
            </label>
            <div className="owner-blog-form__row">
              <label className="owner-profile-field" htmlFor="owner-post-category">
                <span>Category <span aria-hidden="true">*</span></span>
                <select aria-describedby={fieldErrors.category ? 'owner-post-category-error' : undefined} aria-invalid={Boolean(fieldErrors.category)} disabled={isSaving} id="owner-post-category" name="category" onChange={changeField} value={values.category}>
                  <option value="">Select a category</option>
                  {categoriesQuery.data.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                {fieldErrors.category && <span className="owner-profile-field__error" id="owner-post-category-error">{fieldErrors.category}</span>}
              </label>
              <label className="owner-profile-field" htmlFor="owner-post-status">
                <span>Publication status <span aria-hidden="true">*</span></span>
                <select aria-describedby={fieldErrors.status ? 'owner-post-status-error' : undefined} aria-invalid={Boolean(fieldErrors.status)} disabled={isSaving} id="owner-post-status" name="status" onChange={changeField} value={values.status}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
                {fieldErrors.status && <span className="owner-profile-field__error" id="owner-post-status-error">{fieldErrors.status}</span>}
              </label>
            </div>
            <label className="owner-profile-field" htmlFor="owner-post-tags">
              <span>Tags</span>
              <select aria-describedby="owner-post-tags-hint" disabled={isSaving} id="owner-post-tags" multiple name="tags" onChange={changeField} size={Math.min(Math.max(tagsQuery.data.length, 3), 6)} value={values.tags}>
                {tagsQuery.data.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </select>
              <span className="owner-blog-form-hint" id="owner-post-tags-hint">Use Ctrl (Windows/Linux) or Command (Mac) to select multiple tags.</span>
            </label>
            <label className="owner-blog-featured" htmlFor="owner-post-featured">
              <input checked={values.is_featured} disabled={isSaving} id="owner-post-featured" name="is_featured" onChange={changeField} type="checkbox" />
              <span>Feature this post</span>
            </label>
            <div className="owner-blog-form__actions">
              {editingPost && <button className="owner-button" disabled={isSaving} onClick={resetForm} type="button">Cancel</button>}
              <button className="owner-button owner-button--save" disabled={isSaving} type="submit">
                {isSaving ? <><span className="owner-spinner owner-spinner--small" /> Saving…</> : editingPost ? 'Save changes' : 'Create post'}
              </button>
            </div>
          </form>
        )}
      </section>

      {feedback && <p className={`owner-notice owner-notice--${feedback.type} owner-blog-feedback`} role={feedback.type === 'error' ? 'alert' : 'status'} aria-live="polite">{feedback.message}</p>}

      {pendingDelete && (
        <div className="owner-confirm-backdrop">
          <section aria-labelledby="owner-post-delete-title" aria-modal="true" className="owner-confirm-dialog" role="dialog">
            <span className="owner-confirm-dialog__icon" aria-hidden="true">!</span>
            <h2 id="owner-post-delete-title">Delete {pendingDelete.title}?</h2>
            <p>This will permanently remove this post.</p>
            {deleteMutation.isError && <p className="owner-notice owner-notice--error" role="alert">{getErrorMessage(deleteMutation.error, 'posts')}</p>}
            <div className="owner-confirm-dialog__actions">
              <button className="owner-button" disabled={deleteMutation.isPending} onClick={() => { setPendingDelete(null); deleteMutation.reset() }} type="button">Cancel</button>
              <button className="owner-button owner-button--danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(pendingDelete)} type="button">
                {deleteMutation.isPending ? 'Deleting…' : 'Delete post'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default OwnerBlogManagement
