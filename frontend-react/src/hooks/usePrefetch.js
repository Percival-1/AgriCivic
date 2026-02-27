/**
 * usePrefetch Hook
 * 
 * Custom hook for prefetching components and resources.
 * Helps improve perceived performance by loading resources before they're needed.
 * 
 * Requirements: 17.1-17.6
 */

import { useEffect, useCallback } from 'react';
import { prefetchOnIdle, preloadComponent } from '../utils/lazyLoad';

/**
 * Prefetch components on mount
 * 
 * @param {Array<Function>} importFns - Array of dynamic import functions
 * @param {Object} options - Configuration options
 * @param {boolean} options.immediate - Prefetch immediately (default: false, uses idle callback)
 * @param {number} options.delay - Delay before prefetching in ms (default: 0)
 */
export const usePrefetch = (importFns, options = {}) => {
    const { immediate = false, delay = 0 } = options;

    useEffect(() => {
        if (!importFns || importFns.length === 0) {
            return;
        }

        const prefetch = () => {
            if (immediate) {
                importFns.forEach((importFn) => {
                    preloadComponent(importFn).catch((error) => {
                        console.warn('Failed to prefetch component:', error);
                    });
                });
            } else {
                prefetchOnIdle(importFns);
            }
        };

        if (delay > 0) {
            const timer = setTimeout(prefetch, delay);
            return () => clearTimeout(timer);
        } else {
            prefetch();
        }
    }, [importFns, immediate, delay]);
};

/**
 * Get a prefetch handler for hover events
 * 
 * @param {Function} importFn - Dynamic import function
 * @returns {Function} - Event handler for onMouseEnter
 */
export const usePrefetchOnHover = (importFn) => {
    return useCallback(() => {
        if (importFn) {
            preloadComponent(importFn).catch((error) => {
                console.warn('Failed to prefetch component on hover:', error);
            });
        }
    }, [importFn]);
};

/**
 * Prefetch route components based on user role
 * Automatically prefetches likely next routes
 * 
 * @param {string} userRole - User role ('user' or 'admin')
 */
export const usePrefetchRoutes = (userRole) => {
    useEffect(() => {
        if (!userRole) return;

        // Common routes for all authenticated users
        const commonRoutes = [
            () => import('../pages/user/Dashboard'),
            () => import('../pages/user/Profile'),
            () => import('../pages/user/Notifications'),
        ];

        // User-specific routes
        const userRoutes = [
            () => import('../pages/user/Chat'),
            () => import('../pages/user/Weather'),
            () => import('../pages/user/Market'),
            () => import('../pages/user/Schemes'),
        ];

        // Admin-specific routes
        const adminRoutes = [
            () => import('../pages/admin/AdminDashboard'),
            () => import('../pages/admin/Users'),
            () => import('../pages/admin/Monitoring'),
        ];

        const routesToPrefetch = [
            ...commonRoutes,
            ...(userRole === 'admin' ? adminRoutes : userRoutes),
        ];

        // Prefetch after a short delay to not interfere with initial page load
        prefetchOnIdle(routesToPrefetch);
    }, [userRole]);
};

/**
 * Example usage:
 * 
 * // Prefetch components on mount
 * usePrefetch([
 *   () => import('./HeavyComponent1'),
 *   () => import('./HeavyComponent2'),
 * ]);
 * 
 * // Prefetch immediately with delay
 * usePrefetch([
 *   () => import('./Component'),
 * ], { immediate: true, delay: 2000 });
 * 
 * // Prefetch on hover
 * const handlePrefetch = usePrefetchOnHover(() => import('./Component'));
 * <Link to="/page" onMouseEnter={handlePrefetch}>Page</Link>
 * 
 * // Prefetch routes based on user role
 * const user = useSelector(state => state.auth.user);
 * usePrefetchRoutes(user?.role);
 */
