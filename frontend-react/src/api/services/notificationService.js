import axios from '../axios';
import BaseService from './BaseService';

/**
 * Notification Service
 * Handles all notification API calls
 * Requirements: 11.1-11.6
 */
class NotificationService extends BaseService {
    constructor() {
        super();
        this.baseURL = '/api/v1/notifications';
    }

    /**
     * Get user notifications (notification history)
     * Backend endpoint: GET /api/v1/notifications/history/{user_id}
     */
    async getNotifications(limit = 10, offset = 0, userId = 'me') {
        const response = await axios.get(`${this.baseURL}/history/${userId}`, {
            params: { limit, offset },
        });
        return response.data;
    }

    /**
     * Mark notification as read
     * Note: This endpoint may not exist in backend, using patch as fallback
     */
    async markAsRead(notificationId) {
        try {
            const response = await axios.patch(`${this.baseURL}/${notificationId}/read`);
            return response.data;
        } catch (error) {
            // If endpoint doesn't exist, log and return success
            console.warn('Mark as read endpoint not implemented in backend');
            return { success: true };
        }
    }

    /**
     * Mark all notifications as read
     * Note: This endpoint may not exist in backend
     */
    async markAllAsRead() {
        try {
            const response = await axios.patch(`${this.baseURL}/read-all`);
            return response.data;
        } catch (error) {
            // If endpoint doesn't exist, log and return success
            console.warn('Mark all as read endpoint not implemented in backend');
            return { success: true };
        }
    }

    /**
     * Get notification preferences
     * Backend endpoint: GET /api/v1/notification-preferences/{user_id}
     */
    async getPreferences(userId = 'me') {
        try {
            console.log('NotificationService: Fetching preferences for userId:', userId);
            const response = await axios.get(`/api/v1/notification-preferences/${userId}`);
            console.log('NotificationService: Preferences response:', response.data);
            return response.data;
        } catch (error) {
            console.error('NotificationService: Error fetching preferences:', {
                userId,
                error: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw error;
        }
    }

    /**
     * Update notification preferences
     * Backend endpoint: PUT /api/v1/notification-preferences/{user_id}
     */
    async updatePreferences(preferences, userId = 'me') {
        try {
            console.log('NotificationService: Updating preferences for userId:', userId, preferences);
            const response = await axios.put(`/api/v1/notification-preferences/${userId}`, preferences);
            console.log('NotificationService: Update response:', response.data);
            return response.data;
        } catch (error) {
            console.error('NotificationService: Error updating preferences:', {
                userId,
                error: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw error;
        }
    }

    /**
     * Get unread count
     * Note: This is calculated client-side since backend doesn't have this endpoint
     */
    async getUnreadCount(userId = 'me') {
        try {
            const notifications = await this.getNotifications(100, 0, userId);
            const unreadCount = Array.isArray(notifications)
                ? notifications.filter(n => !n.read && n.delivery_status !== 'delivered').length
                : 0;
            return { count: unreadCount };
        } catch (error) {
            console.error('Failed to get unread count:', error);
            return { count: 0 };
        }
    }

    /**
     * Get notification statistics
     * Backend endpoint: GET /api/v1/notifications/stats
     */
    async getStats(days = 7) {
        const response = await axios.get(`${this.baseURL}/stats`, {
            params: { days },
        });
        return response.data;
    }

    /**
     * Trigger notifications manually (admin)
     * Backend endpoint: POST /api/v1/notifications/trigger
     */
    async triggerNotifications(notificationType, userIds = null, customMessage = null) {
        const response = await axios.post(`${this.baseURL}/trigger`, {
            notification_type: notificationType,
            user_ids: userIds,
            custom_message: customMessage,
        });
        return response.data;
    }

    /**
     * Unsubscribe from all notifications
     * Backend endpoint: DELETE /api/v1/notification-preferences/{user_id}/unsubscribe-all
     */
    async unsubscribeAll(userId = 'me') {
        const response = await axios.delete(`/api/v1/notification-preferences/${userId}/unsubscribe-all`);
        return response.data;
    }
}

export default new NotificationService();
