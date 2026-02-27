import { describe, it, expect, beforeEach, vi } from 'vitest';
import authReducer, {
    setToken,
    setUser,
    login,
    logout,
    setLoading,
    setError,
    clearError,
    updateUser,
    setTokenExpiry,
    checkTokenExpiry,
    selectAuth,
    selectIsAuthenticated,
    selectToken,
    selectUser,
    selectAuthLoading,
    selectAuthError,
    selectTokenExpiry,
} from './authSlice';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();

global.localStorage = localStorageMock;

describe('authSlice', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('initial state', () => {
        it('should have correct initial state when no token in localStorage', () => {
            const state = authReducer(undefined, { type: '@@INIT' });

            expect(state).toEqual({
                isAuthenticated: false,
                token: null,
                user: null,
                loading: false,
                error: null,
                tokenExpiry: null,
            });
        });
    });

    describe('setToken', () => {
        it('should set token and mark as authenticated', () => {
            const token = 'test-jwt-token';
            const state = authReducer(undefined, setToken(token));

            expect(state.token).toBe(token);
            expect(state.isAuthenticated).toBe(true);
            expect(state.error).toBe(null);
            expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', token);
        });

        it('should clear token when null is provided', () => {
            const initialState = {
                isAuthenticated: true,
                token: 'old-token',
                user: null,
                loading: false,
                error: null,
                tokenExpiry: null,
            };

            const state = authReducer(initialState, setToken(null));

            expect(state.token).toBe(null);
            expect(state.isAuthenticated).toBe(false);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
        });
    });

    describe('setUser', () => {
        it('should set user information', () => {
            const user = {
                id: '123',
                phone: '+1234567890',
                name: 'Test User',
                role: 'user',
            };

            const state = authReducer(undefined, setUser(user));

            expect(state.user).toEqual(user);
            expect(state.error).toBe(null);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'auth_user',
                JSON.stringify(user)
            );
        });

        it('should clear user when null is provided', () => {
            const initialState = {
                isAuthenticated: false,
                token: null,
                user: { id: '123', name: 'Test' },
                loading: false,
                error: null,
                tokenExpiry: null,
            };

            const state = authReducer(initialState, setUser(null));

            expect(state.user).toBe(null);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
        });
    });

    describe('login', () => {
        it('should set token, user, and authentication state', () => {
            const payload = {
                token: 'jwt-token',
                user: {
                    id: '123',
                    phone: '+1234567890',
                    name: 'Test User',
                },
            };

            const state = authReducer(undefined, login(payload));

            expect(state.token).toBe(payload.token);
            expect(state.user).toEqual(payload.user);
            expect(state.isAuthenticated).toBe(true);
            expect(state.loading).toBe(false);
            expect(state.error).toBe(null);
            expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', payload.token);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'auth_user',
                JSON.stringify(payload.user)
            );
        });

        it('should calculate token expiry when expiresIn is provided', () => {
            const now = Date.now();
            const expiresIn = 3600; // 1 hour in seconds

            const payload = {
                token: 'jwt-token',
                user: { id: '123' },
                expiresIn,
            };

            const state = authReducer(undefined, login(payload));

            expect(state.tokenExpiry).toBeGreaterThanOrEqual(now + expiresIn * 1000);
            expect(state.tokenExpiry).toBeLessThanOrEqual(now + expiresIn * 1000 + 100);
        });
    });

    describe('logout', () => {
        it('should clear all authentication state', () => {
            const initialState = {
                isAuthenticated: true,
                token: 'jwt-token',
                user: { id: '123', name: 'Test' },
                loading: false,
                error: null,
                tokenExpiry: Date.now() + 3600000,
            };

            const state = authReducer(initialState, logout());

            expect(state.token).toBe(null);
            expect(state.user).toBe(null);
            expect(state.isAuthenticated).toBe(false);
            expect(state.loading).toBe(false);
            expect(state.error).toBe(null);
            expect(state.tokenExpiry).toBe(null);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
        });
    });

    describe('setLoading', () => {
        it('should set loading state to true', () => {
            const state = authReducer(undefined, setLoading(true));
            expect(state.loading).toBe(true);
        });

        it('should set loading state to false', () => {
            const initialState = {
                isAuthenticated: false,
                token: null,
                user: null,
                loading: true,
                error: null,
                tokenExpiry: null,
            };

            const state = authReducer(initialState, setLoading(false));
            expect(state.loading).toBe(false);
        });
    });

    describe('setError', () => {
        it('should set error message and clear loading', () => {
            const initialState = {
                isAuthenticated: false,
                token: null,
                user: null,
                loading: true,
                error: null,
                tokenExpiry: null,
            };

            const errorMessage = 'Authentication failed';
            const state = authReducer(initialState, setError(errorMessage));

            expect(state.error).toBe(errorMessage);
            expect(state.loading).toBe(false);
        });
    });

    describe('clearError', () => {
        it('should clear error state', () => {
            const initialState = {
                isAuthenticated: false,
                token: null,
                user: null,
                loading: false,
                error: 'Some error',
                tokenExpiry: null,
            };

            const state = authReducer(initialState, clearError());
            expect(state.error).toBe(null);
        });
    });

    describe('updateUser', () => {
        it('should merge new user data with existing user', () => {
            const initialState = {
                isAuthenticated: true,
                token: 'token',
                user: {
                    id: '123',
                    name: 'Old Name',
                    phone: '+1234567890',
                },
                loading: false,
                error: null,
                tokenExpiry: null,
            };

            const updates = {
                name: 'New Name',
                location: 'New Location',
            };

            const state = authReducer(initialState, updateUser(updates));

            expect(state.user).toEqual({
                id: '123',
                name: 'New Name',
                phone: '+1234567890',
                location: 'New Location',
            });
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'auth_user',
                JSON.stringify(state.user)
            );
        });

        it('should not update if user is null', () => {
            const initialState = {
                isAuthenticated: false,
                token: null,
                user: null,
                loading: false,
                error: null,
                tokenExpiry: null,
            };

            const state = authReducer(initialState, updateUser({ name: 'Test' }));
            expect(state.user).toBe(null);
        });
    });

    describe('setTokenExpiry', () => {
        it('should set token expiry timestamp', () => {
            const expiry = Date.now() + 3600000;
            const state = authReducer(undefined, setTokenExpiry(expiry));

            expect(state.tokenExpiry).toBe(expiry);
        });
    });

    describe('checkTokenExpiry', () => {
        it('should logout if token is expired', () => {
            const initialState = {
                isAuthenticated: true,
                token: 'jwt-token',
                user: { id: '123' },
                loading: false,
                error: null,
                tokenExpiry: Date.now() - 1000, // Expired 1 second ago
            };

            const state = authReducer(initialState, checkTokenExpiry());

            expect(state.token).toBe(null);
            expect(state.user).toBe(null);
            expect(state.isAuthenticated).toBe(false);
            expect(state.tokenExpiry).toBe(null);
            expect(state.error).toBe('Session expired. Please login again.');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
        });

        it('should not logout if token is not expired', () => {
            const initialState = {
                isAuthenticated: true,
                token: 'jwt-token',
                user: { id: '123' },
                loading: false,
                error: null,
                tokenExpiry: Date.now() + 3600000, // Expires in 1 hour
            };

            const state = authReducer(initialState, checkTokenExpiry());

            expect(state.token).toBe('jwt-token');
            expect(state.user).toEqual({ id: '123' });
            expect(state.isAuthenticated).toBe(true);
        });

        it('should not logout if tokenExpiry is null', () => {
            const initialState = {
                isAuthenticated: true,
                token: 'jwt-token',
                user: { id: '123' },
                loading: false,
                error: null,
                tokenExpiry: null,
            };

            const state = authReducer(initialState, checkTokenExpiry());

            expect(state.token).toBe('jwt-token');
            expect(state.isAuthenticated).toBe(true);
        });
    });

    describe('selectors', () => {
        const mockState = {
            auth: {
                isAuthenticated: true,
                token: 'jwt-token',
                user: { id: '123', name: 'Test User' },
                loading: false,
                error: null,
                tokenExpiry: Date.now() + 3600000,
            },
        };

        it('selectAuth should return auth state', () => {
            expect(selectAuth(mockState)).toEqual(mockState.auth);
        });

        it('selectIsAuthenticated should return authentication status', () => {
            expect(selectIsAuthenticated(mockState)).toBe(true);
        });

        it('selectToken should return token', () => {
            expect(selectToken(mockState)).toBe('jwt-token');
        });

        it('selectUser should return user', () => {
            expect(selectUser(mockState)).toEqual({ id: '123', name: 'Test User' });
        });

        it('selectAuthLoading should return loading state', () => {
            expect(selectAuthLoading(mockState)).toBe(false);
        });

        it('selectAuthError should return error', () => {
            expect(selectAuthError(mockState)).toBe(null);
        });

        it('selectTokenExpiry should return token expiry', () => {
            expect(selectTokenExpiry(mockState)).toBe(mockState.auth.tokenExpiry);
        });
    });
});
