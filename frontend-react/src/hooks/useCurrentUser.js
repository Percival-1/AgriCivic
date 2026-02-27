import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    setProfile,
    setLoading,
    setError,
    clearError,
    selectProfile,
    selectUserLoading,
    selectUserError,
    selectProfileComplete,
    selectProfileCompletionPercentage,
} from '../store/slices/userSlice';
import { selectIsAuthenticated, selectToken } from '../store/slices/authSlice';
import userService from '../api/services/userService';

/**
 * Custom hook for managing current user data
 * 
 * Provides:
 * - Automatic fetching of current user data on mount
 * - Loading and error states
 * - Auto-refresh functionality
 * - Profile completion status
 * - Manual refresh capability
 * 
 * Requirements: 2.4, 19.1
 */
export const useCurrentUser = (options = {}) => {
    const {
        autoFetch = true,           // Automatically fetch on mount
        refreshInterval = null,     // Auto-refresh interval in milliseconds (null = disabled)
        onSuccess = null,           // Callback on successful fetch
        onError = null,             // Callback on error
    } = options;

    const dispatch = useDispatch();

    // Select state from Redux store
    const profile = useSelector(selectProfile);
    const loading = useSelector(selectUserLoading);
    const error = useSelector(selectUserError);
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const token = useSelector(selectToken);
    const profileComplete = useSelector(selectProfileComplete);
    const profileCompletionPercentage = useSelector(selectProfileCompletionPercentage);

    // Refs for cleanup and preventing duplicate fetches
    const isFetchingRef = useRef(false);
    const refreshIntervalRef = useRef(null);

    /**
     * Fetch current user data from API
     * Requirement 2.4: Fetch current user details
     * Requirement 19.1: useCurrentUser hook to fetch and manage current user state
     */
    const fetchCurrentUser = useCallback(async () => {
        // Don't fetch if not authenticated
        if (!isAuthenticated || !token) {
            return { success: false, error: 'Not authenticated' };
        }

        // Prevent duplicate fetches
        if (isFetchingRef.current) {
            return { success: false, error: 'Fetch already in progress' };
        }

        try {
            isFetchingRef.current = true;
            dispatch(clearError());
            dispatch(setLoading(true));

            // Fetch user data from API
            const response = await userService.getProfile();

            // Extract user data from response
            const userData = response.user || response;

            // Update Redux store with user profile
            dispatch(setProfile(userData));

            // Call success callback if provided
            if (onSuccess) {
                onSuccess(userData);
            }

            return { success: true, data: userData };
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch user data';
            dispatch(setError(errorMessage));

            // Call error callback if provided
            if (onError) {
                onError(err);
            }

            return { success: false, error: errorMessage };
        } finally {
            dispatch(setLoading(false));
            isFetchingRef.current = false;
        }
    }, [isAuthenticated, token, dispatch, onSuccess, onError]);

    /**
     * Refresh user data manually
     * Forces a fresh fetch from the API
     */
    const refreshUser = useCallback(async () => {
        return await fetchCurrentUser();
    }, [fetchCurrentUser]);

    /**
     * Clear user error
     */
    const clearUserError = useCallback(() => {
        dispatch(clearError());
    }, [dispatch]);

    /**
     * Get cached user data from localStorage
     * Useful for immediate access before API fetch completes
     */
    const getCachedUser = useCallback(() => {
        return userService.getCachedUser();
    }, []);

    /**
     * Check if profile is complete
     */
    const isProfileComplete = useCallback(() => {
        return userService.isProfileComplete(profile);
    }, [profile]);

    /**
     * Get missing profile fields
     */
    const getMissingFields = useCallback(() => {
        return userService.getMissingProfileFields(profile);
    }, [profile]);

    /**
     * Auto-fetch user data on mount
     * Requirement 2.4: Fetch current user details using custom hook
     */
    useEffect(() => {
        if (autoFetch && isAuthenticated && token && !profile) {
            fetchCurrentUser();
        }
    }, [autoFetch, isAuthenticated, token, profile, fetchCurrentUser]);

    /**
     * Set up auto-refresh interval
     * Requirement 19.1: Auto-refresh user data
     */
    useEffect(() => {
        if (refreshInterval && isAuthenticated && token) {
            // Clear any existing interval
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }

            // Set up new interval
            refreshIntervalRef.current = setInterval(() => {
                fetchCurrentUser();
            }, refreshInterval);

            // Cleanup on unmount or when dependencies change
            return () => {
                if (refreshIntervalRef.current) {
                    clearInterval(refreshIntervalRef.current);
                    refreshIntervalRef.current = null;
                }
            };
        }
    }, [refreshInterval, isAuthenticated, token, fetchCurrentUser]);

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        return () => {
            // Clear refresh interval
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, []);

    /**
     * Re-fetch when authentication status changes
     * Requirement 2.7: Validate token and fetch user details automatically
     */
    useEffect(() => {
        if (isAuthenticated && token && !profile && !loading) {
            fetchCurrentUser();
        }
    }, [isAuthenticated, token, profile, loading, fetchCurrentUser]);

    // Return user state and functions
    return {
        // User data
        profile,
        user: profile, // Alias for convenience

        // Status flags
        loading,
        error,
        isAuthenticated,
        profileComplete,
        profileCompletionPercentage,

        // Functions
        fetchCurrentUser,
        refreshUser,
        clearError: clearUserError,
        getCachedUser,
        isProfileComplete,
        getMissingFields,

        // Computed values
        hasProfile: !!profile,
        needsProfileCompletion: isAuthenticated && (!profile || !profileComplete),
    };
};

export default useCurrentUser;
