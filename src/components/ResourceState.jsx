/**
 * Presents the loading, error, empty, or successful state of an API resource.
 * @param {{ status: 'loading'|'error'|'empty'|'success', error?: string, emptyMessage?: string, onRetry?: () => void, children?: import('react').ReactNode }} props
 */
function ResourceState({
  status,
  error,
  emptyMessage = 'No information available yet.',
  onRetry,
  children,
}) {
  if (status === 'loading') {
    return (
      <p className="resource-state resource-state--loading" role="status">
        Loading…
      </p>
    )
  }

  if (status === 'error') {
    return (
      <div>
        <p className="resource-state resource-state--error" role="alert">
          {error || 'Unable to load this information.'}
        </p>
        {onRetry && (
          <button className="button button--secondary" onClick={onRetry} type="button">
            Retry
          </button>
        )}
      </div>
    )
  }

  if (status === 'empty') {
    return <p className="resource-state resource-state--empty">{emptyMessage}</p>
  }

  if (status === 'success') {
    return children ?? null
  }

  return (
    <p className="resource-state resource-state--error" role="alert">
      Unable to display this information because its loading state is invalid.
    </p>
  )
}

export default ResourceState
