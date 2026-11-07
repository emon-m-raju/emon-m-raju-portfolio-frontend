import { Link } from 'react-router-dom'
import ThemeToggle from './ThemeToggle.jsx'

/**
 * Renders the branded fallback for URLs that do not match an application route.
 * @param {{ theme: 'light'|'dark', onToggleTheme: () => void }} props
 */
function NotFoundPage({ theme, onToggleTheme }) {
  return (
    <main className="not-found-page">
      <header className="not-found-page__header">
        <Link aria-label="Portfolio home" className="site-brand" to="/">
          <span aria-hidden="true" className="site-brand__mark">{'>_'}</span>
          <span>portfolio</span>
        </Link>
        <ThemeToggle onToggle={onToggleTheme} theme={theme} />
      </header>

      <section aria-labelledby="not-found-title" className="not-found-page__content">
        <p className="not-found-page__code">ERROR 404</p>
        <h1 id="not-found-title">This page is missing.</h1>
        <p>
          The address may be outdated, or the page may have moved. You can return to
          the portfolio or open the owner sign-in page.
        </p>
        <div className="not-found-page__actions">
          <Link className="button button--primary" to="/">Return to portfolio</Link>
          <Link className="button button--secondary" to="/login">Owner sign in</Link>
        </div>
      </section>
    </main>
  )
}

export default NotFoundPage
