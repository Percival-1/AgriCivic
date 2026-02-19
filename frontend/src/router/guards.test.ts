import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authGuard, adminGuard } from './guards';
import { useAuthStore } from '@/stores/auth';
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router';
import { setActivePinia, createPinia } from 'pinia';

// Mock route objects
const createMockRoute = (
    name: string,
    requiresAuth = false,
    requiresAdmin = false
): RouteLocationNormalized => ({
    name,
    path: `/${name}`,
    fullPath: `/${name}`,
    params: {},
    query: {},
    hash: '',
    matched: [
        {
            meta: { requiresAuth, requiresAdmin },
        } as any,
    ],
    redirectedFrom: undefined,
    meta: { requiresAuth, requiresAdmin },
});

describe('Router Guards', () => {
    let authStore: ReturnType<typeof useAuthStore>;
    let nextMock: NavigationGuardNext;

    beforeEach(() => {
        setActivePinia(createPinia());
        authStore = useAuthStore();
        nextMock = vi.fn() as any;
    });

    describe('authGuard', () => {
        it('should allow access to public routes', async () => {
            const to = createMockRoute('login', false);
            const from = createMockRoute('home', false);

            await authGuard(to, from, nextMock);

            expect(nextMock).toHaveBeenCalledWith();
        });

        it('should redirect to login when accessing protected route without authentication', async () => {
            const to = createMockRoute('dashboard', true);
            const from = createMockRoute('home', false);

            authStore.isAuthenticated = false;
            authStore.token = null;

            await authGuard(to, from, nextMock);

            expect(nextMock).toHaveBeenCalledWith({
                name: 'Login',
                query: { redirect: '/dashboard' },
            });
        });

        it('should allow access to protected route when authenticated', async () => {
            const to = createMockRoute('dashboard', true);
            const from = createMockRoute('home', false);

            authStore.isAuthenticated = true;
            authStore.user = {
                id: '1',
                phone_number: '+1234567890',
                name: 'Test User',
                role: 'user',
                preferred_language: 'en',
                is_active: true,
            };

            await authGuard(to, from, nextMock);

            expect(nextMock).toHaveBeenCalledWith();
        });

        it('should redirect to dashboard when authenticated user tries to access login', async () => {
            const to = createMockRoute('login', false);
            const from = createMockRoute('home', false);
            to.name = 'Login';

            authStore.isAuthenticated = true;

            await authGuard(to, from, nextMock);

            expect(nextMock).toHaveBeenCalledWith({ name: 'Dashboard' });
        });
    });

    describe('adminGuard', () => {
        it('should allow access to non-admin routes', () => {
            const to = createMockRoute('dashboard', true, false);
            const from = createMockRoute('home', false);

            adminGuard(to, from, nextMock);

            expect(nextMock).toHaveBeenCalledWith();
        });

        it('should redirect to dashboard when non-admin tries to access admin route', () => {
            const to = createMockRoute('admin', true, true);
            const from = createMockRoute('dashboard', true);

            authStore.user = {
                id: '1',
                phone_number: '+1234567890',
                name: 'Test User',
                role: 'user',
                preferred_language: 'en',
                is_active: true,
            };

            adminGuard(to, from, nextMock);

            expect(nextMock).toHaveBeenCalledWith({ name: 'Dashboard' });
        });

        it('should allow access to admin route when user is admin', () => {
            const to = createMockRoute('admin', true, true);
            const from = createMockRoute('dashboard', true);

            authStore.user = {
                id: '1',
                phone_number: '+1234567890',
                name: 'Admin User',
                role: 'admin',
                preferred_language: 'en',
                is_active: true,
            };

            adminGuard(to, from, nextMock);

            expect(nextMock).toHaveBeenCalledWith();
        });
    });
});
