import { Component } from 'react'

class AppErrorBoundary extends Component {
  state = { hasError: false, error: null, componentStack: '' }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('Unexpected portfolio rendering error:', error, errorInfo)
      this.setState({ componentStack: errorInfo.componentStack || '' })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error" role="alert">
          <p className="app-error__eyebrow">APPLICATION ERROR</p>
          <h1>This page could not be displayed.</h1>
          <p>
            An unexpected error interrupted the portfolio. Reload the page to try again.
          </p>
          {import.meta.env.DEV && (
            <section className="app-error__details" aria-label="Development error details">
              <h2>Development error details</h2>
              <h3>Message</h3>
              <pre>{this.state.error?.message || 'No error message available.'}</pre>
              <h3>Error stack</h3>
              <pre>{this.state.error?.stack || 'No error stack available.'}</pre>
              {this.state.componentStack && (
                <>
                  <h3>Component stack</h3>
                  <pre>{this.state.componentStack}</pre>
                </>
              )}
            </section>
          )}
          <button type="button" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </main>
      )
    }

    return this.props.children
  }
}

export default AppErrorBoundary
