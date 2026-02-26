/**
 * SanitizedTextarea Component
 * 
 * Textarea component with automatic sanitization
 * Prevents XSS attacks by sanitizing user input
 * 
 * Requirements: 18.1-18.6
 */

import { forwardRef } from 'react';
import { sanitizeInput } from '../../utils/security';

/**
 * Textarea component with automatic sanitization
 */
const SanitizedTextarea = forwardRef(
    ({ value, onChange, onBlur, sanitize = true, ...props }, ref) => {
        const handleChange = (e) => {
            if (onChange) {
                if (sanitize) {
                    const sanitizedValue = sanitizeInput(e.target.value);
                    const sanitizedEvent = {
                        ...e,
                        target: {
                            ...e.target,
                            value: sanitizedValue,
                        },
                    };
                    onChange(sanitizedEvent);
                } else {
                    onChange(e);
                }
            }
        };

        const handleBlur = (e) => {
            if (onBlur) {
                if (sanitize) {
                    const sanitizedValue = sanitizeInput(e.target.value);
                    const sanitizedEvent = {
                        ...e,
                        target: {
                            ...e.target,
                            value: sanitizedValue,
                        },
                    };
                    onBlur(sanitizedEvent);
                } else {
                    onBlur(e);
                }
            }
        };

        return (
            <textarea
                ref={ref}
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                {...props}
            />
        );
    }
);

SanitizedTextarea.displayName = 'SanitizedTextarea';

export default SanitizedTextarea;
