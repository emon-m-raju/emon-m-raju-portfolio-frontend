import { useQuery } from '@tanstack/react-query'
import {
  getEducation,
  getExperiences,
  getPosts,
  getProfile,
  getProjects,
  getSkills,
} from '../api/portfolio.js'
import { queryKeys } from '../api/queryKeys.js'

function toResource(query, key) {
  if (query.isPending) {
    return { status: 'loading', data: null, error: null, retry: query.refetch }
  }
  if (query.isError) {
    return {
      status: 'error',
      data: null,
      error: query.error?.message,
      retry: query.refetch,
    }
  }
  const isEmpty = key === 'profile'
    ? !query.data || Object.keys(query.data).length === 0
    : query.data.length === 0
  return {
    status: isEmpty ? 'empty' : 'success',
    data: query.data,
    error: null,
    retry: query.refetch,
  }
}

export function usePortfolioData() {
  const profile = useQuery({
    queryKey: queryKeys.publicProfile(),
    queryFn: ({ signal }) => getProfile({ signal }),
  })
  const skills = useQuery({
    queryKey: queryKeys.publicSkills(),
    queryFn: ({ signal }) => getSkills({ signal }),
  })
  const education = useQuery({
    queryKey: queryKeys.publicEducation(),
    queryFn: ({ signal }) => getEducation({ signal }),
  })
  const experiences = useQuery({
    queryKey: queryKeys.publicExperiences(),
    queryFn: ({ signal }) => getExperiences({ signal }),
  })
  const projects = useQuery({
    queryKey: queryKeys.publicProjects(),
    queryFn: ({ signal }) => getProjects({ signal }),
  })
  const posts = useQuery({
    queryKey: queryKeys.publicPosts(),
    queryFn: ({ signal }) => getPosts({ signal }),
  })
  return {
    profile: toResource(profile, 'profile'),
    skills: toResource(skills, 'skills'),
    education: toResource(education, 'education'),
    experiences: toResource(experiences, 'experiences'),
    projects: toResource(projects, 'projects'),
    posts: toResource(posts, 'posts'),
  }
}
