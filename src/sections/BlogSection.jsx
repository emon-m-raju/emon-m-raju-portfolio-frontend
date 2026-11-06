import BlogPostCard from '../components/BlogPostCard.jsx'
import ResourceState from '../components/ResourceState.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

function BlogSection({ postsResource }) {
  const posts =
    postsResource?.status === 'success' && Array.isArray(postsResource.data)
      ? postsResource.data.filter(
          (post) => post && typeof post === 'object' && !Array.isArray(post),
        )
      : []

  return (
    <section className="portfolio-section panel" id="blog" aria-label="Blog">
      <SectionHeading
        eyebrow="WRITING"
        title="Blog"
        description="Published posts returned by the portfolio API."
      />
      <ResourceState
        status={postsResource?.status ?? 'error'}
        error={postsResource?.error ?? 'Blog data is unavailable.'}
        onRetry={postsResource?.retry}
        emptyMessage="No published posts are available yet."
      >
        {posts.length > 0 ? (
          <div className="blog-grid">
            {posts.map((post, index) => (
              <BlogPostCard key={post.id ?? `post-${post.slug ?? index}`} post={post} />
            ))}
          </div>
        ) : postsResource?.status === 'success' ? (
          <p className="resource-state resource-state--empty">
            No published posts are available yet.
          </p>
        ) : null}
      </ResourceState>
    </section>
  )
}

export default BlogSection
