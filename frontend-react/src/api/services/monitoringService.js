import axios from '../axios';
import { ENDPOINTS } from '../endpoints';

/**
 * Monitoring Service
 * Handles admin system monitoring operations
 */
class MonitoringService {
    /**
     * Get system health status
     */
    async getHealthStatus() {
        const response = await axios.get(`${ENDPOINTS.ADMIN.MONITORING}/health`);
        return response.data;
    }

    /**
     * Get real-time system metrics
     */
    async getMetrics() {
        const response = await axios.get(`${ENDPOINTS.ADMIN.MONITORING}/metrics`);
        return response.data;
    }

    /**
     * Get service-specific metrics
     */
    async getServiceMetrics() {
        const response = await axios.get(`${ENDPOINTS.ADMIN.MONITORING}/service-metrics`);
        return response.data;
    }

    /**
     * Get circuit breaker status for all services
     */
    async getCircuitBreakers() {
        const response = await axios.get(`${ENDPOINTS.ADMIN.MONITORING}/circuit-breakers`);
        return response.data;
    }

    /**
     * Get circuit breaker details for a specific service
     */
    async getCircuitBreakerDetails(breakerName) {
        const response = await axios.get(
            `${ENDPOINTS.ADMIN.MONITORING}/circuit-breakers/${breakerName}`
        );
        return response.data;
    }

    /**
     * Reset a circuit breaker
     */
    async resetCircuitBreaker(breakerName) {
        const response = await axios.post(
            `${ENDPOINTS.ADMIN.MONITORING}/circuit-breakers/${breakerName}/reset`
        );
        return response.data;
    }

    /**
     * Reset all circuit breakers
     */
    async resetAllCircuitBreakers() {
        const response = await axios.post(
            `${ENDPOINTS.ADMIN.MONITORING}/circuit-breakers/reset-all`
        );
        return response.data;
    }

    /**
     * Get error summary
     * @param {number} timeWindowSeconds - Time window for error aggregation (default: 3600)
     */
    async getErrorSummary(timeWindowSeconds = 3600) {
        const response = await axios.get(`${ENDPOINTS.ADMIN.MONITORING}/errors`, {
            params: {
                time_window_seconds: timeWindowSeconds,
            },
        });
        return response.data;
    }

    /**
     * Clear old error records
     * @param {number} maxAgeSeconds - Maximum age of errors to keep (default: 86400)
     */
    async clearOldErrors(maxAgeSeconds = 86400) {
        const response = await axios.post(`${ENDPOINTS.ADMIN.MONITORING}/errors/clear`, null, {
            params: {
                max_age_seconds: maxAgeSeconds,
            },
        });
        return response.data;
    }

    /**
     * Get active alerts
     */
    async getActiveAlerts() {
        const response = await axios.get(`${ENDPOINTS.ADMIN.MONITORING}/alerts`);
        return response.data;
    }

    /**
     * Get alert history
     * @param {number} limit - Maximum number of alerts to return (default: 100)
     */
    async getAlertHistory(limit = 100) {
        const response = await axios.get(`${ENDPOINTS.ADMIN.MONITORING}/alerts/history`, {
            params: { limit },
        });
        return response.data;
    }

    /**
     * Resolve an alert
     */
    async resolveAlert(alertId) {
        const response = await axios.post(
            `${ENDPOINTS.ADMIN.MONITORING}/alerts/${alertId}/resolve`
        );
        return response.data;
    }

    /**
     * Manually trigger alert condition checks
     */
    async checkAlerts() {
        const response = await axios.post(`${ENDPOINTS.ADMIN.MONITORING}/alerts/check`);
        return response.data;
    }

    /**
     * Get system metrics (comprehensive system-wide metrics)
     * This is an alias for getMetrics() for consistency with requirements
     */
    async getSystemMetrics() {
        return this.getMetrics();
    }

    /**
     * Get alerts (both active and historical)
     * @param {boolean} activeOnly - If true, return only active alerts (default: true)
     * @param {number} limit - Maximum number of alerts to return for history
     */
    async getAlerts(activeOnly = true, limit = 100) {
        if (activeOnly) {
            return this.getActiveAlerts();
        } else {
            return this.getAlertHistory(limit);
        }
    }
}

export default new MonitoringService();
