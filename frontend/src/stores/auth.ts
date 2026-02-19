import { defineStore } from 'pinia';
import { authService, type LoginCredentials, type RegisterData } from '@/services/auth.service';
import type { User } from '@/types/user.types';

/**
 * Authentication State Interface
 */
export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

/**
 * Auth Store
 * Manages authentication state and user information
 */
export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        user: null,
        token: authService.getToken(),
        isAuthenticated: false,
        isLoading: false,
        error: null,
    }),

    getters: {
        /**
         * Check if current user is an admin
         */
        isAdmin: (state): boolean => {
            return state.user?.role === 'admin';
        },

        /**
         * Get user's name
         */
        userName: (state): string => {
            return state.user?.name || '';
        },

        /**
         * Get user's language preference
         */
        userLanguage: (state): string => {
            return state.user?.preferred_language || 'en';
        },

        /**
         * Check if token is expired
         */
        isTokenExpired: (): boolean => {
            return authService.isTokenExpired();
        },
    },

    actions: {
        /**
         * Login user with credentials
         * @param credentials - User login credentials
         */
        async login(credentials: LoginCredentials): Promise<void> {
            this.isLoading = true;
            this.error = null;

            try {
                const response = await authService.login(credentials);

                // Update state
                this.token = response.access_token;
                this.user = response.user;
                this.isAuthenticated = true;
            } catch (error: any) {
                this.error = error.message || 'Login failed';
                this.clearAuth();
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Register new user
         * Note: Backend returns user data without token, user must login after registration
         * @param data - User registration data
         */
        async register(data: RegisterData): Promise<void> {
            this.isLoading = true;
            this.error = null;

            try {
                // Register user (returns user data without token)
                await authService.register(data);

                // Registration successful, but user needs to login
                // The calling component should redirect to login or auto-login
            } catch (error: any) {
                this.error = error.message || 'Registration failed';
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Fetch current authenticated user
         */
        async fetchCurrentUser(): Promise<void> {
            this.isLoading = true;
            this.error = null;

            try {
                const user = await authService.getCurrentUser();

                // Update state
                this.user = user;
                this.isAuthenticated = true;
            } catch (error: any) {
                this.error = error.message || 'Failed to fetch user';
                this.clearAuth();
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Update user profile
         * @param data - Partial user data to update
         */
        async updateProfile(data: Partial<User>): Promise<void> {
            this.isLoading = true;
            this.error = null;

            try {
                const updatedUser = await authService.updateProfile(data);

                // Update state
                this.user = updatedUser;
            } catch (error: any) {
                this.error = error.message || 'Failed to update profile';
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Logout user
         */
        async logout(): Promise<void> {
            this.isLoading = true;
            this.error = null;

            try {
                await authService.logout();
            } catch (error: any) {
                this.error = error.message || 'Logout failed';
                // Continue with logout even if API call fails
                console.error('Logout error:', error);
            } finally {
                this.clearAuth();
                this.isLoading = false;
            }
        },

        /**
         * Set JWT token
         * @param token - JWT token string
         */
        setToken(token: string): void {
            this.token = token;
            authService.setToken(token);
        },

        /**
         * Clear authentication state
         */
        clearAuth(): void {
            this.user = null;
            this.token = null;
            this.isAuthenticated = false;
            this.error = null;
            authService.removeToken();
        },

        /**
         * Initialize auth state from stored token
         * Attempts to restore session if valid token exists
         */
        async initializeAuth(): Promise<void> {
            const token = authService.getToken();

            if (token && !authService.isTokenExpired()) {
                try {
                    await this.fetchCurrentUser();
                } catch (error) {
                    // If fetching user fails, clear auth
                    this.clearAuth();
                }
            } else {
                // No valid token, clear auth
                this.clearAuth();
            }
        },

        /**
         * Refresh authentication token
         */
        async refreshToken(): Promise<void> {
            try {
                const newToken = await authService.refreshToken();
                this.token = newToken;
            } catch (error: any) {
                this.error = error.message || 'Token refresh failed';
                this.clearAuth();
                throw error;
            }
        },
    },
});
