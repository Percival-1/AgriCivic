import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    login as loginAction,
    logout as logoutAction,
    setLoading,
    setError,
    clearError,
    selectAuth,
    selectIsAuthenticated,
    selectUser,
    selectAuthLoading,
    selectAuthError,
} from '../store/slices/authSlice';
import authService from '../api/services/authService';

/**
 * Custom hook for authentication operations
 * 
 * Provides:
 * - login, logout, register functions
 * - Authentication state (isAuthenticated, user, loading, error)
 * - Token management
 * 
 * Requirements: 1.1-1.10, 19.2
 */
export const useAuth = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Select auth state from Redux store
    const auth = useSelector(selectAuth);
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const user = useSelector(selectUser);
    const loading = useSelector(selectAuthLoading);
    const error = useSelector(selectAuthError);

    /**
     * Login user with phone number and password
     * Requirement 1.1: Authenticate via Backend_API and store JWT_Token
     * Requirement 1.5: Validate phone numbers in E.164 format
     * Requirement 1.8: Include JWT_Token in all Backend_API requests
     * Requirement 1.10: Auto-navigate to dashboard with valid JWT_Token
     */
    const login = useCallback(async (phoneNumber, password, redirectTo = null) => {
        try {
            // Clear any previous errors
            dispatch(clearError());
            dispatch(setLoading(true));

            // Validate phone number format (Requirement 1.5)
            if (!authService.validatePhoneNumber(phoneNumber)) {
                throw new Error('Invalid phone number format. Please use E.164 format (e.g., +1234567890)');
            }

            // Call authentication service (Requirement 1.1)
            const response = await authService.login(phoneNumber, password);

            // Extract token
            const token = response.access_token;

            // Calculate token expiry if provided
            const expiresIn = response.expires_in;

            // Fetch current user data to get role and other details
            const userResponse = await authService.getCurrentUser();
            const userData = userResponse.user || userResponse;

            // Dispatch login action to update Redux store
            dispatch(loginAction({
                token,
                user: userData,
                expiresIn,
            }));

            // Navigate to intended destination or dashboard (Requirement 1.10)
            if (redirectTo) {
                navigate(redirectTo);
            } else if (userData.profile_completed === false) {
                // Redirect to profile completion if profile is incomplete (Requirement 1.9)
                navigate('/profile-completion');
            } else {
                // Check if user is admin and redirect accordingly
                const isAdmin = userData.role === 'admin' || userData.is_admin === true;
                if (isAdmin) {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/dashboard');
                }
            }

            return { success: true, user: userData };
        } catch (err) {
            const errorMessage = err.message || 'Login failed. Please check your credentials.';
            dispatch(setError(errorMessage));
            return { success: false, error: errorMessage };
        } finally {
            dispatch(setLoading(false));
        }
    }, [dispatch, navigate]);

    /**
     * Register new user
     * Requirement 1.2: Create account via Backend_API
     * Requirement 1.5: Validate phone numbers in E.164 format
     * Requirement 1.9: Navigate to profile completion after signup
     */
    const register = useCallback(async (userData) => {
        try {
            // Clear any previous errors
            dispatch(clearError());
            dispatch(setLoading(true));

            // Validate phone number format (Requirement 1.5)
            if (!authService.validatePhoneNumber(userData.phone_number)) {
                throw new Error('Invalid phone number format. Please use E.164 format (e.g., +1234567890)');
            }

            // Call registration service (Requirement 1.2)
            const response = await authService.register(userData);

            // Extract token
            const token = response.access_token;

            // Calculate token expiry if provided
            const expiresIn = response.expires_in;

            // Fetch current user data to get role and other details
            const userResponse = await authService.getCurrentUser();
            const user = userResponse.user || userResponse;

            // Dispatch login action to update Redux store
            dispatch(loginAction({
                token,
                user,
                expiresIn,
            }));

            // Navigate to profile completion (Requirement 1.9)
            navigate('/profile-completion');

            return { success: true, user };
        } catch (err) {
            const errorMessage = err.message || 'Registration failed. Please try again.';
            dispatch(setError(errorMessage));
            return { success: false, error: errorMessage };
        } finally {
            dispatch(setLoading(false));
        }
    }, [dispatch, navigate]);

    /**
     * Logout user
     * Requirement 1.4: Clear JWT_Token from localStorage and Redux store, redirect to login
     */
    const logout = useCallback(async () => {
        try {
            dispatch(setLoading(true));

            // Call logout service to notify backend
            await authService.logout();

            // Dispatch logout action to clear Redux store and localStorage (Requirement 1.4)
            dispatch(logoutAction());

            // Redirect to login page
            navigate('/login');

            return { success: true };
        } catch (err) {
            // Even if backend call fails, clear local state
            dispatch(logoutAction());
            navigate('/login');

            return { success: false, error: err.message };
        } finally {
            dispatch(setLoading(false));
        }
    }, [dispatch, navigate]);

    /**
     * Check password strength
     * Requirement 1.6: Display password strength indicator
     */
    const checkPasswordStrength = useCallback((password) => {
        return authService.checkPasswordStrength(password);
    }, []);

    /**
     * Validate phone number
     * Requirement 1.5: Validate phone numbers in E.164 format
     */
    const validatePhoneNumber = useCallback((phoneNumber) => {
        return authService.validatePhoneNumber(phoneNumber);
    }, []);

    /**
     * Get current token
     * Requirement 1.7: JWT_Token included in all Backend_API requests
     */
    const getToken = useCallback(() => {
        return authService.getToken();
    }, []);

    /**
     * Check if user is authenticated
     * Requirement 1.8: Check for valid JWT_Token
     */
    const checkAuth = useCallback(() => {
        return authService.isAuthenticated();
    }, []);

    /**
     * Clear authentication error
     */
    const clearAuthError = useCallback(() => {
        dispatch(clearError());
    }, [dispatch]);

    // Return authentication state and functions
    return {
        // State
        isAuthenticated,
        user,
        loading,
        error,
        token: auth.token,

        // Functions
        login,
        logout,
        register,
        checkPasswordStrength,
        validatePhoneNumber,
        getToken,
        checkAuth,
        clearError: clearAuthError,
    };
};

export default useAuth;
