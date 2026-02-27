import BaseService from './BaseService'

/**
 * Portal Synchronization service for managing government portal data sync
 */
class PortalSyncService extends BaseService {
    /**
     * Trigger synchronization with government portals
     * @param {boolean} forceSync - Force sync even if recently synced
     * @returns {Promise<object>} Sync result
     */
    async triggerSync(forceSync = false) {
        const response = await this.post('/api/v1/portal-sync/trigger', {
            force_sync: forceSync
        })
        return response
    }

    /**
     * Trigger background synchronization
     * @param {boolean} forceSync - Force sync even if recently synced
     * @returns {Promise<object>} Background sync status
     */
    async triggerBackgroundSync(forceSync = false) {
        const response = await this.post('/api/v1/portal-sync/trigger-background', {
            force_sync: forceSync
        })
        return response
    }

    /**
     * Get synchronization status
     * @returns {Promise<object>} Sync status information
     */
    async getSyncStatus() {
        const response = await this.get('/api/v1/portal-sync/status')
        return response.status || response
    }

    /**
     * Get list of configured portals
     * @returns {Promise<object>} List of configured portals
     */
    async getConfiguredPortals() {
        const response = await this.get('/api/v1/portal-sync/portals')
        return response
    }

    /**
     * Get synced documents
     * @param {object} params - Query parameters
     * @param {number} params.page - Page number for pagination
     * @param {number} params.limit - Items per page
     * @returns {Promise<object>} Synced documents
     */
    async getSyncedDocuments(params = {}) {
        const { page = 1, limit = 10, ...rest } = params
        const offset = (page - 1) * limit

        const response = await this.get('/api/v1/portal-sync/documents', {
            params: {
                limit,
                offset,
                ...rest
            }
        })
        return response
    }

    /**
     * Get sync health status
     * @returns {Promise<object>} Health status of sync services
     */
    async getSyncHealth() {
        const response = await this.get('/api/v1/portal-sync/health')
        return {
            status: response.health_status || 'unknown',
            issues: response.issues || [],
            service_info: response.service_info || {}
        }
    }
}

export default new PortalSyncService()
