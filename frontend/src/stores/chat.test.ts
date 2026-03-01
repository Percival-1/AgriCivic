import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useChatStore } from './chat';
import { chatService } from '@/services/chat.service';
import type { ChatSession, ChatMessage } from '@/types/chat.types';

// Mock the chat service
vi.mock('@/services/chat.service', () => ({
    chatService: {
        initSession: vi.fn(),
        sendMessage: vi.fn(),
        getHistory: vi.fn(),
        endSession: vi.fn(),
        uploadImage: vi.fn(),
    },
}));

describe('Chat Store', () => {
    beforeEach(() => {
        // Create a fresh pinia instance for each test
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('Initial State', () => {
        it('should have correct initial state', () => {
            const store = useChatStore();

            expect(store.currentSession).toBeNull();
            expect(store.messages).toEqual([]);
            expect(store.isLoading).toBe(false);
            expect(store.isTyping).toBe(false);
            expect(store.error).toBeNull();
        });
    });

    describe('Getters', () => {
        it('should return correct message count', () => {
            const store = useChatStore();
            const mockMessages: ChatMessage[] = [
                {
                    id: '1',
                    session_id: 'session1',
                    role: 'user',
                    content: 'Hello',
                    timestamp: new Date().toISOString(),
                },
                {
                    id: '2',
                    session_id: 'session1',
                    role: 'assistant',
                    content: 'Hi there!',
                    timestamp: new Date().toISOString(),
                },
            ];

            store.messages = mockMessages;
            expect(store.messageCount).toBe(2);
        });

        it('should return last message', () => {
            const store = useChatStore();
            const mockMessages: ChatMessage[] = [
                {
                    id: '1',
                    session_id: 'session1',
                    role: 'user',
                    content: 'Hello',
                    timestamp: new Date().toISOString(),
                },
                {
                    id: '2',
                    session_id: 'session1',
                    role: 'assistant',
                    content: 'Hi there!',
                    timestamp: new Date().toISOString(),
                },
            ];

            store.messages = mockMessages;
            expect(store.lastMessage).toEqual(mockMessages[1]);
        });

        it('should return undefined for last message when no messages', () => {
            const store = useChatStore();
            expect(store.lastMessage).toBeUndefined();
        });

        it('should check if session is active', () => {
            const store = useChatStore();
            expect(store.hasActiveSession).toBe(false);

            store.currentSession = {
                session_id: 'session1',
                user_id: 'user1',
                created_at: new Date().toISOString(),
                last_message_at: new Date().toISOString(),
            };

            expect(store.hasActiveSession).toBe(true);
        });

        it('should return session ID', () => {
            const store = useChatStore();
            expect(store.sessionId).toBeNull();

            store.currentSession = {
                session_id: 'session1',
                user_id: 'user1',
                created_at: new Date().toISOString(),
                last_message_at: new Date().toISOString(),
            };

            expect(store.sessionId).toBe('session1');
        });

        it('should search messages by content', () => {
            const store = useChatStore();
            const mockMessages: ChatMessage[] = [
                {
                    id: '1',
                    session_id: 'session1',
                    role: 'user',
                    content: 'How do I grow tomatoes?',
                    timestamp: new Date().toISOString(),
                },
                {
                    id: '2',
                    session_id: 'session1',
                    role: 'assistant',
                    content: 'Tomatoes need full sun and well-drained soil.',
                    timestamp: new Date().toISOString(),
                },
                {
                    id: '3',
                    session_id: 'session1',
                    role: 'user',
                    content: 'What about potatoes?',
                    timestamp: new Date().toISOString(),
                },
            ];

            store.messages = mockMessages;

            const results = store.searchMessages('tomato');
            expect(results).toHaveLength(2);
            expect(results[0].content).toContain('tomatoes');
            expect(results[1].content).toContain('Tomatoes');
        });

        it('should search messages by source titles', () => {
            const store = useChatStore();
            const mockMessages: ChatMessage[] = [
                {
                    id: '1',
                    session_id: 'session1',
                    role: 'assistant',
                    content: 'Here is some information.',
                    sources: [
                        { title: 'Farming Guide', relevance_score: 0.9 },
                        { title: 'Crop Management', relevance_score: 0.8 },
                    ],
                    timestamp: new Date().toISOString(),
                },
                {
                    id: '2',
                    session_id: 'session1',
                    role: 'assistant',
                    content: 'More details here.',
                    sources: [
                        { title: 'Weather Patterns', relevance_score: 0.7 },
                    ],
                    timestamp: new Date().toISOString(),
                },
            ];

            store.messages = mockMessages;

            const results = store.searchMessages('farming');
            expect(results).toHaveLength(1);
            expect(results[0].sources?.[0].title).toContain('Farming');
        });

        it('should return all messages when search query is empty', () => {
            const store = useChatStore();
            const mockMessages: ChatMessage[] = [
                {
                    id: '1',
                    session_id: 'session1',
                    role: 'user',
                    content: 'Test message',
                    timestamp: new Date().toISOString(),
                },
            ];

            store.messages = mockMessages;

            const results = store.searchMessages('');
            expect(results).toEqual(mockMessages);
        });

        it('should perform case-insensitive search', () => {
            const store = useChatStore();
            const mockMessages: ChatMessage[] = [
                {
                    id: '1',
                    session_id: 'session1',
                    role: 'user',
                    content: 'HELLO WORLD',
                    timestamp: new Date().toISOString(),
                },
            ];

            store.messages = mockMessages;

            const results = store.searchMessages('hello');
            expect(results).toHaveLength(1);
        });
    });

    describe('Actions', () => {
        describe('initSession', () => {
            it('should initialize a new session successfully', async () => {
                const store = useChatStore();
                const mockSession: ChatSession = {
                    session_id: 'session1',
                    user_id: 'user1',
                    created_at: new Date().toISOString(),
                    last_message_at: new Date().toISOString(),
                };

                vi.mocked(chatService.initSession).mockResolvedValue(mockSession);

                await store.initSession();

                expect(store.currentSession).toEqual(mockSession);
                expect(store.messages).toEqual([]);
                expect(store.isLoading).toBe(false);
                expect(store.error).toBeNull();
            });

            it('should handle initialization errors', async () => {
                const store = useChatStore();
                const errorMessage = 'Failed to initialize session';

                vi.mocked(chatService.initSession).mockRejectedValue(new Error(errorMessage));

                await expect(store.initSession()).rejects.toThrow(errorMessage);
                expect(store.error).toBe(errorMessage);
                expect(store.isLoading).toBe(false);
            });
        });

        describe('sendMessage', () => {
            it('should send message successfully', async () => {
                const store = useChatStore();
                store.currentSession = {
                    session_id: 'session1',
                    user_id: 'user1',
                    created_at: new Date().toISOString(),
                    last_message_at: new Date().toISOString(),
                };

                const mockResponse: ChatMessage = {
                    id: 'msg2',
                    session_id: 'session1',
                    role: 'assistant',
                    content: 'Hello! How can I help you?',
                    timestamp: new Date().toISOString(),
                };

                vi.mocked(chatService.sendMessage).mockResolvedValue(mockResponse);

                await store.sendMessage('Hello');

                expect(store.messages).toHaveLength(2);
                expect(store.messages[0].role).toBe('user');
                expect(store.messages[0].content).toBe('Hello');
                expect(store.messages[1]).toEqual(mockResponse);
                expect(store.isTyping).toBe(false);
                expect(store.isLoading).toBe(false);
            });

            it('should throw error when no active session', async () => {
                const store = useChatStore();

                await expect(store.sendMessage('Hello')).rejects.toThrow(
                    'No active session. Please initialize a session first.'
                );
            });

            it('should handle send message errors', async () => {
                const store = useChatStore();
                store.currentSession = {
                    session_id: 'session1',
                    user_id: 'user1',
                    created_at: new Date().toISOString(),
                    last_message_at: new Date().toISOString(),
                };

                const errorMessage = 'Failed to send message';
                vi.mocked(chatService.sendMessage).mockRejectedValue(new Error(errorMessage));

                await expect(store.sendMessage('Hello')).rejects.toThrow(errorMessage);
                expect(store.error).toBe(errorMessage);
                expect(store.isTyping).toBe(false);
                expect(store.isLoading).toBe(false);
            });
        });

        describe('loadHistory', () => {
            it('should load chat history successfully', async () => {
                const store = useChatStore();
                store.currentSession = {
                    session_id: 'session1',
                    user_id: 'user1',
                    created_at: new Date().toISOString(),
                    last_message_at: new Date().toISOString(),
                };

                const mockHistory: ChatMessage[] = [
                    {
                        id: '1',
                        session_id: 'session1',
                        role: 'user',
                        content: 'Previous message',
                        timestamp: new Date().toISOString(),
                    },
                ];

                vi.mocked(chatService.getHistory).mockResolvedValue(mockHistory);

                await store.loadHistory();

                expect(store.messages).toEqual(mockHistory);
                expect(store.isLoading).toBe(false);
            });

            it('should throw error when no active session', async () => {
                const store = useChatStore();

                await expect(store.loadHistory()).rejects.toThrow(
                    'No active session. Please initialize a session first.'
                );
            });
        });

        describe('endSession', () => {
            it('should end session successfully', async () => {
                const store = useChatStore();
                store.currentSession = {
                    session_id: 'session1',
                    user_id: 'user1',
                    created_at: new Date().toISOString(),
                    last_message_at: new Date().toISOString(),
                };
                store.messages = [
                    {
                        id: '1',
                        session_id: 'session1',
                        role: 'user',
                        content: 'Test',
                        timestamp: new Date().toISOString(),
                    },
                ];

                vi.mocked(chatService.endSession).mockResolvedValue();

                await store.endSession();

                expect(store.currentSession).toBeNull();
                expect(store.messages).toEqual([]);
                expect(store.isLoading).toBe(false);
            });

            it('should clear session even when API call fails', async () => {
                const store = useChatStore();
                store.currentSession = {
                    session_id: 'session1',
                    user_id: 'user1',
                    created_at: new Date().toISOString(),
                    last_message_at: new Date().toISOString(),
                };

                vi.mocked(chatService.endSession).mockRejectedValue(new Error('API Error'));

                await expect(store.endSession()).rejects.toThrow('API Error');
                expect(store.currentSession).toBeNull();
                expect(store.messages).toEqual([]);
            });
        });

        describe('uploadImage', () => {
            it('should upload image successfully', async () => {
                const store = useChatStore();
                store.currentSession = {
                    session_id: 'session1',
                    user_id: 'user1',
                    created_at: new Date().toISOString(),
                    last_message_at: new Date().toISOString(),
                };

                const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
                const mockResponse: ChatMessage = {
                    id: 'msg2',
                    session_id: 'session1',
                    role: 'assistant',
                    content: 'Disease detected: Leaf Blight',
                    timestamp: new Date().toISOString(),
                };

                vi.mocked(chatService.uploadImage).mockResolvedValue(mockResponse);

                await store.uploadImage(mockFile);

                expect(store.messages).toHaveLength(2);
                expect(store.messages[0].content).toContain('test.jpg');
                expect(store.messages[1]).toEqual(mockResponse);
                expect(store.isTyping).toBe(false);
            });

            it('should throw error when no active session', async () => {
                const store = useChatStore();
                const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

                await expect(store.uploadImage(mockFile)).rejects.toThrow(
                    'No active session. Please initialize a session first.'
                );
            });
        });

        describe('Helper Actions', () => {
            it('should add message to conversation', () => {
                const store = useChatStore();
                store.currentSession = {
                    session_id: 'session1',
                    user_id: 'user1',
                    created_at: new Date().toISOString(),
                    last_message_at: new Date().toISOString(),
                };

                const message: ChatMessage = {
                    id: '1',
                    session_id: 'session1',
                    role: 'user',
                    content: 'Test message',
                    timestamp: new Date().toISOString(),
                };

                store.addMessage(message);

                expect(store.messages).toHaveLength(1);
                expect(store.messages[0]).toEqual(message);
            });

            it('should set typing indicator', () => {
                const store = useChatStore();

                store.setTyping(true);
                expect(store.isTyping).toBe(true);

                store.setTyping(false);
                expect(store.isTyping).toBe(false);
            });

            it('should clear messages', () => {
                const store = useChatStore();
                store.messages = [
                    {
                        id: '1',
                        session_id: 'session1',
                        role: 'user',
                        content: 'Test',
                        timestamp: new Date().toISOString(),
                    },
                ];

                store.clearMessages();

                expect(store.messages).toEqual([]);
            });

            it('should clear error', () => {
                const store = useChatStore();
                store.error = 'Some error';

                store.clearError();

                expect(store.error).toBeNull();
            });
        });

        describe('Export Functionality', () => {
            it('should export chat history as JSON', () => {
                const store = useChatStore();
                store.currentSession = {
                    session_id: 'session1',
                    user_id: 'user1',
                    created_at: new Date().toISOString(),
                    last_message_at: new Date().toISOString(),
                };
                store.messages = [
                    {
                        id: '1',
                        session_id: 'session1',
                        role: 'user',
                        content: 'Hello',
                        timestamp: new Date().toISOString(),
                    },
                    {
                        id: '2',
                        session_id: 'session1',
                        role: 'assistant',
                        content: 'Hi there!',
                        timestamp: new Date().toISOString(),
                    },
                ];

                const jsonExport = store.exportChatHistory();
                const parsed = JSON.parse(jsonExport);

                expect(parsed.session_id).toBe('session1');
                expect(parsed.message_count).toBe(2);
                expect(parsed.messages).toHaveLength(2);
                expect(parsed.messages[0].role).toBe('user');
                expect(parsed.messages[0].content).toBe('Hello');
            });

            it('should export chat history as text', () => {
                const store = useChatStore();
                store.currentSession = {
                    session_id: 'session1',
                    user_id: 'user1',
                    created_at: new Date().toISOString(),
                    last_message_at: new Date().toISOString(),
                };
                store.messages = [
                    {
                        id: '1',
                        session_id: 'session1',
                        role: 'user',
                        content: 'Hello',
                        timestamp: new Date().toISOString(),
                    },
                ];

                const textExport = store.exportChatHistoryAsText();

                expect(textExport).toContain('CHAT HISTORY');
                expect(textExport).toContain('session1');
                expect(textExport).toContain('USER');
                expect(textExport).toContain('Hello');
            });

            it('should include sources in text export', () => {
                const store = useChatStore();
                store.currentSession = {
                    session_id: 'session1',
                    user_id: 'user1',
                    created_at: new Date().toISOString(),
                    last_message_at: new Date().toISOString(),
                };
                store.messages = [
                    {
                        id: '1',
                        session_id: 'session1',
                        role: 'assistant',
                        content: 'Here is information.',
                        sources: [
                            { title: 'Source 1', url: 'http://example.com', relevance_score: 0.9 },
                        ],
                        timestamp: new Date().toISOString(),
                    },
                ];

                const textExport = store.exportChatHistoryAsText();

                expect(textExport).toContain('Sources:');
                expect(textExport).toContain('Source 1');
                expect(textExport).toContain('http://example.com');
            });

            it('should handle export with no session', () => {
                const store = useChatStore();
                store.messages = [
                    {
                        id: '1',
                        session_id: 'session1',
                        role: 'user',
                        content: 'Test',
                        timestamp: new Date().toISOString(),
                    },
                ];

                const jsonExport = store.exportChatHistory();
                const parsed = JSON.parse(jsonExport);

                expect(parsed.session_id).toBe('unknown');
                expect(parsed.message_count).toBe(1);
            });
        });
    });
});
