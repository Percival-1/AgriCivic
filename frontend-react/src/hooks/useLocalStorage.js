import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for localStorage operations
 * 
 * Provides:
 * - get, set, remove functions
 * - Sync with localStorage
 * - Automatic JSON serialization/deserialization
 * - State synchronization across components
 * 
 * Requirements: 19.4
 * 
 * @param {string} key - The localStorage key
 * @param {*} initialValue - Initial value if key doesn't exist
 * @returns {[value, setValue, removeValue]} - Current value, setter function, and remove function
 */
export const useLocalStorage = (key, initialValue) => {
    // State to store our value
    // Pass initial state function to useState so logic is only executed once
    const [storedValue, setStoredValue] = useState(() => {
        try {
            // Get from local storage by key
            const item = window.localStorage.getItem(key);

            // Parse stored json or if none return initialValue
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            // If error also return initialValue
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    /**
     * Set value to localStorage
     * Requirement 19.4: Implement set function
     */
    const setValue = useCallback((value) => {
        try {
            // Allow value to be a function so we have same API as useState
            const valueToStore = value instanceof Function ? value(storedValue) : value;

            // Save state
            setStoredValue(valueToStore);

            // Save to local storage
            window.localStorage.setItem(key, JSON.stringify(valueToStore));

            // Dispatch custom event to sync across tabs/windows
            window.dispatchEvent(new CustomEvent('localStorageChange', {
                detail: { key, value: valueToStore }
            }));
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    /**
     * Remove value from localStorage
     * Requirement 19.4: Implement remove function
     */
    const removeValue = useCallback(() => {
        try {
            // Remove from state
            setStoredValue(initialValue);

            // Remove from local storage
            window.localStorage.removeItem(key);

            // Dispatch custom event to sync across tabs/windows
            window.dispatchEvent(new CustomEvent('localStorageChange', {
                detail: { key, value: null }
            }));
        } catch (error) {
            console.error(`Error removing localStorage key "${key}":`, error);
        }
    }, [key, initialValue]);

    /**
     * Get current value from localStorage
     * Requirement 19.4: Implement get function
     */
    const getValue = useCallback(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error getting localStorage key "${key}":`, error);
            return initialValue;
        }
    }, [key, initialValue]);

    /**
     * Sync with localStorage changes from other tabs/windows
     * Requirement 19.4: Sync with localStorage
     */
    useEffect(() => {
        // Handle storage events from other tabs/windows
        const handleStorageChange = (e) => {
            if (e.key === key) {
                try {
                    const newValue = e.newValue ? JSON.parse(e.newValue) : initialValue;
                    setStoredValue(newValue);
                } catch (error) {
                    console.error(`Error parsing storage event for key "${key}":`, error);
                }
            }
        };

        // Handle custom events from same tab
        const handleCustomStorageChange = (e) => {
            if (e.detail.key === key) {
                setStoredValue(e.detail.value ?? initialValue);
            }
        };

        // Listen for storage events (from other tabs)
        window.addEventListener('storage', handleStorageChange);

        // Listen for custom events (from same tab)
        window.addEventListener('localStorageChange', handleCustomStorageChange);

        // Cleanup
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('localStorageChange', handleCustomStorageChange);
        };
    }, [key, initialValue]);

    return [storedValue, setValue, removeValue, getValue];
};

export default useLocalStorage;
