import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaBell, FaExclamationCircle, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';

/**
 * Notification Widget Component
 * Displays recent notifications
 * Requirement 20.5: Display recent activity and notifications
 */
export default function NotificationWidget({ notifications, loading, error }) {
    const { t } = useTranslation();

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">{t('dashboard.recentNotifications')}</h2>
                <div className="flex items-center justify-center h-40">
                    <ClipLoader color="#3B82F6" size={40} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">{t('dashboard.recentNotifications')}</h2>
                <div className="text-center text-red-500 py-8">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!notifications || notifications.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">{t('dashboard.recentNotifications')}</h2>
                <div className="text-center text-gray-500 py-8">
                    <p>{t('dashboard.noNotifications')}</p>
                </div>
            </div>
        );
    }

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'alert':
            case 'warning':
                return <FaExclamationCircle className="text-yellow-500" size={18} />;
            case 'error':
                return <FaExclamationCircle className="text-red-500" size={18} />;
            case 'success':
                return <FaCheckCircle className="text-green-500" size={18} />;
            default:
                return <FaInfoCircle className="text-blue-500" size={18} />;
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
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

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">{t('dashboard.recentNotifications')}</h2>
                <Link to="/notifications" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    {t('dashboard.viewAll')} →
                </Link>
            </div>

            <div className="space-y-3">
                {notifications.slice(0, 5).map((notification, index) => (
                    <div
                        key={notification.id || index}
                        className={`border-l-4 ${notification.read ? 'border-gray-300 bg-gray-50' : 'border-blue-500 bg-blue-50'
                            } rounded-r-lg p-3 hover:shadow-sm transition-shadow`}
                    >
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                                {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                    {notification.title || notification.message}
                                </p>
                                {notification.message && notification.title && (
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                        {notification.message}
                                    </p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                    {formatTime(notification.created_at || notification.timestamp)}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
