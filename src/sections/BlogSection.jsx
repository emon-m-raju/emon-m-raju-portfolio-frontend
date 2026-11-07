import { useMutation, useQueryClient } from '@tanstack/react-query'
import { likePost, getStoredPostLike, setStoredPostLike } from '../api/axiosClient.js'
import { queryKeys } from '../api/queryKeys.js'
import BlogPostCard from '../components/BlogPostCard.jsx'
import ResourceState from '../components/ResourceState.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

/**
 * Displays published posts and applies optimistic updates to their like state.
 * @param {{ postsResource: { status: string, data?: object[], error?: string, retry?: () => void } }} props
 */
function BlogSection({ postsResource }) {
  const queryClient = useQueryClient()
  const likeMutation = useMutation({
    mutationFn: ({ slug }) => likePost(slug),
    onMutate: async ({ slug }) => {
      const postsQueryKey = queryKeys.publicPosts()
      await queryClient.cancelQueries({ queryKey: postsQueryKey })
      const previousPosts = queryClient.getQueryData(postsQueryKey)
      const currentPost = previousPosts?.find((post) => post.slug === slug)
      const wasLiked = currentPost?.liked ?? getStoredPostLike(slug)
      const liked = !wasLiked

      setStoredPostLike(slug, liked)
      queryClient.setQueryData(postsQueryKey, (posts) =>
        Array.isArray(posts)
          ? posts.map((post) =>
              post.slug === slug
                ? {
                    ...post,
                    liked,
                    likes_count: Math.max(
                      0,
                      (Number(post.likes_count) || 0) + (liked ? 1 : -1),
                    ),
                  }
                : post,
            )
          : posts,
      )
      return { previousPosts, slug, wasLiked }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(queryKeys.publicPosts(), context.previousPosts)
      }
      if (context) {
        setStoredPostLike(context.slug, context.wasLiked)
      }
    },
    onSuccess: (result, { slug }) => {
      setStoredPostLike(slug, result.liked)
      queryClient.setQueryData(queryKeys.publicPosts(), (posts) =>
        Array.isArray(posts)
          ? posts.map((post) =>
              post.slug === slug
                ? { ...post, liked: result.liked, likes_count: result.likes_count }
                : post,
            )
          : posts,
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.publicPosts() }),
  })

  const posts =
    postsResource?.status === 'success' && Array.isArray(postsResource.data)
      ? postsResource.data.filter(
          (post) => post && typeof post === 'object' && !Array.isArray(post),
        ).map((post) => ({
          ...post,
          liked: post.liked ?? getStoredPostLike(post.slug),
        }))
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
              <BlogPostCard
                key={post.id ?? `post-${post.slug ?? index}`}
                post={post}
                onLike={() => likeMutation.mutate({ slug: post.slug })}
                likePending={likeMutation.isPending}
              />
            ))}
          </div>
        ) : postsResource?.status === 'success' ? (
          <p className="resource-state resource-state--empty">
            No published posts are available yet.
          </p>
        ) : null}
        {likeMutation.isError && (
          <p className="resource-state resource-state--error" role="alert">
            Could not update the like: {likeMutation.error.message}
          </p>
        )}
      </ResourceState>
    </section>
  )
}

export default BlogSection
