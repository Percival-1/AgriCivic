import { createSlice } from '@reduxjs/toolkit';

/**
 * User Slice
 * 
 * Manages current user data and preferences including:
 * - User profile information (name, location, crops, land size)
 * - User preferences (language, dashboard settings, notifications)
 * - Profile completion status
 * - Loading and error states for user operations
 * 
 * User preferences are persisted to localStorage
 */

// Helper functions for localStorage
const USER_PREFERENCES_KEY = 'user_preferences';
const DASHBOARD_PREFERENCES_KEY = 'dashboard_preferences';

const loadPreferencesFromStorage = () => {
    try {
        const preferencesJson = localStorage.getItem(USER_PREFERENCES_KEY);
        return preferencesJson ? JSON.parse(preferencesJson) : null;
    } catch (error) {
        console.error('Error loading preferences from localStorage:', error);
        return null;
    }
};

const savePreferencesToStorage = (preferences) => {
    try {
        if (preferences) {
            localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(preferences));
        } else {
            localStorage.removeItem(USER_PREFERENCES_KEY);
        }
    } catch (error) {
        console.error('Error saving preferences to localStorage:', error);
    }
};

const loadDashboardPreferencesFromStorage = () => {
    try {
        const preferencesJson = localStorage.getItem(DASHBOARD_PREFERENCES_KEY);
        return preferencesJson ? JSON.parse(preferencesJson) : null;
    } catch (error) {
        console.error('Error loading dashboard preferences from localStorage:', error);
        return null;
    }
};

const saveDashboardPreferencesToStorage = (preferences) => {
    try {
        if (preferences) {
            localStorage.setItem(DASHBOARD_PREFERENCES_KEY, JSON.stringify(preferences));
        } else {
            localStorage.removeItem(DASHBOARD_PREFERENCES_KEY);
        }
    } catch (error) {
        console.error('Error saving dashboard preferences to localStorage:', error);
    }
};

// Initial state
const initialState = {
    // Current user profile data
    profile: null,

    // User preferences
    preferences: loadPreferencesFromStorage() || {
        language: 'en',
        theme: 'light',
        notifications: {
            email: true,
            sms: true,
            push: true,
            weather: true,
            market: true,
            schemes: true,
        },
    },

    // Dashboard preferences
    dashboardPreferences: loadDashboardPreferencesFromStorage() || {
        widgets: ['weather', 'market', 'schemes', 'notifications'],
        layout: 'grid',
        showWelcome: true,
    },

    // Profile completion status
    profileComplete: false,
    profileCompletionPercentage: 0,

    // Loading states
    loading: false,
    updating: false,

    // Error state
    error: null,

    // Last updated timestamp
    lastUpdated: null,
};

/**
 * User Slice
 */
const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        /**
         * Set user profile data
         */
        setProfile: (state, action) => {
            state.profile = action.payload;
            state.lastUpdated = Date.now();
            state.error = null;

            // Calculate profile completion
            if (action.payload) {
                const requiredFields = ['name', 'location', 'crops', 'land_size', 'language'];
                const completedFields = requiredFields.filter(
                    (field) => action.payload[field] && action.payload[field] !== ''
                );
                state.profileCompletionPercentage = Math.round(
                    (completedFields.length / requiredFields.length) * 100
                );
                state.profileComplete = state.profileCompletionPercentage === 100;
            }
        },

        /**
         * Update user profile
         * Merges new data with existing profile
         */
        updateProfile: (state, action) => {
            if (state.profile) {
                state.profile = {
                    ...state.profile,
                    ...action.payload,
                };
            } else {
                state.profile = action.payload;
            }
            state.lastUpdated = Date.now();
            state.error = null;

            // Recalculate profile completion
            if (state.profile) {
                const requiredFields = ['name', 'location', 'crops', 'land_size', 'language'];
                const completedFields = requiredFields.filter(
                    (field) => state.profile[field] && state.profile[field] !== ''
                );
                state.profileCompletionPercentage = Math.round(
                    (completedFields.length / requiredFields.length) * 100
                );
                state.profileComplete = state.profileCompletionPercentage === 100;
            }
        },

        /**
         * Set user preferences
         */
        setPreferences: (state, action) => {
            state.preferences = {
                ...state.preferences,
                ...action.payload,
            };
            savePreferencesToStorage(state.preferences);
            state.error = null;
        },

        /**
         * Update language preference
         */
        setLanguage: (state, action) => {
            state.preferences.language = action.payload;
            savePreferencesToStorage(state.preferences);
        },

        /**
         * Update theme preference
         */
        setTheme: (state, action) => {
            state.preferences.theme = action.payload;
            savePreferencesToStorage(state.preferences);
        },

        /**
         * Update notification preferences
         */
        setNotificationPreferences: (state, action) => {
            state.preferences.notifications = {
                ...state.preferences.notifications,
                ...action.payload,
            };
            savePreferencesToStorage(state.preferences);
        },

        /**
         * Set dashboard preferences
         */
        setDashboardPreferences: (state, action) => {
            state.dashboardPreferences = {
                ...state.dashboardPreferences,
                ...action.payload,
            };
            saveDashboardPreferencesToStorage(state.dashboardPreferences);
        },

        /**
         * Update dashboard widgets
         */
        setDashboardWidgets: (state, action) => {
            state.dashboardPreferences.widgets = action.payload;
            saveDashboardPreferencesToStorage(state.dashboardPreferences);
        },

        /**
         * Update dashboard layout
         */
        setDashboardLayout: (state, action) => {
            state.dashboardPreferences.layout = action.payload;
            saveDashboardPreferencesToStorage(state.dashboardPreferences);
        },

        /**
         * Toggle welcome message visibility
         */
        toggleWelcomeMessage: (state) => {
            state.dashboardPreferences.showWelcome = !state.dashboardPreferences.showWelcome;
            saveDashboardPreferencesToStorage(state.dashboardPreferences);
        },

        /**
         * Set loading state
         */
        setLoading: (state, action) => {
            state.loading = action.payload;
        },

        /**
         * Set updating state
         */
        setUpdating: (state, action) => {
            state.updating = action.payload;
        },

        /**
         * Set error state
         */
        setError: (state, action) => {
            state.error = action.payload;
            state.loading = false;
            state.updating = false;
        },

        /**
         * Clear error state
         */
        clearError: (state) => {
            state.error = null;
        },

        /**
         * Clear user data
         * Used on logout
         */
        clearUserData: (state) => {
            state.profile = null;
            state.profileComplete = false;
            state.profileCompletionPercentage = 0;
            state.loading = false;
            state.updating = false;
            state.error = null;
            state.lastUpdated = null;
            // Note: preferences are kept even after logout
        },

        /**
         * Reset all user state including preferences
         * Complete reset for new user
         */
        resetUserState: (state) => {
            state.profile = null;
            state.preferences = {
                language: 'en',
                theme: 'light',
                notifications: {
                    email: true,
                    sms: true,
                    push: true,
                    weather: true,
                    market: true,
                    schemes: true,
                },
            };
            state.dashboardPreferences = {
                widgets: ['weather', 'market', 'schemes', 'notifications'],
                layout: 'grid',
                showWelcome: true,
            };
            state.profileComplete = false;
            state.profileCompletionPercentage = 0;
            state.loading = false;
            state.updating = false;
            state.error = null;
            state.lastUpdated = null;

            // Clear localStorage
            savePreferencesToStorage(null);
            saveDashboardPreferencesToStorage(null);
        },

        /**
         * Set profile completion status
         */
        setProfileComplete: (state, action) => {
            state.profileComplete = action.payload;
        },
    },
});

// Export actions
export const {
    setProfile,
    updateProfile,
    setPreferences,
    setLanguage,
    setTheme,
    setNotificationPreferences,
    setDashboardPreferences,
    setDashboardWidgets,
    setDashboardLayout,
    toggleWelcomeMessage,
    setLoading,
    setUpdating,
    setError,
    clearError,
    clearUserData,
    resetUserState,
    setProfileComplete,
} = userSlice.actions;

// Selectors
export const selectUser = (state) => state.user;
export const selectProfile = (state) => state.user.profile;
export const selectPreferences = (state) => state.user.preferences;
export const selectLanguage = (state) => state.user.preferences.language;
export const selectTheme = (state) => state.user.preferences.theme;
export const selectNotificationPreferences = (state) => state.user.preferences.notifications;
export const selectDashboardPreferences = (state) => state.user.dashboardPreferences;
export const selectDashboardWidgets = (state) => state.user.dashboardPreferences.widgets;
export const selectDashboardLayout = (state) => state.user.dashboardPreferences.layout;
export const selectShowWelcome = (state) => state.user.dashboardPreferences.showWelcome;
export const selectProfileComplete = (state) => state.user.profileComplete;
export const selectProfileCompletionPercentage = (state) => state.user.profileCompletionPercentage;
export const selectUserLoading = (state) => state.user.loading;
export const selectUserUpdating = (state) => state.user.updating;
export const selectUserError = (state) => state.user.error;
export const selectLastUpdated = (state) => state.user.lastUpdated;

// Export reducer
export default userSlice.reducer;
