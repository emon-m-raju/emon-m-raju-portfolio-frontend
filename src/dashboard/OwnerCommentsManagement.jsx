import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getOwnerComments,
  getOwnerPostTitles,
  replyToOwnerComment,
  setOwnerCommentApproval,
} from '../api/axiosClient.js'
import { formatResourceError } from '../api/errorFormatters.js'
import { queryKeys } from '../api/queryKeys.js'
import { useOwnerAuth } from '../auth/OwnerAuthContext.jsx'
import './owner-comments.css'

const filters = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
]

function getErrorMessage(error, resource = 'comments') {
  return formatResourceError(error, resource)
}

function formatDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function CommentCard({
  comment,
  postTitle,
  nested = false,
  orphan = false,
  busy = false,
  onApprovalChange,
  onReply,
  children,
}) {
  const isApproved = comment.is_approved === true

  return (
    <article className={`owner-comment-card${nested ? ' owner-comment-card--reply' : ''}`}>
      {orphan && (
        <p className="owner-comment-card__reply-context">
          Reply to comment #{comment.parent}
          <span> (the original comment is on another page)</span>
        </p>
      )}
      <header className="owner-comment-card__header">
        <div className="owner-comment-card__identity">
          <span aria-hidden="true" className="owner-comment-card__avatar">
            {(comment.name || '?').slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{comment.name || 'Visitor'}</strong>
            {comment.email && <a href={`mailto:${comment.email}`}>{comment.email}</a>}
          </div>
        </div>
        <span className={`owner-comment-status${isApproved ? ' owner-comment-status--approved' : ''}`}>
          {isApproved ? 'Approved' : 'Pending'}
        </span>
      </header>

      <p className="owner-comment-card__content">{comment.content || 'No comment text.'}</p>
      <div className="owner-comment-card__meta">
        <span>
          On <strong>{postTitle || (comment.post != null ? `Post #${comment.post}` : 'Unknown post')}</strong>
        </span>
        <time dateTime={comment.created_at || undefined}>{formatDate(comment.created_at)}</time>
      </div>

      <div className="owner-comment-card__actions">
        <button
          className="owner-button"
          disabled={busy}
          onClick={() => onApprovalChange(comment, !isApproved)}
          type="button"
        >
          {busy ? 'Saving…' : isApproved ? 'Unapprove' : 'Approve'}
        </button>
        {!nested && !orphan && (
          <button
            className="owner-button"
            disabled={busy}
            onClick={() => onReply(comment)}
            type="button"
          >
            Reply
          </button>
        )}
      </div>
      {children}
    </article>
  )
}

function OwnerCommentsManagement() {
  const { auth } = useOwnerAuth()
  const queryClient = useQueryClient()
  const ownerId = auth?.user?.id
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyDraft, setReplyDraft] = useState({ name: '', email: '', content: '' })
  const [feedback, setFeedback] = useState(null)
  const commentsQueryKey = queryKeys.ownerComments(ownerId, page, status)

  const commentsQuery = useQuery({
    queryKey: commentsQueryKey,
    queryFn: ({ signal }) => getOwnerComments(auth.accessToken, { page, status, signal }),
    enabled: Boolean(auth?.accessToken),
  })
  const postTitlesQuery = useQuery({
    queryKey: queryKeys.ownerCommentPostTitles(ownerId),
    queryFn: ({ signal }) => getOwnerPostTitles(auth.accessToken, { signal }),
    enabled: Boolean(auth?.accessToken && commentsQuery.data),
    staleTime: 60_000,
  })

  const refreshComments = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.ownerComments(ownerId) })

  const approvalMutation = useMutation({
    mutationFn: ({ comment, isApproved }) =>
      setOwnerCommentApproval(auth.accessToken, comment.id, isApproved),
    onSuccess: async (_updatedComment, { isApproved }) => {
      setFeedback({
        type: 'success',
        message: isApproved ? 'Comment approved.' : 'Comment unapproved.',
      })
      await refreshComments()
    },
    onError: (error) => setFeedback({ type: 'error', message: getErrorMessage(error) }),
  })

  const replyMutation = useMutation({
    mutationFn: ({ comment, draft }) => replyToOwnerComment(auth.accessToken, {
      post: comment.post,
      parent: comment.id,
      name: draft.name.trim(),
      email: draft.email.trim(),
      website: '',
      content: draft.content.trim(),
    }),
    onSuccess: (reply, { comment }) => {
      if (status !== 'pending') {
        queryClient.setQueryData(commentsQueryKey, (data) => {
          if (!data || !Array.isArray(data.results)) return data
          return {
            ...data,
            count: (Number(data.count) || data.results.length) + 1,
            results: data.results.map((item) =>
              item.id === comment.id
                ? { ...item, replies: [...(Array.isArray(item.replies) ? item.replies : []), reply] }
                : item,
            ),
          }
        })
      }
      setReplyingTo(null)
      setReplyDraft({ name: '', email: '', content: '' })
      setFeedback({ type: 'success', message: 'Your reply was added and approved.' })
    },
    onError: (error) => setFeedback({ type: 'error', message: getErrorMessage(error, 'reply') }),
  })

  const comments = commentsQuery.data?.results || []
  const totalCount = Math.max(0, Number(commentsQuery.data?.count) || 0)
  const pageCount = Math.max(1, Math.ceil(totalCount / 10))

  useEffect(() => {
    if (!commentsQuery.isFetching && commentsQuery.data && comments.length === 0 && page > 1) {
      setPage((current) => Math.max(1, current - 1))
    }
  }, [comments, commentsQuery.data, commentsQuery.isFetching, page])

  function changeFilter(nextStatus) {
    setPage(1)
    setStatus(nextStatus)
    setFeedback(null)
  }

  function startReply(comment) {
    setReplyingTo(comment.id)
    setReplyDraft({
      name: auth?.user?.username || '',
      email: auth?.user?.email || '',
      content: '',
    })
    setFeedback(null)
    replyMutation.reset()
  }

  function submitReply(event, comment) {
    event.preventDefault()
    const draft = {
      name: replyDraft.name.trim(),
      email: replyDraft.email.trim(),
      content: replyDraft.content.trim(),
    }
    if (
      !draft.name ||
      !draft.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email) ||
      draft.content.length < 5 ||
      draft.content.length > 1000
    ) {
      setFeedback({
        type: 'error',
        message: 'Enter a name, valid email, and a reply between 5 and 1,000 characters.',
      })
      return
    }
    setFeedback(null)
    replyMutation.mutate({ comment, draft })
  }

  function onApprovalChange(comment, isApproved) {
    setFeedback(null)
    approvalMutation.mutate({ comment, isApproved })
  }

  const replyMap = new Map()
  comments.forEach((comment) => {
    if (comment.parent != null) {
      const parentId = String(comment.parent)
      replyMap.set(parentId, [...(replyMap.get(parentId) || []), comment])
    }
    if (Array.isArray(comment.replies)) {
      comment.replies.forEach((reply) => {
        const parentId = String(reply.parent ?? comment.id)
        const siblings = replyMap.get(parentId) || []
        if (!siblings.some((item) => String(item.id) === String(reply.id))) {
          replyMap.set(parentId, [...siblings, reply])
        }
      })
    }
  })
  const roots = comments.filter((comment) => comment.parent == null)
  const orphanReplies = comments.filter(
    (comment) =>
      comment.parent != null &&
      !comments.some((candidate) => String(candidate.id) === String(comment.parent)),
  )

  return (
    <section className="owner-comments-page" aria-labelledby="owner-comments-title">
      <header className="owner-page-heading">
        <div>
          <p className="owner-eyebrow">OWNER WORKSPACE / BLOG / COMMENTS</p>
          <h1 id="owner-comments-title">Comments management</h1>
          <p className="owner-page-heading__description">
            Review visitor feedback, moderate comments, and reply to your readers.
          </p>
        </div>
        <button
          className="owner-button owner-button--refresh"
          disabled={commentsQuery.isFetching}
          onClick={() => {
            commentsQuery.refetch()
            if (commentsQuery.data) postTitlesQuery.refetch()
          }}
          type="button"
        >
          <span aria-hidden="true">↻</span>
          {commentsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <section className="owner-panel owner-comments-list" aria-labelledby="owner-comments-list-title">
        <div className="owner-panel__heading owner-comments-list__heading">
          <div>
            <p className="owner-eyebrow">MODERATION QUEUE</p>
            <h2 id="owner-comments-list-title">Visitor comments</h2>
          </div>
          <span className="owner-panel__count">{totalCount}</span>
        </div>

        <div className="owner-comments-filters" role="tablist" aria-label="Filter comments">
          {filters.map((filter) => (
            <button
              aria-selected={status === filter.value}
              className={`owner-comments-filter${status === filter.value ? ' owner-comments-filter--active' : ''}`}
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
            className={`owner-notice owner-notice--${feedback.type} owner-comments-feedback`}
            role={feedback.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {feedback.message}
          </p>
        )}
        {commentsQuery.isPending && (
          <div className="owner-state" role="status">
            <span className="owner-spinner" /> Loading comments…
          </div>
        )}
        {commentsQuery.isError && (
          <div className="owner-notice owner-notice--error" role="alert">
            <strong>Could not load comments.</strong>
            <p>{getErrorMessage(commentsQuery.error)}</p>
            <button className="owner-button" onClick={() => commentsQuery.refetch()} type="button">
              Retry
            </button>
          </div>
        )}
        {postTitlesQuery.isError && commentsQuery.data && (
          <div className="owner-notice owner-notice--warning" role="status">
            <p>Related post titles could not be loaded. Comment post IDs remain available.</p>
            <button className="owner-button" onClick={() => postTitlesQuery.refetch()} type="button">
              Retry post lookup
            </button>
            <span>{getErrorMessage(postTitlesQuery.error, 'related posts')}</span>
          </div>
        )}
        {postTitlesQuery.isPending && commentsQuery.data && (
          <p className="owner-comments-post-loading" role="status">Loading related post titles…</p>
        )}

        {!commentsQuery.isPending && commentsQuery.data && comments.length === 0 && (
          <div className="owner-comments-empty">
            <strong>No {status === 'all' ? '' : `${status} `}comments found.</strong>
            <p>Comments that match this filter will appear here.</p>
          </div>
        )}

        {roots.map((comment) => {
          const replies = replyMap.get(String(comment.id)) || []
          return (
            <div className="owner-comment-thread" key={comment.id}>
              <CommentCard
                busy={approvalMutation.isPending && approvalMutation.variables?.comment.id === comment.id}
                comment={comment}
                onApprovalChange={onApprovalChange}
                onReply={startReply}
                postTitle={postTitlesQuery.data?.[String(comment.post)]}
              >
                {replyingTo === comment.id && (
                  <form
                    className="owner-comment-reply-form"
                    onSubmit={(event) => submitReply(event, comment)}
                  >
                    <h3>Reply to {comment.name || 'visitor'}</h3>
                    <div className="owner-comment-reply-form__identity">
                      <label>
                        Your name
                        <input
                          autoComplete="name"
                          maxLength={120}
                          onChange={(event) => setReplyDraft((current) => ({ ...current, name: event.target.value }))}
                          required
                          value={replyDraft.name}
                        />
                      </label>
                      <label>
                        Your email
                        <input
                          autoComplete="email"
                          maxLength={254}
                          onChange={(event) => setReplyDraft((current) => ({ ...current, email: event.target.value }))}
                          required
                          type="email"
                          value={replyDraft.email}
                        />
                      </label>
                    </div>
                    <label>
                      Reply
                      <textarea
                        maxLength={1000}
                        minLength={5}
                        onChange={(event) => setReplyDraft((current) => ({ ...current, content: event.target.value }))}
                        required
                        rows={4}
                        value={replyDraft.content}
                      />
                    </label>
                    <p className="owner-comment-form-hint">5–1,000 characters. Replies are published immediately.</p>
                    <div className="owner-comment-reply-form__actions">
                      <button
                        className="owner-button"
                        disabled={replyMutation.isPending}
                        onClick={() => setReplyingTo(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button className="owner-button owner-comment-primary-action" disabled={replyMutation.isPending} type="submit">
                        {replyMutation.isPending ? 'Sending…' : 'Send reply'}
                      </button>
                    </div>
                  </form>
                )}
              </CommentCard>
              {replies.map((reply) => (
                <CommentCard
                  busy={approvalMutation.isPending && String(approvalMutation.variables?.comment.id) === String(reply.id)}
                  comment={reply}
                  key={reply.id}
                  nested
                  onApprovalChange={onApprovalChange}
                  onReply={startReply}
                  postTitle={postTitlesQuery.data?.[String(reply.post ?? comment.post)]}
                />
              ))}
            </div>
          )
        })}
        {orphanReplies.map((reply) => (
          <CommentCard
            busy={approvalMutation.isPending && String(approvalMutation.variables?.comment.id) === String(reply.id)}
            comment={reply}
            key={reply.id}
            onApprovalChange={onApprovalChange}
            onReply={startReply}
            orphan
            postTitle={postTitlesQuery.data?.[String(reply.post)]}
          />
        ))}

        {commentsQuery.data && totalCount > 0 && (
          <nav className="owner-comments-pagination" aria-label="Comment list pages">
            <span>
              Showing {Math.min((page - 1) * 10 + 1, totalCount)}–{Math.min(page * 10, totalCount)} of {totalCount}
            </span>
            <div>
              <button
                className="owner-button"
                disabled={page <= 1 || commentsQuery.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Previous
              </button>
              <span>Page {page} of {pageCount}</span>
              <button
                className="owner-button"
                disabled={page >= pageCount || commentsQuery.isFetching}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
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

export default OwnerCommentsManagement
