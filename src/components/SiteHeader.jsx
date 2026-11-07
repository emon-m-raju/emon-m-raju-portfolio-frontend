import { useState } from 'react'
import { Link } from 'react-router-dom'
import ThemeToggle from './ThemeToggle.jsx'

const navigationItems = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Education', href: '#education' },
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'Blog', href: '#blog' },
  { label: 'Contact', href: '#contact' },
  { label: 'Login', href: '#login' },
]

/**
 * Renders public section navigation and owner-aware links.
 * @param {{ theme: 'light'|'dark', onToggleTheme: () => void, authenticatedUser?: { username: string }|null }} props
 */
function SiteHeader({ theme, onToggleTheme, authenticatedUser }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const links = authenticatedUser
    ? [
        ...navigationItems.slice(0, 7),
      { label: 'Dashboard', href: '/owner' },
        ...navigationItems.slice(7),
      ]
    : navigationItems

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="site-brand" href="#home" onClick={closeMenu} aria-label="Portfolio home">
          <span className="site-brand__mark" aria-hidden="true">
            {'>_'}
          </span>
          <span>portfolio</span>
        </a>

        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          className={`site-navigation${menuOpen ? ' site-navigation--open' : ''}`}
          id="primary-navigation"
          aria-label="Main navigation"
        >
          {links.map(({ label, href }) => (
            href.startsWith('#') ? (
              <a
                className={`site-navigation__link${label === 'Login' || label === 'Dashboard' ? ' site-navigation__login' : ''}`}
                href={href}
                key={label}
                onClick={closeMenu}
              >
                {label}
              </a>
            ) : (
              <Link
                className={`site-navigation__link${label === 'Login' || label === 'Dashboard' ? ' site-navigation__login' : ''}`}
                key={label}
                onClick={closeMenu}
                to={href}
              >
                {label}
              </Link>
            )
          ))}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </nav>
      </div>
    </header>
  )
}

export default SiteHeader
