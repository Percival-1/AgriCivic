import BaseService from './BaseService'
import { ENDPOINTS } from '../endpoints'

/**
 * Authentication service for user login, registration, and session management
 */
class AuthService extends BaseService {
    /**
     * Login user with phone number and password
     * @param {string} phoneNumber - User's phone number in E.164 format
     * @param {string} password - User's password
     * @returns {Promise<{access_token: string, refresh_token: string, user: object}>}
     */
    async login(phoneNumber, password) {
        const response = await this.post(ENDPOINTS.AUTH.LOGIN, {
            phone_number: phoneNumber,
            password: password
        })

        // Store tokens in localStorage
        if (response.access_token) {
            localStorage.setItem('token', response.access_token)
        }
        if (response.refresh_token) {
            localStorage.setItem('refreshToken', response.refresh_token)
        }

        return response
    }

    /**
     * Register new user
     * @param {object} userData - User registration data
     * @param {string} userData.phone_number - Phone number in E.164 format
     * @param {string} userData.password - Password
     * @param {string} userData.name - User's name (optional)
     * @param {string} userData.location - User's location (optional)
     * @param {Array<string>} userData.crops - User's crops (optional)
     * @param {number} userData.land_size - Land size in acres (optional)
     * @param {string} userData.language - Preferred language (optional)
     * @returns {Promise<{access_token: string, refresh_token: string, user: object}>}
     */
    async register(userData) {
        const response = await this.post(ENDPOINTS.AUTH.REGISTER, userData)

        // Store tokens in localStorage
        if (response.access_token) {
            localStorage.setItem('token', response.access_token)
        }
        if (response.refresh_token) {
            localStorage.setItem('refreshToken', response.refresh_token)
        }

        return response
    }

    /**
     * Logout current user
     * @returns {Promise<void>}
     */
    async logout() {
        try {
            // Call backend logout endpoint
            await this.post(ENDPOINTS.AUTH.LOGOUT)
        } catch (error) {
            // Continue with local logout even if backend call fails
            console.error('Logout error:', error)
        } finally {
            // Clear tokens from localStorage
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')

            // Clear any other user-related data
            localStorage.removeItem('user')
        }
    }

    /**
     * Get current authenticated user
     * @returns {Promise<object>} Current user data
     */
    async getCurrentUser() {
        const response = await this.get(ENDPOINTS.AUTH.CURRENT_USER)

        // Cache user data in localStorage
        if (response.user || response) {
            const userData = response.user || response
            localStorage.setItem('user', JSON.stringify(userData))
        }

        return response
    }

    /**
     * Refresh access token using refresh token
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<{access_token: string, refresh_token: string}>}
     */
    async refreshToken(refreshToken) {
        const response = await this.post(ENDPOINTS.AUTH.REFRESH, {
            refresh_token: refreshToken
        })

        // Update tokens in localStorage
        if (response.access_token) {
            localStorage.setItem('token', response.access_token)
        }
        if (response.refresh_token) {
            localStorage.setItem('refreshToken', response.refresh_token)
        }

        return response
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if user has valid token
     */
    isAuthenticated() {
        const token = localStorage.getItem('token')
        return !!token
    }

    /**
     * Get stored JWT token
     * @returns {string|null} JWT token or null
     */
    getToken() {
        return localStorage.getItem('token')
    }

    /**
     * Get stored refresh token
     * @returns {string|null} Refresh token or null
     */
    getRefreshToken() {
        return localStorage.getItem('refreshToken')
    }

    /**
     * Get cached user data from localStorage
     * @returns {object|null} User data or null
     */
    getCachedUser() {
        const userData = localStorage.getItem('user')
        return userData ? JSON.parse(userData) : null
    }

    /**
     * Validate phone number format (E.164)
     * @param {string} phoneNumber - Phone number to validate
     * @returns {boolean} True if valid
     */
    validatePhoneNumber(phoneNumber) {
        // E.164 format: +[country code][number]
        const e164Regex = /^\+[1-9]\d{1,14}$/
        return e164Regex.test(phoneNumber)
    }

    /**
     * Calculate password strength
     * @param {string} password - Password to check
     * @returns {object} Strength score and feedback
     */
    checkPasswordStrength(password) {
        let strength = 0
        const feedback = []

        if (!password) {
            return { strength: 0, label: 'None', feedback: ['Password is required'] }
        }

        // Length check
        if (password.length >= 8) {
            strength += 1
        } else {
            feedback.push('Use at least 8 characters')
        }

        // Uppercase check
        if (/[A-Z]/.test(password)) {
            strength += 1
        } else {
            feedback.push('Include uppercase letters')
        }

        // Lowercase check
        if (/[a-z]/.test(password)) {
            strength += 1
        } else {
            feedback.push('Include lowercase letters')
        }

        // Number check
        if (/\d/.test(password)) {
            strength += 1
        } else {
            feedback.push('Include numbers')
        }

        // Special character check
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            strength += 1
        } else {
            feedback.push('Include special characters')
        }

        // Determine label
        let label = 'Weak'
        if (strength >= 4) {
            label = 'Strong'
        } else if (strength >= 3) {
            label = 'Medium'
        }

        return {
            strength,
            label,
            feedback: feedback.length > 0 ? feedback : ['Password is strong']
        }
    }
}

export default new AuthService()
