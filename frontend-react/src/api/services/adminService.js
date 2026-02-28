import axios from '../axios';

class AdminService {
    /**
     * Get system statistics for admin dashboard
     */
    async getSystemStats() {
        const response = await axios.get('/api/v1/admin/stats');
        return response.data;
    }

    /**
     * Get recent activity logs
     */
    async getRecentActivity(limit = 10) {
        const response = await axios.get('/api/v1/admin/activity', {
            params: { limit },
        });
        return response.data;
    }

    /**
     * Get all users with pagination
     */
    async getUsers(page = 1, limit = 20, search = '', filters = {}) {
        const response = await axios.get('/api/v1/admin/users', {
            params: {
                page,
                limit,
                search,
                ...filters,
            },
        });
        return response.data;
    }

    /**
     * Get user details by ID
     */
    async getUserDetails(userId) {
        const response = await axios.get(`/api/v1/admin/users/${userId}`);
        return response.data;
    }

    /**
     * Get user activity logs
     */
    async getUserActivityLogs(userId, page = 1, limit = 20) {
        const response = await axios.get(`/api/v1/admin/users/${userId}/activity`, {
            params: { page, limit },
        });
        return response.data;
    }

    /**
     * Activate user account
     */
    async activateUser(userId) {
        const response = await axios.post(`/api/v1/admin/users/${userId}/activate`);
        return response.data;
    }

    /**
     * Deactivate user account
     */
    async deactivateUser(userId) {
        const response = await axios.post(`/api/v1/admin/users/${userId}/deactivate`);
        return response.data;
    }

    /**
     * Export user data
     */
    async exportUserData(userId, format = 'json') {
        const response = await axios.get(`/api/v1/admin/users/${userId}/export`, {
            params: { format },
            responseType: 'blob',
        });
        return response.data;
    }

    /**
     * Get user statistics
     */
    async getUserStats() {
        const response = await axios.get('/api/v1/admin/users/stats');
        return response.data;
    }
}

export default new AdminService();
