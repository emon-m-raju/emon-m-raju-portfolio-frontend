import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createOwnerSkill,
  deleteOwnerSkill,
  getOwnerSkills,
  updateOwnerSkill,
} from '../api/axiosClient.js'
import { ApiError } from '../api/client.js'
import { useOwnerAuth } from '../auth/OwnerAuthContext.jsx'
import './owner-skills.css'

const skillCategories = [
  { value: 'FRONTEND', label: 'Frontend' },
  { value: 'BACKEND', label: 'Backend' },
  { value: 'DATABASE', label: 'Database' },
  { value: 'DEVOPS', label: 'DevOps' },
  { value: 'TOOLS', label: 'Tools' },
  { value: 'SOFT_SKILL', label: 'Soft skill' },
]

const emptyForm = { name: '', category: '', proficiency: '' }

function categoryLabel(value) {
  return skillCategories.find((category) => category.value === value)?.label || value || 'Uncategorized'
}

function validateSkill(values) {
  const errors = {}
  const name = values.name.trim()
  const proficiency = Number(values.proficiency)

  if (!name) {
    errors.name = 'Skill name is required.'
  } else if (name.length > 80) {
    errors.name = 'Skill name must be 80 characters or fewer.'
  }
  if (!skillCategories.some((category) => category.value === values.category)) {
    errors.category = 'Choose a valid skill category.'
  }
  if (!Number.isInteger(proficiency) || proficiency < 1 || proficiency > 100) {
    errors.proficiency = 'Proficiency must be a whole number from 1 to 100.'
  }
  return errors
}

function skillPayload(values) {
  return {
    name: values.name.trim(),
    category: values.category,
    proficiency: Number(values.proficiency),
  }
}

function getErrorMessage(error) {
  if (error instanceof ApiError && error.status === 401) {
    return 'Your owner session has expired. Sign in again to continue.'
  }
  if (error instanceof ApiError && error.status === 403) {
    return 'The API denied this action. Only the portfolio owner can manage skills.'
  }
  if (error instanceof ApiError && error.status === 429) {
    return 'The API is rate-limiting requests. Wait a moment and try again.'
  }
  return error?.message || 'The request could not be completed.'
}

function OwnerSkillsManagement() {
  const { auth } = useOwnerAuth()
  const queryClient = useQueryClient()
  const skillsQueryKey = ['owner-skills', auth?.user?.id]
  const [formValues, setFormValues] = useState(emptyForm)
  const [editingSkill, setEditingSkill] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [feedback, setFeedback] = useState(null)

  const skillsQuery = useQuery({
    queryKey: skillsQueryKey,
    queryFn: ({ signal }) => getOwnerSkills(auth.accessToken, { signal }),
    enabled: Boolean(auth?.accessToken),
  })

  const createMutation = useMutation({
    mutationFn: (skill) => createOwnerSkill(auth.accessToken, skill),
    onSuccess: async (createdSkill) => {
      queryClient.setQueryData(skillsQueryKey, (skills = []) => [...skills, createdSkill])
      setFormValues(emptyForm)
      setFieldErrors({})
      setFeedback({ type: 'success', message: `${createdSkill.name} was added.` })
      await queryClient.invalidateQueries({ queryKey: skillsQueryKey })
    },
    onError: (error) => setFeedback({ type: 'error', message: getErrorMessage(error) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, skill }) => updateOwnerSkill(auth.accessToken, id, skill),
    onSuccess: async (updatedSkill) => {
      queryClient.setQueryData(skillsQueryKey, (skills = []) =>
        skills.map((skill) => (skill.id === updatedSkill.id ? updatedSkill : skill)),
      )
      setEditingSkill(null)
      setFormValues(emptyForm)
      setFieldErrors({})
      setFeedback({ type: 'success', message: `${updatedSkill.name} was updated.` })
      await queryClient.invalidateQueries({ queryKey: skillsQueryKey })
    },
    onError: (error) => setFeedback({ type: 'error', message: getErrorMessage(error) }),
  })

  const deleteMutation = useMutation({
    mutationFn: (skill) => deleteOwnerSkill(auth.accessToken, skill.id),
    onSuccess: async (_, deletedSkill) => {
      queryClient.setQueryData(skillsQueryKey, (skills = []) =>
        skills.filter((skill) => skill.id !== deletedSkill.id),
      )
      setPendingDelete(null)
      setFeedback({ type: 'success', message: `${deletedSkill.name} was deleted.` })
      await queryClient.invalidateQueries({ queryKey: skillsQueryKey })
    },
    onError: (error) => setFeedback({ type: 'error', message: getErrorMessage(error) }),
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  function resetForm() {
    setEditingSkill(null)
    setFormValues(emptyForm)
    setFieldErrors({})
    setFeedback(null)
    createMutation.reset()
    updateMutation.reset()
  }

  function startEditing(skill) {
    setEditingSkill(skill)
    setFormValues({
      name: skill.name,
      category: skill.category,
      proficiency: String(skill.proficiency),
    })
    setFieldErrors({})
    setFeedback(null)
    createMutation.reset()
    updateMutation.reset()
  }

  function changeField(event) {
    const { name, value } = event.target
    setFormValues((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
    setFeedback(null)
  }

  function submitForm(event) {
    event.preventDefault()
    if (!skillsQuery.data || isSaving) return
    const errors = validateSkill(formValues)
    setFieldErrors(errors)
    setFeedback(null)
    if (Object.keys(errors).length) {
      setFeedback({ type: 'error', message: 'Please correct the highlighted fields.' })
      return
    }

    const payload = skillPayload(formValues)
    if (editingSkill) {
      updateMutation.mutate({ id: editingSkill.id, skill: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <section className="owner-skills-page" aria-labelledby="owner-skills-title">
      <header className="owner-page-heading">
        <div>
          <p className="owner-eyebrow">OWNER WORKSPACE / SKILLS</p>
          <h1 id="owner-skills-title">Skills management</h1>
          <p className="owner-page-heading__description">
            Manage the skills and proficiency levels shown on your portfolio.
          </p>
        </div>
        <button
          className="owner-button owner-button--refresh"
          disabled={skillsQuery.isFetching}
          onClick={() => skillsQuery.refetch()}
          type="button"
        >
          <span aria-hidden="true">↻</span>
          {skillsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <div className="owner-skills-layout">
        <section className="owner-panel owner-skills-list" aria-labelledby="owner-skills-list-title">
          <div className="owner-panel__heading">
            <div>
              <p className="owner-eyebrow">PORTFOLIO DATA</p>
              <h2 id="owner-skills-list-title">All skills</h2>
            </div>
            {Array.isArray(skillsQuery.data) && (
              <span className="owner-panel__count">{skillsQuery.data.length}</span>
            )}
          </div>

          {skillsQuery.isPending && (
            <div className="owner-state" role="status">
              <span className="owner-spinner" /> Loading skills…
            </div>
          )}

          {skillsQuery.isError && (
            <div className="owner-notice owner-notice--error" role="alert">
              <strong>Skills could not be loaded.</strong>
              <p>{getErrorMessage(skillsQuery.error)}</p>
              <button
                className="owner-button"
                disabled={skillsQuery.isFetching}
                onClick={() => skillsQuery.refetch()}
                type="button"
              >
                {skillsQuery.isFetching ? 'Retrying…' : 'Retry'}
              </button>
            </div>
          )}

          {skillsQuery.isSuccess && skillsQuery.data.length === 0 && (
            <div className="owner-skills-empty">
              <span aria-hidden="true">⌘</span>
              <strong>No skills yet</strong>
              <p>Add a real skill using the form. Nothing is pre-populated.</p>
            </div>
          )}

          {Array.isArray(skillsQuery.data) && skillsQuery.data.length > 0 && (
            <ul className="owner-skill-list">
              {skillsQuery.data.map((skill) => (
                <li className="owner-skill-row" key={skill.id}>
                  <div className="owner-skill-row__details">
                    <div className="owner-skill-row__heading">
                      <strong>{skill.name}</strong>
                      <span className="owner-skill-category">{categoryLabel(skill.category)}</span>
                    </div>
                    <div
                      className="owner-skill-proficiency"
                      role="meter"
                      aria-label={`${skill.name} proficiency`}
                      aria-valuemin={1}
                      aria-valuemax={100}
                      aria-valuenow={skill.proficiency}
                    >
                      <span><span style={{ width: `${skill.proficiency}%` }} /></span>
                      <strong>{skill.proficiency}%</strong>
                    </div>
                  </div>
                  <div className="owner-skill-row__actions">
                    <button
                      aria-label={`Edit ${skill.name}`}
                      className="owner-skill-action"
                      disabled={isSaving || deleteMutation.isPending}
                      onClick={() => startEditing(skill)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      aria-label={`Delete ${skill.name}`}
                      className="owner-skill-action owner-skill-action--delete"
                      disabled={isSaving || deleteMutation.isPending}
                      onClick={() => {
                        setPendingDelete(skill)
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

        <section className="owner-panel owner-skill-form-panel" aria-labelledby="owner-skill-form-title">
          <div className="owner-panel__heading">
            <div>
              <p className="owner-eyebrow">{editingSkill ? 'EDIT SKILL' : 'NEW ENTRY'}</p>
              <h2 id="owner-skill-form-title">{editingSkill ? 'Update skill' : 'Add a skill'}</h2>
            </div>
            <span className="owner-skill-form-panel__icon" aria-hidden="true">
              {editingSkill ? '↗' : '+'}
            </span>
          </div>

          {!skillsQuery.isSuccess ? (
            <p className="owner-skill-form-panel__hint">
              {skillsQuery.isPending
                ? 'The form will be available after the current skills load.'
                : 'Load the skills list before creating or editing records.'}
            </p>
          ) : (
            <form className="owner-skill-form" onSubmit={submitForm} noValidate>
              <label className="owner-profile-field" htmlFor="owner-skill-name">
                <span>Skill name <span aria-hidden="true">*</span></span>
                <input
                  aria-describedby={fieldErrors.name ? 'owner-skill-name-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.name)}
                  autoComplete="off"
                  disabled={isSaving}
                  id="owner-skill-name"
                  maxLength={80}
                  name="name"
                  onChange={changeField}
                  placeholder="e.g. JavaScript"
                  value={formValues.name}
                />
                {fieldErrors.name && (
                  <span className="owner-profile-field__error" id="owner-skill-name-error">
                    {fieldErrors.name}
                  </span>
                )}
              </label>

              <label className="owner-profile-field" htmlFor="owner-skill-category">
                <span>Category <span aria-hidden="true">*</span></span>
                <select
                  aria-describedby={fieldErrors.category ? 'owner-skill-category-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.category)}
                  disabled={isSaving}
                  id="owner-skill-category"
                  name="category"
                  onChange={changeField}
                  value={formValues.category}
                >
                  <option value="">Select a category</option>
                  {skillCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.category && (
                  <span className="owner-profile-field__error" id="owner-skill-category-error">
                    {fieldErrors.category}
                  </span>
                )}
              </label>

              <label className="owner-profile-field" htmlFor="owner-skill-proficiency">
                <span>Proficiency (1–100) <span aria-hidden="true">*</span></span>
                <input
                  aria-describedby={fieldErrors.proficiency ? 'owner-skill-proficiency-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.proficiency)}
                  disabled={isSaving}
                  id="owner-skill-proficiency"
                  max="100"
                  min="1"
                  name="proficiency"
                  onChange={changeField}
                  step="1"
                  type="number"
                  value={formValues.proficiency}
                />
                {fieldErrors.proficiency && (
                  <span className="owner-profile-field__error" id="owner-skill-proficiency-error">
                    {fieldErrors.proficiency}
                  </span>
                )}
              </label>

              <div className="owner-skill-form__actions">
                {editingSkill && (
                  <button
                    className="owner-button"
                    disabled={isSaving}
                    onClick={resetForm}
                    type="button"
                  >
                    Cancel
                  </button>
                )}
                <button
                  className="owner-button owner-button--save"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? (
                    <><span className="owner-spinner owner-spinner--small" /> Saving…</>
                  ) : editingSkill ? (
                    'Save changes'
                  ) : (
                    'Add skill'
                  )}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {feedback && (
        <p
          className={`owner-notice owner-notice--${feedback.type} owner-skill-feedback`}
          role={feedback.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {feedback.message}
        </p>
      )}

      {pendingDelete && (
        <div className="owner-confirm-backdrop">
          <section
            aria-labelledby="owner-skill-delete-title"
            aria-modal="true"
            className="owner-confirm-dialog"
            role="dialog"
          >
            <span className="owner-confirm-dialog__icon" aria-hidden="true">!</span>
            <h2 id="owner-skill-delete-title">Delete {pendingDelete.name}?</h2>
            <p>This will permanently remove this skill and its portfolio relationships.</p>
            {deleteMutation.isError && (
              <p className="owner-notice owner-notice--error" role="alert">
                {getErrorMessage(deleteMutation.error)}
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
                {deleteMutation.isPending ? 'Deleting…' : 'Delete skill'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default OwnerSkillsManagement
