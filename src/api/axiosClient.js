import axios from 'axios'
import { ApiError } from './client.js'

function getApiBaseUrl() {
  const value = import.meta.env.VITE_API_BASE_URL
  if (!value) {
    throw new Error(
      'VITE_API_BASE_URL is not set. Copy .env.example to .env and configure the Django API URL.',
    )
  }

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('VITE_API_BASE_URL must be a valid absolute URL.')
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('VITE_API_BASE_URL must use HTTP or HTTPS and must not contain credentials.')
  }

  if (!url.pathname.endsWith('/')) {
    url.pathname += '/'
  }

  return url.href
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { Accept: 'application/json' },
  timeout: 15_000,
})

function getApiErrorMessage(data, fallback) {
  if (typeof data?.detail === 'string') {
    return data.detail
  }

  if (data && typeof data === 'object') {
    const messages = Object.entries(data).flatMap(([field, value]) => {
      const entries = Array.isArray(value) ? value : [value]
      return entries.map((entry) => `${field}: ${String(entry)}`)
    })
    if (messages.length) {
      return messages.join('; ')
    }
  }

  return fallback
}

function toApiError(error) {
  if (axios.isCancel(error)) {
    return error
  }
  if (!axios.isAxiosError(error)) {
    return error
  }

  const status = error.response?.status
  const message = getApiErrorMessage(
    error.response?.data,
    status
      ? `API request failed with status ${status}.`
      : `Could not connect to the API: ${error.message}`,
  )
  return new ApiError(message, status)
}

export async function getPublicProfile({ signal } = {}) {
  try {
    const response = await apiClient.get('profile/', { signal })
    if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      throw new Error('The Profile API returned an invalid response.')
    }
    return response.data
  } catch (error) {
    const apiError = toApiError(error)
    if (apiError === error) throw error
    throw apiError
  }
}

export async function getPublicCollection(path, label, { signal } = {}) {
  const items = []
  const visited = new Set()
  let url = new URL(path, apiClient.defaults.baseURL)

  try {
    while (url) {
      const baseUrl = new URL(apiClient.defaults.baseURL)
      if (url.origin !== baseUrl.origin) {
        throw new Error(`The API returned a ${label.toLowerCase()} pagination URL outside the configured API origin.`)
      }
      if (visited.has(url.href)) {
        throw new Error(`The API returned a repeated ${label.toLowerCase()} pagination URL.`)
      }
      visited.add(url.href)

      const response = await apiClient.get(url.href, { signal })
      const page = response.data
      if (Array.isArray(page)) {
        if (items.length) {
          throw new Error(`The ${label} API response changed shape while loading.`)
        }
        return page
      }
      if (!page || typeof page !== 'object' || !Array.isArray(page.results)) {
        throw new Error(`The ${label} API returned an unexpected collection response.`)
      }
      items.push(...page.results)

      if (page.next == null) {
        url = null
      } else {
        try {
          url = new URL(page.next, url)
        } catch {
          throw new Error(`The API returned an invalid ${label.toLowerCase()} pagination URL.`)
        }
      }
    }
    return items
  } catch (error) {
    const apiError = toApiError(error)
    if (apiError === error) throw error
    throw apiError
  }
}

export async function createContactMessage(message, { signal } = {}) {
  try {
    const response = await apiClient.post('contact/', message, {
      signal,
      headers: { 'Content-Type': 'application/json' },
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function loginOwner(credentials, { signal } = {}) {
  try {
    const response = await apiClient.post('auth/login/', credentials, {
      signal,
      headers: { 'Content-Type': 'application/json' },
    })
    const tokens = response.data
    if (!tokens || typeof tokens.access !== 'string' || typeof tokens.refresh !== 'string') {
      throw new Error('The login API returned an invalid token response.')
    }

    const userResponse = await apiClient.get('auth/me/', {
      signal,
      headers: { Authorization: `Bearer ${tokens.access}` },
    })
    const user = userResponse.data
    if (!user || typeof user.username !== 'string') {
      throw new Error('The owner verification API returned an invalid response.')
    }
    return { accessToken: tokens.access, refreshToken: tokens.refresh, user }
  } catch (error) {
    const apiError = toApiError(error)
    if (apiError === error) throw error
    throw apiError
  }
}

export async function logoutOwner(auth, { signal } = {}) {
  try {
    const response = await apiClient.post(
      'auth/logout/',
      { refresh: auth.refreshToken },
      {
        signal,
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    )
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getOwnerSession(accessToken, { signal } = {}) {
  try {
    const response = await apiClient.get('auth/me/', {
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getOwnerDashboardStats(accessToken, { signal } = {}) {
  try {
    const response = await apiClient.get('dashboard/stats/', {
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      throw new Error('The Dashboard API returned an invalid response.')
    }
    return response.data
  } catch (error) {
    const apiError = toApiError(error)
    if (apiError === error) throw error
    throw apiError
  }
}

export async function getOwnerProfile(accessToken, { signal } = {}) {
  try {
    const response = await apiClient.get('profile/', {
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      throw new Error('The Profile API returned an invalid response.')
    }
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error
    }
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const message = getApiErrorMessage(
        error.response?.data,
        status
          ? `API request failed with status ${status}.`
          : `Could not connect to the API: ${error.message}`,
      )
      throw new ApiError(message, status)
    }
    throw error
  }
}

export async function getOwnerSkills(accessToken, { signal } = {}) {
  const items = []
  const visited = new Set()
  let url = new URL('skills/', apiClient.defaults.baseURL)

  try {
    while (url) {
      if (url.origin !== new URL(apiClient.defaults.baseURL).origin) {
        throw new Error('The API returned a pagination URL outside the configured API origin.')
      }
      if (visited.has(url.href)) {
        throw new Error('The API returned a repeated pagination URL.')
      }
      visited.add(url.href)

      const response = await apiClient.get(url.href, {
        signal,
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const page = response.data
      if (Array.isArray(page)) {
        if (items.length) {
          throw new Error('The API response changed shape while loading paginated skills.')
        }
        return page
      }
      if (!page || typeof page !== 'object' || !Array.isArray(page.results)) {
        throw new Error('The Skills API returned an unexpected collection response.')
      }
      items.push(...page.results)

      if (page.next == null) {
        url = null
      } else {
        try {
          url = new URL(page.next, url)
        } catch {
          throw new Error('The API returned an invalid pagination URL.')
        }
      }
    }

    return items
  } catch (error) {
    const apiError = toApiError(error)
    if (apiError === error) {
      throw error
    }
    throw apiError
  }
}

export async function getOwnerProjects(accessToken, { signal } = {}) {
  const projects = []
  const visited = new Set()
  let url = new URL('projects/', apiClient.defaults.baseURL)

  try {
    while (url) {
      if (url.origin !== new URL(apiClient.defaults.baseURL).origin) {
        throw new Error('The API returned a pagination URL outside the configured API origin.')
      }
      if (visited.has(url.href)) {
        throw new Error('The API returned a repeated pagination URL.')
      }
      visited.add(url.href)

      const response = await apiClient.get(url.href, {
        signal,
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const page = response.data
      if (Array.isArray(page)) {
        if (projects.length) {
          throw new Error('The API response changed shape while loading paginated projects.')
        }
        return page
      }
      if (!page || typeof page !== 'object' || !Array.isArray(page.results)) {
        throw new Error('The Projects API returned an unexpected collection response.')
      }
      projects.push(...page.results)

      if (page.next == null) {
        url = null
      } else {
        try {
          url = new URL(page.next, url)
        } catch {
          throw new Error('The API returned an invalid pagination URL.')
        }
      }
    }

    return projects
  } catch (error) {
    const apiError = toApiError(error)
    if (apiError === error) {
      throw error
    }
    throw apiError
  }
}

export async function createOwnerProject(accessToken, project, { signal } = {}) {
  try {
    const response = await apiClient.post('projects/', project, {
      signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function updateOwnerProject(accessToken, slug, project, { signal } = {}) {
  try {
    const response = await apiClient.patch(`projects/${encodeURIComponent(slug)}/`, project, {
      signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function deleteOwnerProject(accessToken, slug, { signal } = {}) {
  try {
    await apiClient.delete(`projects/${encodeURIComponent(slug)}/`, {
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getOwnerPosts(accessToken, { page = 1, search = '', status = 'all', signal } = {}) {
  try {
    const response = await apiClient.get('posts/', {
      params: { page, status, ...(search ? { search } : {}) },
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = response.data
    if (Array.isArray(data)) {
      return { count: data.length, next: null, previous: null, results: data }
    }
    if (!data || typeof data !== 'object' || !Array.isArray(data.results)) {
      throw new Error('The Posts API returned an unexpected collection response.')
    }
    return data
  } catch (error) {
    const apiError = toApiError(error)
    if (apiError === error) throw error
    throw apiError
  }
}

export async function getOwnerComments(accessToken, { page = 1, status = 'all', signal } = {}) {
  try {
    const response = await apiClient.get('comments/', {
      params: {
        page,
        ...(status === 'all' ? {} : { is_approved: status === 'approved' }),
      },
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = response.data
    if (Array.isArray(data)) {
      return { count: data.length, next: null, previous: null, results: data }
    }
    if (!data || typeof data !== 'object' || !Array.isArray(data.results)) {
      throw new Error('The Comments API returned an unexpected collection response.')
    }
    return data
  } catch (error) {
    const apiError = toApiError(error)
    if (apiError === error) throw error
    throw apiError
  }
}

export async function getOwnerPostTitles(accessToken, { signal } = {}) {
  const titles = {}
  const visited = new Set()
  let url = new URL('posts/?status=all', apiClient.defaults.baseURL)

  try {
    while (url) {
      if (url.origin !== new URL(apiClient.defaults.baseURL).origin) {
        throw new Error('The API returned a post pagination URL outside the configured API origin.')
      }
      if (visited.has(url.href)) {
        throw new Error('The API returned a repeated post pagination URL.')
      }
      visited.add(url.href)

      const response = await apiClient.get(url.href, {
        signal,
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const page = response.data
      if (Array.isArray(page)) {
        if (visited.size > 1) {
          throw new Error('The Posts API response changed shape while loading post titles.')
        }
        page.forEach((post) => {
          if (post?.id != null && typeof post.title === 'string') {
            titles[String(post.id)] = post.title
          }
        })
        return titles
      }
      if (!page || typeof page !== 'object' || !Array.isArray(page.results)) {
        throw new Error('The Posts API returned an unexpected collection response.')
      }
      page.results.forEach((post) => {
        if (post?.id != null && typeof post.title === 'string') {
          titles[String(post.id)] = post.title
        }
      })

      if (page.next == null) {
        url = null
      } else {
        try {
          url = new URL(page.next, url)
        } catch {
          throw new Error('The API returned an invalid post pagination URL.')
        }
      }
    }

    return titles
  } catch (error) {
    const apiError = toApiError(error)
    if (apiError === error) throw error
    throw apiError
  }
}

export async function setOwnerCommentApproval(accessToken, commentId, isApproved, { signal } = {}) {
  try {
    const response = await apiClient.post(
      `comments/${encodeURIComponent(commentId)}/approval/`,
      { is_approved: isApproved },
      {
        signal,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    )
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function replyToOwnerComment(accessToken, reply, { signal } = {}) {
  try {
    const response = await apiClient.post('comments/replies/', reply, {
      signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getOwnerMessages(accessToken, { page = 1, status = 'all', signal } = {}) {
  try {
    const response = await apiClient.get('contact/', {
      params: {
        page,
        ...(status === 'all' ? {} : { is_read: status === 'read' }),
      },
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = response.data
    if (Array.isArray(data)) {
      return { count: data.length, next: null, previous: null, results: data }
    }
    if (!data || typeof data !== 'object' || !Array.isArray(data.results)) {
      throw new Error('The Contact Messages API returned an unexpected collection response.')
    }
    return data
  } catch (error) {
    const apiError = toApiError(error)
    if (apiError === error) throw error
    throw apiError
  }
}

export async function setOwnerMessageReadState(accessToken, messageId, isRead, { signal } = {}) {
  try {
    const response = await apiClient.patch(
      `contact/${encodeURIComponent(messageId)}/read-state/`,
      { is_read: isRead },
      {
        signal,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    )
    if (!response.data || typeof response.data.is_read !== 'boolean') {
      throw new Error('The Contact Messages API returned an invalid read-state response.')
    }
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function getOwnerCategories(accessToken, { signal } = {}) {
  return getOwnerCollection('categories/', 'Categories', accessToken, signal)
}

export async function getOwnerTags(accessToken, { signal } = {}) {
  return getOwnerCollection('tags/', 'Tags', accessToken, signal)
}

async function getOwnerCollection(path, label, accessToken, signal) {
  const items = []
  const visited = new Set()
  let url = new URL(path, apiClient.defaults.baseURL)

  try {
    while (url) {
      if (url.origin !== new URL(apiClient.defaults.baseURL).origin) {
        throw new Error(`The API returned a ${label.toLowerCase()} pagination URL outside the configured API origin.`)
      }
      if (visited.has(url.href)) {
        throw new Error(`The API returned a repeated ${label.toLowerCase()} pagination URL.`)
      }
      visited.add(url.href)
      const response = await apiClient.get(url.href, {
        signal,
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (Array.isArray(response.data)) {
        if (items.length) throw new Error(`The ${label} API response changed shape while loading.`)
        return response.data
      }
      if (!response.data || typeof response.data !== 'object' || !Array.isArray(response.data.results)) {
        throw new Error(`The ${label} API returned an unexpected collection response.`)
      }
      items.push(...response.data.results)
      if (response.data.next == null) {
        url = null
      } else {
        try {
          url = new URL(response.data.next, url)
        } catch {
          throw new Error(`The API returned an invalid ${label.toLowerCase()} pagination URL.`)
        }
      }
    }
    return items
  } catch (error) {
    const apiError = toApiError(error)
    if (apiError === error) throw error
    throw apiError
  }
}

export async function createOwnerPost(accessToken, post, { signal } = {}) {
  return mutateOwnerResource('post', 'posts/', accessToken, post, signal)
}

export async function updateOwnerPost(accessToken, slug, post, { signal } = {}) {
  return mutateOwnerResource('patch', `posts/${encodeURIComponent(slug)}/`, accessToken, post, signal)
}

export async function deleteOwnerPost(accessToken, slug, { signal } = {}) {
  try {
    await apiClient.delete(`posts/${encodeURIComponent(slug)}/`, {
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (error) {
    throw toApiError(error)
  }
}

export async function createOwnerCategory(accessToken, category, { signal } = {}) {
  return mutateOwnerResource('post', 'categories/', accessToken, category, signal)
}

export async function updateOwnerCategory(accessToken, id, category, { signal } = {}) {
  return mutateOwnerResource('patch', `categories/${id}/`, accessToken, category, signal)
}

export async function deleteOwnerCategory(accessToken, id, { signal } = {}) {
  return deleteOwnerResource(`categories/${id}/`, accessToken, signal)
}

export async function createOwnerTag(accessToken, tag, { signal } = {}) {
  return mutateOwnerResource('post', 'tags/', accessToken, tag, signal)
}

export async function updateOwnerTag(accessToken, id, tag, { signal } = {}) {
  return mutateOwnerResource('patch', `tags/${id}/`, accessToken, tag, signal)
}

export async function deleteOwnerTag(accessToken, id, { signal } = {}) {
  return deleteOwnerResource(`tags/${id}/`, accessToken, signal)
}

async function mutateOwnerResource(method, path, accessToken, payload, signal) {
  try {
    const response = await apiClient[method](path, payload, {
      signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

async function deleteOwnerResource(path, accessToken, signal) {
  try {
    await apiClient.delete(path, {
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (error) {
    throw toApiError(error)
  }
}

export async function createOwnerSkill(accessToken, skill, { signal } = {}) {
  try {
    const response = await apiClient.post('skills/', skill, {
      signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function updateOwnerSkill(accessToken, id, skill, { signal } = {}) {
  try {
    const response = await apiClient.patch(`skills/${id}/`, skill, {
      signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export async function deleteOwnerSkill(accessToken, id, { signal } = {}) {
  try {
    await apiClient.delete(`skills/${id}/`, {
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (error) {
    throw toApiError(error)
  }
}

export async function patchOwnerProfile(accessToken, values, resumeFile, { signal } = {}) {
  const hasResumeFile = resumeFile instanceof File
  const body = hasResumeFile ? new FormData() : { ...values }

  if (hasResumeFile) {
    Object.entries(values).forEach(([key, value]) => body.append(key, value))
    body.append('resume', resumeFile)
  }

  try {
    const response = await apiClient.patch('profile/', body, {
      signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(hasResumeFile ? {} : { 'Content-Type': 'application/json' }),
      },
    })
    if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      throw new Error('The Profile API returned an invalid response.')
    }
    return response.data
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error
    }
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const message = getApiErrorMessage(
        error.response?.data,
        status
          ? `API request failed with status ${status}.`
          : `Could not connect to the API: ${error.message}`,
      )
      throw new ApiError(message, status)
    }
    throw error
  }
}
