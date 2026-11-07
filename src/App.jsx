import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { OwnerAuthContext } from './auth/OwnerAuthContext.jsx'
import { clearStoredOwnerTokens, restoreOwnerSession } from './api/axiosClient.js'
const OwnerLayout = lazy(() => import('./dashboard/OwnerLayout.jsx'))
const OwnerOverview = lazy(() => import('./dashboard/OwnerOverview.jsx'))
const OwnerBlogManagement = lazy(() => import('./dashboard/OwnerBlogManagement.jsx'))
const OwnerProfileManagement = lazy(() => import('./dashboard/OwnerProfileManagement.jsx'))
const OwnerProjectsManagement = lazy(() => import('./dashboard/OwnerProjectsManagement.jsx'))
const OwnerCommentsManagement = lazy(() => import('./dashboard/OwnerCommentsManagement.jsx'))
const OwnerMessagesManagement = lazy(() => import('./dashboard/OwnerMessagesManagement.jsx'))
const OwnerSkillsManagement = lazy(() => import('./dashboard/OwnerSkillsManagement.jsx'))
const OwnerTaxonomyManagement = lazy(() => import('./dashboard/OwnerTaxonomyManagement.jsx'))
import OwnerRoute from './dashboard/OwnerRoute.jsx'
import { usePortfolioData } from './hooks/usePortfolioData.js'
import { useTheme } from './hooks/useTheme.js'
import SiteFooter from './components/SiteFooter.jsx'
import SiteHeader from './components/SiteHeader.jsx'
import NotFoundPage from './components/NotFoundPage.jsx'
import AboutSection from './sections/AboutSection.jsx'
import BlogSection from './sections/BlogSection.jsx'
import ContactSection from './sections/ContactSection.jsx'
import EducationSection from './sections/EducationSection.jsx'
import ExperienceSection from './sections/ExperienceSection.jsx'
import HomeSection from './sections/HomeSection.jsx'
import ProjectsSection from './sections/ProjectsSection.jsx'
import SkillsSection from './sections/SkillsSection.jsx'
import LoginSection from './sections/LoginSection.jsx'
import OwnerDashboardSection from './sections/OwnerDashboardSection.jsx'
import './App.css'

function PortfolioHome({ auth, onLoginSuccess, onLogout, theme, onToggleTheme }) {
  const resources = usePortfolioData()

  return (
    <div className="app-shell">
      <SiteHeader
        authenticatedUser={auth?.user}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
      <main className="page-content">
        <HomeSection profileResource={resources.profile} />
        <AboutSection
          profileResource={resources.profile}
          educationResource={resources.education}
        />
        <SkillsSection skillsResource={resources.skills} />
        <EducationSection educationResource={resources.education} />
        <ExperienceSection experiencesResource={resources.experiences} />
        <ProjectsSection
          projectsResource={resources.projects}
          skillsResource={resources.skills}
        />
        <BlogSection postsResource={resources.posts} />
        <ContactSection />
        <LoginSection
          auth={auth}
          onLoginSuccess={onLoginSuccess}
          onLogout={onLogout}
        />
        <OwnerDashboardSection auth={auth} />
      </main>
      <SiteFooter />
    </div>
  )
}

function LoginPage({ auth, onLoginSuccess, onLogout }) {
  const location = useLocation()
  const from = location.state?.from?.pathname

  if (auth?.accessToken) {
    return <Navigate to={from?.startsWith('/owner') ? from : '/owner'} replace />
  }

  return (
    <main className="login-page">
      <a className="login-page__back" href="/">← Back to portfolio</a>
      {location.state?.logoutWarning && (
        <p className="owner-notice owner-notice--warning" role="status">
          You were signed out on this device, but the server logout request could not be completed:
          {' '}{location.state.logoutWarning}
        </p>
      )}
      {location.state?.reason === 401 && (
        <p className="owner-notice owner-notice--warning" role="status">
          Your owner session expired. Sign in again to continue.
        </p>
      )}
      {location.state?.reason === 403 && (
        <p className="owner-notice owner-notice--warning" role="status">
          The API denied owner access. Verify that this account has owner permissions.
        </p>
      )}
      <LoginSection
        auth={auth}
        onLoginSuccess={(ownerAuth) =>
          onLoginSuccess(ownerAuth, from?.startsWith('/owner') ? from : '/owner')
        }
        onLogout={onLogout}
      />
    </main>
  )
}

function App() {
  const [auth, setAuth] = useState(undefined)
  const [restoreError, setRestoreError] = useState('')
  const { theme, toggleTheme } = useTheme()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const restoreSession = useCallback(async () => {
    setAuth(undefined)
    setRestoreError('')
    try {
      const restoredAuth = await restoreOwnerSession()
      setAuth(restoredAuth)
    } catch (error) {
      setAuth(null)
      setRestoreError(error.message || 'Could not restore the owner session.')
    }
  }, [])

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  const clearAuth = useCallback(() => {
    clearStoredOwnerTokens()
    queryClient.clear()
    setAuth(null)
    setRestoreError('')
  }, [queryClient])

  const handleLoginSuccess = useCallback((ownerAuth, destination = '/owner') => {
    queryClient.clear()
    setAuth(ownerAuth)
    setRestoreError('')
    navigate(destination, { replace: true })
  }, [navigate, queryClient])

  const ownerAuth = {
    auth,
    clearAuth,
    isRestoring: auth === undefined,
    restoreError,
    retryRestore: () => restoreSession(),
  }

  return (
    <OwnerAuthContext.Provider value={ownerAuth}>
      <Routes>
        <Route
          path="/"
          element={
            <PortfolioHome
              auth={auth}
              onLoginSuccess={handleLoginSuccess}
              onLogout={clearAuth}
              onToggleTheme={toggleTheme}
              theme={theme}
            />
          }
        />
        <Route
          path="/login"
          element={
            <LoginPage
              auth={auth}
              onLoginSuccess={handleLoginSuccess}
              onLogout={clearAuth}
            />
          }
        />
        <Route element={<OwnerRoute />}>
          <Route
            path="/owner"
            element={
              <Suspense fallback={<div className="route-loading" role="status">Loading dashboard…</div>}>
                <OwnerLayout onToggleTheme={toggleTheme} theme={theme} />
              </Suspense>
            }
          >
            <Route index element={<OwnerOverview />} />
            <Route path="profile" element={<OwnerProfileManagement />} />
            <Route path="skills" element={<OwnerSkillsManagement />} />
            <Route path="projects" element={<OwnerProjectsManagement />} />
            <Route path="blog" element={<OwnerBlogManagement />} />
            <Route path="posts" element={<Navigate to="/owner/blog" replace />} />
            <Route path="categories" element={<OwnerTaxonomyManagement resource="categories" />} />
            <Route path="tags" element={<OwnerTaxonomyManagement resource="tags" />} />
            <Route path="comments" element={<OwnerCommentsManagement />} />
            <Route path="messages" element={<OwnerMessagesManagement />} />
          </Route>
        </Route>
        <Route
          path="*"
          element={<NotFoundPage onToggleTheme={toggleTheme} theme={theme} />}
        />
      </Routes>
    </OwnerAuthContext.Provider>
  )
}

export default App
