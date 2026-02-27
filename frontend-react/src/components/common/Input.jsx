import { forwardRef } from 'react';

/**
 * Input Component
 * 
 * Reusable input field with validation support.
 * 
 * @param {string} label - Input label
 * @param {string} type - Input type (text, email, password, number, tel, etc.)
 * @param {string} placeholder - Placeholder text
 * @param {string} error - Error message to display
 * @param {string} helperText - Helper text below input
 * @param {boolean} required - Required field indicator
 * @param {boolean} disabled - Disabled state
 * @param {string} className - Additional CSS classes
 * @param {ReactNode} icon - Optional icon to display
 */

const Input = forwardRef(({
    label,
    type = 'text',
    placeholder,
    error,
    helperText,
    required = false,
    disabled = false,
    className = '',
    icon,
    ...props
}, ref) => {
    const inputClasses = `
        w-full px-4 py-2 border rounded-lg
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        disabled:bg-gray-100 disabled:cursor-not-allowed
        ${error ? 'border-red-500' : 'border-gray-300'}
        ${icon ? 'pl-10' : ''}
        ${className}
    `;

    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        {icon}
                    </div>
                )}

                <input
                    ref={ref}
                    type={type}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={inputClasses}
                    {...props}
                />
            </div>

            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}

            {helperText && !error && (
                <p className="mt-1 text-sm text-gray-500">{helperText}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
