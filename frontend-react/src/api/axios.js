import axios from 'axios'
import { sanitizeObject } from '../utils/security'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Create axios instance with base configuration
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Track if we're currently refreshing the token
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })

    failedQueue = []
}

// Request interceptor - Add JWT token to requests and sanitize data
axiosInstance.interceptors.request.use(
    (config) => {
        // Get token from localStorage
        const token = localStorage.getItem('token')

        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        // Sanitize request data to prevent XSS
        // Only sanitize for specific endpoints that accept user input
        // Exclude authentication, token refresh, and other sensitive endpoints
        const shouldSanitize = config.url &&
            !config.url.includes('/auth/') &&
            !config.url.includes('/token') &&
            !config.url.includes('/refresh') &&
            config.method !== 'get'; // Don't sanitize GET requests

        if (shouldSanitize && config.data && typeof config.data === 'object') {
            // Don't sanitize FormData (used for file uploads)
            if (!(config.data instanceof FormData)) {
                // Exclude certain fields that should not be sanitized
                const excludeKeys = ['password', 'token', 'refresh_token', 'access_token', 'api_key', 'role', 'roles', 'is_admin', 'isAdmin'];
                config.data = sanitizeObject(config.data, excludeKeys);
            }
        }

        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor - Handle errors and token refresh
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        // Handle network errors
        if (!error.response) {
            return Promise.reject({
                message: 'Network error. Please check your internet connection.',
                type: 'network_error',
                originalError: error
            })
        }

        // Handle 401 Unauthorized - Token expired or invalid
        if (error.response.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`
                    return axiosInstance(originalRequest)
                }).catch(err => {
                    return Promise.reject(err)
                })
            }

            originalRequest._retry = true
            isRefreshing = true

            const refreshToken = localStorage.getItem('refreshToken')

            if (!refreshToken) {
                // No refresh token, redirect to login
                isRefreshing = false
                localStorage.removeItem('token')
                localStorage.removeItem('refreshToken')
                window.location.href = '/login'
                return Promise.reject(error)
            }

            try {
                // Attempt to refresh token
                const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
                    refresh_token: refreshToken
                })

                const { access_token, refresh_token } = response.data

                // Store new tokens
                localStorage.setItem('token', access_token)
                if (refresh_token) {
                    localStorage.setItem('refreshToken', refresh_token)
                }

                // Update authorization header
                axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
                originalRequest.headers.Authorization = `Bearer ${access_token}`

                // Process queued requests
                processQueue(null, access_token)
                isRefreshing = false

                // Retry original request
                return axiosInstance(originalRequest)
            } catch (refreshError) {
                // Refresh failed, clear tokens and redirect to login
                processQueue(refreshError, null)
                isRefreshing = false
                localStorage.removeItem('token')
                localStorage.removeItem('refreshToken')
                window.location.href = '/login'
                return Promise.reject(refreshError)
            }
        }

        // Handle other error responses
        const errorResponse = {
            message: error.response?.data?.error?.message ||
                error.response?.data?.message ||
                error.response?.data?.detail ||
                'An error occurred',
            status: error.response?.status,
            data: error.response?.data,
            originalError: error
        }

        return Promise.reject(errorResponse)
    }
)

// Retry logic for failed requests
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config

        // Don't retry if no config or already exceeded max retries
        if (!config || config.__retryCount >= MAX_RETRIES) {
            return Promise.reject(error)
        }

        // Initialize retry count
        config.__retryCount = config.__retryCount || 0

        // Determine if we should retry
        const shouldRetry =
            // Retry on network errors
            (!error.response) ||
            // Retry on 5xx server errors
            (error.response.status >= 500 && error.response.status < 600) ||
            // Retry on 429 Too Many Requests
            (error.response.status === 429)

        if (!shouldRetry) {
            return Promise.reject(error)
        }

        // Increment retry count
        config.__retryCount += 1

        // Calculate delay with exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, config.__retryCount - 1)

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay))

        // Retry the request
        return axiosInstance(config)
    }
)

export default axiosInstance
