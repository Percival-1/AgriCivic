import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectToken } from '../store/slices/authSlice';

/**
 * ProtectedRoute Component
 * 
 * Navigation guard that protects routes requiring authentication.
 * 
 * Features:
 * - Checks for valid JWT token in Redux store
 * - Redirects unauthenticated users to login page
 * - Preserves intended destination URL for post-login redirect
 * - Validates token existence and authentication state
 * 
 * Usage:
 * <ProtectedRoute>
 *   <YourProtectedComponent />
 * </ProtectedRoute>
 * 
 * Requirements: 3.1-3.3, 1.8
 */

export default function ProtectedRoute({ children }) {
    const location = useLocation();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const token = useSelector(selectToken);

    // Check if user is authenticated with valid token
    if (!isAuthenticated || !token) {
        // Redirect to login page, preserving the intended destination
        // The 'state' object contains the location user was trying to access
        return (
            <Navigate
                to="/login"
                state={{ from: location.pathname + location.search }}
                replace
            />
        );
    }

    // User is authenticated, render the protected component
    return children;
}
