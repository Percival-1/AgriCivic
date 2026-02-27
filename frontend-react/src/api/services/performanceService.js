import axios from '../axios';
import { ENDPOINTS } from '../endpoints';

/**
 * Performance Service
 * Handles admin performance monitoring operations
 */
class PerformanceService {
    /**
     * Get performance metrics
     * @returns {Promise<object>} Performance metrics including response times, throughput, etc.
     */
    async getPerformanceMetrics() {
        const response = await axios.get(`${ENDPOINTS.ADMIN.PERFORMANCE}/metrics`);
        return response.data.metrics || response.data;
    }

    /**
     * Get slow requests above threshold
     * @param {number} thresholdMs - Threshold in milliseconds (default: 1000)
     * @param {number} limit - Maximum number of requests to return (default: 100)
     * @returns {Promise<object>} List of slow requests
     */
    async getSlowRequests(thresholdMs = 1000, limit = 100) {
        const response = await axios.get(`${ENDPOINTS.ADMIN.PERFORMANCE}/metrics/slow-requests`, {
            params: {
                threshold: thresholdMs / 1000, // Convert to seconds
                limit,
            },
        });
        return response.data;
    }

    /**
     * Get slow database queries
     * @param {number} thresholdMs - Threshold in milliseconds (default: 500)
     * @param {number} limit - Maximum number of queries to return (default: 100)
     * @returns {Promise<object>} List of slow queries with execution times
     */
    async getSlowQueries(thresholdMs = 500, limit = 100) {
        const response = await axios.get(`${ENDPOINTS.ADMIN.PERFORMANCE}/metrics/slow-queries`, {
            params: {
                limit,
            },
        });
        return response.data;
    }

    /**
     * Get time series performance metrics
     * @param {string} metric - Metric name (e.g., 'response_time', 'throughput', 'error_rate')
     * @param {number} timeWindowSeconds - Time window in seconds (default: 3600)
     * @param {number} intervalSeconds - Data point interval in seconds (default: 60)
     * @returns {Promise<object>} Time series data for the specified metric
     */
    async getTimeSeriesMetrics(metric, timeWindowSeconds = 3600, intervalSeconds = 60) {
        const response = await axios.get(`${ENDPOINTS.ADMIN.PERFORMANCE}/metrics/time-series`, {
            params: {
                minutes: Math.floor(timeWindowSeconds / 60),
            },
        });
        return response.data.time_series || response.data;
    }

    /**
     * Get database query performance metrics
     * @returns {Promise<object>} Database query performance statistics
     */
    async getQueryPerformance() {
        const response = await axios.get(`${ENDPOINTS.ADMIN.PERFORMANCE}/metrics/database`);
        return response.data.database_metrics || response.data;
    }

    /**
     * Clear old performance metrics
     * @param {number} maxAgeSeconds - Maximum age of metrics to keep (default: 86400)
     * @returns {Promise<object>} Clear operation result
     */
    async clearOldMetrics(maxAgeSeconds = 86400) {
        const response = await axios.post(
            `${ENDPOINTS.ADMIN.PERFORMANCE}/metrics/clear`,
            null,
            {
                params: {
                    hours: Math.floor(maxAgeSeconds / 3600),
                },
            }
        );
        return response.data;
    }

    /**
     * Get endpoint performance breakdown
     * @returns {Promise<object>} Performance metrics grouped by endpoint
     */
    async getEndpointPerformance() {
        const response = await axios.get(`${ENDPOINTS.ADMIN.PERFORMANCE}/metrics/endpoints`);
        return response.data.endpoint_metrics || response.data;
    }

    /**
     * Format duration in human-readable format
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} Formatted duration
     */
    formatDuration(milliseconds) {
        if (milliseconds < 1000) {
            return `${milliseconds.toFixed(0)}ms`;
        } else if (milliseconds < 60000) {
            return `${(milliseconds / 1000).toFixed(2)}s`;
        } else {
            const minutes = Math.floor(milliseconds / 60000);
            const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
            return `${minutes}m ${seconds}s`;
        }
    }

    /**
     * Get performance status color based on response time
     * @param {number} responseTimeMs - Response time in milliseconds
     * @returns {string} Color class for status
     */
    getPerformanceColor(responseTimeMs) {
        if (responseTimeMs < 200) return 'text-green-600';
        if (responseTimeMs < 500) return 'text-blue-600';
        if (responseTimeMs < 1000) return 'text-yellow-600';
        if (responseTimeMs < 2000) return 'text-orange-600';
        return 'text-red-600';
    }

    /**
     * Get performance status background color
     * @param {number} responseTimeMs - Response time in milliseconds
     * @returns {string} Background color class for status
     */
    getPerformanceBgColor(responseTimeMs) {
        if (responseTimeMs < 200) return 'bg-green-100';
        if (responseTimeMs < 500) return 'bg-blue-100';
        if (responseTimeMs < 1000) return 'bg-yellow-100';
        if (responseTimeMs < 2000) return 'bg-orange-100';
        return 'bg-red-100';
    }

    /**
     * Calculate percentile from sorted array
     * @param {number[]} sortedArray - Sorted array of numbers
     * @param {number} percentile - Percentile to calculate (0-100)
     * @returns {number} Percentile value
     */
    calculatePercentile(sortedArray, percentile) {
        if (sortedArray.length === 0) return 0;
        const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
        return sortedArray[Math.max(0, index)];
    }

    /**
     * Format throughput value
     * @param {number} requestsPerSecond - Requests per second
     * @returns {string} Formatted throughput
     */
    formatThroughput(requestsPerSecond) {
        if (requestsPerSecond < 1) {
            return `${(requestsPerSecond * 60).toFixed(2)} req/min`;
        }
        return `${requestsPerSecond.toFixed(2)} req/s`;
    }
}

export default new PerformanceService();
