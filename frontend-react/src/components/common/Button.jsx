import { memo, useMemo } from 'react';

/**
 * Button Component
 * 
 * Reusable button with multiple variants and states.
 * Optimized with React.memo to prevent unnecessary re-renders.
 * 
 * @param {string} variant - Button style variant: 'primary', 'secondary', 'danger', 'success', 'outline'
 * @param {string} size - Button size: 'sm', 'md', 'lg'
 * @param {boolean} disabled - Disabled state
 * @param {boolean} loading - Loading state (shows spinner)
 * @param {string} type - Button type: 'button', 'submit', 'reset'
 * @param {function} onClick - Click handler
 * @param {ReactNode} children - Button content
 * @param {string} className - Additional CSS classes
 */

const Button = memo(function Button({
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    type = 'button',
    onClick,
    children,
    className = '',
    ...props
}) {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
        outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    // Memoize computed classes to avoid recalculation on every render
    const classes = useMemo(
        () => `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`,
        [variant, size, className]
    );

    return (
        <button
            type={type}
            disabled={disabled || loading}
            onClick={onClick}
            className={classes}
            {...props}
        >
            {loading && (
                <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            )}
            {children}
        </button>
    );
});

export default Button;
