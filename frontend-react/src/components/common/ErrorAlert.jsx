import { FaExclamationCircle, FaTimes } from 'react-icons/fa';

/**
 * ErrorAlert Component
 * 
 * Displays error messages with optional retry functionality.
 * 
 * @param {string} message - Error message to display
 * @param {string} title - Optional error title
 * @param {function} onRetry - Optional retry callback
 * @param {function} onDismiss - Optional dismiss callback
 * @param {string} variant - Alert variant: 'error', 'warning', 'info'
 */

export default function ErrorAlert({
    message,
    title = 'Error',
    onRetry,
    onDismiss,
    variant = 'error',
}) {
    const variantClasses = {
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
    };

    const iconColor = {
        error: 'text-red-500',
        warning: 'text-yellow-500',
        info: 'text-blue-500',
    };

    return (
        <div className={`border rounded-lg p-4 ${variantClasses[variant]}`}>
            <div className="flex items-start">
                <div className={`flex-shrink-0 ${iconColor[variant]}`}>
                    <FaExclamationCircle size={20} />
                </div>

                <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium">{title}</h3>
                    <div className="mt-1 text-sm">
                        <p>{message}</p>
                    </div>

                    {onRetry && (
                        <div className="mt-3">
                            <button
                                onClick={onRetry}
                                className="text-sm font-medium underline hover:no-underline"
                            >
                                Try again
                            </button>
                        </div>
                    )}
                </div>

                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="flex-shrink-0 ml-3 hover:opacity-70"
                    >
                        <FaTimes size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
