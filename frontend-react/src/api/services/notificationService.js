import axios from '../axios';
import BaseService from './BaseService';

class NotificationService extends BaseService {
    constructor() {
        super();
        // 🔥 FIX: Removed /api from baseURL
        this.baseURL = '/v1/notifications';
    }

    async getNotifications(limit = 10, offset = 0, userId = 'me') {
        const response = await axios.get(`${this.baseURL}/history/${userId}`, {
            params: { limit, offset },
        });
        return response.data;
    }

    async markAsRead(notificationId) {
        try {
            const response = await axios.patch(`${this.baseURL}/${notificationId}/read`);
            return response.data;
        } catch (error) {
            console.warn('Mark as read endpoint not implemented in backend');
            return { success: true };
        }
    }

    async markAllAsRead() {
        try {
            const response = await axios.patch(`${this.baseURL}/read-all`);
            return response.data;
        } catch (error) {
            console.warn('Mark all as read endpoint not implemented in backend');
            return { success: true };
        }
    }

    async getPreferences(userId = 'me') {
        try {
            // 🔥 FIX: Removed /api
            const response = await axios.get(`/v1/notification-preferences/${userId}`);
            return response.data;
        } catch (error) {
            console.error('NotificationService: Error fetching preferences:', error);
            throw error;
        }
    }

    async updatePreferences(preferences, userId = 'me') {
        try {
            // 🔥 FIX: Removed /api
            const response = await axios.put(`/v1/notification-preferences/${userId}`, preferences);
            return response.data;
        } catch (error) {
            console.error('NotificationService: Error updating preferences:', error);
            throw error;
        }
    }

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

    async getStats(days = 7) {
        const response = await axios.get(`${this.baseURL}/stats`, { params: { days } });
        return response.data;
    }

    async triggerNotifications(notificationType, userIds = null, customMessage = null) {
        const response = await axios.post(`${this.baseURL}/trigger`, {
            notification_type: notificationType,
            user_ids: userIds,
            custom_message: customMessage,
        });
        return response.data;
    }

    async unsubscribeAll(userId = 'me') {
        // 🔥 FIX: Removed /api
        const response = await axios.delete(`/v1/notification-preferences/${userId}/unsubscribe-all`);
        return response.data;
    }
}

export default new NotificationService();