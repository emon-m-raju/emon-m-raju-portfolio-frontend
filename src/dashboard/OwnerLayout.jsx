import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logoutOwner } from '../api/auth.js'
import { useOwnerAuth } from '../auth/OwnerAuthContext.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import './owner-dashboard.css'

const navigation = [
  { label: 'Overview', path: '/owner', icon: '⌂', end: true },
  { label: 'Profile', path: '/owner/profile', icon: '◉' },
  { label: 'Skills', path: '/owner/skills', icon: '⌘' },
  { label: 'Projects', path: '/owner/projects', icon: '▣' },
  { label: 'Blog posts', path: '/owner/blog', icon: '▤' },
  { label: 'Categories', path: '/owner/categories', icon: '◫' },
  { label: 'Tags', path: '/owner/tags', icon: '#' },
  { label: 'Comments', path: '/owner/comments', icon: '☷' },
  { label: 'Messages', path: '/owner/messages', icon: '✉' },
]

function OwnerLayout({ theme, onToggleTheme }) {
  const { auth, clearAuth } = useOwnerAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const logoutMutation = useMutation({ mutationFn: () => logoutOwner(auth) })
  const loggingOut = logoutMutation.isPending
  const currentPage = navigation.find((item) =>
    item.end ? location.pathname === item.path : location.pathname.startsWith(item.path),
  )

  async function handleLogout() {
    let logoutWarning = ''
    try {
      await logoutMutation.mutateAsync()
    } catch (error) {
      logoutWarning = error.message || 'The server could not invalidate this session.'
    } finally {
      clearAuth()
      navigate('/login', {
        replace: true,
        state: logoutWarning ? { logoutWarning } : undefined,
      })
    }
  }

  function closeSidebar() {
    setSidebarOpen(false)
  }

  return (
    <div className="owner-app">
      {sidebarOpen && (
        <button
          aria-label="Close dashboard navigation"
          className="owner-sidebar-backdrop"
          onClick={closeSidebar}
          type="button"
        />
      )}
      <aside className={`owner-sidebar${sidebarOpen ? ' owner-sidebar--open' : ''}`}>
        <Link className="owner-brand" onClick={closeSidebar} to="/owner">
          <span className="owner-brand__mark">&gt;_</span>
          <span>devfolio<span className="owner-brand__sub"> / owner</span></span>
        </Link>
        <p className="owner-sidebar__label">WORKSPACE</p>
        <nav aria-label="Owner dashboard" className="owner-nav">
          {navigation.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `owner-nav__link${isActive ? ' owner-nav__link--active' : ''}`
              }
              end={item.end}
              key={item.path}
              onClick={closeSidebar}
              to={item.path}
            >
              <span aria-hidden="true" className="owner-nav__icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="owner-sidebar__bottom">
          <Link className="owner-back-link" onClick={closeSidebar} to="/">← View portfolio</Link>
          <p className="owner-sidebar__secure"><span /> Owner protected</p>
        </div>
      </aside>

      <div className="owner-main">
        <header className="owner-topbar">
          <button
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? 'Close dashboard navigation' : 'Open dashboard navigation'}
            className="owner-menu-toggle"
            onClick={() => setSidebarOpen((open) => !open)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
          <div className="owner-topbar__crumb">
            <span>Workspace</span><span aria-hidden="true">/</span>
            <strong>{currentPage?.label || 'Owner dashboard'}</strong>
          </div>
          <div className="owner-topbar__actions">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <div className="owner-identity">
              <span aria-hidden="true" className="owner-identity__avatar">
                {(auth?.user?.username || 'O').slice(0, 1).toUpperCase()}
              </span>
              <span className="owner-identity__name">{auth?.user?.username || 'Owner'}</span>
            </div>
            <button
              className="owner-logout"
              disabled={loggingOut}
              onClick={handleLogout}
              type="button"
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </header>
        <main className="owner-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default OwnerLayout
