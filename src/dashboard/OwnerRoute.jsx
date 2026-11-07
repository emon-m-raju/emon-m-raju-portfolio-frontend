import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getOwnerSession } from '../api/axiosClient.js'
import { ApiError } from '../api/client.js'
import { useOwnerAuth } from '../auth/OwnerAuthContext.jsx'

function OwnerRoute() {
  const { auth, clearAuth, isRestoring, restoreError, retryRestore } = useOwnerAuth()
  const location = useLocation()
  const verification = useQuery({
    queryKey: ['owner-verification', auth?.accessToken],
    queryFn: ({ signal }) => getOwnerSession(auth.accessToken, { signal }),
    enabled: Boolean(auth?.accessToken),
    retry: false,
    staleTime: 60_000,
  })
  const invalidSession =
    (verification.error instanceof ApiError && [401, 403].includes(verification.error.status)) ||
    (verification.isSuccess &&
      (!verification.data || typeof verification.data.username !== 'string'))

  useEffect(() => {
    if (invalidSession) {
      clearAuth()
    }
  }, [clearAuth, invalidSession])

  if (isRestoring) {
    return (
      <main className="owner-gate">
        <p role="status">Restoring owner session…</p>
      </main>
    )
  }

  if (restoreError) {
    return (
      <main className="owner-gate">
        <div className="owner-notice owner-notice--error" role="alert">
          <strong>Could not restore owner access.</strong>
          <p>{restoreError}</p>
          <button className="owner-button" onClick={retryRestore} type="button">
            Retry session restoration
          </button>
        </div>
      </main>
    )
  }

  if (!auth?.accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (verification.isPending) {
    return (
      <main className="owner-gate">
        <p role="status">Verifying owner access…</p>
      </main>
    )
  }

  if (invalidSession) {
    return (
      <main className="owner-gate">
        <p role="status">Owner session is no longer valid. Returning to login…</p>
      </main>
    )
  }

  if (verification.isError) {
    return (
      <main className="owner-gate">
        <div className="owner-notice owner-notice--error" role="alert">
          <strong>Could not verify owner access.</strong>
          <p>{verification.error.message}</p>
          {verification.error instanceof ApiError && verification.error.status === 429 && (
            <p>Please wait before trying again.</p>
          )}
          <button className="owner-button" onClick={() => verification.refetch()} type="button">
            Retry verification
          </button>
        </div>
      </main>
    )
  }

  return <Outlet />
}

export default OwnerRoute
