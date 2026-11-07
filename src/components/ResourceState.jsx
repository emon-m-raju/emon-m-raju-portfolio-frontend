/**
 * Presents the loading, error, empty, or successful state of an API resource.
 * @param {{ status: 'loading'|'error'|'empty'|'success', error?: string, emptyMessage?: string, emptyTitle?: string, loadingVariant?: 'projects'|'skills', onRetry?: () => void, children?: import('react').ReactNode }} props
 */
function ResourceState({
  status,
  error,
  emptyMessage = 'No information available yet.',
  emptyTitle = 'Nothing to show yet',
  loadingVariant,
  onRetry,
  children,
}) {
  if (status === 'loading') {
    if (loadingVariant === 'projects' || loadingVariant === 'skills') {
      const count = loadingVariant === 'projects' ? 3 : 6
      return (
        <div
          aria-label={`Loading ${loadingVariant}`}
          className={`resource-skeleton resource-skeleton--${loadingVariant}`}
          role="status"
        >
          <span className="visually-hidden">Loading {loadingVariant}…</span>
          {Array.from({ length: count }, (_, index) => (
            <div
              aria-hidden="true"
              className="resource-skeleton__card"
              key={`${loadingVariant}-${index}`}
            >
              <span className="resource-skeleton__line resource-skeleton__line--short" />
              <span className="resource-skeleton__line" />
              <span className="resource-skeleton__line resource-skeleton__line--medium" />
            </div>
          ))}
        </div>
      )
    }

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
    return (
      <div className="resource-empty" role="status">
        <span aria-hidden="true" className="resource-empty__mark">◇</span>
        <strong>{emptyTitle}</strong>
        <p>{emptyMessage}</p>
      </div>
    )
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
