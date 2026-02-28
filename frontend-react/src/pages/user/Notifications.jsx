import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
    FaBell,
    FaCheckCircle,
    FaExclamationTriangle,
    FaInfoCircle,
    FaCog,
    FaCheck,
    FaCheckDouble,
    FaTrash,
} from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import {
    selectNotificationItems,
    selectUnreadCount,
    selectNotificationLoading,
    selectNotificationError,
    setNotifications,
    markAsRead,
    markAllAsRead,
    setLoading,
    setError,
} from '../../store/slices/notificationSlice';
import { selectUser } from '../../store/slices/authSlice';
import { selectProfile } from '../../store/slices/userSlice';
import { useNotifications } from '../../hooks/useNotifications';
import notificationService from '../../api/services/notificationService';
import { Card } from '../../components/common';
import ErrorAlert from '../../components/common/ErrorAlert';

/**
 * Notifications Page
 * 
 * Features:
 * - Display notification list
 * - Show unread count badge
 * - Mark notifications as read
 * - Display notification preferences
 * - Real-time notifications via Socket.IO
 * - Browser notifications for new alerts
 * 
 * Requirements: 11.1-11.7
 */
export default function Notifications() {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    // Redux state
    const notifications = useSelector(selectNotificationItems);
    const unreadCount = useSelector(selectUnreadCount);
    const loading = useSelector(selectNotificationLoading);
    const error = useSelector(selectNotificationError);
    const currentUser = useSelector(selectUser); // Get current user from auth
    const profile = useSelector(selectProfile); // Get profile from user slice

    // Get user ID from multiple sources
    const getUserId = () => {
        // Try to get ID from various sources
        let userId = currentUser?.id || currentUser?.user_id || profile?.id || profile?.user_id;

        // If still no ID, try to decode it from the JWT token
        if (!userId) {
            try {
                const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                if (token) {
                    // Decode JWT token (it's base64 encoded)
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    userId = payload.sub || payload.user_id || payload.id;
                    console.log('Extracted user ID from JWT:', userId);
                }
            } catch (error) {
                console.error('Error decoding JWT token:', error);
            }
        }

        console.log('Getting user ID:', {
            currentUser,
            profile,
            resolvedUserId: userId
        });

        return userId;
    };

    // Real-time notifications hook
    // Requirement 11.5: Integrate Socket.IO for real-time notifications
    // Requirement 11.7: Show browser notifications for new alerts
    // Wrapped in try-catch to prevent Socket.IO errors from blocking the page
    let isConnected = false;
    let requestNotificationPermission = () => { };

    try {
        const socketHook = useNotifications();
        isConnected = socketHook.isConnected;
        requestNotificationPermission = socketHook.requestNotificationPermission;
    } catch (error) {
        console.warn('Socket.IO not available, real-time notifications disabled:', error);
    }

    // Local state
    const [preferences, setPreferences] = useState(null);
    const [preferencesError, setPreferencesError] = useState(null);
    const [showPreferences, setShowPreferences] = useState(false);
    const [loadingPreferences, setLoadingPreferences] = useState(false);
    const [savingPreferences, setSavingPreferences] = useState(false);
    const [filter, setFilter] = useState('all'); // all, unread, read
    const [actionLoading, setActionLoading] = useState(null);

    /**
     * Fetch notifications on mount
     * Requirement 11.2: Fetch notification history from Backend_API
     */
    useEffect(() => {
        fetchNotifications();
    }, []);

    /**
     * Fetch notification preferences
     * Requirement 11.4: Display notification preferences
     */
    useEffect(() => {
        if (showPreferences && !preferences) {
            fetchPreferences();
        }
    }, [showPreferences]);

    /**
     * Fetch notifications from API
     */
    const fetchNotifications = async () => {
        const userId = getUserId();

        if (!userId) {
            console.warn('No user ID available for fetching notifications');
            console.log('Auth user:', currentUser);
            console.log('Profile:', profile);
            dispatch(setLoading(false));
            dispatch(setError('Unable to identify user. Please log in again.'));
            return;
        }

        dispatch(setLoading(true));
        dispatch(setError(null));
        try {
            const data = await notificationService.getNotifications(50, 0, userId);
            // Handle different response formats
            const notifications = Array.isArray(data)
                ? data
                : (data.notifications || data.items || []);
            dispatch(setNotifications(notifications));
            dispatch(setLoading(false));
        } catch (err) {
            console.error('Error fetching notifications:', err);
            dispatch(setError(err.message || 'Failed to load notifications'));
            dispatch(setLoading(false));
        }
    };

    /**
     * Fetch notification preferences
     */
    const fetchPreferences = async () => {
        const userId = getUserId();

        if (!userId) {
            const errorMsg = 'No user ID available for fetching preferences. Please ensure you are logged in.';
            console.warn(errorMsg);
            console.log('Auth user:', currentUser);
            console.log('Profile:', profile);
            setPreferencesError(errorMsg);
            return;
        }

        setLoadingPreferences(true);
        setPreferencesError(null);
        try {
            console.log('Fetching preferences for user:', userId);
            const data = await notificationService.getPreferences(userId);
            console.log('Preferences loaded successfully:', data);
            setPreferences(data);
        } catch (err) {
            const errorMsg = err.response?.data?.detail || err.message || 'Failed to load preferences';
            console.error('Error fetching preferences:', err);
            console.error('Error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                userId
            });
            setPreferencesError(errorMsg);
        } finally {
            setLoadingPreferences(false);
        }
    };

    /**
     * Mark notification as read
     * Requirement 11.3: Mark notification as read and update state
     */
    const handleMarkAsRead = async (notificationId) => {
        setActionLoading(notificationId);
        try {
            await notificationService.markAsRead(notificationId);
            dispatch(markAsRead(notificationId));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        } finally {
            setActionLoading(null);
        }
    };

    /**
     * Mark all notifications as read
     */
    const handleMarkAllAsRead = async () => {
        setActionLoading('all');
        try {
            await notificationService.markAllAsRead();
            dispatch(markAllAsRead());
        } catch (err) {
            console.error('Error marking all as read:', err);
        } finally {
            setActionLoading(null);
        }
    };

    /**
     * Update notification preferences
     * Requirement 11.4: Update notification preferences via Backend_API
     */
    const handleUpdatePreferences = async (updatedPreferences) => {
        const userId = getUserId();

        if (!userId) {
            alert('User not authenticated. Please log in.');
            return;
        }

        setSavingPreferences(true);
        try {
            const data = await notificationService.updatePreferences(updatedPreferences, userId);
            setPreferences(data);
            alert('Preferences updated successfully');
        } catch (err) {
            console.error('Error updating preferences:', err);
            alert('Failed to update preferences');
        } finally {
            setSavingPreferences(false);
        }
    };

    /**
     * Handle preference change
     */
    const handlePreferenceChange = (key, value) => {
        setPreferences(prev => ({
            ...prev,
            [key]: value,
        }));
    };

    /**
     * Save preferences
     */
    const handleSavePreferences = () => {
        handleUpdatePreferences(preferences);
    };

    /**
     * Request browser notification permission
     */
    const handleRequestPermission = () => {
        requestNotificationPermission();
    };

    /**
     * Get notification icon based on type
     */
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'success':
                return <FaCheckCircle className="text-green-500" />;
            case 'warning':
                return <FaExclamationTriangle className="text-yellow-500" />;
            case 'error':
                return <FaExclamationTriangle className="text-red-500" />;
            case 'info':
            default:
                return <FaInfoCircle className="text-blue-500" />;
        }
    };

    /**
     * Format notification timestamp
     */
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return t('notifications.justNow');
        if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins });
        if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
        if (diffDays < 7) return t('notifications.daysAgo', { count: diffDays });
        return date.toLocaleDateString();
    };

    /**
     * Filter notifications based on selected filter
     */
    const filteredNotifications = notifications.filter(notification => {
        if (filter === 'unread') return !notification.read;
        if (filter === 'read') return notification.read;
        return true;
    });

    // Show loading state
    if (loading && notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <ClipLoader color="#3B82F6" size={50} />
                <p className="mt-4 text-gray-600">{t('notifications.loadingNotifications')}</p>
            </div>
        );
    }

    // Show error state if there's a critical error
    if (error && notifications.length === 0 && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6">
                <div className="text-center max-w-md">
                    <FaExclamationTriangle className="text-5xl text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        {t('notifications.unableToLoad')}
                    </h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={fetchNotifications}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        {t('notifications.tryAgain')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FaBell className="text-3xl text-blue-600" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">{t('notifications.notifications')}</h1>
                        {/* Requirement 11.1: Display notification count badge */}
                        <p className="text-gray-600">
                            {unreadCount > 0 ? (
                                <span className="text-blue-600 font-semibold">
                                    {t('notifications.unreadCount', { count: unreadCount })}
                                </span>
                            ) : (
                                t('notifications.allCaughtUp')
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Connection status indicator */}
                    <div className="flex items-center gap-2 text-sm">
                        <div
                            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'
                                }`}
                        />
                        <span className="text-gray-600">
                            {isConnected ? t('notifications.connected') : t('notifications.disconnected')}
                        </span>
                    </div>

                    <button
                        onClick={() => setShowPreferences(!showPreferences)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                        <FaCog />
                        {t('notifications.preferences')}
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <ErrorAlert message={error} onClose={() => dispatch(setError(null))} />
            )}

            {/* Notification Preferences Panel */}
            {showPreferences && (
                <Card>
                    <div className="p-6 space-y-4">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">
                            {t('notifications.preferences')}
                        </h2>

                        {loadingPreferences ? (
                            <div className="flex justify-center py-8">
                                <ClipLoader color="#3B82F6" size={40} />
                            </div>
                        ) : preferencesError ? (
                            <div className="text-center py-8">
                                <p className="text-red-600 mb-4">{preferencesError}</p>
                                <button
                                    onClick={fetchPreferences}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {t('notifications.retry')}
                                </button>
                            </div>
                        ) : preferences ? (
                            <div className="space-y-4">
                                {/* Browser Notifications */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h3 className="font-semibold text-gray-800">
                                            {t('notifications.browserNotifications')}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {t('notifications.browserNotificationsDesc')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {Notification.permission === 'granted' ? (
                                            <span className="text-green-600 text-sm">{t('notifications.enabled')}</span>
                                        ) : (
                                            <button
                                                onClick={handleRequestPermission}
                                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                            >
                                                {t('notifications.enable')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Email Notifications */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h3 className="font-semibold text-gray-800">
                                            {t('notifications.emailNotifications')}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {t('notifications.emailNotificationsDesc')}
                                        </p>
                                    </div>
                                    <input
                                        id="email-notifications"
                                        name="email_notifications"
                                        type="checkbox"
                                        checked={preferences.preferred_channels?.includes('email') || false}
                                        onChange={(e) => {
                                            const channels = preferences.preferred_channels || ['sms'];
                                            if (e.target.checked) {
                                                handlePreferenceChange('preferred_channels', [...channels, 'email']);
                                            } else {
                                                handlePreferenceChange('preferred_channels', channels.filter(c => c !== 'email'));
                                            }
                                        }}
                                        className="w-5 h-5 text-blue-600"
                                    />
                                </div>

                                {/* SMS Notifications */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h3 className="font-semibold text-gray-800">
                                            {t('notifications.smsNotifications')}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {t('notifications.smsNotificationsDesc')}
                                        </p>
                                    </div>
                                    <input
                                        id="sms-notifications"
                                        name="sms_notifications"
                                        type="checkbox"
                                        checked={preferences.preferred_channels?.includes('sms') || false}
                                        onChange={(e) => {
                                            const channels = preferences.preferred_channels || [];
                                            if (e.target.checked) {
                                                handlePreferenceChange('preferred_channels', [...channels, 'sms']);
                                            } else {
                                                handlePreferenceChange('preferred_channels', channels.filter(c => c !== 'sms'));
                                            }
                                        }}
                                        className="w-5 h-5 text-blue-600"
                                    />
                                </div>

                                {/* Weather Alerts */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h3 className="font-semibold text-gray-800">
                                            {t('notifications.weatherAlerts')}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {t('notifications.weatherAlertsDesc')}
                                        </p>
                                    </div>
                                    <input
                                        id="weather-alerts"
                                        name="weather_alerts"
                                        type="checkbox"
                                        checked={preferences.weather_alerts || false}
                                        onChange={(e) =>
                                            handlePreferenceChange('weather_alerts', e.target.checked)
                                        }
                                        className="w-5 h-5 text-blue-600"
                                    />
                                </div>

                                {/* Daily MSP Updates */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h3 className="font-semibold text-gray-800">
                                            {t('notifications.dailyMspUpdates')}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {t('notifications.dailyMspUpdatesDesc')}
                                        </p>
                                    </div>
                                    <input
                                        id="msp-updates"
                                        name="msp_updates"
                                        type="checkbox"
                                        checked={preferences.daily_msp_updates || false}
                                        onChange={(e) =>
                                            handlePreferenceChange('daily_msp_updates', e.target.checked)
                                        }
                                        className="w-5 h-5 text-blue-600"
                                    />
                                </div>

                                {/* Market Updates */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h3 className="font-semibold text-gray-800">
                                            {t('notifications.marketUpdates')}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {t('notifications.marketUpdatesDesc')}
                                        </p>
                                    </div>
                                    <input
                                        id="market-alerts"
                                        name="market_alerts"
                                        type="checkbox"
                                        checked={preferences.market_price_alerts || false}
                                        onChange={(e) =>
                                            handlePreferenceChange('market_price_alerts', e.target.checked)
                                        }
                                        className="w-5 h-5 text-blue-600"
                                    />
                                </div>

                                {/* Scheme Notifications */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h3 className="font-semibold text-gray-800">
                                            {t('notifications.schemeNotifications')}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {t('notifications.schemeNotificationsDesc')}
                                        </p>
                                    </div>
                                    <input
                                        id="scheme-notifications"
                                        name="scheme_notifications"
                                        type="checkbox"
                                        checked={preferences.scheme_notifications || false}
                                        onChange={(e) =>
                                            handlePreferenceChange(
                                                'scheme_notifications',
                                                e.target.checked
                                            )
                                        }
                                        className="w-5 h-5 text-blue-600"
                                    />
                                </div>

                                {/* Save Button */}
                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={handleSavePreferences}
                                        disabled={savingPreferences}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        {savingPreferences ? t('notifications.saving') : t('notifications.savePreferences')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-600">{t('notifications.failedToLoadPreferences')}</p>
                        )}
                    </div>
                </Card>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-between">
                {/* Filter Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg transition ${filter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {t('notifications.all')} ({notifications.length})
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`px-4 py-2 rounded-lg transition ${filter === 'unread'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {t('notifications.unread')} ({unreadCount})
                    </button>
                    <button
                        onClick={() => setFilter('read')}
                        className={`px-4 py-2 rounded-lg transition ${filter === 'read'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {t('notifications.read')} ({notifications.length - unreadCount})
                    </button>
                </div>

                {/* Mark All as Read Button */}
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        disabled={actionLoading === 'all'}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {actionLoading === 'all' ? (
                            <ClipLoader color="#ffffff" size={16} />
                        ) : (
                            <FaCheckDouble />
                        )}
                        {t('notifications.markAllAsRead')}
                    </button>
                )}
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
                {filteredNotifications.length === 0 ? (
                    <Card>
                        <div className="p-8 text-center text-gray-500">
                            <FaBell className="text-5xl mx-auto mb-4 text-gray-300" />
                            <p className="text-lg">{t('notifications.noNotificationsToDisplay')}</p>
                        </div>
                    </Card>
                ) : (
                    filteredNotifications.map((notification) => (
                        <Card
                            key={notification.id}
                            className={`transition-all ${!notification.read ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                                }`}
                        >
                            <div className="p-4 flex items-start gap-4">
                                {/* Icon */}
                                <div className="text-2xl mt-1">
                                    {getNotificationIcon(notification.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-800">
                                                {notification.title}
                                            </h3>
                                            <p className="text-gray-600 mt-1">
                                                {notification.message || notification.body}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-2">
                                                {formatTimestamp(
                                                    notification.created_at || notification.timestamp
                                                )}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            {!notification.read && (
                                                <button
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                    disabled={actionLoading === notification.id}
                                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                                                    title={t('notifications.markAsRead')}
                                                >
                                                    {actionLoading === notification.id ? (
                                                        <ClipLoader color="#2563EB" size={16} />
                                                    ) : (
                                                        <FaCheck />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
