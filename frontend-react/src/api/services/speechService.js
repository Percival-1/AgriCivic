import BaseService from './BaseService'

/**
 * Speech Service for speech-to-text and text-to-speech functionality
 * Matches backend API at /api/v1/speech/*
 */
class SpeechService extends BaseService {
    /**
     * Transcribe audio file to text (Speech-to-Text)
     * Backend: POST /api/v1/speech/transcribe
     */
    async transcribeAudio(audioFile, language = null, useCache = true) {
        this.validateAudioFile(audioFile, 25) // Backend max is 25MB

        const formData = new FormData()
        formData.append('audio', audioFile)
        if (language) {
            formData.append('language', language)
        }
        formData.append('use_cache', useCache.toString())

        const response = await this.post('/api/v1/speech/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })

        // Transform backend response to frontend format
        return {
            text: response.transcribed_text,
            confidence: response.confidence,
            language: response.detected_language,
            provider: response.provider,
            cached: response.cached,
            responseTime: response.response_time,
            audioDuration: response.audio_duration,
            timestamp: response.timestamp,
        }
    }

    /**
     * Batch transcribe multiple audio files
     * Backend: POST /api/v1/speech/transcribe/batch
     */
    async batchTranscribe(audioFiles, language = null, useCache = true) {
        audioFiles.forEach(file => this.validateAudioFile(file, 25))

        const formData = new FormData()
        audioFiles.forEach((file) => {
            formData.append('audio_files', file)
        })
        if (language) {
            formData.append('language', language)
        }
        formData.append('use_cache', useCache.toString())

        const response = await this.post('/api/v1/speech/transcribe/batch', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })

        return {
            results: response.results.map(r => ({
                text: r.transcribed_text,
                confidence: r.confidence,
                language: r.detected_language,
                provider: r.provider,
                cached: r.cached,
                responseTime: r.response_time,
                audioDuration: r.audio_duration,
                timestamp: r.timestamp,
            })),
            totalFiles: response.total_files,
            successful: response.successful,
            failed: response.failed,
        }
    }

    /**
     * Convert text to speech (Text-to-Speech)
     * Backend: POST /api/v1/speech/synthesize
     */
    async synthesizeSpeech(text, language = 'en', voice = null, speed = 1.0, audioFormat = 'mp3', useCache = true) {
        const formData = new FormData()
        formData.append('text', text)
        formData.append('language', language)
        if (voice) {
            formData.append('voice', voice)
        }
        formData.append('speed', speed.toString())
        formData.append('audio_format', audioFormat)
        formData.append('use_cache', useCache.toString())

        const response = await this.post('/api/v1/speech/synthesize', formData, {
            responseType: 'blob',
            headers: { 'Content-Type': 'multipart/form-data' },
        })

        return response // Returns audio blob
    }

    /**
     * Get supported audio formats
     * Backend: GET /api/v1/speech/formats
     */
    async getSupportedFormats() {
        const response = await this.get('/api/v1/speech/formats')
        return {
            formats: response.formats,
            maxFileSizeMB: response.max_file_size_mb,
        }
    }

    /**
     * Get supported languages
     * Backend: GET /api/v1/speech/languages
     * Returns: { languages: ["en", "hi", "bn", ...] }
     */
    async getSupportedLanguages() {
        const response = await this.get('/api/v1/speech/languages')
        // Backend returns array of codes, convert to objects with names
        return {
            languages: response.languages.map(code => ({
                code: code,
                name: this.getLanguageName(code),
            })),
        }
    }

    /**
     * Get supported voices for TTS
     * Backend: GET /api/v1/speech/tts/voices
     * Returns: { voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] }
     */
    async getSupportedVoices(language = null) {
        const response = await this.get('/api/v1/speech/tts/voices')
        return {
            voices: response.voices.map(voice => ({
                id: voice,
                name: this.getVoiceDisplayName(voice),
                gender: this.getVoiceGender(voice),
            })),
        }
    }

    /**
     * Get language name from code
     */
    getLanguageName(code) {
        const names = {
            'en': 'English', 'hi': 'Hindi', 'bn': 'Bengali', 'te': 'Telugu',
            'ta': 'Tamil', 'mr': 'Marathi', 'gu': 'Gujarati', 'kn': 'Kannada',
            'ml': 'Malayalam', 'or': 'Odia', 'pa': 'Punjabi', 'ur': 'Urdu',
            'es': 'Spanish', 'fr': 'French', 'de': 'German', 'pt': 'Portuguese',
            'ru': 'Russian', 'ja': 'Japanese', 'zh': 'Chinese', 'ar': 'Arabic',
            'ko': 'Korean', 'it': 'Italian',
        }
        return names[code] || code.toUpperCase()
    }

    /**
     * Get voice display name (OpenAI TTS voices)
     */
    getVoiceDisplayName(voice) {
        const names = {
            'alloy': 'Alloy', 'echo': 'Echo', 'fable': 'Fable',
            'onyx': 'Onyx', 'nova': 'Nova', 'shimmer': 'Shimmer',
        }
        return names[voice] || voice.charAt(0).toUpperCase() + voice.slice(1)
    }

    /**
     * Get voice gender hint
     */
    getVoiceGender(voice) {
        const genders = {
            'alloy': 'Neutral', 'echo': 'Male', 'fable': 'Male',
            'onyx': 'Male', 'nova': 'Female', 'shimmer': 'Female',
        }
        return genders[voice] || null
    }

    /**
     * Validate audio file (backend supports up to 25MB)
     */
    validateAudioFile(file, maxSizeMB = 25) {
        if (!file) throw new Error('No file provided')

        const validFormats = [
            'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mp3', 'audio/mpeg',
            'audio/ogg', 'audio/webm', 'audio/flac', 'audio/x-flac',
            'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/mpga',
        ]

        // Extract base MIME type (remove codec parameters like ";codecs=opus")
        const baseMimeType = file.type.split(';')[0].trim()

        if (!validFormats.includes(baseMimeType)) {
            throw new Error(`Invalid audio format: ${file.type}. Supported: MP3, WAV, M4A, FLAC, OGG, WebM`)
        }

        const maxSize = maxSizeMB * 1024 * 1024
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
        if (file.size > maxSize) {
            throw new Error(`File size (${fileSizeMB}MB) exceeds maximum (${maxSizeMB}MB)`)
        }

        if (!file.name || file.name.trim() === '') {
            throw new Error('Invalid file name')
        }

        return true
    }

    // Utility methods
    createAudioURL(blob) { return URL.createObjectURL(blob) }
    revokeAudioURL(url) { if (url) URL.revokeObjectURL(url) }

    downloadAudio(blob, filename = 'speech.mp3') {
        const url = this.createAudioURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        this.revokeAudioURL(url)
    }

    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '00:00'
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    getConfidenceLevel(confidence) {
        if (confidence >= 0.9) return 'High'
        if (confidence >= 0.7) return 'Medium'
        if (confidence >= 0.5) return 'Low'
        return 'Very Low'
    }

    getConfidenceColor(confidence) {
        if (confidence >= 0.9) return 'text-green-600'
        if (confidence >= 0.7) return 'text-yellow-600'
        if (confidence >= 0.5) return 'text-orange-600'
        return 'text-red-600'
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
    }

    isRecordingSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    }

    isAudioTypeSupported(mimeType) {
        const audio = document.createElement('audio')
        return audio.canPlayType(mimeType) !== ''
    }
}

export default new SpeechService()
