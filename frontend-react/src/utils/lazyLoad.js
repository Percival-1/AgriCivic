/**
 * Lazy Loading Utilities
 * 
 * Helper functions for dynamic imports and code splitting.
 * Provides retry logic and better error handling for lazy-loaded components.
 * 
 * Requirements: 17.1-17.6
 */

/**
 * Lazy load a component with retry logic
 * Retries failed imports up to 3 times before giving up
 * 
 * @param {Function} importFn - Dynamic import function
 * @param {number} retries - Number of retries (default: 3)
 * @returns {Promise} - Promise that resolves to the component
 */
export const lazyLoadWithRetry = (importFn, retries = 3) => {
    return new Promise((resolve, reject) => {
        importFn()
            .then(resolve)
            .catch((error) => {
                if (retries === 0) {
                    reject(error);
                    return;
                }

                console.warn(`Failed to load component, retrying... (${retries} attempts left)`);

                // Retry after a short delay
                setTimeout(() => {
                    lazyLoadWithRetry(importFn, retries - 1)
                        .then(resolve)
                        .catch(reject);
                }, 1000);
            });
    });
};

/**
 * Preload a lazy component
 * Useful for preloading components that will be needed soon
 * 
 * @param {Function} importFn - Dynamic import function
 * @returns {Promise} - Promise that resolves when component is loaded
 */
export const preloadComponent = (importFn) => {
    return importFn();
};

/**
 * Create a lazy component with custom loading and error handling
 * 
 * @param {Function} importFn - Dynamic import function
 * @param {Object} options - Configuration options
 * @param {number} options.retries - Number of retries for failed imports
 * @param {number} options.delay - Minimum delay before showing component (for smoother transitions)
 * @returns {React.LazyExoticComponent} - Lazy component
 */
export const createLazyComponent = (importFn, options = {}) => {
    const { retries = 3, delay = 0 } = options;

    return () => {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            lazyLoadWithRetry(importFn, retries)
                .then((module) => {
                    const elapsed = Date.now() - startTime;
                    const remaining = Math.max(0, delay - elapsed);

                    if (remaining > 0) {
                        setTimeout(() => resolve(module), remaining);
                    } else {
                        resolve(module);
                    }
                })
                .catch(reject);
        });
    };
};

/**
 * Prefetch components on idle
 * Uses requestIdleCallback to prefetch components when browser is idle
 * 
 * @param {Array<Function>} importFns - Array of dynamic import functions
 */
export const prefetchOnIdle = (importFns) => {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            importFns.forEach((importFn) => {
                preloadComponent(importFn).catch((error) => {
                    console.warn('Failed to prefetch component:', error);
                });
            });
        });
    } else {
        // Fallback for browsers that don't support requestIdleCallback
        setTimeout(() => {
            importFns.forEach((importFn) => {
                preloadComponent(importFn).catch((error) => {
                    console.warn('Failed to prefetch component:', error);
                });
            });
        }, 1000);
    }
};

/**
 * Prefetch components on hover
 * Preloads a component when user hovers over a link
 * 
 * @param {Function} importFn - Dynamic import function
 * @returns {Function} - Event handler for onMouseEnter
 */
export const prefetchOnHover = (importFn) => {
    let prefetched = false;

    return () => {
        if (!prefetched) {
            prefetched = true;
            preloadComponent(importFn).catch((error) => {
                console.warn('Failed to prefetch component on hover:', error);
            });
        }
    };
};

/**
 * Example usage:
 * 
 * // Basic lazy loading with retry
 * const MyComponent = lazy(() => lazyLoadWithRetry(() => import('./MyComponent')));
 * 
 * // Lazy loading with custom options
 * const MyComponent = lazy(createLazyComponent(() => import('./MyComponent'), {
 *   retries: 5,
 *   delay: 200,
 * }));
 * 
 * // Prefetch on idle
 * useEffect(() => {
 *   prefetchOnIdle([
 *     () => import('./HeavyComponent1'),
 *     () => import('./HeavyComponent2'),
 *   ]);
 * }, []);
 * 
 * // Prefetch on hover
 * <Link
 *   to="/dashboard"
 *   onMouseEnter={prefetchOnHover(() => import('../pages/Dashboard'))}
 * >
 *   Dashboard
 * </Link>
 */
