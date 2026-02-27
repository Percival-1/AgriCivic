import BaseService from './BaseService'
import { ENDPOINTS } from '../endpoints'

/**
 * User service for profile management and user data operations
 */
class UserService extends BaseService {
    /**
     * Get user profile
     * @param {string} userId - User ID (optional, defaults to current user)
     * @returns {Promise<object>} User profile data
     */
    async getProfile(userId = null) {
        // If userId is provided, fetch specific user profile
        // Otherwise, use the current user endpoint
        const endpoint = userId
            ? `${ENDPOINTS.ADMIN.USERS}/${userId}`
            : ENDPOINTS.AUTH.CURRENT_USER

        const response = await this.get(endpoint)

        // Cache current user data
        if (!userId && (response.user || response)) {
            const userData = response.user || response
            localStorage.setItem('user', JSON.stringify(userData))
        }

        return response
    }

    /**
     * Update user profile
     * @param {object} profileData - Profile data to update
     * @param {string} profileData.name - User's name
     * @param {string} profileData.location - User's location
     * @param {Array<string>} profileData.crops - User's crops
     * @param {number} profileData.land_size - Land size in acres
     * @param {string} profileData.language - Preferred language
     * @param {string} profileData.phone_number - Phone number
     * @returns {Promise<object>} Updated user data
     */
    async updateProfile(profileData) {
        // Use PATCH for partial updates
        const response = await this.patch(ENDPOINTS.AUTH.CURRENT_USER, profileData)

        // Update cached user data
        if (response.user || response) {
            const userData = response.user || response
            localStorage.setItem('user', JSON.stringify(userData))
        }

        return response
    }

    /**
     * Complete user profile (for new users)
     * @param {object} profileData - Complete profile data
     * @param {string} profileData.name - User's name
     * @param {string} profileData.location - User's location
     * @param {Array<string>} profileData.crops - User's crops
     * @param {number} profileData.land_size - Land size in acres
     * @param {string} profileData.language - Preferred language
     * @returns {Promise<object>} Updated user data
     */
    async completeProfile(profileData) {
        return this.updateProfile(profileData)
    }

    /**
     * Update user preferences
     * @param {object} preferences - User preferences
     * @param {string} preferences.language - Preferred language
     * @param {object} preferences.notifications - Notification preferences
     * @param {string} preferences.theme - UI theme preference
     * @returns {Promise<object>} Updated preferences
     */
    async updatePreferences(preferences) {
        const response = await this.patch(ENDPOINTS.AUTH.CURRENT_USER, {
            preferences: preferences
        })

        // Update cached user data
        if (response.user || response) {
            const userData = response.user || response
            localStorage.setItem('user', JSON.stringify(userData))
        }

        return response
    }

    /**
     * Get cached user data from localStorage
     * @returns {object|null} Cached user data or null
     */
    getCachedUser() {
        const userData = localStorage.getItem('user')
        return userData ? JSON.parse(userData) : null
    }

    /**
     * Check if user profile is complete
     * @param {object} user - User object
     * @returns {boolean} True if profile is complete
     */
    isProfileComplete(user) {
        if (!user) return false

        const requiredFields = ['name', 'location', 'crops', 'land_size', 'language']

        return requiredFields.every(field => {
            const value = user[field]
            if (Array.isArray(value)) {
                return value.length > 0
            }
            return value !== null && value !== undefined && value !== ''
        })
    }

    /**
     * Get profile completion percentage
     * @param {object} user - User object
     * @returns {number} Completion percentage (0-100)
     */
    getProfileCompletionPercentage(user) {
        if (!user) return 0

        const fields = ['name', 'location', 'crops', 'land_size', 'language', 'phone_number']
        let completedFields = 0

        fields.forEach(field => {
            const value = user[field]
            if (Array.isArray(value)) {
                if (value.length > 0) completedFields++
            } else if (value !== null && value !== undefined && value !== '') {
                completedFields++
            }
        })

        return Math.round((completedFields / fields.length) * 100)
    }

    /**
     * Get missing profile fields
     * @param {object} user - User object
     * @returns {Array<string>} Array of missing field names
     */
    getMissingProfileFields(user) {
        if (!user) return ['name', 'location', 'crops', 'land_size', 'language']

        const requiredFields = ['name', 'location', 'crops', 'land_size', 'language']
        const missingFields = []

        requiredFields.forEach(field => {
            const value = user[field]
            if (Array.isArray(value)) {
                if (value.length === 0) missingFields.push(field)
            } else if (value === null || value === undefined || value === '') {
                missingFields.push(field)
            }
        })

        return missingFields
    }

    /**
     * Validate profile data
     * @param {object} profileData - Profile data to validate
     * @returns {object} Validation result with errors
     */
    validateProfileData(profileData) {
        const errors = {}

        // Name validation
        if (profileData.name !== undefined) {
            if (!profileData.name || profileData.name.trim().length === 0) {
                errors.name = 'Name is required'
            } else if (profileData.name.length < 2) {
                errors.name = 'Name must be at least 2 characters'
            } else if (profileData.name.length > 100) {
                errors.name = 'Name must be less than 100 characters'
            }
        }

        // Location validation
        if (profileData.location !== undefined) {
            if (!profileData.location || profileData.location.trim().length === 0) {
                errors.location = 'Location is required'
            }
        }

        // Crops validation
        if (profileData.crops !== undefined) {
            if (!Array.isArray(profileData.crops)) {
                errors.crops = 'Crops must be an array'
            } else if (profileData.crops.length === 0) {
                errors.crops = 'At least one crop is required'
            }
        }

        // Land size validation
        if (profileData.land_size !== undefined) {
            const landSize = Number(profileData.land_size)
            if (isNaN(landSize) || landSize <= 0) {
                errors.land_size = 'Land size must be a positive number'
            } else if (landSize > 10000) {
                errors.land_size = 'Land size seems too large'
            }
        }

        // Language validation
        if (profileData.language !== undefined) {
            if (!profileData.language || profileData.language.trim().length === 0) {
                errors.language = 'Language preference is required'
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        }
    }

    /**
     * Clear cached user data
     */
    clearCache() {
        localStorage.removeItem('user')
    }
}

export default new UserService()
