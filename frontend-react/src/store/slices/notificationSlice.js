import { createSlice } from '@reduxjs/toolkit';

/**
 * Notification Slice
 * 
 * Manages notification state including:
 * - Notification items (list of notifications)
 * - Unread count
 * - Loading and error states
 * 
 * Supports real-time notifications via Socket.IO
 * Requirements: 11.5, 19.8
 */

// Initial state
const initialState = {
    // List of notifications
    items: [],

    // Unread notification count
    unreadCount: 0,

    // Loading state
    loading: false,

    // Error state
    error: null,

    // Last updated timestamp
    lastUpdated: null,
};

/**
 * Notification Slice
 */
const notificationSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        /**
         * Set all notifications
         */
        setNotifications: (state, action) => {
            // Ensure payload is an array
            const notifications = Array.isArray(action.payload)
                ? action.payload
                : (action.payload?.notifications || []);

            state.items = notifications;
            state.unreadCount = notifications.filter((n) => !n.read).length;
            state.lastUpdated = Date.now();
            state.loading = false;
            state.error = null;
        },

        /**
         * Add a new notification
         * Used for real-time notifications from Socket.IO
         * Requirement 11.5: Support real-time notifications using Socket.IO connection
         */
        addNotification: (state, action) => {
            // Add to beginning of list
            state.items.unshift(action.payload);

            // Increment unread count if notification is unread
            if (!action.payload.read) {
                state.unreadCount += 1;
            }

            state.lastUpdated = Date.now();
        },

        /**
         * Update an existing notification
         */
        updateNotification: (state, action) => {
            const index = state.items.findIndex((n) => n.id === action.payload.id);
            if (index !== -1) {
                const wasUnread = !state.items[index].read;
                const isNowRead = action.payload.read;

                state.items[index] = {
                    ...state.items[index],
                    ...action.payload,
                };

                // Update unread count if read status changed
                if (wasUnread && isNowRead) {
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                } else if (!wasUnread && !isNowRead) {
                    state.unreadCount += 1;
                }
            }
            state.lastUpdated = Date.now();
        },

        /**
         * Mark notification as read
         */
        markAsRead: (state, action) => {
            const notificationId = action.payload;
            const notification = state.items.find((n) => n.id === notificationId);

            if (notification && !notification.read) {
                notification.read = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
                state.lastUpdated = Date.now();
            }
        },

        /**
         * Mark all notifications as read
         */
        markAllAsRead: (state) => {
            state.items.forEach((notification) => {
                notification.read = true;
            });
            state.unreadCount = 0;
            state.lastUpdated = Date.now();
        },

        /**
         * Remove a notification
         */
        removeNotification: (state, action) => {
            const notificationId = action.payload;
            const notification = state.items.find((n) => n.id === notificationId);

            if (notification) {
                // Decrement unread count if notification was unread
                if (!notification.read) {
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }

                // Remove from list
                state.items = state.items.filter((n) => n.id !== notificationId);
                state.lastUpdated = Date.now();
            }
        },

        /**
         * Clear all notifications
         */
        clearAllNotifications: (state) => {
            state.items = [];
            state.unreadCount = 0;
            state.lastUpdated = Date.now();
        },

        /**
         * Increment unread count
         * Used when receiving real-time notification
         */
        incrementUnreadCount: (state) => {
            state.unreadCount += 1;
        },

        /**
         * Decrement unread count
         */
        decrementUnreadCount: (state) => {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
        },

        /**
         * Set unread count
         */
        setUnreadCount: (state, action) => {
            state.unreadCount = Math.max(0, action.payload);
        },

        /**
         * Set loading state
         */
        setLoading: (state, action) => {
            state.loading = action.payload;
        },

        /**
         * Set error state
         */
        setError: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },

        /**
         * Clear error state
         */
        clearError: (state) => {
            state.error = null;
        },

        /**
         * Clear notification data
         * Used on logout
         */
        clearNotificationData: (state) => {
            state.items = [];
            state.unreadCount = 0;
            state.loading = false;
            state.error = null;
            state.lastUpdated = null;
        },
    },
});

// Export actions
export const {
    setNotifications,
    addNotification,
    updateNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    incrementUnreadCount,
    decrementUnreadCount,
    setUnreadCount,
    setLoading,
    setError,
    clearError,
    clearNotificationData,
} = notificationSlice.actions;

// Selectors
export const selectNotifications = (state) => state.notifications;
export const selectNotificationItems = (state) => state.notifications.items;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectUnreadNotifications = (state) =>
    state.notifications.items.filter((n) => !n.read);
export const selectNotificationLoading = (state) => state.notifications.loading;
export const selectNotificationError = (state) => state.notifications.error;
export const selectLastUpdated = (state) => state.notifications.lastUpdated;

// Export reducer
export default notificationSlice.reducer;
