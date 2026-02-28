import axios from '../axios'

/**
 * Base service class with common methods for API services
 */
class BaseService {
    /**
     * Make a GET request
     * @param {string} url - API endpoint URL
     * @param {object} config - Axios config options
     * @returns {Promise} Response data
     */
    async get(url, config = {}) {
        try {
            const response = await axios.get(url, config)
            return response.data
        } catch (error) {
            this.handleError(error)
        }
    }

    /**
     * Make a POST request
     * @param {string} url - API endpoint URL
     * @param {object} data - Request body data
     * @param {object} config - Axios config options
     * @returns {Promise} Response data
     */
    async post(url, data = {}, config = {}) {
        try {
            const response = await axios.post(url, data, config)
            return response.data
        } catch (error) {
            this.handleError(error)
        }
    }

    /**
     * Make a PUT request
     * @param {string} url - API endpoint URL
     * @param {object} data - Request body data
     * @param {object} config - Axios config options
     * @returns {Promise} Response data
     */
    async put(url, data = {}, config = {}) {
        try {
            const response = await axios.put(url, data, config)
            return response.data
        } catch (error) {
            this.handleError(error)
        }
    }

    /**
     * Make a PATCH request
     * @param {string} url - API endpoint URL
     * @param {object} data - Request body data
     * @param {object} config - Axios config options
     * @returns {Promise} Response data
     */
    async patch(url, data = {}, config = {}) {
        try {
            const response = await axios.patch(url, data, config)
            return response.data
        } catch (error) {
            this.handleError(error)
        }
    }

    /**
     * Make a DELETE request
     * @param {string} url - API endpoint URL
     * @param {object} config - Axios config options
     * @returns {Promise} Response data
     */
    async delete(url, config = {}) {
        try {
            const response = await axios.delete(url, config)
            return response.data
        } catch (error) {
            this.handleError(error)
        }
    }

    /**
     * Handle API errors
     * @param {object} error - Error object from axios
     * @throws {Error} Formatted error
     */
    handleError(error) {
        // If error is already formatted by interceptor
        if (error.message && error.status) {
            throw error
        }

        // Extract error message from various possible formats
        let errorMessage = 'An unexpected error occurred';

        if (error.response?.data) {
            const data = error.response.data;

            // Handle custom error format { error: { message: "..." } }
            if (data.error && data.error.message) {
                errorMessage = data.error.message;
            }
            // Handle Pydantic validation errors (array of error objects)
            else if (Array.isArray(data.detail)) {
                errorMessage = data.detail.map(err => err.msg || JSON.stringify(err)).join(', ');
            }
            // Handle string detail
            else if (typeof data.detail === 'string') {
                errorMessage = data.detail;
            }
            // Handle message field
            else if (data.message) {
                errorMessage = data.message;
            }
            // Handle detail object
            else if (data.detail && typeof data.detail === 'object') {
                errorMessage = data.detail.msg || JSON.stringify(data.detail);
            }
        } else if (error.message) {
            errorMessage = error.message;
        }

        // Format raw error
        const formattedError = {
            message: errorMessage,
            status: error.response?.status,
            data: error.response?.data,
            type: error.type || 'api_error'
        }

        throw formattedError
    }

    /**
     * Build query string from params object
     * @param {object} params - Query parameters
     * @returns {string} Query string
     */
    buildQueryString(params) {
        const searchParams = new URLSearchParams()

        Object.keys(params).forEach(key => {
            const value = params[key]
            if (value !== null && value !== undefined && value !== '') {
                if (Array.isArray(value)) {
                    value.forEach(item => searchParams.append(key, item))
                } else {
                    searchParams.append(key, value)
                }
            }
        })

        return searchParams.toString()
    }
}

export default BaseService
