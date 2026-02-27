import BaseService from './BaseService'
import { ENDPOINTS } from '../endpoints'

/**
 * Market service for price information, mandis, and selling recommendations
 */
class MarketService extends BaseService {
    /**
     * Get current market prices for crops
     * @param {string} cropName - Crop name (required)
     * @param {number} latitude - User's latitude (required)
     * @param {number} longitude - User's longitude (required)
     * @param {number} radiusKm - Search radius in km (optional, default: 100)
     * @returns {Promise<object>} Current market prices
     */
    async getCurrentPrices(cropName, latitude, longitude, radiusKm = 100) {
        if (!cropName) {
            throw new Error('Crop name is required')
        }
        if (!latitude || !longitude) {
            throw new Error('Latitude and longitude are required')
        }

        const queryString = this.buildQueryString({
            latitude,
            longitude,
            radius_km: radiusKm
        })
        return await this.get(`/api/v1/market/prices/${encodeURIComponent(cropName)}?${queryString}`)
    }

    /**
     * Compare prices across multiple mandis
     * @param {string} cropName - Crop name (required)
     * @param {number} latitude - User's latitude (required)
     * @param {number} longitude - User's longitude (required)
     * @param {number} radiusKm - Search radius in km (optional, default: 100)
     * @returns {Promise<object>} Price comparison data
     */
    async comparePrices(cropName, latitude, longitude, radiusKm = 100) {
        if (!cropName) {
            throw new Error('Crop name is required for price comparison')
        }
        if (!latitude || !longitude) {
            throw new Error('Latitude and longitude are required')
        }

        const queryString = this.buildQueryString({
            latitude,
            longitude,
            radius_km: radiusKm
        })
        return await this.get(`/api/v1/market/compare/${encodeURIComponent(cropName)}?${queryString}`)
    }

    /**
     * Get price trends for a crop over time
     * @param {string} cropName - Crop name (required)
     * @param {number} latitude - User's latitude (required)
     * @param {number} longitude - User's longitude (required)
     * @param {number} days - Number of days to analyze (optional, default: 30)
     * @returns {Promise<object>} Historical price trend data
     */
    async getPriceTrends(cropName, latitude, longitude, days = 30) {
        if (!cropName) {
            throw new Error('Crop name is required for price trends')
        }
        if (!latitude || !longitude) {
            throw new Error('Latitude and longitude are required')
        }

        const queryString = this.buildQueryString({
            latitude,
            longitude,
            days
        })
        return await this.get(`/api/v1/market/trend/${encodeURIComponent(cropName)}?${queryString}`)
    }

    /**
     * Get comprehensive market intelligence with recommendations
     * @param {string} cropName - Crop name (required)
     * @param {number} latitude - User's latitude (required)
     * @param {number} longitude - User's longitude (required)
     * @param {number} radiusKm - Search radius in km (optional, default: 100)
     * @returns {Promise<object>} Comprehensive market intelligence including mandis and recommendations
     */
    async getMarketIntelligence(cropName, latitude, longitude, radiusKm = 100) {
        if (!cropName) {
            throw new Error('Crop name is required')
        }
        if (!latitude || !longitude) {
            throw new Error('Latitude and longitude are required')
        }

        const queryString = this.buildQueryString({
            latitude,
            longitude,
            radius_km: radiusKm
        })
        return await this.get(`/api/v1/market/intelligence/${encodeURIComponent(cropName)}?${queryString}`)
    }

    /**
     * Calculate distance between two coordinates
     * @param {number} lat1 - First latitude
     * @param {number} lon1 - First longitude
     * @param {number} lat2 - Second latitude
     * @param {number} lon2 - Second longitude
     * @returns {number} Distance in kilometers
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371 // Earth's radius in km
        const dLat = this.toRadians(lat2 - lat1)
        const dLon = this.toRadians(lon2 - lon1)

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) *
            Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2)

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance = R * c

        return Math.round(distance * 10) / 10 // Round to 1 decimal place
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Degrees
     * @returns {number} Radians
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180)
    }

    /**
     * Get favorite mandis from localStorage
     * @returns {Array<object>} List of favorite mandis
     */
    getFavoriteMandis() {
        const favorites = localStorage.getItem('favoriteMandis')
        return favorites ? JSON.parse(favorites) : []
    }

    /**
     * Save favorite mandi to localStorage
     * @param {object} mandi - Mandi object to save
     * @returns {Array<object>} Updated list of favorites
     */
    saveFavoriteMandi(mandi) {
        const favorites = this.getFavoriteMandis()

        // Check if already exists
        const exists = favorites.some(
            (fav) => fav.id === mandi.id || fav.name === mandi.name
        )

        if (!exists) {
            favorites.push(mandi)
            localStorage.setItem('favoriteMandis', JSON.stringify(favorites))
        }

        return favorites
    }

    /**
     * Remove favorite mandi from localStorage
     * @param {string} mandiId - Mandi ID or name
     * @returns {Array<object>} Updated list of favorites
     */
    removeFavoriteMandi(mandiId) {
        const favorites = this.getFavoriteMandis()
        const updated = favorites.filter(
            (fav) => fav.id !== mandiId && fav.name !== mandiId
        )

        localStorage.setItem('favoriteMandis', JSON.stringify(updated))
        return updated
    }

    /**
     * Check if mandi is in favorites
     * @param {string} mandiId - Mandi ID or name
     * @returns {boolean} True if in favorites
     */
    isFavoriteMandi(mandiId) {
        const favorites = this.getFavoriteMandis()
        return favorites.some((fav) => fav.id === mandiId || fav.name === mandiId)
    }

    /**
     * Format price for display
     * @param {number} price - Price value
     * @param {string} currency - Currency symbol (default: ₹)
     * @returns {string} Formatted price string
     */
    formatPrice(price, currency = '₹') {
        if (!price && price !== 0) return 'N/A'
        return `${currency}${price.toLocaleString('en-IN')}`
    }

    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date string
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A'

        const date = new Date(dateString)
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    /**
     * Get price change indicator
     * @param {number} currentPrice - Current price
     * @param {number} previousPrice - Previous price
     * @returns {object} Change percentage and direction
     */
    getPriceChange(currentPrice, previousPrice) {
        if (!previousPrice || previousPrice === 0) {
            return { percentage: 0, direction: 'neutral' }
        }

        const change = ((currentPrice - previousPrice) / previousPrice) * 100
        const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'

        return {
            percentage: Math.abs(Math.round(change * 10) / 10),
            direction,
        }
    }
}

export default new MarketService()
