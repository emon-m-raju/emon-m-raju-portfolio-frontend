import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createContactMessage } from '../api/portfolio.js'
import SectionHeading from '../components/SectionHeading.jsx'

const initialValues = { name: '', email: '', subject: '', message: '' }

function validate(values) {
  const errors = {}
  const email = values.email.trim()

  if (!values.name.trim()) {
    errors.name = 'Enter your name.'
  } else if (values.name.trim().length > 120) {
    errors.name = 'Name must be 120 characters or fewer.'
  }

  if (!email) {
    errors.email = 'Enter your email address.'
  } else if (email.length > 254) {
    errors.email = 'Email must be 254 characters or fewer.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!values.subject.trim()) {
    errors.subject = 'Enter a subject.'
  } else if (values.subject.trim().length > 180) {
    errors.subject = 'Subject must be 180 characters or fewer.'
  }

  const messageLength = values.message.trim().length
  if (messageLength < 10 || messageLength > 2000) {
    errors.message = 'Message must contain between 10 and 2000 characters.'
  }

  return errors
}

/** Validates and submits a public contact message through the API. */
function ContactSection() {
  const submitMutation = useMutation({ mutationFn: createContactMessage })
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [feedback, setFeedback] = useState('')

  function updateField(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    if (status !== 'idle') {
      setStatus('idle')
      setFeedback('')
      submitMutation.reset()
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validate(values)
    setErrors(validationErrors)
    setFeedback('')

    if (Object.keys(validationErrors).length > 0) {
      setStatus('invalid')
      setFeedback('Please correct the highlighted fields.')
      return
    }

    setStatus('loading')
    try {
      await submitMutation.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim(),
        subject: values.subject.trim(),
        message: values.message.trim(),
      })
      setValues(initialValues)
      setStatus('success')
      setFeedback('Your message was sent successfully.')
    } catch (error) {
      setStatus('error')
      setFeedback(error.message || 'Unable to send your message. Please try again.')
    }
  }

  function fieldError(name) {
    return errors[name] ? `contact-${name}-error` : undefined
  }

  return (
    <section className="portfolio-section panel contact-section" id="contact" aria-labelledby="contact-title">
      <SectionHeading
        eyebrow="CONTACT"
        title="Get in touch"
        id="contact-title"
        description="Send a message using the contact form."
      />
      <form className="contact-form" onSubmit={handleSubmit} noValidate>
        <div className="contact-form__grid">
          <label className="form-field" htmlFor="contact-name">
            <span>Name</span>
            <input
              autoComplete="name"
              id="contact-name"
              disabled={submitMutation.isPending}
              maxLength={120}
              name="name"
              onChange={updateField}
              value={values.name}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={fieldError('name')}
              required
            />
            {errors.name && <span className="form-field__error" id="contact-name-error">{errors.name}</span>}
          </label>

          <label className="form-field" htmlFor="contact-email">
            <span>Email</span>
            <input
              autoComplete="email"
              id="contact-email"
              disabled={submitMutation.isPending}
              maxLength={254}
              name="email"
              onChange={updateField}
              type="email"
              value={values.email}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={fieldError('email')}
              required
            />
            {errors.email && <span className="form-field__error" id="contact-email-error">{errors.email}</span>}
          </label>

          <label className="form-field contact-form__wide" htmlFor="contact-subject">
            <span>Subject</span>
            <input
              id="contact-subject"
              disabled={submitMutation.isPending}
              maxLength={180}
              name="subject"
              onChange={updateField}
              value={values.subject}
              aria-invalid={Boolean(errors.subject)}
              aria-describedby={fieldError('subject')}
              required
            />
            {errors.subject && <span className="form-field__error" id="contact-subject-error">{errors.subject}</span>}
          </label>

          <label className="form-field contact-form__wide" htmlFor="contact-message">
            <span>Message</span>
            <textarea
              id="contact-message"
              disabled={submitMutation.isPending}
              maxLength={2000}
              name="message"
              onChange={updateField}
              rows={6}
              value={values.message}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={fieldError('message')}
              required
            />
            {errors.message && <span className="form-field__error" id="contact-message-error">{errors.message}</span>}
          </label>
        </div>

        <div className="contact-form__actions">
          <button className="button button--primary" disabled={submitMutation.isPending} type="submit">
            {submitMutation.isPending ? 'Sending…' : 'Send message'}
          </button>
          {feedback && (
            <p
              className={`form-feedback form-feedback--${status}`}
              role={status === 'error' || status === 'invalid' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {feedback}
            </p>
          )}
        </div>
      </form>
    </section>
  )
}

export default ContactSection
