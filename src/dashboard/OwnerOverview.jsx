import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getOwnerDashboardStats } from '../api/axiosClient.js'
import { ApiError } from '../api/client.js'
import { useOwnerAuth } from '../auth/OwnerAuthContext.jsx'

const statistics = [
  { key: 'total_projects', label: 'Total projects', icon: '▣', tone: 'violet' },
  { key: 'total_skills', label: 'Total skills', icon: '⌘', tone: 'blue' },
  { key: 'total_posts', label: 'Total blog posts', icon: '▤', tone: 'amber' },
  { key: 'published_posts', label: 'Published posts', icon: '↗', tone: 'green' },
  { key: 'draft_posts', label: 'Draft posts', icon: '◷', tone: 'slate' },
  { key: 'total_comments', label: 'Total comments', icon: '☷', tone: 'cyan' },
  { key: 'pending_comments', label: 'Pending comments', icon: '◌', tone: 'orange' },
  { key: 'unread_messages', label: 'Unread messages', icon: '✉', tone: 'pink' },
]

function formatMonth(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit' }).format(date)
}

function OwnerOverview() {
  const { auth, clearAuth } = useOwnerAuth()
  const navigate = useNavigate()
  const statsQuery = useQuery({
    queryKey: ['owner-dashboard-stats'],
    queryFn: ({ signal }) => getOwnerDashboardStats(auth.accessToken, { signal }),
    staleTime: 30_000,
  })
  const authErrorStatus =
    statsQuery.error instanceof ApiError && [401, 403].includes(statsQuery.error.status)

  useEffect(() => {
    if (authErrorStatus) {
      const status = statsQuery.error.status
      clearAuth()
      navigate('/login', {
        replace: true,
        state: { reason: status, from: { pathname: '/owner' } },
      })
    }
  }, [authErrorStatus, clearAuth, navigate, statsQuery.error])
  const data = statsQuery.data
  const monthlyPosts = Array.isArray(data?.posts_per_month) ? data.posts_per_month : []
  const maxMonthlyPosts = Math.max(1, ...monthlyPosts.map((item) => Number(item.total) || 0))

  return (
    <section className="owner-overview" aria-labelledby="owner-overview-title">
      <div className="owner-page-heading">
        <div>
          <p className="owner-eyebrow">OVERVIEW / ANALYTICS</p>
          <h1 id="owner-overview-title">Good to see you, {auth?.user?.username || 'Owner'}.</h1>
          <p className="owner-page-heading__description">
            A live snapshot of your portfolio, published content, and community activity.
          </p>
        </div>
        <button
          className="owner-button owner-button--refresh"
          disabled={statsQuery.isFetching}
          onClick={() => statsQuery.refetch()}
          type="button"
        >
          <span aria-hidden="true">↻</span>
          {statsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {statsQuery.isPending && (
        <div className="owner-state" role="status">
          <span className="owner-spinner" /> Loading dashboard statistics…
        </div>
      )}
      {statsQuery.isError && (
        <div className="owner-notice owner-notice--error" role="alert">
          <strong>
            {statsQuery.error instanceof ApiError && statsQuery.error.status === 401
              ? 'Your session has expired.'
              : statsQuery.error instanceof ApiError && statsQuery.error.status === 403
                ? 'Owner access is required.'
                : statsQuery.error instanceof ApiError && statsQuery.error.status === 429
                  ? 'The API is rate-limiting requests.'
                  : 'Dashboard data could not be loaded.'}
          </strong>
          <p>{statsQuery.error.message}</p>
          <button className="owner-button" onClick={() => statsQuery.refetch()} type="button">
            Try again
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="owner-stat-grid">
            {statistics.map((stat) => (
              <article className="owner-stat-card" key={stat.key}>
                <span className={`owner-stat-card__icon owner-stat-card__icon--${stat.tone}`} aria-hidden="true">
                  {stat.icon}
                </span>
                <div>
                  <p>{stat.label}</p>
                  <strong>{Number.isFinite(Number(data[stat.key])) ? data[stat.key] : '—'}</strong>
                </div>
                <span className="owner-stat-card__signal" aria-hidden="true">↗</span>
              </article>
            ))}
          </div>

          <div className="owner-panel-grid">
            <article className="owner-panel owner-chart-panel">
              <div className="owner-panel__heading">
                <div>
                  <p className="owner-eyebrow">CONTENT ACTIVITY</p>
                  <h2>Posts per month</h2>
                </div>
                <span className="owner-panel__period">Last 6 months</span>
              </div>
              {monthlyPosts.length === 0 ? (
                <p className="owner-empty">No monthly post activity is available yet.</p>
              ) : (
                <div className="owner-chart" role="img" aria-label="Posts per month bar chart">
                  {monthlyPosts.map((item, index) => {
                    const count = Number(item.total) || 0
                    const height = count === 0 ? 4 : Math.max(12, (count / maxMonthlyPosts) * 100)
                    return (
                      <div className="owner-chart__column" key={`${item.month}-${index}`}>
                        <span className="owner-chart__count">{count}</span>
                        <div className="owner-chart__track">
                          <span className="owner-chart__bar" style={{ height: `${height}%` }} />
                        </div>
                        <span className="owner-chart__label">{formatMonth(item.month)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </article>

            <article className="owner-panel">
              <div className="owner-panel__heading">
                <div>
                  <p className="owner-eyebrow">COMMUNITY</p>
                  <h2>Recent comments</h2>
                </div>
                <span className="owner-panel__count">{Array.isArray(data.recent_comments) ? data.recent_comments.length : 0}</span>
              </div>
              {!Array.isArray(data.recent_comments) || data.recent_comments.length === 0 ? (
                <p className="owner-empty">No comments to show.</p>
              ) : (
                <ul className="owner-activity-list">
                  {data.recent_comments.map((comment, index) => (
                    <li className="owner-activity" key={comment.id ?? `${comment.created_at}-${index}`}>
                      <span className="owner-activity__avatar" aria-hidden="true">
                        {(comment.name || '?').slice(0, 1).toUpperCase()}
                      </span>
                      <div className="owner-activity__body">
                        <strong>{comment.name || 'Visitor'}</strong>
                        <p>{comment.content || 'No comment text.'}</p>
                        <time>{comment.created_at ? new Date(comment.created_at).toLocaleDateString() : 'Date unavailable'}</time>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="owner-panel owner-messages-panel">
              <div className="owner-panel__heading">
                <div>
                  <p className="owner-eyebrow">INBOX</p>
                  <h2>Recent contact messages</h2>
                </div>
                <span className="owner-panel__count">{Array.isArray(data.recent_contact_messages) ? data.recent_contact_messages.length : 0}</span>
              </div>
              {!Array.isArray(data.recent_contact_messages) || data.recent_contact_messages.length === 0 ? (
                <p className="owner-empty">No recent messages.</p>
              ) : (
                <ul className="owner-message-list">
                  {data.recent_contact_messages.map((message, index) => (
                    <li className="owner-message" key={message.id ?? index}>
                      <span className={`owner-message__dot${message.is_read ? '' : ' owner-message__dot--unread'}`} />
                      <strong>{message.subject || 'No subject'}</strong>
                      <time>{message.created_at ? new Date(message.created_at).toLocaleDateString() : 'Date unavailable'}</time>
                      <span className="owner-message__status">{message.is_read ? 'Read' : 'Unread'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </>
      )}
    </section>
  )
}

export default OwnerOverview
