import BaseService from './BaseService'

/**
 * Chat service for managing chat sessions and messages
 */
class ChatService extends BaseService {
    /**
     * Initialize a new chat session
     * @param {object} params - Session parameters
     * @param {string} params.userId - User ID (required)
     * @param {string} params.language - Preferred language for responses
     * @param {object} params.context - Optional initial context
     * @returns {Promise<object>} Session data with session_id
     */
    async initSession(params = {}) {
        const { userId, language = 'en', context = {} } = params

        if (!userId) {
            throw new Error('User ID is required to create a session')
        }

        return await this.post('/api/v1/chat/init', {
            user_id: userId,
            language,
            initial_context: context
        })
    }

    /**
     * Send a message in a chat session
     * @param {string} sessionId - Session ID
     * @param {string} message - Message text
     * @param {File} image - Optional image file
     * @param {string} language - User's preferred language (e.g., 'en', 'hi', 'ta')
     * @returns {Promise<object>} Response with message and sources
     */
    async sendMessage(sessionId, message, image = null, language = 'en') {
        if (!sessionId) {
            throw new Error('Session ID is required')
        }

        if (!message && !image) {
            throw new Error('Message or image is required')
        }

        // If image is provided, use FormData
        if (image) {
            const formData = new FormData()
            formData.append('session_id', sessionId)
            formData.append('message', message || '')
            formData.append('language', language)
            formData.append('image', image)

            return await this.post('/api/v1/chat/message', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
        }

        // Text-only message - pass user's language
        return await this.post('/api/v1/chat/message', {
            session_id: sessionId,
            message,
            language
        })
    }

    /**
     * Get chat history for a session
     * @param {string} sessionId - Session ID
     * @param {object} params - Query parameters
     * @param {number} params.limit - Maximum number of messages to retrieve
     * @param {number} params.offset - Offset for pagination
     * @returns {Promise<object>} Chat history with messages array
     */
    async getHistory(sessionId, params = {}) {
        if (!sessionId) {
            throw new Error('Session ID is required')
        }

        const { limit = 50, offset = 0 } = params
        const queryString = this.buildQueryString({ limit, offset })

        return await this.get(`/api/v1/chat/${sessionId}/history?${queryString}`)
    }

    /**
     * End a chat session (deactivate)
     * @param {string} sessionId - Session ID
     * @returns {Promise<object>} Confirmation response
     */
    async endSession(sessionId) {
        if (!sessionId) {
            throw new Error('Session ID is required')
        }

        return await this.delete(`/api/v1/chat/${sessionId}`)
    }

    /**
     * Get active sessions for current user
     * @param {string} userId - User ID
     * @returns {Promise<object>} List of active sessions
     */
    async getActiveSessions(userId) {
        if (!userId) {
            throw new Error('User ID is required')
        }

        return await this.get(`/api/v1/users/${userId}/sessions?active_only=true`)
    }

    /**
     * Delete a chat session
     * @param {string} sessionId - Session ID
     * @returns {Promise<object>} Confirmation response
     */
    async deleteSession(sessionId) {
        if (!sessionId) {
            throw new Error('Session ID is required')
        }

        return await this.delete(`/api/v1/chat/session/${sessionId}`)
    }

    /**
     * Validate image file for upload
     * @param {File} file - Image file to validate
     * @param {number} maxSizeMB - Maximum file size in MB
     * @returns {boolean} True if valid
     * @throws {Error} If validation fails
     */
    validateImageFile(file, maxSizeMB = 10) {
        const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

        if (!validFormats.includes(file.type)) {
            throw new Error('Invalid image format. Supported: JPEG, PNG, WebP')
        }

        const maxSize = maxSizeMB * 1024 * 1024
        if (file.size > maxSize) {
            throw new Error(`File size exceeds ${maxSizeMB}MB limit`)
        }

        return true
    }

    /**
     * Export chat history to JSON
     * @param {string} sessionId - Session ID
     * @returns {Promise<Blob>} JSON blob for download
     */
    async exportHistory(sessionId) {
        const history = await this.getHistory(sessionId, { limit: 1000 })
        const jsonString = JSON.stringify(history, null, 2)
        return new Blob([jsonString], { type: 'application/json' })
    }

    /**
     * Download exported chat history
     * @param {Blob} blob - JSON blob
     * @param {string} filename - Filename for download
     */
    downloadHistory(blob, filename = 'chat-history.json') {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }
}

export default new ChatService()
