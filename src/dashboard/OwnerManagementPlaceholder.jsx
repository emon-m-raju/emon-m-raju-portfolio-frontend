import { useLocation } from 'react-router-dom'

const pages = {
  '/owner/profile': ['Profile', 'Review your public profile information.'],
  '/owner/skills': ['Skills', 'Organize the technologies and skills shown on your portfolio.'],
  '/owner/projects': ['Projects', 'Manage the projects featured in your portfolio.'],
  '/owner/posts': ['Blog posts', 'Plan and manage published posts and drafts.'],
  '/owner/categories': ['Categories', 'Organize blog content into categories.'],
  '/owner/tags': ['Tags', 'Manage reusable labels for your posts.'],
  '/owner/comments': ['Comments', 'Review and moderate visitor comments.'],
  '/owner/messages': ['Messages', 'Review contact messages sent through your portfolio.'],
}

function OwnerManagementPlaceholder() {
  const { pathname } = useLocation()
  const [title, description] = pages[pathname] || ['Owner workspace', 'Select a dashboard section.']

  return (
    <section className="owner-placeholder">
      <p className="owner-eyebrow">OWNER WORKSPACE</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="owner-placeholder__notice">
        <span aria-hidden="true">⌘</span>
        <div>
          <strong>Management workspace is ready</strong>
          <p>This foundation step adds protected navigation and routing. CRUD forms are not included.</p>
        </div>
      </div>
    </section>
  )
}

export default OwnerManagementPlaceholder
