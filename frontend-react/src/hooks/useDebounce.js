import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing values
 * 
 * Provides:
 * - Debounce logic for search inputs
 * - Configurable delay
 * - Automatic cleanup on unmount
 * 
 * Requirements: 19.5
 * 
 * @param {*} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 500ms)
 * @returns {*} - Debounced value
 */
export const useDebounce = (value, delay = 500) => {
    // State to store the debounced value
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Set up a timer to update the debounced value after the delay
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Cleanup function to cancel the timeout if value changes before delay expires
        // This ensures only the latest value is used after the delay
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); // Re-run effect when value or delay changes

    return debouncedValue;
};

export default useDebounce;
