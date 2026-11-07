import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getOwnerProfile, patchOwnerProfile } from '../api/axiosClient.js'
import { formatResourceError } from '../api/errorFormatters.js'
import { queryKeys } from '../api/queryKeys.js'
import { useOwnerAuth } from '../auth/OwnerAuthContext.jsx'
import './owner-profile.css'

const profileQueryKey = queryKeys.ownerProfile()
const textFields = [
  { name: 'full_name', label: 'Full name', required: true, maxLength: 160 },
  { name: 'headline', label: 'Headline', required: true, maxLength: 200 },
  { name: 'bio', label: 'Bio', required: true, multiline: true },
  { name: 'location', label: 'Location', maxLength: 120 },
  { name: 'email', label: 'Email', required: true, type: 'email', maxLength: 254 },
  { name: 'phone', label: 'Phone', maxLength: 30 },
  { name: 'github_url', label: 'GitHub URL', type: 'url' },
  { name: 'linkedin_url', label: 'LinkedIn URL', type: 'url' },
  { name: 'website_url', label: 'Website URL', type: 'url' },
]

function valuesFromProfile(profile) {
  return {
    ...Object.fromEntries(
      textFields.map(({ name }) => [
        name,
        typeof profile[name] === 'string' ? profile[name] : '',
      ]),
    ),
    is_available_for_hire: profile.is_available_for_hire === true,
  }
}

function validate(values) {
  const errors = {}
  for (const field of textFields) {
    const value = values[field.name].trim()
    if (field.required && !value) {
      errors[field.name] = `${field.label} is required.`
      continue
    }
    if (field.maxLength && value.length > field.maxLength) {
      errors[field.name] = `${field.label} must be ${field.maxLength} characters or fewer.`
      continue
    }
    if (field.name === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[field.name] = 'Enter a valid email address.'
      continue
    }
    if (field.type === 'url' && value) {
      try {
        if (!['http:', 'https:'].includes(new URL(value).protocol)) {
          errors[field.name] = 'URL must use HTTP or HTTPS.'
        }
      } catch {
        errors[field.name] = 'Enter a valid URL beginning with https:// or http://.'
      }
    }
  }
  return errors
}

function getProfileErrorMessage(error) {
  return formatResourceError(
    error,
    'profile',
    'The API denied access. Only the portfolio owner can view or update this profile.',
  )
}

function OwnerProfileManagement() {
  const { auth } = useOwnerAuth()
  const queryClient = useQueryClient()
  const [values, setValues] = useState(null)
  const [resumeFile, setResumeFile] = useState(null)
  const resumeInputRef = useRef(null)
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState(null)

  const profileQuery = useQuery({
    queryKey: profileQueryKey,
    queryFn: ({ signal }) => getOwnerProfile(auth.accessToken, { signal }),
    enabled: Boolean(auth?.accessToken),
    retry: 1,
  })

  useEffect(() => {
    if (profileQuery.data) {
      setValues(valuesFromProfile(profileQuery.data))
      setResumeFile(null)
      setErrors({})
    }
  }, [profileQuery.data])

  const updateMutation = useMutation({
    mutationFn: ({ data, file }) =>
      patchOwnerProfile(auth.accessToken, data, file),
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileQueryKey, profile)
      setResumeFile(null)
      if (resumeInputRef.current) {
        resumeInputRef.current.value = ''
      }
      setFeedback({ type: 'success', message: 'Profile updated successfully.' })
      await queryClient.invalidateQueries({ queryKey: profileQueryKey })
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getProfileErrorMessage(error) })
    },
  })

  function updateField(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setFeedback(null)
  }

  function cancelChanges() {
    if (!profileQuery.data) return
    setValues(valuesFromProfile(profileQuery.data))
    setResumeFile(null)
    if (resumeInputRef.current) {
      resumeInputRef.current.value = ''
    }
    setErrors({})
    setFeedback(null)
    updateMutation.reset()
  }

  function submit(event) {
    event.preventDefault()
    if (!profileQuery.data || !values || updateMutation.isPending) return
    const validationErrors = validate(values)
    setErrors(validationErrors)
    setFeedback(null)
    if (Object.keys(validationErrors).length) {
      setFeedback({ type: 'error', message: 'Please correct the highlighted fields.' })
      return
    }

    updateMutation.mutate({ data: values, file: resumeFile })
  }

  return (
    <section className="owner-profile-page" aria-labelledby="owner-profile-title">
      <header className="owner-page-heading">
        <div>
          <p className="owner-eyebrow">OWNER WORKSPACE / PROFILE</p>
          <h1 id="owner-profile-title">Profile management</h1>
          <p className="owner-page-heading__description">
            Update the information displayed on your public portfolio.
          </p>
        </div>
      </header>

      {profileQuery.isPending && (
        <div className="owner-state" role="status">
          <span className="owner-spinner" /> Loading your current profile…
        </div>
      )}

      {profileQuery.isError && (
        <div className="owner-notice owner-notice--error" role="alert">
          <strong>Profile could not be loaded.</strong>
          <p>{getProfileErrorMessage(profileQuery.error)}</p>
          <button
            className="owner-button"
            disabled={profileQuery.isFetching}
            onClick={() => profileQuery.refetch()}
            type="button"
          >
            {profileQuery.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      {profileQuery.isSuccess && !values && (
        <div className="owner-state" role="status">
          Preparing profile form…
        </div>
      )}

      {profileQuery.isSuccess && values && (
        <form className="owner-profile-form owner-panel" onSubmit={submit} noValidate>
          <div className="owner-profile-form__intro">
            <div>
              <h2>Public profile details</h2>
              <p>Changes are sent to the owner-only Profile API after you save.</p>
            </div>
            <span className="owner-profile-form__badge">Owner only</span>
          </div>

          <div className="owner-profile-form__grid">
            {textFields.map((field) => {
              const id = `owner-profile-${field.name}`
              const fieldError = errors[field.name]
              return (
                <label
                  className={`owner-profile-field${field.multiline ? ' owner-profile-field--wide' : ''}`}
                  htmlFor={id}
                  key={field.name}
                >
                  <span>{field.label}{field.required && <span aria-hidden="true"> *</span>}</span>
                  {field.multiline ? (
                    <textarea
                      aria-describedby={fieldError ? `${id}-error` : undefined}
                      aria-invalid={Boolean(fieldError)}
                      disabled={updateMutation.isPending}
                      id={id}
                      name={field.name}
                      onChange={updateField}
                      required={field.required}
                      rows={7}
                      value={values[field.name]}
                    />
                  ) : (
                    <input
                      aria-describedby={fieldError ? `${id}-error` : undefined}
                      aria-invalid={Boolean(fieldError)}
                      autoComplete={field.name === 'email' ? 'email' : 'off'}
                      disabled={updateMutation.isPending}
                      id={id}
                      maxLength={field.maxLength}
                      name={field.name}
                      onChange={updateField}
                      required={field.required}
                      type={field.type || 'text'}
                      value={values[field.name]}
                    />
                  )}
                  {fieldError && (
                    <span className="owner-profile-field__error" id={`${id}-error`}>
                      {fieldError}
                    </span>
                  )}
                </label>
              )
            })}
          </div>

          <label className="owner-profile-toggle" htmlFor="owner-profile-available">
            <input
              checked={values.is_available_for_hire}
              disabled={updateMutation.isPending}
              id="owner-profile-available"
              name="is_available_for_hire"
              onChange={(event) => {
                setValues((current) => ({
                  ...current,
                  is_available_for_hire: event.target.checked,
                }))
                setFeedback(null)
              }}
              type="checkbox"
            />
            <span className="owner-profile-toggle__control" aria-hidden="true" />
            <span>
              <strong>Available for hire</strong>
              <small>Show your availability on the public portfolio.</small>
            </span>
          </label>

          <div className="owner-profile-resume">
            <div>
              <label htmlFor="owner-profile-resume">Resume file</label>
              <p>Upload a replacement file if needed. Leaving this empty keeps the current file.</p>
              {typeof profileQuery.data.resume === 'string' && profileQuery.data.resume && (
                <a href={profileQuery.data.resume} target="_blank" rel="noreferrer">
                  View current resume <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
            <input
              accept=".pdf,.doc,.docx"
              disabled={updateMutation.isPending}
              id="owner-profile-resume"
              name="resume"
              ref={resumeInputRef}
              onChange={(event) => {
                setResumeFile(event.target.files?.[0] || null)
                setFeedback(null)
              }}
              type="file"
            />
            {resumeFile && <span className="owner-profile-resume__selected">{resumeFile.name}</span>}
          </div>

          {feedback && (
            <p
              className={`owner-notice owner-notice--${feedback.type}`}
              role={feedback.type === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {feedback.message}
            </p>
          )}

          <div className="owner-profile-form__actions">
            <button
              className="owner-button"
              disabled={updateMutation.isPending}
              onClick={cancelChanges}
              type="button"
            >
              Cancel changes
            </button>
            <button
              className="owner-button owner-button--save"
              disabled={updateMutation.isPending}
              type="submit"
            >
              {updateMutation.isPending ? (
                <><span className="owner-spinner owner-spinner--small" /> Saving…</>
              ) : (
                'Save profile'
              )}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default OwnerProfileManagement
