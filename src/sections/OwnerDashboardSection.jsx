import SectionHeading from '../components/SectionHeading.jsx'
import { Link } from 'react-router-dom'

function OwnerDashboardSection({ auth }) {
  return (
    <section className="portfolio-section panel auth-section" id="dashboard" aria-labelledby="dashboard-title">
      <SectionHeading
        eyebrow="PRIVATE AREA"
        title="Owner dashboard"
        id="dashboard-title"
        description="Owner-only tools are protected by both the frontend and Django API permissions."
      />
      {auth ? (
        <div className="auth-session__message">
          <p>Owner access verified for <strong>{auth.user.username}</strong>.</p>
          <Link className="button button--primary" to="/owner">Open owner dashboard</Link>
        </div>
      ) : (
        <div className="auth-gate" role="status">
          <p>You must sign in as the portfolio owner to access this area.</p>
          <Link className="button button--primary" to="/login">Go to owner login</Link>
        </div>
      )}
    </section>
  )
}

export default OwnerDashboardSection
