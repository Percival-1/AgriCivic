import BaseService from './BaseService'

/**
 * RAG (Retrieval-Augmented Generation) and Knowledge Base Service
 * Handles knowledge base search, document ingestion, and collection management
 */
class RAGService extends BaseService {
    /**
     * Search the knowledge base
     * @param {string} query - Search query
     * @param {object} options - Search options
     * @param {string} options.collection - Collection name to search in
     * @param {number} options.limit - Maximum number of results
     * @param {number} options.threshold - Similarity threshold
     * @param {object} options.filters - Additional filters
     * @returns {Promise} Search results
     */
    async searchKnowledgeBase(query, options = {}) {
        const { collection, limit = 10, threshold = 0.7, filters = {} } = options

        const requestBody = {
            query,
            top_k: limit,
            similarity_threshold: threshold,
            filters
        }

        if (collection) {
            requestBody.collections = [collection]
        }

        return this.post('/api/v1/rag/retrieve', requestBody)
    }

    /**
     * Ingest documents into the knowledge base
     * @param {File|File[]} files - Document file(s) to ingest
     * @param {object} options - Ingestion options
     * @param {string} options.collection - Target collection name
     * @param {object} options.metadata - Additional metadata
     * @param {boolean} options.overwrite - Whether to overwrite existing documents
     * @returns {Promise} Ingestion result
     */
    async ingestDocuments(files, options = {}) {
        const { collection, metadata = {}, overwrite = false } = options

        // For now, we'll use the JSON-based ingestion endpoint
        // In a real implementation, you might want to handle file uploads differently
        const fileArray = Array.isArray(files) ? files : [files]

        // Read file contents and prepare documents
        const documents = []

        for (const file of fileArray) {
            try {
                const content = await this._readFileContent(file)
                documents.push({
                    content: content,
                    metadata: {
                        source: file.name,
                        file_type: file.type,
                        ...metadata
                    }
                })
            } catch (error) {
                console.error(`Failed to read file ${file.name}:`, error)
            }
        }

        if (documents.length === 0) {
            throw new Error('No valid documents to ingest')
        }

        return this.post('/api/v1/rag/ingest', {
            documents: documents,
            collection_name: collection || 'default',
            batch_size: 50
        })
    }

    /**
     * Read file content as text
     * @private
     */
    async _readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.onerror = (e) => reject(e)
            reader.readAsText(file)
        })
    }

    /**
     * Get knowledge base statistics
     * @param {string} collection - Optional collection name for specific stats
     * @returns {Promise} Knowledge base statistics
     */
    async getKnowledgeBaseStats(collection = null) {
        return this.get('/api/v1/rag/stats')
    }

    /**
     * List all collections in the knowledge base
     * @returns {Promise} List of collections with metadata
     */
    async listCollections() {
        return this.get('/api/v1/rag/collections')
    }

    /**
     * Get details of a specific collection
     * @param {string} collectionName - Name of the collection
     * @returns {Promise} Collection details
     */
    async getCollectionDetails(collectionName) {
        return this.get(`/api/v1/rag/collections/${collectionName}`)
    }

    /**
     * Create a new collection
     * @param {string} name - Collection name
     * @param {object} config - Collection configuration
     * @returns {Promise} Created collection details
     */
    async createCollection(name, config = {}) {
        // Note: This endpoint may not exist in the backend yet
        // You may need to implement it or use a different approach
        return this.post('/api/v1/rag/collections', {
            name,
            ...config
        })
    }

    /**
     * Delete a collection
     * @param {string} collectionName - Name of the collection to delete
     * @returns {Promise} Deletion result
     */
    async deleteCollection(collectionName) {
        // Note: This endpoint may not exist in the backend yet
        return this.delete(`/api/v1/rag/collections/${collectionName}`)
    }

    /**
     * Validate knowledge base integrity
     * @param {string} collection - Optional collection name to validate
     * @returns {Promise} Validation results
     */
    async validateKnowledgeBase(collection = null) {
        return this.get('/api/v1/rag/validate')
    }

    /**
     * Reset a collection (clear all documents)
     * @param {string} collectionName - Name of the collection to reset
     * @returns {Promise} Reset result
     */
    async resetCollection(collectionName) {
        // Note: This endpoint may not exist in the backend yet
        return this.post(`/api/v1/rag/collections/${collectionName}/reset`)
    }

    /**
     * Get documents from a collection
     * @param {string} collectionName - Collection name
     * @param {object} options - Query options
     * @param {number} options.page - Page number
     * @param {number} options.limit - Items per page
     * @returns {Promise} List of documents
     */
    async getDocuments(collectionName, options = {}) {
        const { page = 1, limit = 50 } = options
        const offset = (page - 1) * limit
        const params = { limit, offset }
        const queryString = this.buildQueryString(params)
        return this.get(`/api/v1/rag/collections/${collectionName}/documents?${queryString}`)
    }

    /**
     * Delete a specific document from a collection
     * @param {string} collectionName - Collection name
     * @param {string} documentId - Document ID
     * @returns {Promise} Deletion result
     */
    async deleteDocument(collectionName, documentId) {
        return this.delete(`/api/v1/rag/collections/${collectionName}/documents/${documentId}`)
    }

    /**
     * Update document metadata
     * @param {string} collectionName - Collection name
     * @param {string} documentId - Document ID
     * @param {object} metadata - New metadata
     * @returns {Promise} Update result
     */
    async updateDocumentMetadata(collectionName, documentId, metadata) {
        return this.patch(`/api/v1/rag/collections/${collectionName}/documents/${documentId}`, {
            metadata
        })
    }

    /**
     * Validate document file before upload
     * @param {File} file - File to validate
     * @param {number} maxSizeMB - Maximum file size in MB
     * @returns {boolean} True if valid
     * @throws {Error} If validation fails
     */
    validateDocumentFile(file, maxSizeMB = 50) {
        const validFormats = [
            'application/pdf',
            'text/plain',
            'text/markdown',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/html',
            'application/json'
        ]

        if (!validFormats.includes(file.type)) {
            throw new Error(
                'Invalid document format. Supported: PDF, TXT, MD, DOC, DOCX, HTML, JSON'
            )
        }

        const maxSize = maxSizeMB * 1024 * 1024
        if (file.size > maxSize) {
            throw new Error(`File size exceeds ${maxSizeMB}MB limit`)
        }

        return true
    }
}

export default new RAGService()
