import React from 'react';
import { useNotifications } from './useNotifications';
import { FaBell } from 'react-icons/fa';

/**
 * Example component demonstrating useNotifications hook usage
 * 
 * This component shows how to:
 * - Display notification count badge
 * - Show connection status
 * - Request browser notification permission
 * - Display notification list
 * 
 * Requirements: 11.5, 19.8
 */
export default function NotificationExample() {
    const {
        notifications,
        unreadCount,
        isConnected,
        requestNotificationPermission,
    } = useNotifications();

    return (
        <div className="p-4">
            <div className="flex items-center gap-4 mb-4">
                {/* Notification Bell with Badge */}
                <div className="relative">
                    <FaBell size={24} className="text-gray-700" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadCount}
                        </span>
                    )}
                </div>

                {/* Connection Status */}
                <div className="flex items-center gap-2">
                    <div
                        className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'
                            }`}
                    />
                    <span className="text-sm text-gray-600">
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>

                {/* Request Permission Button */}
                <button
                    onClick={requestNotificationPermission}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Enable Notifications
                </button>
            </div>

            {/* Notification List */}
            <div className="space-y-2">
                <h3 className="text-lg font-semibold mb-2">
                    Notifications ({notifications.length})
                </h3>
                {notifications.length === 0 ? (
                    <p className="text-gray-500">No notifications</p>
                ) : (
                    notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`p-3 border rounded ${notification.read
                                    ? 'bg-white border-gray-200'
                                    : 'bg-blue-50 border-blue-300'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold">
                                        {notification.title}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                        {notification.message || notification.body}
                                    </p>
                                </div>
                                {!notification.read && (
                                    <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                                        New
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

/**
 * Example: Using in a Header component
 */
export function HeaderWithNotifications() {
    const { unreadCount, isConnected } = useNotifications();

    return (
        <header className="bg-white shadow-md p-4">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold">My App</h1>

                <div className="flex items-center gap-4">
                    {/* Connection indicator */}
                    {!isConnected && (
                        <span className="text-sm text-red-500">
                            Reconnecting...
                        </span>
                    )}

                    {/* Notification bell */}
                    <button className="relative">
                        <FaBell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}

/**
 * Example: Auto-requesting permission on mount
 */
export function AutoRequestPermission() {
    const { requestNotificationPermission } = useNotifications();

    React.useEffect(() => {
        // Request permission when component mounts
        requestNotificationPermission();
    }, [requestNotificationPermission]);

    return null; // This component doesn't render anything
}
