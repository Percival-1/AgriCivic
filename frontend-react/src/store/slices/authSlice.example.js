/**
 * Auth Slice Usage Examples
 * 
 * This file demonstrates how to use the auth slice in your React components.
 */

import { useAppDispatch, useAppSelector } from '../hooks';
import {
    login,
    logout,
    setToken,
    setUser,
    updateUser,
    selectIsAuthenticated,
    selectUser,
    selectToken,
    selectAuthError,
    selectAuthLoading,
} from './authSlice';

// ============================================================================
// Example 1: Login Component
// ============================================================================

function LoginComponent() {
    const dispatch = useAppDispatch();
    const error = useAppSelector(selectAuthError);
    const loading = useAppSelector(selectAuthLoading);

    const handleLogin = async (phoneNumber, password) => {
        try {
            // Call your API to authenticate
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phoneNumber, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Dispatch login action with token and user data
                dispatch(login({
                    token: data.access_token,
                    user: data.user,
                    expiresIn: data.expires_in, // Optional: token expiry in seconds
                }));
            } else {
                // Handle error
                dispatch(setError(data.message || 'Login failed'));
            }
        } catch (error) {
            dispatch(setError('Network error'));
        }
    };

    return (
        <div>
            {/* Your login form here */}
            {error && <div className="error">{error}</div>}
            {loading && <div>Loading...</div>}
        </div>
    );
}

// ============================================================================
// Example 2: Protected Component - Check Authentication
// ============================================================================

function ProtectedComponent() {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const user = useAppSelector(selectUser);

    if (!isAuthenticated) {
        return <div>Please login to access this page</div>;
    }

    return (
        <div>
            <h1>Welcome, {user?.name || 'User'}!</h1>
            {/* Your protected content here */}
        </div>
    );
}

// ============================================================================
// Example 3: Logout Button
// ============================================================================

function LogoutButton() {
    const dispatch = useAppDispatch();

    const handleLogout = () => {
        // Clear authentication state and localStorage
        dispatch(logout());

        // Optionally redirect to login page
        // navigate('/login');
    };

    return (
        <button onClick={handleLogout}>
            Logout
        </button>
    );
}

// ============================================================================
// Example 4: Profile Update
// ============================================================================

function ProfileUpdateComponent() {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);

    const handleUpdateProfile = async (updates) => {
        try {
            // Call your API to update profile
            const response = await fetch('/api/users/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            });

            const data = await response.json();

            if (response.ok) {
                // Update user in Redux store
                dispatch(updateUser(data.user));
            }
        } catch (error) {
            console.error('Profile update failed:', error);
        }
    };

    return (
        <div>
            <h2>Update Profile</h2>
            <p>Current name: {user?.name}</p>
            {/* Your profile form here */}
        </div>
    );
}

// ============================================================================
// Example 5: Using Token in API Calls
// ============================================================================

function DataFetchingComponent() {
    const token = useAppSelector(selectToken);

    const fetchData = async () => {
        try {
            const response = await fetch('/api/data', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Fetch failed:', error);
        }
    };

    return (
        <div>
            {/* Your component here */}
        </div>
    );
}

// ============================================================================
// Example 6: Token Refresh on App Load
// ============================================================================

function AppInitializer() {
    const dispatch = useAppDispatch();
    const token = useAppSelector(selectToken);
    const isAuthenticated = useAppSelector(selectIsAuthenticated);

    useEffect(() => {
        // Check if token exists and is valid on app load
        if (token && isAuthenticated) {
            // Optionally verify token with backend
            verifyToken(token).then((isValid) => {
                if (!isValid) {
                    dispatch(logout());
                }
            });
        }
    }, []);

    return null; // This is just an initializer component
}

// ============================================================================
// Example 7: Manual Token Setting (e.g., from OAuth callback)
// ============================================================================

function OAuthCallbackHandler() {
    const dispatch = useAppDispatch();

    useEffect(() => {
        // Get token from URL params or other source
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            // Set token
            dispatch(setToken(token));

            // Fetch user data
            fetchUserData(token).then((user) => {
                dispatch(setUser(user));
            });
        }
    }, []);

    return <div>Processing authentication...</div>;
}

// ============================================================================
// Example 8: Check Token Expiry Periodically
// ============================================================================

function TokenExpiryChecker() {
    const dispatch = useAppDispatch();

    useEffect(() => {
        // Check token expiry every minute
        const interval = setInterval(() => {
            dispatch(checkTokenExpiry());
        }, 60000);

        return () => clearInterval(interval);
    }, [dispatch]);

    return null;
}

export {
    LoginComponent,
    ProtectedComponent,
    LogoutButton,
    ProfileUpdateComponent,
    DataFetchingComponent,
    AppInitializer,
    OAuthCallbackHandler,
    TokenExpiryChecker,
};
