import BaseService from './BaseService'

/**
 * Maps service for geocoding and location services
 */
class MapsService extends BaseService {
    /**
     * Convert address to geographic coordinates (geocoding)
     * @param {string} address - Address to geocode
     * @returns {Promise<object>} Location with coordinates and address components
     */
    async geocode(address) {
        if (!address) {
            throw new Error('Address is required for geocoding')
        }

        return await this.post('/api/v1/maps/geocode', { address })
    }

    /**
     * Get address suggestions for autocomplete
     * @param {string} text - Search text (minimum 2 characters)
     * @param {number} limit - Maximum number of suggestions (default: 5)
     * @returns {Promise<Array>} List of address suggestions
     */
    async autocomplete(text, limit = 5) {
        if (!text || text.length < 2) {
            return []
        }

        return await this.post('/api/v1/maps/autocomplete', { text, limit })
    }

    /**
     * Convert coordinates to address (reverse geocoding)
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @returns {Promise<object>} Location with address information
     */
    async reverseGeocode(latitude, longitude) {
        if (!latitude || !longitude) {
            throw new Error('Latitude and longitude are required')
        }

        return await this.post('/api/v1/maps/reverse-geocode', {
            latitude,
            longitude
        })
    }

    /**
     * Calculate distance between two locations
     * @param {object} origin - Origin location with latitude and longitude
     * @param {object} destination - Destination location with latitude and longitude
     * @param {string} mode - Travel mode (driving, walking, bicycling, transit)
     * @returns {Promise<object>} Distance and duration information
     */
    async calculateDistance(origin, destination, mode = 'driving') {
        return await this.post('/api/v1/maps/distance', {
            origin,
            destination,
            mode
        })
    }

    /**
     * Get route information between two locations
     * @param {object} origin - Origin location with latitude and longitude
     * @param {object} destination - Destination location with latitude and longitude
     * @param {string} mode - Travel mode (driving, walking, bicycling, transit)
     * @returns {Promise<object>} Route information with steps and polyline
     */
    async getRoute(origin, destination, mode = 'driving') {
        return await this.post('/api/v1/maps/route', {
            origin,
            destination,
            mode
        })
    }

    /**
     * Validate if a location is valid
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @returns {Promise<object>} Validation result
     */
    async validateLocation(latitude, longitude) {
        return await this.post('/api/v1/maps/validate-location', {
            latitude,
            longitude
        })
    }
}

export default new MapsService()
