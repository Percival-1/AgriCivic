import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

/**
 * Authentication Guard
 * Protects routes that require authentication
 * Redirects to login if user is not authenticated
 * Preserves the intended destination in query parameters
 */
export async function authGuard(
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
): Promise<void> {
    const authStore = useAuthStore();
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

    // If route requires authentication
    if (requiresAuth) {
        // Check if user is already authenticated
        if (authStore.isAuthenticated) {
            next();
            return;
        }

        // Try to restore session from token
        const token = authStore.token;
        if (token && !authStore.isTokenExpired) {
            try {
                // Attempt to fetch current user to validate token
                await authStore.fetchCurrentUser();
                next();
                return;
            } catch (error) {
                // Token is invalid, clear auth state
                authStore.clearAuth();
            }
        }

        // No valid authentication, redirect to login
        // Preserve the intended destination for redirect after login
        next({
            name: 'Login',
            query: { redirect: to.fullPath },
        });
        return;
    }

    // If route is login/register and user is already authenticated
    if ((to.name === 'Login' || to.name === 'Register') && authStore.isAuthenticated) {
        // Redirect to dashboard instead
        next({ name: 'Dashboard' });
        return;
    }

    // Route doesn't require authentication, proceed
    next();
}

/**
 * Admin Guard
 * Protects routes that require admin role
 * Redirects to dashboard if user is not an admin
 */
export function adminGuard(
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
): void {
    const authStore = useAuthStore();
    const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin);

    // If route requires admin role
    if (requiresAdmin) {
        // Check if user has admin role
        if (authStore.isAdmin) {
            next();
            return;
        }

        // User is not admin, redirect to dashboard
        next({ name: 'Dashboard' });
        return;
    }

    // Route doesn't require admin role, proceed
    next();
}
