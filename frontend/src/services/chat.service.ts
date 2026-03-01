import { apiService } from './api';
import type {
    ChatSession,
    ChatMessage,
    SendMessageRequest,
    InitSessionResponse,
    SendMessageResponse,
    ChatHistoryResponse,
    UploadImageResponse,
} from '@/types/chat.types';

/**
 * Chat Service
 * Handles all chat-related operations including session management,
 * message sending, history retrieval, and image uploads for disease detection
 */
class ChatService {
    private readonly baseUrl = '/chat';

    /**
     * Initialize a new chat session
     * @returns Promise<ChatSession> - The created chat session
     */
    async initSession(): Promise<ChatSession> {
        // Get current user ID from auth store
        const response = await apiService.post<InitSessionResponse>(`${this.baseUrl}/init`, {
            user_id: await this.getCurrentUserId(),
            language: 'en',
            initial_context: {},
        });

        // Transform response to ChatSession format
        return {
            session_id: response.session_id,
            user_id: response.user_id,
            created_at: response.timestamp,
            last_message_at: response.timestamp,
        };
    }

    /**
     * Send a message in a chat session
     * @param request - The message request containing session_id, message, and optional language
     * @returns Promise<ChatMessage> - The assistant's response message
     */
    async sendMessage(request: SendMessageRequest): Promise<ChatMessage> {
        const response = await apiService.post<SendMessageResponse>(`${this.baseUrl}/message`, {
            session_id: request.session_id,
            message: request.message,
            language: request.language || 'en',
        });

        // Transform response to ChatMessage format
        return {
            id: response.message_id,
            session_id: request.session_id,
            role: 'assistant',
            content: response.content,
            sources: response.sources?.map((source) => ({
                title: source,
                relevance_score: 1.0,
            })),
            timestamp: response.timestamp,
        };
    }

    /**
     * Get chat history for a session
     * @param sessionId - The session ID to retrieve history for
     * @param limit - Optional limit on number of messages to retrieve
     * @returns Promise<ChatMessage[]> - Array of chat messages
     */
    async getHistory(sessionId: string, limit?: number): Promise<ChatMessage[]> {
        const params: Record<string, string> = {};
        if (limit) {
            params.limit = limit.toString();
        }

        const response = await apiService.get<ChatHistoryResponse>(
            `${this.baseUrl}/${sessionId}/history`,
            { params }
        );

        // Transform response messages to ChatMessage format
        return response.messages.map((msg) => ({
            id: msg.message_id,
            session_id: response.session_id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            sources: msg.sources?.map((source) => ({
                title: source,
                relevance_score: 1.0,
            })),
            timestamp: msg.timestamp,
        }));
    }

    /**
     * End a chat session
     * @param sessionId - The session ID to end
     * @returns Promise<void>
     */
    async endSession(sessionId: string): Promise<void> {
        await apiService.delete<void>(`${this.baseUrl}/${sessionId}`);
    }

    /**
     * Upload an image for disease detection within a chat session
     * @param sessionId - The session ID to associate the image with
     * @param image - The image file to upload
     * @returns Promise<ChatMessage> - The assistant's response with disease analysis
     */
    async uploadImage(sessionId: string, image: File): Promise<ChatMessage> {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('image', image);
        formData.append('session_id', sessionId);
        formData.append('language', 'en');

        // Upload image using the API service
        const response = await apiService.axiosInstance.post<UploadImageResponse>(
            `${this.baseUrl}/upload-image`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        // Format disease info and treatment into a readable message
        const diseaseInfo = response.data.disease_info;
        const treatments = response.data.treatment_recommendations;

        let content = `**Disease Identified:** ${diseaseInfo.disease_name || 'Unknown'}\n\n`;

        if (diseaseInfo.confidence) {
            content += `**Confidence:** ${(diseaseInfo.confidence * 100).toFixed(1)}%\n\n`;
        }

        if (treatments && treatments.length > 0) {
            content += `**Treatment Recommendations:**\n`;
            treatments.forEach((treatment, index) => {
                content += `${index + 1}. ${treatment}\n`;
            });
        }

        // Transform response to ChatMessage format
        return {
            id: response.data.message_id,
            session_id: sessionId,
            role: 'assistant',
            content: content,
            sources: response.data.sources?.map((source) => ({
                title: source,
                relevance_score: 1.0,
            })),
            timestamp: response.data.timestamp,
        };
    }

    /**
     * Get current user ID from the auth store
     * @returns Promise<string> - The current user ID
     */
    private async getCurrentUserId(): Promise<string> {
        try {
            // Get current user info from auth endpoint
            const response = await apiService.get<{ id: string }>('/auth/me');
            return response.id;
        } catch (error) {
            console.error('Failed to get current user ID:', error);
            throw new Error('Authentication required');
        }
    }
}

// Create and export singleton instance
export const chatService = new ChatService();
export default chatService;
