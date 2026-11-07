import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '../api/client.js'
import { loginOwner, logoutOwner } from '../api/auth.js'
import SectionHeading from '../components/SectionHeading.jsx'
import { Link } from 'react-router-dom'

/**
 * Handles owner sign-in and sign-out using API-backed mutations.
 * @param {{ auth: object|null, onLoginSuccess: (auth: object) => void, onLogout: () => void }} props
 */
function LoginSection({ auth, onLoginSuccess, onLogout }) {
  const loginMutation = useMutation({ mutationFn: loginOwner })
  const logoutMutation = useMutation({ mutationFn: logoutOwner })
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [feedback, setFeedback] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setFeedback('')
    if (!username.trim() || !password) {
      setStatus('invalid')
      setFeedback('Enter both your username and password.')
      return
    }

    setStatus('loading')
    try {
      const ownerAuth = await loginMutation.mutateAsync({
        username: username.trim(),
        password,
      })
      onLoginSuccess(ownerAuth)
      setPassword('')
      setStatus('success')
      setFeedback('Owner login verified. Your dashboard link is now available.')
    } catch (error) {
      setStatus('error')
      setFeedback(
        error instanceof ApiError && error.status === 401
          ? 'Invalid credentials. Only the portfolio owner can sign in.'
          : error instanceof ApiError && error.status === 403
            ? 'This account is not permitted to access the owner dashboard.'
              : error instanceof ApiError && error.status === 429
              ? 'Too many sign-in attempts. Please wait and try again.'
          : error.message || 'Unable to sign in. Please try again.',
      )
    } finally {
      setPassword('')
    }
  }

  async function handleLogout() {
    setStatus('loading')
    setFeedback('')
    try {
      await logoutMutation.mutateAsync(auth)
      setStatus('success')
      setFeedback('You have been signed out.')
    } catch (error) {
      setStatus('error')
      setFeedback(`Signed out locally, but the server logout request failed: ${error.message}`)
    } finally {
      onLogout()
    }
  }

  return (
    <section className="portfolio-section panel auth-section" id="login" aria-labelledby="login-title">
      <SectionHeading
        eyebrow="OWNER ACCESS"
        title={auth ? 'Owner session' : 'Owner login'}
        id="login-title"
        description="Sign-in is verified by the Django authentication API."
      />

      {auth ? (
        <div className="auth-session">
          <p>
            Signed in as <strong>{auth.user.username}</strong>.
          </p>
          <Link className="button button--secondary" to="/owner">Open owner dashboard</Link>
          <button className="button button--primary" disabled={status === 'loading'} onClick={handleLogout} type="button">
            {status === 'loading' ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      ) : (
        <form
          aria-describedby={feedback ? 'login-feedback' : undefined}
          aria-label="Owner sign in"
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <label className="form-field" htmlFor="login-username">
            <span>Username</span>
            <input
              autoComplete="username"
              disabled={loginMutation.isPending}
              id="login-username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              value={username}
              aria-invalid={status === 'invalid' && !username.trim()}
              aria-required="true"
              required
            />
          </label>
          <label className="form-field" htmlFor="login-password">
            <span>Password</span>
            <input
              autoComplete="current-password"
              disabled={loginMutation.isPending}
              id="login-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
              aria-invalid={status === 'invalid' && !password}
              aria-required="true"
              required
            />
          </label>
          <button className="button button--primary" disabled={loginMutation.isPending} type="submit">
            {loginMutation.isPending ? 'Verifying…' : 'Sign in'}
          </button>
        </form>
      )}

      {feedback && (
        <p
          className={`form-feedback form-feedback--${status}`}
          id="login-feedback"
          role={status === 'error' || status === 'invalid' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {feedback}
        </p>
      )}
      <p className="auth-section__security">
        Owner access and refresh tokens are stored in this browser to restore your session after reload.
      </p>
    </section>
  )
}

export default LoginSection
