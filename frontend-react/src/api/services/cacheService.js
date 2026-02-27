import BaseService from './BaseService'
import { ENDPOINTS } from '../endpoints'

/**
 * Cache service for managing application cache
 */
class CacheService extends BaseService {
    /**
     * Get cache metrics
     * @returns {Promise<object>} Cache metrics including hit rates, memory usage, and statistics
     */
    async getCacheMetrics() {
        const response = await this.get(ENDPOINTS.CACHE.METRICS)
        return response
    }

    /**
     * Invalidate cache for a specific namespace
     * @param {string} namespace - Cache namespace to invalidate (e.g., 'weather', 'market', 'scheme')
     * @param {string} identifier - Optional specific identifier to invalidate
     * @returns {Promise<object>} Invalidation result
     */
    async invalidateCache(namespace, identifier = null) {
        const response = await this.post(ENDPOINTS.CACHE.INVALIDATE, {
            namespace,
            identifier
        })
        return response
    }

    /**
     * Get cache health status
     * @returns {Promise<object>} Cache health information
     */
    async getCacheHealth() {
        const response = await this.get(ENDPOINTS.CACHE.HEALTH)
        return response
    }

    /**
     * Get cache namespaces with TTL information
     * @returns {Promise<object>} List of cache namespaces
     */
    async getCacheNamespaces() {
        const response = await this.get(ENDPOINTS.CACHE.NAMESPACES)
        return response
    }

    /**
     * Reset cache metrics counters
     * @returns {Promise<object>} Reset result
     */
    async resetMetrics() {
        const response = await this.post(ENDPOINTS.CACHE.RESET_METRICS)
        return response
    }

    /**
     * Calculate cache hit rate percentage
     * @param {number} hits - Number of cache hits
     * @param {number} misses - Number of cache misses
     * @returns {number} Hit rate percentage
     */
    calculateHitRate(hits, misses) {
        const total = hits + misses
        if (total === 0) return 0
        return ((hits / total) * 100).toFixed(2)
    }

    /**
     * Format memory size in human-readable format
     * @param {number} bytes - Memory size in bytes
     * @returns {string} Formatted memory size
     */
    formatMemorySize(bytes) {
        if (bytes === 0) return '0 B'

        const units = ['B', 'KB', 'MB', 'GB', 'TB']
        const k = 1024
        const i = Math.floor(Math.log(bytes) / Math.log(k))

        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`
    }

    /**
     * Get cache status color based on health
     * @param {string} status - Cache health status
     * @returns {string} Color class for status
     */
    getStatusColor(status) {
        const statusColors = {
            healthy: 'text-green-600',
            degraded: 'text-yellow-600',
            unhealthy: 'text-red-600',
            unknown: 'text-gray-600'
        }

        return statusColors[status?.toLowerCase()] || statusColors.unknown
    }

    /**
     * Get cache status background color
     * @param {string} status - Cache health status
     * @returns {string} Background color class for status
     */
    getStatusBgColor(status) {
        const statusBgColors = {
            healthy: 'bg-green-100',
            degraded: 'bg-yellow-100',
            unhealthy: 'bg-red-100',
            unknown: 'bg-gray-100'
        }

        return statusBgColors[status?.toLowerCase()] || statusBgColors.unknown
    }
}

export default new CacheService()
