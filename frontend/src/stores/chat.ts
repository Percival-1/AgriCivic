import { defineStore } from 'pinia';
import { chatService } from '@/services/chat.service';
import type { ChatSession, ChatMessage } from '@/types/chat.types';

/**
 * Chat State Interface
 */
export interface ChatState {
    currentSession: ChatSession | null;
    messages: ChatMessage[];
    isLoading: boolean;
    isTyping: boolean;
    error: string | null;
}

/**
 * Chat Store
 * Manages chat sessions and message history
 */
export const useChatStore = defineStore('chat', {
    state: (): ChatState => ({
        currentSession: null,
        messages: [],
        isLoading: false,
        isTyping: false,
        error: null,
    }),

    getters: {
        /**
         * Get total message count
         */
        messageCount: (state): number => {
            return state.messages.length;
        },

        /**
         * Get the last message in the conversation
         */
        lastMessage: (state): ChatMessage | undefined => {
            return state.messages[state.messages.length - 1];
        },

        /**
         * Check if a session is active
         */
        hasActiveSession: (state): boolean => {
            return state.currentSession !== null;
        },

        /**
         * Get current session ID
         */
        sessionId: (state): string | null => {
            return state.currentSession?.session_id || null;
        },

        /**
         * Search messages by query string
         * @param query - The search query
         * @returns Filtered messages matching the query
         */
        searchMessages: (state) => (query: string): ChatMessage[] => {
            if (!query.trim()) {
                return state.messages;
            }

            const lowerQuery = query.toLowerCase();
            return state.messages.filter((message) => {
                // Search in message content
                if (message.content.toLowerCase().includes(lowerQuery)) {
                    return true;
                }

                // Search in source titles
                if (message.sources) {
                    return message.sources.some((source) =>
                        source.title.toLowerCase().includes(lowerQuery)
                    );
                }

                return false;
            });
        },
    },

    actions: {
        /**
         * Initialize a new chat session
         */
        async initSession(): Promise<void> {
            this.isLoading = true;
            this.error = null;

            try {
                const session = await chatService.initSession();

                // Update state
                this.currentSession = session;
                this.messages = [];
            } catch (error: any) {
                this.error = error.message || 'Failed to initialize session';
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Send a message in the current session
         * @param message - The message text to send
         * @param language - Optional language preference
         */
        async sendMessage(message: string, language?: string): Promise<void> {
            if (!this.currentSession) {
                throw new Error('No active session. Please initialize a session first.');
            }

            this.isLoading = true;
            this.isTyping = true;
            this.error = null;

            try {
                // Add user message to state immediately
                const userMessage: ChatMessage = {
                    id: this.generateMessageId(),
                    session_id: this.currentSession.session_id,
                    role: 'user',
                    content: message,
                    timestamp: new Date().toISOString(),
                };
                this.messages.push(userMessage);

                // Send message to backend
                const assistantMessage = await chatService.sendMessage({
                    session_id: this.currentSession.session_id,
                    message,
                    language,
                });

                // Add assistant response to state
                this.messages.push(assistantMessage);

                // Update last message time
                if (this.currentSession) {
                    this.currentSession.last_message_at = new Date().toISOString();
                }
            } catch (error: any) {
                this.error = error.message || 'Failed to send message';
                throw error;
            } finally {
                this.isLoading = false;
                this.isTyping = false;
            }
        },

        /**
         * Load chat history for the current session
         * @param limit - Optional limit on number of messages to retrieve
         */
        async loadHistory(limit?: number): Promise<void> {
            if (!this.currentSession) {
                throw new Error('No active session. Please initialize a session first.');
            }

            this.isLoading = true;
            this.error = null;

            try {
                const history = await chatService.getHistory(
                    this.currentSession.session_id,
                    limit
                );

                // Replace current messages with history
                this.messages = history;
            } catch (error: any) {
                this.error = error.message || 'Failed to load chat history';
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * End the current chat session
         */
        async endSession(): Promise<void> {
            if (!this.currentSession) {
                return;
            }

            this.isLoading = true;
            this.error = null;

            try {
                await chatService.endSession(this.currentSession.session_id);

                // Clear session and messages
                this.currentSession = null;
                this.messages = [];
            } catch (error: any) {
                this.error = error.message || 'Failed to end session';
                // Clear session even if API call fails
                this.currentSession = null;
                this.messages = [];
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Upload an image for disease detection
         * @param image - The image file to upload
         */
        async uploadImage(image: File): Promise<void> {
            if (!this.currentSession) {
                throw new Error('No active session. Please initialize a session first.');
            }

            this.isLoading = true;
            this.isTyping = true;
            this.error = null;

            try {
                // Add user message indicating image upload
                const userMessage: ChatMessage = {
                    id: this.generateMessageId(),
                    session_id: this.currentSession.session_id,
                    role: 'user',
                    content: `[Image uploaded: ${image.name}]`,
                    timestamp: new Date().toISOString(),
                };
                this.messages.push(userMessage);

                // Upload image and get response
                const assistantMessage = await chatService.uploadImage(
                    this.currentSession.session_id,
                    image
                );

                // Add assistant response to state
                this.messages.push(assistantMessage);

                // Update last message time
                if (this.currentSession) {
                    this.currentSession.last_message_at = new Date().toISOString();
                }
            } catch (error: any) {
                this.error = error.message || 'Failed to upload image';
                throw error;
            } finally {
                this.isLoading = false;
                this.isTyping = false;
            }
        },

        /**
         * Add a message to the current conversation
         * @param message - The message to add
         */
        addMessage(message: ChatMessage): void {
            this.messages.push(message);

            // Update last message time if session exists
            if (this.currentSession) {
                this.currentSession.last_message_at = new Date().toISOString();
            }
        },

        /**
         * Set typing indicator state
         * @param isTyping - Whether the assistant is typing
         */
        setTyping(isTyping: boolean): void {
            this.isTyping = isTyping;
        },

        /**
         * Clear all messages in the current session
         */
        clearMessages(): void {
            this.messages = [];
        },

        /**
         * Export chat history to JSON file
         * @returns JSON string of chat history
         */
        exportChatHistory(): string {
            const exportData = {
                session_id: this.currentSession?.session_id || 'unknown',
                exported_at: new Date().toISOString(),
                message_count: this.messages.length,
                messages: this.messages.map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp,
                    sources: msg.sources,
                })),
            };

            return JSON.stringify(exportData, null, 2);
        },

        /**
         * Export chat history as downloadable file
         * @param format - Export format ('json' or 'txt')
         */
        downloadChatHistory(format: 'json' | 'txt' = 'json'): void {
            let content: string;
            let filename: string;
            let mimeType: string;

            if (format === 'json') {
                content = this.exportChatHistory();
                filename = `chat-history-${this.currentSession?.session_id || 'unknown'}-${Date.now()}.json`;
                mimeType = 'application/json';
            } else {
                // Text format
                content = this.exportChatHistoryAsText();
                filename = `chat-history-${this.currentSession?.session_id || 'unknown'}-${Date.now()}.txt`;
                mimeType = 'text/plain';
            }

            // Create blob and download
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        },

        /**
         * Export chat history as plain text
         * @returns Plain text representation of chat history
         */
        exportChatHistoryAsText(): string {
            const lines: string[] = [];
            lines.push('='.repeat(60));
            lines.push('CHAT HISTORY');
            lines.push('='.repeat(60));
            lines.push(`Session ID: ${this.currentSession?.session_id || 'unknown'}`);
            lines.push(`Exported: ${new Date().toLocaleString()}`);
            lines.push(`Total Messages: ${this.messages.length}`);
            lines.push('='.repeat(60));
            lines.push('');

            this.messages.forEach((msg, index) => {
                const timestamp = new Date(msg.timestamp).toLocaleString();
                const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';

                lines.push(`[${index + 1}] ${role} - ${timestamp}`);
                lines.push('-'.repeat(60));
                lines.push(msg.content);

                if (msg.sources && msg.sources.length > 0) {
                    lines.push('');
                    lines.push('Sources:');
                    msg.sources.forEach((source, idx) => {
                        lines.push(`  ${idx + 1}. ${source.title}${source.url ? ` (${source.url})` : ''}`);
                    });
                }

                lines.push('');
                lines.push('');
            });

            return lines.join('\n');
        },

        /**
         * Clear error state
         */
        clearError(): void {
            this.error = null;
        },

        /**
         * Generate a unique message ID
         * @returns string - A unique message ID
         */
        generateMessageId(): string {
            return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        },
    },
});
