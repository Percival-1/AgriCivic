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
 * Speech Service Metrics
 */
export interface SpeechMetrics {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    success_rate: number;
    cache_hits: number;
    cache_misses: number;
    cache_hit_rate: number;
    average_response_time: number;
    total_audio_duration: number;
}

/**
 * TTS Service Metrics
 */
export interface TTSMetrics {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    success_rate: number;
    cache_hits: number;
    cache_misses: number;
    cache_hit_rate: number;
    average_response_time: number;
    total_characters_processed: number;
}
