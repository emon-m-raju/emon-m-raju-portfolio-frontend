import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getOwnerMessages, setOwnerMessageReadState } from '../api/axiosClient.js'
import { ApiError } from '../api/client.js'
import { useOwnerAuth } from '../auth/OwnerAuthContext.jsx'
import './owner-messages.css'

const filters = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
]

function getErrorMessage(error, resource = 'messages') {
  if (error instanceof ApiError && error.status === 401) {
    return 'Your owner session has expired. Sign in again to continue.'
  }
  if (error instanceof ApiError && error.status === 403) {
    return `The API denied access. Only the portfolio owner can manage ${resource}.`
  }
  if (error instanceof ApiError && error.status === 429) {
    return 'The API is rate-limiting requests. Wait a moment and try again.'
  }
  return error?.message || `The ${resource} request could not be completed.`
}

function formatDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function messagePreview(message) {
  const content = typeof message === 'string' ? message : ''
  return content.replace(/\s+/g, ' ').trim() || 'No message content.'
}

function OwnerMessagesManagement() {
  const { auth } = useOwnerAuth()
  const queryClient = useQueryClient()
  const ownerId = auth?.user?.id
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const messagesQueryKey = ['owner-messages', ownerId, page, status]

  const messagesQuery = useQuery({
    queryKey: messagesQueryKey,
    queryFn: ({ signal }) => getOwnerMessages(auth.accessToken, { page, status, signal }),
    enabled: Boolean(auth?.accessToken),
  })

  const readStateMutation = useMutation({
    mutationFn: ({ message, isRead }) =>
      setOwnerMessageReadState(auth.accessToken, message.id, isRead),
    onSuccess: async (result, { message, isRead }) => {
      setSelectedMessage((current) =>
        current?.id === message.id ? { ...current, is_read: result.is_read } : current,
      )
      queryClient.setQueryData(messagesQueryKey, (data) => {
        if (!data || !Array.isArray(data.results)) return data
        return {
          ...data,
          results: data.results.map((item) =>
            item.id === message.id ? { ...item, is_read: result.is_read } : item,
          ),
        }
      })
      setFeedback({
        type: 'success',
        message: isRead ? 'Message marked as read.' : 'Message marked as unread.',
      })
      await queryClient.invalidateQueries({ queryKey: ['owner-messages', ownerId] })
    },
    onError: (error) => setFeedback({ type: 'error', message: getErrorMessage(error, 'message') }),
  })

  const messages = messagesQuery.data?.results || []
  const totalCount = Math.max(0, Number(messagesQuery.data?.count) || 0)
  const pageCount = Math.max(1, Math.ceil(totalCount / 10))

  function changeFilter(nextStatus) {
    setPage(1)
    setStatus(nextStatus)
    setSelectedMessage(null)
    setFeedback(null)
  }

  function changePage(nextPage) {
    setPage(nextPage)
    setSelectedMessage(null)
    setFeedback(null)
  }

  function toggleReadState(message) {
    setFeedback(null)
    readStateMutation.mutate({ message, isRead: !message.is_read })
  }

  return (
    <section className="owner-messages-page" aria-labelledby="owner-messages-title">
      <header className="owner-page-heading">
        <div>
          <p className="owner-eyebrow">OWNER WORKSPACE / INBOX</p>
          <h1 id="owner-messages-title">Messages management</h1>
          <p className="owner-page-heading__description">
            Read contact messages and keep your inbox organized.
          </p>
        </div>
        <button
          className="owner-button owner-button--refresh"
          disabled={messagesQuery.isFetching}
          onClick={() => messagesQuery.refetch()}
          type="button"
        >
          <span aria-hidden="true">↻</span>
          {messagesQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <section className="owner-panel owner-messages-inbox" aria-labelledby="owner-messages-inbox-title">
        <div className="owner-panel__heading owner-messages-inbox__heading">
          <div>
            <p className="owner-eyebrow">INBOX</p>
            <h2 id="owner-messages-inbox-title">Contact messages</h2>
          </div>
          <span className="owner-panel__count">{totalCount}</span>
        </div>

        <div className="owner-messages-filters" role="tablist" aria-label="Filter messages">
          {filters.map((filter) => (
            <button
              aria-selected={status === filter.value}
              className={`owner-messages-filter${status === filter.value ? ' owner-messages-filter--active' : ''}`}
              key={filter.value}
              onClick={() => changeFilter(filter.value)}
              role="tab"
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        {feedback && (
          <p
            className={`owner-notice owner-notice--${feedback.type} owner-messages-feedback`}
            role={feedback.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {feedback.message}
          </p>
        )}
        {messagesQuery.isPending && (
          <div className="owner-state" role="status">
            <span className="owner-spinner" /> Loading messages…
          </div>
        )}
        {messagesQuery.isError && (
          <div className="owner-notice owner-notice--error" role="alert">
            <strong>Could not load messages.</strong>
            <p>{getErrorMessage(messagesQuery.error)}</p>
            <button className="owner-button" onClick={() => messagesQuery.refetch()} type="button">
              Retry
            </button>
          </div>
        )}
        {!messagesQuery.isPending && messagesQuery.data && messages.length === 0 && (
          <div className="owner-messages-empty">
            <strong>No {status === 'all' ? '' : `${status} `}messages found.</strong>
            <p>Messages that match this filter will appear here.</p>
          </div>
        )}
        {messagesQuery.data && messages.length > 0 && (
          <div className="owner-messages-layout">
            <div className="owner-messages-list" aria-label="Contact messages">
              {messages.map((message) => (
                <button
                  aria-current={selectedMessage?.id === message.id ? 'true' : undefined}
                  className={`owner-message-item${selectedMessage?.id === message.id ? ' owner-message-item--active' : ''}${message.is_read ? '' : ' owner-message-item--unread'}`}
                  key={message.id}
                  onClick={() => {
                    setSelectedMessage(message)
                    setFeedback(null)
                    readStateMutation.reset()
                  }}
                  type="button"
                >
                  <span className={`owner-message-item__dot${message.is_read ? '' : ' owner-message-item__dot--unread'}`} aria-hidden="true" />
                  <span className="owner-message-item__main">
                    <span className="owner-message-item__top">
                      <strong>{message.name || 'Unknown sender'}</strong>
                      <span className={`owner-message-status${message.is_read ? '' : ' owner-message-status--unread'}`}>
                        {message.is_read ? 'Read' : 'Unread'}
                      </span>
                    </span>
                    <span className="owner-message-item__email">{message.email || 'No email provided'}</span>
                    <span className="owner-message-item__subject">{message.subject || 'No subject'}</span>
                    <span className="owner-message-item__preview">{messagePreview(message.message)}</span>
                    <time dateTime={message.created_at || undefined}>{formatDate(message.created_at)}</time>
                  </span>
                </button>
              ))}
            </div>

            <section className="owner-message-detail" aria-label="Message details" aria-live="polite">
              {!selectedMessage ? (
                <div className="owner-message-detail__empty">
                  <span aria-hidden="true">✉</span>
                  <strong>Select a message</strong>
                  <p>Open a message from the inbox to read its full contents.</p>
                </div>
              ) : (
                <>
                  <header className="owner-message-detail__header">
                    <div>
                      <span className={`owner-message-status${selectedMessage.is_read ? '' : ' owner-message-status--unread'}`}>
                        {selectedMessage.is_read ? 'Read' : 'Unread'}
                      </span>
                      <h2>{selectedMessage.subject || 'No subject'}</h2>
                    </div>
                    <button
                      className="owner-button"
                      disabled={readStateMutation.isPending}
                      onClick={() => toggleReadState(selectedMessage)}
                      type="button"
                    >
                      {readStateMutation.isPending
                        ? 'Saving…'
                        : selectedMessage.is_read
                          ? 'Mark unread'
                          : 'Mark read'}
                    </button>
                  </header>
                  <div className="owner-message-detail__sender">
                    <span aria-hidden="true" className="owner-message-detail__avatar">
                      {(selectedMessage.name || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>{selectedMessage.name || 'Unknown sender'}</strong>
                      {selectedMessage.email && (
                        <a href={`mailto:${selectedMessage.email}`}>{selectedMessage.email}</a>
                      )}
                    </div>
                    <time dateTime={selectedMessage.created_at || undefined}>
                      {formatDate(selectedMessage.created_at)}
                    </time>
                  </div>
                  <div className="owner-message-detail__body">
                    {selectedMessage.message || 'No message content.'}
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {messagesQuery.data && totalCount > 0 && (
          <nav className="owner-messages-pagination" aria-label="Message list pages">
            <span>
              Showing {Math.min((page - 1) * 10 + 1, totalCount)}–{Math.min(page * 10, totalCount)} of {totalCount}
            </span>
            <div>
              <button
                className="owner-button"
                disabled={page <= 1 || messagesQuery.isFetching}
                onClick={() => changePage(Math.max(1, page - 1))}
                type="button"
              >
                Previous
              </button>
              <span>Page {page} of {pageCount}</span>
              <button
                className="owner-button"
                disabled={page >= pageCount || messagesQuery.isFetching}
                onClick={() => changePage(Math.min(pageCount, page + 1))}
                type="button"
              >
                Next
              </button>
            </div>
          </nav>
        )}
      </section>
    </section>
  )
}

export default OwnerMessagesManagement
