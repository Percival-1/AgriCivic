import axios from '../axios';

class AdminService {
        async getSystemStats() {
                const response = await axios.get('/api/v1/admin/stats');
                return response.data;
        }

        async getRecentActivity(limit = 10) {
                const response = await axios.get('/api/v1/admin/activity', {
                        params: { limit },
                });
                return response.data;
        }

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

        async getUserDetails(userId) {
                const response = await axios.get(`/api/v1/admin/users/${userId}`);
                return response.data;
        }

        async getUserActivityLogs(userId, page = 1, limit = 20) {
                const response = await axios.get(`/api/v1/admin/users/${userId}/activity`, {
                        params: { page, limit },
                });
                return response.data;
        }

        async activateUser(userId) {
                const response = await axios.post(`/api/v1/admin/users/${userId}/activate`);
                return response.data;
        }

        async deactivateUser(userId) {
                const response = await axios.post(`/api/v1/admin/users/${userId}/deactivate`);
                return response.data;
        }

        async exportUserData(userId, format = 'json') {
                const response = await axios.get(`/api/v1/admin/users/${userId}/export`, {
                        params: { format },
                        responseType: 'blob',
                });
                return response.data;
        }

        async getUserStats() {
                const response = await axios.get('/api/v1/admin/users/stats');
                return response.data;
        }
}

export default new AdminService();