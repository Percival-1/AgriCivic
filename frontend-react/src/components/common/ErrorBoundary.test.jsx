import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }) => {
    if (shouldThrow) {
        throw new Error('Test error');
    }
    return <div>No error</div>;
};

describe('ErrorBoundary', () => {
    // Suppress console.error for these tests
    const originalError = console.error;
    beforeEach(() => {
        console.error = vi.fn();
    });

    afterEach(() => {
        console.error = originalError;
    });

    it('should render children when there is no error', () => {
        render(
            <ErrorBoundary>
                <div>Test content</div>
            </ErrorBoundary>
        );

        expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render error UI when child component throws', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
        expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
        expect(screen.getByText(/Go to Home/i)).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
        const onError = vi.fn();

        render(
            <ErrorBoundary onError={onError}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(onError).toHaveBeenCalled();
    });

    it('should reset error state when Try Again is clicked', () => {
        const { rerender } = render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

        const tryAgainButton = screen.getByText(/Try Again/i);
        fireEvent.click(tryAgainButton);

        // After reset, re-render with no error using a new key to force remount
        rerender(
            <ErrorBoundary key="reset">
                <ThrowError shouldThrow={false} />
            </ErrorBoundary>
        );

        expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should render custom fallback UI when provided', () => {
        const customFallback = ({ error, resetError }) => (
            <div>
                <p>Custom error: {error?.message || 'Unknown error'}</p>
                <button onClick={resetError}>Reset</button>
            </div>
        );

        render(
            <ErrorBoundary fallback={customFallback}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText(/Custom error: Test error/i)).toBeInTheDocument();
        expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('should track error count for multiple errors', () => {
        const { rerender } = render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // First error
        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

        // Click Try Again
        const tryAgainButton = screen.getByText(/Try Again/i);
        fireEvent.click(tryAgainButton);

        // Trigger error again
        rerender(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // Should show error count
        expect(screen.getByText(/occurred 2 times/i)).toBeInTheDocument();
    });
});
