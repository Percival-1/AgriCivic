import { createSlice } from '@reduxjs/toolkit';

/**
 * Authentication Slice
 * 
 * Manages authentication state including:
 * - User authentication status
 * - JWT token storage and persistence
 * - User information
 * - Loading and error states
 * 
 * Token is persisted to localStorage for session management
 */

// Helper functions for localStorage
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

const loadTokenFromStorage = () => {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        return token || null;
    } catch (error) {
        console.error('Error loading token from localStorage:', error);
        return null;
    }
};

const saveTokenToStorage = (token) => {
    try {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    } catch (error) {
        console.error('Error saving token to localStorage:', error);
    }
};

const loadUserFromStorage = () => {
    try {
        const userJson = localStorage.getItem(USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
        console.error('Error loading user from localStorage:', error);
        return null;
    }
};

const saveUserToStorage = (user) => {
    try {
        if (user) {
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(USER_KEY);
        }
    } catch (error) {
        console.error('Error saving user to localStorage:', error);
    }
};

// Initial state
const initialState = {
    // Authentication status
    isAuthenticated: !!loadTokenFromStorage(),

    // JWT token
    token: loadTokenFromStorage(),

    // Current user information
    user: loadUserFromStorage(),

    // Loading state for async operations
    loading: false,

    // Error state
    error: null,

    // Token expiration timestamp
    tokenExpiry: null,
};

/**
 * Auth Slice
 */
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        /**
         * Set authentication token
         * Persists token to localStorage
         */
        setToken: (state, action) => {
            const token = action.payload;
            state.token = token;
            state.isAuthenticated = !!token;
            saveTokenToStorage(token);

            // Clear error on successful token set
            state.error = null;
        },

        /**
         * Set current user information
         * Persists user to localStorage
         */
        setUser: (state, action) => {
            const user = action.payload;
            state.user = user;
            saveUserToStorage(user);

            // Clear error on successful user set
            state.error = null;
        },

        /**
         * Login action
         * Sets both token and user, marks as authenticated
         */
        login: (state, action) => {
            const { token, user, expiresIn } = action.payload;

            state.token = token;
            state.user = user;
            state.isAuthenticated = true;
            state.loading = false;
            state.error = null;

            // Calculate token expiry if provided
            if (expiresIn) {
                state.tokenExpiry = Date.now() + expiresIn * 1000;
            }

            // Persist to localStorage
            saveTokenToStorage(token);
            saveUserToStorage(user);
        },

        /**
         * Logout action
         * Clears all authentication state and localStorage
         */
        logout: (state) => {
            state.token = null;
            state.user = null;
            state.isAuthenticated = false;
            state.loading = false;
            state.error = null;
            state.tokenExpiry = null;

            // Clear localStorage
            saveTokenToStorage(null);
            saveUserToStorage(null);
        },

        /**
         * Set loading state
         */
        setLoading: (state, action) => {
            state.loading = action.payload;
        },

        /**
         * Set error state
         */
        setError: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },

        /**
         * Clear error state
         */
        clearError: (state) => {
            state.error = null;
        },

        /**
         * Update user profile
         * Merges new data with existing user
         */
        updateUser: (state, action) => {
            if (state.user) {
                state.user = {
                    ...state.user,
                    ...action.payload,
                };
                saveUserToStorage(state.user);
            }
        },

        /**
         * Set token expiry
         */
        setTokenExpiry: (state, action) => {
            state.tokenExpiry = action.payload;
        },

        /**
         * Check if token is expired
         * This is a helper that can be called to validate token
         */
        checkTokenExpiry: (state) => {
            if (state.tokenExpiry && Date.now() >= state.tokenExpiry) {
                // Token expired, logout
                state.token = null;
                state.user = null;
                state.isAuthenticated = false;
                state.tokenExpiry = null;
                state.error = 'Session expired. Please login again.';

                // Clear localStorage
                saveTokenToStorage(null);
                saveUserToStorage(null);
            }
        },
    },
});

// Export actions
export const {
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
} = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectToken = (state) => state.auth.token;
export const selectUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectTokenExpiry = (state) => state.auth.tokenExpiry;

// Export reducer
export default authSlice.reducer;
