export const queryKeys = {
  publicProfile: () => ['public-profile'],
  publicSkills: () => ['public-skills'],
  publicEducation: () => ['public-education'],
  publicExperiences: () => ['public-experiences'],
  publicProjects: () => ['public-projects'],
  publicPosts: () => ['public-posts'],
  ownerVerification: (accessToken) => ['owner-verification', accessToken],
  ownerDashboardStats: () => ['owner-dashboard-stats'],
  ownerProfile: () => ['owner-profile'],
  ownerSkills: (ownerId) => ['owner-skills', ownerId],
  ownerProjects: (ownerId) => ['owner-projects', ownerId],
  ownerPosts: (ownerId, page, search, status) =>
    page === undefined
      ? ['owner-posts', ownerId]
      : ['owner-posts', ownerId, page, search, status],
  ownerCategories: (ownerId) => ['owner-categories', ownerId],
  ownerTags: (ownerId) => ['owner-tags', ownerId],
  ownerComments: (ownerId, page, status) =>
    page === undefined
      ? ['owner-comments', ownerId]
      : ['owner-comments', ownerId, page, status],
  ownerCommentPostTitles: (ownerId) => ['owner-comment-post-titles', ownerId],
  ownerMessages: (ownerId, page, status) =>
    page === undefined
      ? ['owner-messages', ownerId]
      : ['owner-messages', ownerId, page, status],
}
