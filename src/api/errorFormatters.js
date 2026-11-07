import { ApiError } from './client.js'

export function formatApiErrorResponse(data, fallback) {
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

export function formatResourceError(
  error,
  resource = 'request',
  deniedMessage = `The API denied access. Only the portfolio owner can manage ${resource}.`,
) {
  if (error instanceof ApiError && error.status === 401) {
    return 'Your owner session has expired. Sign in again to continue.'
  }
  if (error instanceof ApiError && error.status === 403) {
    return deniedMessage
  }
  if (error instanceof ApiError && error.status === 429) {
    return 'The API is rate-limiting requests. Wait a moment and try again.'
  }
  return error?.message || `The ${resource} request could not be completed.`
}
