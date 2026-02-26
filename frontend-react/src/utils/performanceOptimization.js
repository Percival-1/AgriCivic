/**
 * Performance Optimization Utilities
 * 
 * Helper functions and patterns for optimizing React component rendering.
 * 
 * Requirements: 17.1-17.6
 */

/**
 * Custom comparison function for React.memo
 * Performs shallow comparison of props
 * 
 * @param {Object} prevProps - Previous props
 * @param {Object} nextProps - Next props
 * @returns {boolean} - True if props are equal (skip re-render)
 */
export const shallowEqual = (prevProps, nextProps) => {
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);

    if (prevKeys.length !== nextKeys.length) {
        return false;
    }

    for (let key of prevKeys) {
        if (prevProps[key] !== nextProps[key]) {
            return false;
        }
    }

    return true;
};

/**
 * Custom comparison function for React.memo
 * Performs deep comparison of specific props
 * 
 * @param {Array<string>} propsToCompare - Array of prop names to compare deeply
 * @returns {Function} - Comparison function for React.memo
 */
export const createDeepCompare = (propsToCompare = []) => {
    return (prevProps, nextProps) => {
        // First do shallow comparison for all props
        if (!shallowEqual(prevProps, nextProps)) {
            // Check if the changed props are in the deep compare list
            for (let key of propsToCompare) {
                if (JSON.stringify(prevProps[key]) !== JSON.stringify(nextProps[key])) {
                    return false;
                }
            }
        }
        return true;
    };
};

/**
 * Debounce function for expensive operations
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait = 300) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle function for limiting execution frequency
 * 
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export const throttle = (func, limit = 300) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

/**
 * Check if two arrays are equal (shallow comparison)
 * Useful for useMemo and useCallback dependencies
 * 
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {boolean} - True if arrays are equal
 */
export const areArraysEqual = (arr1, arr2) => {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
        return false;
    }

    if (arr1.length !== arr2.length) {
        return false;
    }

    return arr1.every((item, index) => item === arr2[index]);
};

/**
 * Memoization helper for expensive computations
 * 
 * @param {Function} fn - Function to memoize
 * @returns {Function} - Memoized function
 */
export const memoize = (fn) => {
    const cache = new Map();

    return (...args) => {
        const key = JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key);
        }

        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};

/**
 * Performance monitoring wrapper
 * Logs component render time in development
 * 
 * @param {string} componentName - Name of the component
 * @param {Function} renderFn - Render function to measure
 * @returns {*} - Result of render function
 */
export const measureRenderTime = (componentName, renderFn) => {
    if (import.meta.env.DEV) {
        const startTime = performance.now();
        const result = renderFn();
        const endTime = performance.now();
        const renderTime = endTime - startTime;

        if (renderTime > 16) {
            // Log if render takes longer than one frame (16ms)
            console.warn(
                `[Performance] ${componentName} took ${renderTime.toFixed(2)}ms to render`
            );
        }

        return result;
    }

    return renderFn();
};

/**
 * Example usage patterns for optimization
 */

// Example 1: Using React.memo with custom comparison
/*
import { memo } from 'react';
import { shallowEqual } from './utils/performanceOptimization';

const MyComponent = memo(({ data, onClick }) => {
  return <div onClick={onClick}>{data.name}</div>;
}, shallowEqual);
*/

// Example 2: Using useMemo for expensive calculations
/*
import { useMemo } from 'react';

function MyComponent({ items }) {
  const sortedItems = useMemo(() => {
    return items.sort((a, b) => a.value - b.value);
  }, [items]);

  return <div>{sortedItems.map(item => <div key={item.id}>{item.name}</div>)}</div>;
}
*/

// Example 3: Using useCallback for event handlers
/*
import { useCallback } from 'react';

function MyComponent({ onSave }) {
  const handleClick = useCallback(() => {
    onSave();
  }, [onSave]);

  return <button onClick={handleClick}>Save</button>;
}
*/

// Example 4: Optimizing list rendering with keys
/*
function MyList({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
*/

// Example 5: Code splitting with React.lazy
/*
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function MyComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
*/
