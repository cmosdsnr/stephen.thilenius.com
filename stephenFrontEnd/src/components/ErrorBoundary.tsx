import React from 'react'

interface Props {
    children: React.ReactNode
    fallback?: React.ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false, error: null }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info.componentStack)
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback
            return (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <h4>Something went wrong</h4>
                    <p style={{ color: '#666', marginBottom: '1rem' }}>
                        {this.state.error?.message ?? 'An unexpected error occurred.'}
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={() => this.setState({ hasError: false, error: null })}
                    >
                        Try again
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}
