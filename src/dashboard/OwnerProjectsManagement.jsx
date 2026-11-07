import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createOwnerProject,
  deleteOwnerProject,
  getOwnerProjects,
  getOwnerSkills,
  updateOwnerProject,
} from '../api/axiosClient.js'
import { formatResourceError } from '../api/errorFormatters.js'
import { queryKeys } from '../api/queryKeys.js'
import { useOwnerAuth } from '../auth/OwnerAuthContext.jsx'
import './owner-projects.css'

const projectCategories = [
  { value: 'WEB', label: 'Web' },
  { value: 'MOBILE', label: 'Mobile' },
  { value: 'API', label: 'API' },
  { value: 'ML', label: 'Machine learning' },
  { value: 'OTHER', label: 'Other' },
]

const emptyForm = {
  title: '',
  summary: '',
  description: '',
  category: '',
  github_url: '',
  live_url: '',
  is_featured: false,
  tech_stack: [],
}

function projectTechStack(project) {
  if (!Array.isArray(project.tech_stack)) return []
  return project.tech_stack.map((skill) => {
    if (skill && typeof skill === 'object' && 'id' in skill) return Number(skill.id)
    return Number(skill)
  }).filter(Number.isInteger)
}

function validateProject(values) {
  const errors = {}
  const title = values.title.trim()
  const summary = values.summary.trim()
  const description = values.description.trim()

  if (!title) errors.title = 'Project title is required.'
  else if (title.length > 180) errors.title = 'Title must be 180 characters or fewer.'
  if (!summary) errors.summary = 'Summary is required.'
  else if (summary.length > 200) errors.summary = 'Summary must be 200 characters or fewer.'
  if (!description) errors.description = 'Description is required.'
  if (!projectCategories.some(({ value }) => value === values.category)) {
    errors.category = 'Choose a valid project category.'
  }

  for (const field of ['github_url', 'live_url']) {
    const value = values[field].trim()
    if (!value) continue
    try {
      if (!['http:', 'https:'].includes(new URL(value).protocol)) {
        errors[field] = 'URL must use HTTP or HTTPS.'
      }
    } catch {
      errors[field] = 'Enter a valid URL beginning with https:// or http://.'
    }
  }
  if (!values.github_url.trim() && !values.live_url.trim()) {
    errors.github_url = 'Provide a GitHub URL or a live URL.'
    errors.live_url = 'Provide a GitHub URL or a live URL.'
  }

  return errors
}

function projectPayload(values) {
  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    description: values.description.trim(),
    category: values.category,
    github_url: values.github_url.trim(),
    live_url: values.live_url.trim(),
    is_featured: values.is_featured,
    tech_stack: values.tech_stack,
  }
}

function apiErrorMessage(error, resource = 'projects') {
  return formatResourceError(error, resource)
}

function OwnerProjectsManagement() {
  const { auth } = useOwnerAuth()
  const queryClient = useQueryClient()
  const ownerId = auth?.user?.id
  const projectsQueryKey = queryKeys.ownerProjects(ownerId)
  const skillsQueryKey = queryKeys.ownerSkills(ownerId)
  const [values, setValues] = useState(emptyForm)
  const [editingProject, setEditingProject] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [feedback, setFeedback] = useState(null)

  const projectsQuery = useQuery({
    queryKey: projectsQueryKey,
    queryFn: ({ signal }) => getOwnerProjects(auth.accessToken, { signal }),
    enabled: Boolean(auth?.accessToken),
  })
  const skillsQuery = useQuery({
    queryKey: skillsQueryKey,
    queryFn: ({ signal }) => getOwnerSkills(auth.accessToken, { signal }),
    enabled: Boolean(auth?.accessToken),
  })

  const createMutation = useMutation({
    mutationFn: (project) => createOwnerProject(auth.accessToken, project),
    onSuccess: async (createdProject) => {
      queryClient.setQueryData(projectsQueryKey, (projects = []) => [...projects, createdProject])
      setValues(emptyForm)
      setFieldErrors({})
      setFeedback({ type: 'success', message: `${createdProject.title} was added.` })
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey })
    },
    onError: (error) => setFeedback({ type: 'error', message: apiErrorMessage(error) }),
  })
  const updateMutation = useMutation({
    mutationFn: ({ slug, project }) => updateOwnerProject(auth.accessToken, slug, project),
    onSuccess: async (updatedProject) => {
      queryClient.setQueryData(projectsQueryKey, (projects = []) =>
        projects.map((project) => (project.slug === updatedProject.slug ? updatedProject : project)),
      )
      setEditingProject(null)
      setValues(emptyForm)
      setFieldErrors({})
      setFeedback({ type: 'success', message: `${updatedProject.title} was updated.` })
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey })
    },
    onError: (error) => setFeedback({ type: 'error', message: apiErrorMessage(error) }),
  })
  const deleteMutation = useMutation({
    mutationFn: (project) => deleteOwnerProject(auth.accessToken, project.slug),
    onSuccess: async (_, deletedProject) => {
      queryClient.setQueryData(projectsQueryKey, (projects = []) =>
        projects.filter((project) => project.slug !== deletedProject.slug),
      )
      setPendingDelete(null)
      setFeedback({ type: 'success', message: `${deletedProject.title} was deleted.` })
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey })
    },
    onError: (error) => setFeedback({ type: 'error', message: apiErrorMessage(error) }),
  })

  const isSaving = createMutation.isPending || updateMutation.isPending
  const skillNames = new Map((skillsQuery.data || []).map((skill) => [skill.id, skill.name]))

  function resetForm() {
    setEditingProject(null)
    setValues(emptyForm)
    setFieldErrors({})
    setFeedback(null)
    createMutation.reset()
    updateMutation.reset()
  }

  function startEditing(project) {
    setEditingProject(project)
    setValues({
      title: project.title || '',
      summary: project.summary || '',
      description: project.description || '',
      category: project.category || '',
      github_url: project.github_url || '',
      live_url: project.live_url || '',
      is_featured: project.is_featured === true,
      tech_stack: projectTechStack(project),
    })
    setFieldErrors({})
    setFeedback(null)
    createMutation.reset()
    updateMutation.reset()
  }

  function changeField(event) {
    const { name, value, options, type, checked } = event.target
    const nextValue = type === 'checkbox'
      ? checked
      : name === 'tech_stack'
        ? Array.from(options).filter((option) => option.selected).map((option) => Number(option.value))
        : value
    setValues((current) => ({ ...current, [name]: nextValue }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
    setFeedback(null)
  }

  function submitForm(event) {
    event.preventDefault()
    if (!projectsQuery.data || !skillsQuery.data || isSaving) return

    const errors = validateProject(values)
    setFieldErrors(errors)
    setFeedback(null)
    if (Object.keys(errors).length) {
      setFeedback({ type: 'error', message: 'Please correct the highlighted fields.' })
      return
    }

    const project = projectPayload(values)
    if (editingProject) {
      updateMutation.mutate({ slug: editingProject.slug, project })
    } else {
      createMutation.mutate(project)
    }
  }

  return (
    <section className="owner-projects-page" aria-labelledby="owner-projects-title">
      <header className="owner-page-heading">
        <div>
          <p className="owner-eyebrow">OWNER WORKSPACE / PROJECTS</p>
          <h1 id="owner-projects-title">Projects management</h1>
          <p className="owner-page-heading__description">
            Manage the project details and technologies displayed in your portfolio.
          </p>
        </div>
        <button
          className="owner-button owner-button--refresh"
          disabled={projectsQuery.isFetching}
          onClick={() => projectsQuery.refetch()}
          type="button"
        >
          <span aria-hidden="true">↻</span>
          {projectsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <div className="owner-projects-layout">
        <section className="owner-panel owner-projects-list" aria-labelledby="owner-projects-list-title">
          <div className="owner-panel__heading">
            <div>
              <p className="owner-eyebrow">PORTFOLIO DATA</p>
              <h2 id="owner-projects-list-title">All projects</h2>
            </div>
            {Array.isArray(projectsQuery.data) && (
              <span className="owner-panel__count">{projectsQuery.data.length}</span>
            )}
          </div>

          {projectsQuery.isPending && (
            <div className="owner-state" role="status">
              <span className="owner-spinner" /> Loading projects…
            </div>
          )}

          {projectsQuery.isError && (
            <div className="owner-notice owner-notice--error" role="alert">
              <strong>Projects could not be loaded.</strong>
              <p>{apiErrorMessage(projectsQuery.error)}</p>
              <button
                className="owner-button"
                disabled={projectsQuery.isFetching}
                onClick={() => projectsQuery.refetch()}
                type="button"
              >
                {projectsQuery.isFetching ? 'Retrying…' : 'Retry'}
              </button>
            </div>
          )}

          {projectsQuery.isSuccess && projectsQuery.data.length === 0 && (
            <div className="owner-projects-empty">
              <span aria-hidden="true">▣</span>
              <strong>No projects yet</strong>
              <p>Add a project using the form. Nothing is pre-populated.</p>
            </div>
          )}

          {Array.isArray(projectsQuery.data) && projectsQuery.data.length > 0 && (
            <ul className="owner-project-list">
              {projectsQuery.data.map((project) => (
                <li className="owner-project-row" key={project.slug}>
                  <div className="owner-project-row__content">
                    <div className="owner-project-row__heading">
                      <strong>{project.title}</strong>
                      <span className="owner-project-category">
                        {projectCategories.find(({ value }) => value === project.category)?.label || project.category}
                      </span>
                      {project.is_featured && <span className="owner-project-featured">Featured</span>}
                    </div>
                    <p className="owner-project-row__summary">{project.summary}</p>
                    {projectTechStack(project).length > 0 && (
                      <ul className="owner-project-tech-stack" aria-label={`${project.title} tech stack`}>
                        {projectTechStack(project).map((skillId) => (
                          <li key={skillId}>{skillNames.get(skillId) || `Skill #${skillId}`}</li>
                        ))}
                      </ul>
                    )}
                    <div className="owner-project-row__links">
                      {project.github_url && <a href={project.github_url} target="_blank" rel="noreferrer">GitHub ↗</a>}
                      {project.live_url && <a href={project.live_url} target="_blank" rel="noreferrer">Live ↗</a>}
                    </div>
                  </div>
                  <div className="owner-project-row__actions">
                    <button
                      aria-label={`Edit ${project.title}`}
                      className="owner-skill-action"
                      disabled={isSaving || deleteMutation.isPending}
                      onClick={() => startEditing(project)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      aria-label={`Delete ${project.title}`}
                      className="owner-skill-action owner-skill-action--delete"
                      disabled={isSaving || deleteMutation.isPending}
                      onClick={() => {
                        setPendingDelete(project)
                        setFeedback(null)
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="owner-panel owner-project-form-panel" aria-labelledby="owner-project-form-title">
          <div className="owner-panel__heading">
            <div>
              <p className="owner-eyebrow">{editingProject ? 'EDIT PROJECT' : 'NEW ENTRY'}</p>
              <h2 id="owner-project-form-title">{editingProject ? 'Update project' : 'Add a project'}</h2>
            </div>
            <span className="owner-project-form-panel__icon" aria-hidden="true">
              {editingProject ? '↗' : '+'}
            </span>
          </div>

          {!projectsQuery.isSuccess || !skillsQuery.isSuccess ? (
            <div className="owner-project-form-panel__hint">
              {skillsQuery.isPending
                ? <p>Loading available skills for tech stack selection…</p>
                : skillsQuery.isError
                  ? (
                    <>
                      <p>Skills could not be loaded, so the form is unavailable.</p>
                      <p role="alert">{apiErrorMessage(skillsQuery.error, 'skills')}</p>
                      <button
                        className="owner-button"
                        disabled={skillsQuery.isFetching}
                        onClick={() => skillsQuery.refetch()}
                        type="button"
                      >
                        {skillsQuery.isFetching ? 'Retrying…' : 'Retry skills'}
                      </button>
                    </>
                  )
                  : <p>Load projects before creating or editing records.</p>}
            </div>
          ) : (
            <form className="owner-project-form" onSubmit={submitForm} noValidate>
              <label className="owner-profile-field" htmlFor="owner-project-title">
                <span>Project title <span aria-hidden="true">*</span></span>
                <input
                  aria-describedby={fieldErrors.title ? 'owner-project-title-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.title)}
                  disabled={isSaving}
                  id="owner-project-title"
                  maxLength={180}
                  name="title"
                  onChange={changeField}
                  value={values.title}
                />
                {fieldErrors.title && <span className="owner-profile-field__error" id="owner-project-title-error">{fieldErrors.title}</span>}
              </label>

              <label className="owner-profile-field" htmlFor="owner-project-summary">
                <span>Summary <span aria-hidden="true">*</span></span>
                <input
                  aria-describedby={fieldErrors.summary ? 'owner-project-summary-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.summary)}
                  disabled={isSaving}
                  id="owner-project-summary"
                  maxLength={200}
                  name="summary"
                  onChange={changeField}
                  value={values.summary}
                />
                {fieldErrors.summary && <span className="owner-profile-field__error" id="owner-project-summary-error">{fieldErrors.summary}</span>}
              </label>

              <label className="owner-profile-field" htmlFor="owner-project-description">
                <span>Description <span aria-hidden="true">*</span></span>
                <textarea
                  aria-describedby={fieldErrors.description ? 'owner-project-description-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.description)}
                  disabled={isSaving}
                  id="owner-project-description"
                  name="description"
                  onChange={changeField}
                  rows={5}
                  value={values.description}
                />
                {fieldErrors.description && <span className="owner-profile-field__error" id="owner-project-description-error">{fieldErrors.description}</span>}
              </label>

              <label className="owner-profile-field" htmlFor="owner-project-category">
                <span>Category <span aria-hidden="true">*</span></span>
                <select
                  aria-describedby={fieldErrors.category ? 'owner-project-category-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.category)}
                  disabled={isSaving}
                  id="owner-project-category"
                  name="category"
                  onChange={changeField}
                  value={values.category}
                >
                  <option value="">Select a category</option>
                  {projectCategories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                </select>
                {fieldErrors.category && <span className="owner-profile-field__error" id="owner-project-category-error">{fieldErrors.category}</span>}
              </label>

              <label className="owner-profile-field" htmlFor="owner-project-github">
                <span>GitHub URL</span>
                <input
                  aria-describedby={fieldErrors.github_url ? 'owner-project-github-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.github_url)}
                  disabled={isSaving}
                  id="owner-project-github"
                  name="github_url"
                  onChange={changeField}
                  placeholder="https://github.com/…"
                  type="url"
                  value={values.github_url}
                />
                {fieldErrors.github_url && <span className="owner-profile-field__error" id="owner-project-github-error">{fieldErrors.github_url}</span>}
              </label>

              <label className="owner-profile-field" htmlFor="owner-project-live">
                <span>Live URL</span>
                <input
                  aria-describedby={fieldErrors.live_url ? 'owner-project-live-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.live_url)}
                  disabled={isSaving}
                  id="owner-project-live"
                  name="live_url"
                  onChange={changeField}
                  placeholder="https://…"
                  type="url"
                  value={values.live_url}
                />
                {fieldErrors.live_url && <span className="owner-profile-field__error" id="owner-project-live-error">{fieldErrors.live_url}</span>}
              </label>

              <label className="owner-profile-field" htmlFor="owner-project-tech-stack">
                <span>Tech stack</span>
                <select
                  aria-describedby="owner-project-tech-stack-hint"
                  disabled={isSaving}
                  id="owner-project-tech-stack"
                  multiple
                  name="tech_stack"
                  onChange={changeField}
                  size={Math.min(Math.max(skillsQuery.data.length, 3), 6)}
                  value={values.tech_stack.map(String)}
                >
                  {skillsQuery.data.map((skill) => (
                    <option key={skill.id} value={skill.id}>{skill.name}</option>
                  ))}
                </select>
                <span className="owner-project-form__hint" id="owner-project-tech-stack-hint">
                  Use Ctrl (Windows/Linux) or Command (Mac) to select multiple skills.
                </span>
              </label>

              <label className="owner-project-featured" htmlFor="owner-project-featured">
                <input
                  checked={values.is_featured}
                  disabled={isSaving}
                  id="owner-project-featured"
                  name="is_featured"
                  onChange={changeField}
                  type="checkbox"
                />
                <span>Feature this project</span>
              </label>

              <div className="owner-project-form__actions">
                {editingProject && (
                  <button className="owner-button" disabled={isSaving} onClick={resetForm} type="button">
                    Cancel
                  </button>
                )}
                <button className="owner-button owner-button--save" disabled={isSaving} type="submit">
                  {isSaving
                    ? <><span className="owner-spinner owner-spinner--small" /> Saving…</>
                    : editingProject ? 'Save changes' : 'Add project'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {feedback && (
        <p
          className={`owner-notice owner-notice--${feedback.type} owner-project-feedback`}
          role={feedback.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {feedback.message}
        </p>
      )}

      {pendingDelete && (
        <div className="owner-confirm-backdrop">
          <section
            aria-labelledby="owner-project-delete-title"
            aria-modal="true"
            className="owner-confirm-dialog"
            role="dialog"
          >
            <span className="owner-confirm-dialog__icon" aria-hidden="true">!</span>
            <h2 id="owner-project-delete-title">Delete {pendingDelete.title}?</h2>
            <p>This will permanently remove this project from your portfolio.</p>
            {deleteMutation.isError && (
              <p className="owner-notice owner-notice--error" role="alert">
                {apiErrorMessage(deleteMutation.error)}
              </p>
            )}
            <div className="owner-confirm-dialog__actions">
              <button
                className="owner-button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  setPendingDelete(null)
                  deleteMutation.reset()
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="owner-button owner-button--danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(pendingDelete)}
                type="button"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete project'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default OwnerProjectsManagement
