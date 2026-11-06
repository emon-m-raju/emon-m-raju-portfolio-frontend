function isHttpUrl(value) {
  if (typeof value !== 'string' || !value) {
    return false
  }

  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

function formatPublicationDate(value) {
  if (typeof value !== 'string' || !value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getPreview(post) {
  if (typeof post.excerpt === 'string' && post.excerpt.trim()) {
    return post.excerpt
  }

  if (typeof post.content !== 'string' || !post.content.trim()) {
    return null
  }

  const content = post.content.trim()
  return content.length > 220 ? `${content.slice(0, 220).trimEnd()}…` : content
}

function BlogPostCard({ post }) {
  if (!post || typeof post !== 'object' || Array.isArray(post)) {
    return null
  }

  const publicationDate = formatPublicationDate(post.published_at)
  const tags = Array.isArray(post.tags)
    ? post.tags.filter((tag) => typeof tag === 'string' && tag.trim())
    : []
  const category = typeof post.category === 'string' ? post.category : null
  const preview = getPreview(post)

  return (
    <article className="blog-card">
      {isHttpUrl(post.cover_image) && (
        <img
          className="blog-card__image"
          src={post.cover_image}
          alt=""
          loading="lazy"
        />
      )}
      <div className="blog-card__body">
        <div className="blog-card__meta">
          {category && <span className="blog-card__category">{category}</span>}
          {publicationDate && (
            <time dateTime={post.published_at}>
              {publicationDate.toLocaleDateString()}
            </time>
          )}
        </div>
        {typeof post.title === 'string' && <h3>{post.title}</h3>}
        {preview && <p className="blog-card__preview">{preview}</p>}
        {tags.length > 0 && (
          <ul className="blog-card__tags" aria-label="Tags">
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
        {typeof post.content === 'string' && post.content.trim() && (
          <details className="blog-card__details">
            <summary>Read more</summary>
            <div className="blog-card__content">{post.content}</div>
          </details>
        )}
      </div>
    </article>
  )
}

export default BlogPostCard
