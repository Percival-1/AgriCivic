/**
 * Chat Session Interface
 */
export interface ChatSession {
    session_id: string;
    user_id: string;
    created_at: string;
    last_message_at: string;
}

/**
 * Source Citation Interface
 */
export interface Source {
    title: string;
    url?: string;
    relevance_score: number;
}

/**
 * Chat Message Interface
 */
export interface ChatMessage {
    id: string;
    session_id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
    timestamp: string;
}

/**
 * Send Message Request Interface
 */
export interface SendMessageRequest {
    session_id: string;
    message: string;
    language?: string;
}

/**
 * Init Session Response Interface (Backend API)
 */
export interface InitSessionResponse {
    session_id: string;
    user_id: string;
    language: string;
    welcome_message: string;
    timestamp: string;
}

/**
 * Send Message Response Interface (Backend API)
 */
export interface SendMessageResponse {
    message_id: string;
    role: string;
    content: string;
    language: string;
    timestamp: string;
    sources?: string[];
    metadata?: Record<string, any>;
}

/**
 * Chat History Response Interface (Backend API)
 */
export interface ChatHistoryResponse {
    session_id: string;
    messages: Array<{
        message_id: string;
        role: string;
        content: string;
        language: string;
        timestamp: string;
        sources?: string[];
        metadata?: Record<string, any>;
    }>;
    total_messages: number;
}

/**
 * End Session Response Interface
 */
export interface EndSessionResponse {
    message: string;
    session_id: string;
}

/**
 * Upload Image Response Interface (Backend API)
 */
export interface UploadImageResponse {
    message_id: string;
    disease_info: {
        disease_name?: string;
        confidence?: number;
        severity?: string;
        description?: string;
        [key: string]: any;
    };
    treatment_recommendations: string[];
    sources: string[];
    language: string;
    timestamp: string;
}
