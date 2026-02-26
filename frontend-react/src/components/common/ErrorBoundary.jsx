import React from 'react';
import { FaExclamationTriangle, FaRedo, FaHome } from 'react-icons/fa';

/**
 * ErrorBoundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * 
 * Features:
 * - Catches uncaught errors in child components
 * - Displays user-friendly error UI
 * - Provides retry and navigation options
 * - Logs errors for debugging
 * - Resets error state on navigation
 * 
 * Requirements: 16.1-16.6
 */

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorCount: 0,
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Update state with error details
        this.setState((prevState) => ({
            error,
            errorInfo,
            errorCount: prevState.errorCount + 1,
        }));

        // Optional: Send error to logging service
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });

        // Call optional reset callback
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    handleGoHome = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });

        // Navigate to home
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI from props
            if (this.props.fallback) {
                return this.props.fallback({
                    error: this.state.error,
                    errorInfo: this.state.errorInfo,
                    resetError: this.handleReset,
                });
            }

            // Default fallback UI
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                    <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
                        {/* Error Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="bg-red-100 rounded-full p-4">
                                <FaExclamationTriangle className="text-red-600 text-4xl" />
                            </div>
                        </div>

                        {/* Error Title */}
                        <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
                            Oops! Something went wrong
                        </h1>

                        {/* Error Message */}
                        <p className="text-gray-600 text-center mb-6">
                            We're sorry for the inconvenience. An unexpected error has occurred.
                            {this.state.errorCount > 1 && (
                                <span className="block mt-2 text-sm text-red-600">
                                    This error has occurred {this.state.errorCount} times.
                                </span>
                            )}
                        </p>

                        {/* Error Details (Development Mode) */}
                        {import.meta.env.DEV && this.state.error && (
                            <div className="mb-6 p-4 bg-gray-100 rounded-lg overflow-auto max-h-64">
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                                    Error Details (Development Only):
                                </h3>
                                <pre className="text-xs text-red-600 whitespace-pre-wrap">
                                    {this.state.error.toString()}
                                </pre>
                                {this.state.errorInfo && (
                                    <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                <FaRedo />
                                Try Again
                            </button>

                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                <FaHome />
                                Go to Home
                            </button>
                        </div>

                        {/* Help Text */}
                        <p className="text-sm text-gray-500 text-center mt-6">
                            If this problem persists, please contact support or try refreshing the page.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
