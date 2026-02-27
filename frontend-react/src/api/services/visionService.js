import BaseService from './BaseService'

/**
 * Vision Service for disease detection and image analysis
 * Matches the Vue frontend implementation for consistency
 */
class VisionService extends BaseService {
    /**
     * Analyze crop image for disease identification via file upload
     * @param {File} imageFile - Image file to analyze
     * @param {object} options - Optional analysis parameters
     * @returns {Promise} Disease analysis result
     */
    async analyzeImage(imageFile, options = {}) {
        // Validate file before upload
        this.validateImageFile(imageFile)

        const formData = new FormData()
        formData.append('image', imageFile)

        if (options.cropHint) {
            formData.append('crop_hint', options.cropHint)
        }
        if (options.locationContext) {
            formData.append('location_context', options.locationContext)
        }
        if (options.additionalContext) {
            formData.append('additional_context', options.additionalContext)
        }

        return await this.post('/api/v1/vision/analyze/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    }

    /**
     * Analyze crop image using base64 encoded data
     * @param {string} base64Image - Base64 encoded image data
     * @param {object} options - Optional analysis parameters
     * @returns {Promise} Disease analysis result
     */
    async analyzeImageBase64(base64Image, options = {}) {
        return await this.post('/api/v1/vision/analyze/base64', {
            image_base64: base64Image,
            crop_hint: options.cropHint,
            location_context: options.locationContext,
            additional_context: options.additionalContext,
        })
    }

    /**
     * Perform comprehensive analysis with detailed treatment recommendations
     * @param {File} imageFile - Image file to analyze
     * @param {object} options - Optional analysis parameters
     * @returns {Promise} Comprehensive analysis with treatment plan
     */
    async analyzeComprehensive(imageFile, options = {}) {
        // Validate file before upload
        this.validateImageFile(imageFile)

        const formData = new FormData()
        formData.append('image', imageFile)

        if (options.cropHint) {
            formData.append('crop_hint', options.cropHint)
        }
        if (options.locationContext) {
            formData.append('location_context', options.locationContext)
        }
        if (options.additionalContext) {
            formData.append('additional_context', options.additionalContext)
        }
        if (options.userLocation) {
            formData.append('user_location', options.userLocation)
        }

        return await this.post('/api/v1/vision/analyze/comprehensive', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    }

    /**
     * Validate image file before analysis
     * @param {File} imageFile - Image file to validate
     * @returns {Promise} Validation result
     */
    async validateImage(imageFile) {
        const formData = new FormData()
        formData.append('image', imageFile)

        return await this.post('/api/v1/vision/validate', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    }

    /**
     * Get detailed treatment information for a specific disease
     * @param {string} diseaseName - Name of the disease
     * @param {string} cropType - Optional crop type
     * @returns {Promise} Detailed treatment information
     */
    async getDetailedTreatment(diseaseName, cropType = null) {
        return await this.post('/api/v1/vision/treatment/detailed', {
            disease_name: diseaseName,
            crop_type: cropType,
        })
    }

    /**
     * Generate treatment plan for a known disease
     * @param {string} diseaseName - Name of the disease
     * @param {object} options - Optional parameters
     * @returns {Promise} Treatment plan
     */
    async generateTreatmentPlan(diseaseName, options = {}) {
        const formData = new FormData()
        formData.append('disease_name', diseaseName)

        if (options.cropType) {
            formData.append('crop_type', options.cropType)
        }
        if (options.severity) {
            formData.append('severity', options.severity)
        }
        if (options.userLocation) {
            formData.append('user_location', options.userLocation)
        }

        return await this.post('/api/v1/vision/treatment/plan', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    }

    /**
     * Get list of supported image formats and constraints
     * @returns {Promise} Supported formats information
     */
    async getSupportedFormats() {
        return await this.get('/api/v1/vision/supported-formats')
    }

    /**
     * Get disease categories and common symptoms
     * @returns {Promise} Disease categories information
     */
    async getDiseaseCategories() {
        return await this.get('/api/v1/vision/disease-categories')
    }

    /**
     * Check vision service health
     * @returns {Promise} Health status
     */
    async healthCheck() {
        return await this.get('/api/v1/vision/health')
    }

    /**
     * Validate image file client-side before upload
     * @param {File} file - File to validate
     * @param {number} maxSizeMB - Maximum file size in MB (default: 10)
     * @throws {Error} If validation fails
     * @returns {boolean} True if valid
     */
    validateImageFile(file, maxSizeMB = 10) {
        // Check if file exists
        if (!file) {
            throw new Error('No file provided')
        }

        // Validate file type
        const validFormats = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/heic',
            'image/heif',
        ]

        if (!validFormats.includes(file.type)) {
            throw new Error(
                `Invalid file type: ${file.type}. Supported formats: JPEG, PNG, WebP, HEIC`
            )
        }

        // Validate file size
        const maxSize = maxSizeMB * 1024 * 1024
        const fileSizeMB = file.size / (1024 * 1024)
        if (file.size > maxSize) {
            throw new Error(
                `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
            )
        }

        // Validate file name
        if (!file.name || file.name.trim() === '') {
            throw new Error('Invalid file name')
        }

        return true
    }

    /**
     * Convert file to base64 string
     * @param {File} file - File to convert
     * @returns {Promise<string>} Promise resolving to base64 string
     */
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result)
                } else {
                    reject(new Error('Failed to convert file to base64'))
                }
            }
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
        })
    }

    /**
     * Create preview URL for image file
     * @param {File} file - Image file
     * @returns {string} Object URL for preview
     */
    createImagePreview(file) {
        return URL.createObjectURL(file)
    }

    /**
     * Revoke preview URL to free memory
     * @param {string} url - Object URL to revoke
     */
    revokeImagePreview(url) {
        if (url) {
            URL.revokeObjectURL(url)
        }
    }

    /**
     * Get confidence level label
     * @param {string} confidenceLevel - Confidence level from backend
     * @returns {string} Formatted confidence level
     */
    getConfidenceLevel(confidenceLevel) {
        if (!confidenceLevel) return 'Unknown'
        return confidenceLevel.charAt(0).toUpperCase() + confidenceLevel.slice(1).toLowerCase()
    }

    /**
     * Get confidence color for UI display
     * @param {string} confidenceLevel - Confidence level from backend
     * @returns {string} Tailwind color class
     */
    getConfidenceColor(confidenceLevel) {
        if (!confidenceLevel) return 'text-gray-600'

        switch (confidenceLevel.toLowerCase()) {
            case 'high':
                return 'text-green-600'
            case 'medium':
                return 'text-yellow-600'
            case 'low':
                return 'text-red-600'
            default:
                return 'text-gray-600'
        }
    }

    /**
     * Get severity color for UI display
     * @param {string} severity - Severity level from backend
     * @returns {string} Tailwind color class
     */
    getSeverityColor(severity) {
        if (!severity) return 'text-gray-600'

        switch (severity.toLowerCase()) {
            case 'high':
            case 'severe':
                return 'text-red-600'
            case 'medium':
            case 'moderate':
                return 'text-yellow-600'
            case 'low':
            case 'mild':
                return 'text-green-600'
            default:
                return 'text-gray-600'
        }
    }

    /**
     * Format timestamp for display
     * @param {string} timestamp - ISO timestamp string
     * @returns {string} Formatted date string
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp)
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }
}

export default new VisionService()
