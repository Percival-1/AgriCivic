import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatService } from './chat.service';
import { apiService } from './api';
import type { InitSessionResponse, SendMessageResponse, ChatHistoryResponse, EndSessionResponse, UploadImageResponse } from '@/types/chat.types';

// Mock the API service
vi.mock('./api', () => ({
    apiService: {
        post: vi.fn(),
        get: vi.fn(),
        axiosInstance: {
            post: vi.fn(),
        },
    },
}));

describe('ChatService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initSession', () => {
        it('should initialize a new chat session', async () => {
            const mockResponse: InitSessionResponse = {
                session_id: 'session_123',
                message: 'Session initialized',
            };

            vi.mocked(apiService.post).mockResolvedValue(mockResponse);

            const result = await chatService.initSession();

            expect(apiService.post).toHaveBeenCalledWith('/api/v1/chat/init');
            expect(result).toMatchObject({
                session_id: 'session_123',
                user_id: '',
            });
            expect(result.created_at).toBeDefined();
            expect(result.last_message_at).toBeDefined();
        });
    });

    describe('sendMessage', () => {
        it('should send a message and return assistant response', async () => {
            const mockResponse: SendMessageResponse = {
                response: 'Hello! How can I help you?',
                sources: [
                    {
                        title: 'Agricultural Guide',
                        url: 'https://example.com/guide',
                        relevance_score: 0.95,
                    },
                ],
                session_id: 'session_123',
            };

            vi.mocked(apiService.post).mockResolvedValue(mockResponse);

            const request = {
                session_id: 'session_123',
                message: 'Hello',
                language: 'en',
            };

            const result = await chatService.sendMessage(request);

            expect(apiService.post).toHaveBeenCalledWith('/api/v1/chat/message', {
                session_id: 'session_123',
                message: 'Hello',
                language: 'en',
            });
            expect(result.role).toBe('assistant');
            expect(result.content).toBe('Hello! How can I help you?');
            expect(result.sources).toHaveLength(1);
            expect(result.session_id).toBe('session_123');
        });

        it('should send message without language parameter', async () => {
            const mockResponse: SendMessageResponse = {
                response: 'Response',
                session_id: 'session_123',
            };

            vi.mocked(apiService.post).mockResolvedValue(mockResponse);

            const request = {
                session_id: 'session_123',
                message: 'Test message',
            };

            await chatService.sendMessage(request);

            expect(apiService.post).toHaveBeenCalledWith('/api/v1/chat/message', {
                session_id: 'session_123',
                message: 'Test message',
                language: undefined,
            });
        });
    });

    describe('getHistory', () => {
        it('should retrieve chat history for a session', async () => {
            const mockResponse: ChatHistoryResponse = {
                messages: [
                    {
                        role: 'user',
                        content: 'Hello',
                        timestamp: '2024-01-01T10:00:00Z',
                    },
                    {
                        role: 'assistant',
                        content: 'Hi there!',
                        timestamp: '2024-01-01T10:00:01Z',
                        sources: [
                            {
                                title: 'Source 1',
                                relevance_score: 0.9,
                            },
                        ],
                    },
                ],
                session_id: 'session_123',
            };

            vi.mocked(apiService.get).mockResolvedValue(mockResponse);

            const result = await chatService.getHistory('session_123');

            expect(apiService.get).toHaveBeenCalledWith('/api/v1/chat/history/session_123', {
                params: {},
            });
            expect(result).toHaveLength(2);
            expect(result[0].role).toBe('user');
            expect(result[0].content).toBe('Hello');
            expect(result[1].role).toBe('assistant');
            expect(result[1].sources).toHaveLength(1);
        });

        it('should retrieve chat history with limit', async () => {
            const mockResponse: ChatHistoryResponse = {
                messages: [
                    {
                        role: 'user',
                        content: 'Hello',
                        timestamp: '2024-01-01T10:00:00Z',
                    },
                ],
                session_id: 'session_123',
            };

            vi.mocked(apiService.get).mockResolvedValue(mockResponse);

            await chatService.getHistory('session_123', 10);

            expect(apiService.get).toHaveBeenCalledWith('/api/v1/chat/history/session_123', {
                params: { limit: '10' },
            });
        });
    });

    describe('endSession', () => {
        it('should end a chat session', async () => {
            const mockResponse: EndSessionResponse = {
                message: 'Session ended',
                session_id: 'session_123',
            };

            vi.mocked(apiService.post).mockResolvedValue(mockResponse);

            await chatService.endSession('session_123');

            expect(apiService.post).toHaveBeenCalledWith('/api/v1/chat/end', {
                session_id: 'session_123',
            });
        });
    });

    describe('uploadImage', () => {
        it('should upload an image for disease detection', async () => {
            const mockFile = new File(['image content'], 'crop.jpg', { type: 'image/jpeg' });
            const mockResponse: UploadImageResponse = {
                response: 'Disease detected: Leaf Blight',
                analysis: {
                    disease_name: 'Leaf Blight',
                    confidence: 0.92,
                    treatment_summary: 'Apply fungicide',
                },
                sources: [
                    {
                        title: 'Disease Database',
                        relevance_score: 0.95,
                    },
                ],
                session_id: 'session_123',
            };

            vi.mocked(apiService.axiosInstance.post).mockResolvedValue({
                data: mockResponse,
            });

            const result = await chatService.uploadImage('session_123', mockFile);

            expect(apiService.axiosInstance.post).toHaveBeenCalledWith(
                '/api/v1/chat/upload-image',
                expect.any(FormData),
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            expect(result.role).toBe('assistant');
            expect(result.content).toBe('Disease detected: Leaf Blight');
            expect(result.sources).toHaveLength(1);
            expect(result.session_id).toBe('session_123');
        });
    });
});
