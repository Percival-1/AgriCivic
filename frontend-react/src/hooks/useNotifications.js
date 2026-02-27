import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSocket } from './useSocket';
import {
    addNotification,
    incrementUnreadCount,
    markAsRead,
    updateNotification,
    selectNotificationItems,
    selectUnreadCount,
} from '../store/slices/notificationSlice';

/**
 * Custom hook for real-time notification management
 * 
 * Provides:
 * - Real-time notification listening via Socket.IO
 * - Notification state management
 * - Browser notification support
 * - Connection status tracking
 * 
 * Requirements: 11.5, 19.8
 */
export const useNotifications = () => {
    const dispatch = useDispatch();
    const { socket, isConnected } = useSocket();
    const notifications = useSelector(selectNotificationItems);
    const unreadCount = useSelector(selectUnreadCount);

    /**
     * Request browser notification permission
     */
    const requestNotificationPermission = useCallback(async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                await Notification.requestPermission();
            } catch (error) {
                console.error('Error requesting notification permission:', error);
            }
        }
    }, []);

    /**
     * Show browser notification
     * Requirement 19.8: Show browser notifications
     */
    const showBrowserNotification = useCallback((notification) => {
        // Check if browser notifications are supported and permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                const browserNotification = new Notification(
                    notification.title || 'New Notification',
                    {
                        body: notification.message || notification.body || '',
                        icon: notification.icon || '/favicon.ico',
                        badge: '/favicon.ico',
                        tag: notification.id || `notification-${Date.now()}`,
                        requireInteraction: notification.priority === 'high',
                        silent: notification.priority === 'low',
                        data: notification,
                    }
                );

                // Handle notification click
                browserNotification.onclick = () => {
                    window.focus();
                    browserNotification.close();

                    // Mark as read when clicked
                    if (notification.id) {
                        dispatch(markAsRead(notification.id));
                    }

                    // Navigate to notification URL if provided
                    if (notification.url) {
                        window.location.href = notification.url;
                    }
                };

                // Auto-close after 5 seconds for low priority notifications
                if (notification.priority === 'low') {
                    setTimeout(() => {
                        browserNotification.close();
                    }, 5000);
                }
            } catch (error) {
                console.error('Error showing browser notification:', error);
            }
        }
    }, [dispatch]);

    /**
     * Set up Socket.IO event listeners for real-time notifications
     * Requirement 11.5: Support real-time notifications using Socket.IO connection
     * Requirement 19.8: Listen for real-time notifications via Socket.IO
     */
    useEffect(() => {
        if (socket && isConnected) {
            // Listen for new notifications
            const handleNotification = (notification) => {
                console.log('Received notification:', notification);

                // Add notification to Redux store (this already increments unread count)
                dispatch(addNotification(notification));

                // Show browser notification
                showBrowserNotification(notification);
            };

            // Listen for notification read events
            const handleNotificationRead = (data) => {
                console.log('Notification marked as read:', data);

                if (data.notificationId) {
                    dispatch(markAsRead(data.notificationId));
                }
            };

            // Listen for notification updates
            const handleNotificationUpdate = (notification) => {
                console.log('Notification updated:', notification);

                dispatch(updateNotification(notification));
            };

            // Attach event listeners
            socket.on('notification', handleNotification);
            socket.on('notification:read', handleNotificationRead);
            socket.on('notification:update', handleNotificationUpdate);

            // Request browser notification permission on first connection
            requestNotificationPermission();

            // Cleanup function
            return () => {
                socket.off('notification', handleNotification);
                socket.off('notification:read', handleNotificationRead);
                socket.off('notification:update', handleNotificationUpdate);
            };
        }
    }, [socket, isConnected, dispatch, showBrowserNotification, requestNotificationPermission]);

    return {
        notifications,
        unreadCount,
        isConnected,
        requestNotificationPermission,
        showBrowserNotification,
    };
};

export default useNotifications;
