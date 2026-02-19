import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from './auth';
import { authService } from '@/services/auth.service';
import type { User } from '@/types/user.types';

// Mock the auth service
vi.mock('@/services/auth.service', () => ({
    authService: {
        login: vi.fn(),
        register: vi.fn(),
        getCurrentUser: vi.fn(),
        updateProfile: vi.fn(),
        logout: vi.fn(),
        getToken: vi.fn(),
        setToken: vi.fn(),
        removeToken: vi.fn(),
        isTokenExpired: vi.fn(),
        refreshToken: vi.fn(),
    },
}));

describe('Auth Store', () => {
    beforeEach(() => {
        // Create a fresh pinia instance for each test
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('Initial State', () => {
        it('should initialize with correct default state', () => {
            const store = useAuthStore();

            expect(store.user).toBeNull();
            expect(store.isAuthenticated).toBe(false);
            expect(store.isLoading).toBe(false);
            expect(store.error).toBeNull();
        });

        it('should load token from authService on initialization', () => {
            vi.mocked(authService.getToken).mockReturnValue('test-token');
            const store = useAuthStore();

            expect(store.token).toBe('test-token');
        });
    });

    describe('Getters', () => {
        it('isAdmin should return true when user role is admin', () => {
            const store = useAuthStore();
            store.user = {
                id: '1',
                phone_number: '+1234567890',
                name: 'Admin User',
                role: 'admin',
                preferred_language: 'en',
                is_active: true,
            };

            expect(store.isAdmin).toBe(true);
        });

        it('isAdmin should return false when user role is not admin', () => {
            const store = useAuthStore();
            store.user = {
                id: '1',
                phone_number: '+1234567890',
                name: 'Regular User',
                role: 'user',
                preferred_language: 'en',
                is_active: true,
            };

            expect(store.isAdmin).toBe(false);
        });

        it('userName should return user full name', () => {
            const store = useAuthStore();
            store.user = {
                id: '1',
                phone_number: '+1234567890',
                name: 'John Doe',
                role: 'user',
                preferred_language: 'en',
                is_active: true,
            };

            expect(store.userName).toBe('John Doe');
        });

        it('userName should return empty string when user is null', () => {
            const store = useAuthStore();
            expect(store.userName).toBe('');
        });

        it('userLanguage should return user language preference', () => {
            const store = useAuthStore();
            store.user = {
                id: '1',
                phone_number: '+1234567890',
                name: 'John Doe',
                role: 'user',
                preferred_language: 'hi',
                is_active: true,
            };

            expect(store.userLanguage).toBe('hi');
        });

        it('userLanguage should return "en" as default when user is null', () => {
            const store = useAuthStore();
            expect(store.userLanguage).toBe('en');
        });
    });

    describe('Actions - Login', () => {
        it('should successfully login user', async () => {
            const store = useAuthStore();
            const mockUser: User = {
                id: '1',
                phone_number: '+1234567890',
                name: 'John Doe',
                role: 'user',
                preferred_language: 'en',
                is_active: true,
            };

            vi.mocked(authService.login).mockResolvedValue({
                access_token: 'test-token',
                token_type: 'Bearer',
                user: mockUser,
            });

            await store.login({
                phone_number: '+1234567890',
                password: 'password123',
            });

            expect(store.user).toEqual(mockUser);
            expect(store.token).toBe('test-token');
            expect(store.isAuthenticated).toBe(true);
            expect(store.error).toBeNull();
        });

        it('should handle login failure', async () => {
            const store = useAuthStore();
            const error = new Error('Invalid credentials');

            vi.mocked(authService.login).mockRejectedValue(error);

            try {
                await store.login({
                    phone_number: '+1234567890',
                    password: 'wrong-password',
                });
            } catch (e) {
                // Expected to throw
            }

            expect(store.user).toBeNull();
            expect(store.isAuthenticated).toBe(false);
            expect(store.isLoading).toBe(false);
        });
    });

    describe('Actions - Register', () => {
        it('should successfully register user', async () => {
            const store = useAuthStore();
            const mockUser: User = {
                id: '1',
                phone_number: '+1234567890',
                name: 'John Doe',
                role: 'user',
                preferred_language: 'en',
                is_active: true,
            };

            vi.mocked(authService.register).mockResolvedValue(mockUser);

            await store.register({
                phone_number: '+1234567890',
                password: 'password123',
                name: 'John Doe',
            });

            // Note: Registration doesn't set user/token, user must login after
            expect(store.isAuthenticated).toBe(false);
        });
    });

    describe('Actions - Fetch Current User', () => {
        it('should successfully fetch current user', async () => {
            const store = useAuthStore();
            const mockUser: User = {
                id: '1',
                phone_number: '+1234567890',
                name: 'John Doe',
                role: 'user',
                preferred_language: 'en',
                is_active: true,
            };

            vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);

            await store.fetchCurrentUser();

            expect(store.user).toEqual(mockUser);
            expect(store.isAuthenticated).toBe(true);
        });
    });

    describe('Actions - Logout', () => {
        it('should successfully logout user', async () => {
            const store = useAuthStore();
            store.user = {
                id: '1',
                phone_number: '+1234567890',
                name: 'John Doe',
                role: 'user',
                preferred_language: 'en',
                is_active: true,
            };
            store.token = 'test-token';
            store.isAuthenticated = true;

            vi.mocked(authService.logout).mockResolvedValue();

            await store.logout();

            expect(store.user).toBeNull();
            expect(store.token).toBeNull();
            expect(store.isAuthenticated).toBe(false);
            expect(authService.removeToken).toHaveBeenCalled();
        });
    });

    describe('Actions - Clear Auth', () => {
        it('should clear all authentication state', () => {
            const store = useAuthStore();
            store.user = {
                id: '1',
                phone_number: '+1234567890',
                name: 'John Doe',
                role: 'user',
                preferred_language: 'en',
                is_active: true,
            };
            store.token = 'test-token';
            store.isAuthenticated = true;

            store.clearAuth();

            expect(store.user).toBeNull();
            expect(store.token).toBeNull();
            expect(store.isAuthenticated).toBe(false);
            expect(authService.removeToken).toHaveBeenCalled();
        });
    });
});

