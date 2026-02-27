/**
 * Example usage of useCurrentUser hook
 * 
 * This file demonstrates various ways to use the useCurrentUser hook
 * in your React components.
 */

import React from 'react';
import { useCurrentUser } from './useCurrentUser';

/**
 * Example 1: Basic usage with auto-fetch
 */
export function UserProfileBasic() {
    const { profile, loading, error } = useCurrentUser();

    if (loading) {
        return <div>Loading user profile...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!profile) {
        return <div>No user profile found</div>;
    }

    return (
        <div>
            <h2>Welcome, {profile.name}!</h2>
            <p>Location: {profile.location}</p>
            <p>Crops: {profile.crops?.join(', ')}</p>
        </div>
    );
}

/**
 * Example 2: With manual refresh
 */
export function UserProfileWithRefresh() {
    const { profile, loading, refreshUser } = useCurrentUser();

    const handleRefresh = async () => {
        const result = await refreshUser();
        if (result.success) {
            console.log('Profile refreshed successfully');
        }
    };

    return (
        <div>
            <h2>{profile?.name || 'Guest'}</h2>
            <button onClick={handleRefresh} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh Profile'}
            </button>
        </div>
    );
}

/**
 * Example 3: With auto-refresh interval
 */
export function UserProfileAutoRefresh() {
    // Auto-refresh every 5 minutes (300000ms)
    const { profile, loading } = useCurrentUser({
        autoFetch: true,
        refreshInterval: 300000,
    });

    return (
        <div>
            <h2>{profile?.name || 'Loading...'}</h2>
            {loading && <span>Updating...</span>}
        </div>
    );
}

/**
 * Example 4: With callbacks
 */
export function UserProfileWithCallbacks() {
    const { profile, error } = useCurrentUser({
        autoFetch: true,
        onSuccess: (userData) => {
            console.log('User data loaded:', userData);
            // You can perform additional actions here
        },
        onError: (err) => {
            console.error('Failed to load user:', err);
            // Handle error (e.g., show notification)
        },
    });

    return (
        <div>
            {error ? (
                <div>Failed to load profile</div>
            ) : (
                <div>
                    <h2>{profile?.name}</h2>
                </div>
            )}
        </div>
    );
}

/**
 * Example 5: Profile completion check
 */
export function ProfileCompletionBanner() {
    const {
        profileComplete,
        profileCompletionPercentage,
        needsProfileCompletion,
        getMissingFields,
    } = useCurrentUser();

    if (!needsProfileCompletion) {
        return null;
    }

    const missingFields = getMissingFields();

    return (
        <div className="profile-completion-banner">
            <h3>Complete Your Profile ({profileCompletionPercentage}%)</h3>
            <p>Please complete the following fields:</p>
            <ul>
                {missingFields.map((field) => (
                    <li key={field}>{field}</li>
                ))}
            </ul>
            <button>Complete Profile</button>
        </div>
    );
}

/**
 * Example 6: Using cached user data
 */
export function UserAvatarWithCache() {
    const { profile, getCachedUser } = useCurrentUser({
        autoFetch: false, // Don't auto-fetch
    });

    // Use cached data immediately while profile loads
    const displayUser = profile || getCachedUser();

    return (
        <div className="user-avatar">
            {displayUser ? (
                <>
                    <img src={displayUser.avatar || '/default-avatar.png'} alt="User avatar" />
                    <span>{displayUser.name}</span>
                </>
            ) : (
                <span>Guest</span>
            )}
        </div>
    );
}

/**
 * Example 7: Conditional rendering based on authentication
 */
export function UserDashboard() {
    const {
        isAuthenticated,
        profile,
        loading,
        hasProfile,
        needsProfileCompletion,
    } = useCurrentUser();

    if (!isAuthenticated) {
        return <div>Please log in to view your dashboard</div>;
    }

    if (loading) {
        return <div>Loading dashboard...</div>;
    }

    if (needsProfileCompletion) {
        return (
            <div>
                <h2>Welcome!</h2>
                <p>Please complete your profile to get started.</p>
                <button>Complete Profile</button>
            </div>
        );
    }

    if (!hasProfile) {
        return <div>Unable to load profile</div>;
    }

    return (
        <div>
            <h1>Welcome back, {profile.name}!</h1>
            <div className="dashboard-content">
                {/* Dashboard widgets */}
            </div>
        </div>
    );
}

/**
 * Example 8: Error handling with retry
 */
export function UserProfileWithRetry() {
    const { profile, error, loading, refreshUser, clearError } = useCurrentUser();

    const handleRetry = async () => {
        clearError();
        await refreshUser();
    };

    if (error) {
        return (
            <div className="error-container">
                <p>Failed to load profile: {error}</p>
                <button onClick={handleRetry} disabled={loading}>
                    {loading ? 'Retrying...' : 'Retry'}
                </button>
            </div>
        );
    }

    return (
        <div>
            <h2>{profile?.name || 'Loading...'}</h2>
        </div>
    );
}
