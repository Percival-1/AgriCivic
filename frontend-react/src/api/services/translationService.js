import BaseService from './BaseService'

/**
 * Translation service for text translation and language detection
 */
class TranslationService extends BaseService {
    /**
     * Translate text from one language to another
     * @param {string} text - Text to translate
     * @param {string} targetLanguage - Target language code (e.g., 'hi', 'en', 'ta')
     * @param {string} sourceLanguage - Source language code (optional, auto-detect if not provided)
     * @returns {Promise<{translated_text: string, source_language: string, target_language: string, confidence: number}>}
     */
    async translateText(text, targetLanguage, sourceLanguage = null) {
        const payload = {
            text,
            target_language: targetLanguage
        }

        if (sourceLanguage) {
            payload.source_language = sourceLanguage
        }

        const response = await this.post('/api/v1/translation/translate', payload)
        return response
    }

    /**
     * Translate multiple texts in batch
     * @param {Array<string>} texts - Array of texts to translate
     * @param {string} targetLanguage - Target language code
     * @param {string} sourceLanguage - Source language code (optional)
     * @returns {Promise<{translations: Array<{text: string, translated_text: string, source_language: string, target_language: string}>}>}
     */
    async batchTranslate(texts, targetLanguage, sourceLanguage = null) {
        const payload = {
            texts,
            target_language: targetLanguage
        }

        if (sourceLanguage) {
            payload.source_language = sourceLanguage
        }

        const response = await this.post('/api/v1/translation/translate/batch', payload)
        return response
    }

    /**
     * Detect language of given text
     * @param {string} text - Text to detect language for
     * @returns {Promise<{detected_language: string, confidence: number}>}
     */
    async detectLanguage(text) {
        const response = await this.post('/api/v1/translation/detect-language', { text })
        return response
    }

    /**
     * Get list of supported languages for translation
     * @returns {Promise<{languages: Array<string>, total_count: number}>}
     */
    async getSupportedLanguages() {
        const response = await this.get('/api/v1/translation/supported-languages')
        return response
    }

    /**
     * Validate language code
     * @param {string} languageCode - Language code to validate
     * @param {Array<object>} supportedLanguages - Array of supported language objects
     * @returns {boolean} True if valid
     */
    validateLanguageCode(languageCode, supportedLanguages) {
        if (!languageCode || !supportedLanguages) {
            return false
        }

        return supportedLanguages.some(lang => lang.code === languageCode)
    }

    /**
     * Get language name from code
     * @param {string} languageCode - Language code
     * @param {Array<object>} supportedLanguages - Array of supported language objects
     * @returns {string} Language name or code if not found
     */
    getLanguageName(languageCode, supportedLanguages) {
        if (!languageCode || !supportedLanguages) {
            return languageCode
        }

        const language = supportedLanguages.find(lang => lang.code === languageCode)
        return language ? language.name : languageCode
    }

    /**
     * Validate text for translation
     * @param {string} text - Text to validate
     * @param {number} maxLength - Maximum allowed length
     * @returns {object} Validation result
     */
    validateText(text, maxLength = 5000) {
        const errors = []

        if (!text || text.trim().length === 0) {
            errors.push('Text cannot be empty')
        }

        if (text && text.length > maxLength) {
            errors.push(`Text exceeds maximum length of ${maxLength} characters`)
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }

    /**
     * Validate batch translation request
     * @param {Array<string>} texts - Array of texts to validate
     * @param {number} maxTexts - Maximum number of texts allowed
     * @param {number} maxLength - Maximum length per text
     * @returns {object} Validation result
     */
    validateBatchRequest(texts, maxTexts = 100, maxLength = 5000) {
        const errors = []

        if (!Array.isArray(texts)) {
            errors.push('Texts must be an array')
            return { isValid: false, errors }
        }

        if (texts.length === 0) {
            errors.push('At least one text is required')
        }

        if (texts.length > maxTexts) {
            errors.push(`Maximum ${maxTexts} texts allowed per batch`)
        }

        texts.forEach((text, index) => {
            if (!text || text.trim().length === 0) {
                errors.push(`Text at index ${index} is empty`)
            }

            if (text && text.length > maxLength) {
                errors.push(`Text at index ${index} exceeds maximum length of ${maxLength} characters`)
            }
        })

        return {
            isValid: errors.length === 0,
            errors
        }
    }
}

export default new TranslationService()
