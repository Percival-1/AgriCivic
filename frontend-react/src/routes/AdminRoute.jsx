import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectToken, selectUser } from '../store/slices/authSlice';

/**
 * AdminRoute Component
 * 
 * Navigation guard that protects admin-only routes.
 * 
 * Features:
 * - Checks for valid JWT token and authentication
 * - Verifies user has admin role
 * - Redirects unauthenticated users to login page
 * - Redirects non-admin users to user dashboard
 * - Preserves intended destination for authenticated non-admin users
 * 
 * Usage:
 * <AdminRoute>
 *   <YourAdminComponent />
 * </AdminRoute>
 * 
 * Requirements: 3.4-3.5, 4.1-4.4
 */

export default function AdminRoute({ children }) {
    const location = useLocation();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const token = useSelector(selectToken);
    const user = useSelector(selectUser);

    // First check: User must be authenticated
    if (!isAuthenticated || !token) {
        // Redirect to login page, preserving the intended destination
        return (
            <Navigate
                to="/login"
                state={{ from: location.pathname + location.search }}
                replace
            />
        );
    }

    // Second check: User must have admin role
    // Check for role in user object (could be 'role', 'roles', 'is_admin', etc.)
    const isAdmin = user && (
        user.role === 'admin' ||
        user.is_admin === true ||
        user.isAdmin === true ||
        (Array.isArray(user.roles) && user.roles.includes('admin'))
    );

    if (!isAdmin) {
        // User is authenticated but not an admin
        // Redirect to user dashboard
        return <Navigate to="/dashboard" replace />;
    }

    // User is authenticated and has admin role, render the admin component
    return children;
}
