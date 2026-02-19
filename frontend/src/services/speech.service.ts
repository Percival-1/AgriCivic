import { apiService } from './api';

/**
 * Transcription Result Interface
 */
export interface TranscriptionResult {
    transcribed_text: string;
    detected_language: string | null;
    confidence: number;
    provider: string;
    cached: boolean;
    response_time: number;
    audio_duration: number | null;
    timestamp: string;
}

/**
 * TTS Result Interface
 */
export interface TTSResult {
    audio_format: string;
    language: string;
    voice: string;
    provider: string;
    cached: boolean;
    response_time: number;
    text_length: number;
    timestamp: string;
}

/**
 * Supported Formats Response
 */
export interface SupportedFormatsResponse {
    formats: string[];
    max_file_size_mb: number;
}

/**
 * Supported Languages Response
 */
export interface SupportedLanguagesResponse {
    languages: string[];
}

/**
 * Supported Voices Response
 */
export interface SupportedVoicesResponse {
    voices: string[];
}

/**
 * Speech Service
 * Handles speech-to-text and text-to-speech operations
 */
class SpeechService {
    private readonly baseUrl = '/speech';

    /**
     * Transcribe audio file to text
     * @param audioFile - Audio file to transcribe
     * @param language - Optional language hint
     * @param useCache - Whether to use cached results
     * @returns Transcription result
     */
    async transcribeAudio(
        audioFile: File,
        language?: string,
        useCache: boolean = true
    ): Promise<TranscriptionResult> {
        const formData = new FormData();
        formData.append('audio', audioFile);
        if (language) {
            formData.append('language', language);
        }
        formData.append('use_cache', useCache.toString());

        const response = await apiService.axiosInstance.post<TranscriptionResult>(
            `${this.baseUrl}/transcribe`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        return response.data;
    }

    /**
     * Synthesize speech from text
     * @param text - Text to convert to speech
     * @param language - Language code
     * @param voice - Voice name (optional)
     * @param speed - Speech speed (0.25 to 4.0)
     * @param audioFormat - Output audio format
     * @param useCache - Whether to use cached results
     * @returns Audio blob
     */
    async synthesizeSpeech(
        text: string,
        language: string = 'en',
        voice?: string,
        speed: number = 1.0,
        audioFormat: string = 'mp3',
        useCache: boolean = true
    ): Promise<Blob> {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('language', language);
        if (voice) {
            formData.append('voice', voice);
        }
        formData.append('speed', speed.toString());
        formData.append('audio_format', audioFormat);
        formData.append('use_cache', useCache.toString());

        const response = await apiService.axiosInstance.post(
            `${this.baseUrl}/synthesize`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                responseType: 'blob',
            }
        );

        return response.data;
    }

    /**
     * Get metadata for synthesized speech without downloading audio
     * @param text - Text to convert to speech
     * @param language - Language code
     * @param voice - Voice name (optional)
     * @param speed - Speech speed
     * @param audioFormat - Output audio format
     * @param useCache - Whether to use cached results
     * @returns TTS metadata
     */
    async getSynthesisMetadata(
        text: string,
        language: string = 'en',
        voice?: string,
        speed: number = 1.0,
        audioFormat: string = 'mp3',
        useCache: boolean = true
    ): Promise<TTSResult> {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('language', language);
        if (voice) {
            formData.append('voice', voice);
        }
        formData.append('speed', speed.toString());
        formData.append('audio_format', audioFormat);
        formData.append('use_cache', useCache.toString());

        const response = await apiService.axiosInstance.post<TTSResult>(
            `${this.baseUrl}/synthesize/metadata`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        return response.data;
    }

    /**
     * Get supported audio formats for transcription
     * @returns Supported formats and size limits
     */
    async getSupportedFormats(): Promise<SupportedFormatsResponse> {
        return await apiService.get<SupportedFormatsResponse>(`${this.baseUrl}/formats`);
    }

    /**
     * Get supported languages for speech recognition
     * @returns Supported language codes
     */
    async getSupportedLanguages(): Promise<SupportedLanguagesResponse> {
        return await apiService.get<SupportedLanguagesResponse>(`${this.baseUrl}/languages`);
    }

    /**
     * Get supported voices for text-to-speech
     * @returns Supported voice names
     */
    async getSupportedVoices(): Promise<SupportedVoicesResponse> {
        return await apiService.get<SupportedVoicesResponse>(`${this.baseUrl}/tts/voices`);
    }

    /**
     * Get supported audio formats for TTS output
     * @returns Supported formats
     */
    async getTTSSupportedFormats(): Promise<SupportedFormatsResponse> {
        return await apiService.get<SupportedFormatsResponse>(`${this.baseUrl}/tts/formats`);
    }

    /**
     * Validate audio file before upload
     * @param file - Audio file to validate
     * @param maxSizeMB - Maximum file size in MB
     * @returns True if valid, throws error otherwise
     */
    validateAudioFile(file: File, maxSizeMB: number = 25): boolean {
        // Check file size
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxSizeMB) {
            throw new Error(`File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`);
        }

        // Check file type
        const supportedTypes = [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/x-wav',
            'audio/m4a',
            'audio/x-m4a',
            'audio/flac',
            'audio/ogg',
            'audio/webm',
        ];

        if (!supportedTypes.includes(file.type) && file.type !== '') {
            // If type is empty, check extension
            const extension = file.name.split('.').pop()?.toLowerCase();
            const supportedExtensions = ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'webm'];

            if (!extension || !supportedExtensions.includes(extension)) {
                throw new Error(`Unsupported audio format. Supported formats: ${supportedExtensions.join(', ')}`);
            }
        }

        return true;
    }

    /**
     * Create audio URL from blob for playback
     * @param audioBlob - Audio blob
     * @returns Object URL for audio playback
     */
    createAudioURL(audioBlob: Blob): string {
        return URL.createObjectURL(audioBlob);
    }

    /**
     * Revoke audio URL to free memory
     * @param url - Object URL to revoke
     */
    revokeAudioURL(url: string): void {
        URL.revokeObjectURL(url);
    }

    /**
     * Download audio file
     * @param audioBlob - Audio blob
     * @param filename - Filename for download
     */
    downloadAudio(audioBlob: Blob, filename: string = 'speech.mp3'): void {
        const url = this.createAudioURL(audioBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.revokeAudioURL(url);
    }
}

// Create and export singleton instance
export const speechService = new SpeechService();
export default speechService;
