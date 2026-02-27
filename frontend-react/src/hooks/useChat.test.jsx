import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useChat } from './useChat';
import * as socketModule from '../api/socket';
import authReducer from '../store/slices/authSlice';

// Mock Socket.IO
const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: true,
    disconnect: vi.fn(),
};

vi.mock('../api/socket', () => ({
    initializeSocket: vi.fn(() => mockSocket),
    disconnectSocket: vi.fn(),
    getSocket: vi.fn(() => mockSocket),
}));

describe('useChat', () => {
    let store;
    let wrapper;

    beforeEach(() => {
        // Create a mock Redux store with authenticated state
        store = configureStore({
            reducer: {
                auth: authReducer,
            },
            preloadedState: {
                auth: {
                    isAuthenticated: true,
                    token: 'mock-token',
                    user: null,
                },
            },
        });

        wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;

        // Clear all mocks
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useChat('session-123'), { wrapper });

        expect(result.current.messages).toEqual([]);
        expect(result.current.isTyping).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.isConnected).toBe(true);
    });

    it('should join room when sessionId is provided', async () => {
        renderHook(() => useChat('session-123'), { wrapper });

        await waitFor(() => {
            expect(mockSocket.emit).toHaveBeenCalledWith('join_room', {
                sessionId: 'session-123',
            });
        });
    });

    it('should leave room on unmount', async () => {
        const { unmount } = renderHook(() => useChat('session-123'), { wrapper });

        await waitFor(() => {
            expect(mockSocket.emit).toHaveBeenCalledWith('join_room', {
                sessionId: 'session-123',
            });
        });

        unmount();

        expect(mockSocket.emit).toHaveBeenCalledWith('leave_room', {
            sessionId: 'session-123',
        });
    });

    it('should send message via Socket.IO', async () => {
        const { result } = renderHook(() => useChat('session-123'), { wrapper });

        await waitFor(() => {
            expect(mockSocket.emit).toHaveBeenCalledWith('join_room', {
                sessionId: 'session-123',
            });
        });

        act(() => {
            result.current.sendMessage('Hello, world!');
        });

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'send_message',
            expect.objectContaining({
                sessionId: 'session-123',
                content: 'Hello, world!',
                timestamp: expect.any(String),
            })
        );
    });

    it('should emit typing indicator', async () => {
        const { result } = renderHook(() => useChat('session-123'), { wrapper });

        await waitFor(() => {
            expect(mockSocket.emit).toHaveBeenCalledWith('join_room', {
                sessionId: 'session-123',
            });
        });

        act(() => {
            result.current.emitTyping();
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('typing', {
            sessionId: 'session-123',
        });
    });

    it('should emit stop typing indicator', async () => {
        const { result } = renderHook(() => useChat('session-123'), { wrapper });

        await waitFor(() => {
            expect(mockSocket.emit).toHaveBeenCalledWith('join_room', {
                sessionId: 'session-123',
            });
        });

        act(() => {
            result.current.emitStopTyping();
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('stop_typing', {
            sessionId: 'session-123',
        });
    });

    it('should handle incoming messages', async () => {
        const { result } = renderHook(() => useChat('session-123'), { wrapper });

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
        });

        // Get the message handler
        const messageHandler = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'message'
        )[1];

        // Simulate incoming message
        const incomingMessage = {
            id: '1',
            content: 'Hello from server',
            timestamp: new Date().toISOString(),
        };

        act(() => {
            messageHandler(incomingMessage);
        });

        expect(result.current.messages).toContainEqual(incomingMessage);
    });

    it('should handle typing indicator from other users', async () => {
        const { result } = renderHook(() => useChat('session-123'), { wrapper });

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith('typing', expect.any(Function));
        });

        // Get the typing handler
        const typingHandler = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'typing'
        )[1];

        // Simulate typing event
        act(() => {
            typingHandler({ userId: 'user-456' });
        });

        expect(result.current.isTyping).toBe(true);
    });

    it('should handle stop typing indicator', async () => {
        const { result } = renderHook(() => useChat('session-123'), { wrapper });

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith('stop_typing', expect.any(Function));
        });

        // Get the stop typing handler
        const stopTypingHandler = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'stop_typing'
        )[1];

        // First set typing to true
        const typingHandler = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'typing'
        )[1];

        act(() => {
            typingHandler({ userId: 'user-456' });
        });

        expect(result.current.isTyping).toBe(true);

        // Then simulate stop typing
        act(() => {
            stopTypingHandler({ userId: 'user-456' });
        });

        expect(result.current.isTyping).toBe(false);
    });

    it('should clear messages', async () => {
        const { result } = renderHook(() => useChat('session-123'), { wrapper });

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
        });

        // Add a message
        const messageHandler = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'message'
        )[1];

        act(() => {
            messageHandler({ id: '1', content: 'Test message' });
        });

        expect(result.current.messages).toHaveLength(1);

        // Clear messages
        act(() => {
            result.current.clearMessages();
        });

        expect(result.current.messages).toEqual([]);
    });

    it('should handle chat errors', async () => {
        const { result } = renderHook(() => useChat('session-123'), { wrapper });

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith('chat_error', expect.any(Function));
        });

        // Get the error handler
        const errorHandler = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'chat_error'
        )[1];

        // Simulate error
        act(() => {
            errorHandler({ message: 'Connection failed' });
        });

        expect(result.current.error).toBe('Connection failed');
    });

    it('should not send message when not connected', () => {
        // Create a store with unauthenticated state
        const disconnectedStore = configureStore({
            reducer: {
                auth: authReducer,
            },
            preloadedState: {
                auth: {
                    isAuthenticated: false,
                    token: null,
                    user: null,
                },
            },
        });

        const disconnectedWrapper = ({ children }) => (
            <Provider store={disconnectedStore}>{children}</Provider>
        );

        const { result } = renderHook(() => useChat('session-123'), {
            wrapper: disconnectedWrapper,
        });

        act(() => {
            result.current.sendMessage('Hello');
        });

        // Should set error instead of sending
        expect(result.current.error).toBeTruthy();
    });

    it('should cleanup event listeners on unmount', async () => {
        const { unmount } = renderHook(() => useChat('session-123'), { wrapper });

        await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalled();
        });

        const onCallCount = mockSocket.on.mock.calls.length;

        unmount();

        // Should call off for each on
        expect(mockSocket.off).toHaveBeenCalledTimes(onCallCount);
    });

    it('should send message with metadata', async () => {
        const { result } = renderHook(() => useChat('session-123'), { wrapper });

        await waitFor(() => {
            expect(mockSocket.emit).toHaveBeenCalledWith('join_room', {
                sessionId: 'session-123',
            });
        });

        const metadata = {
            type: 'image',
            imageUrl: 'https://example.com/image.jpg',
        };

        act(() => {
            result.current.sendMessage('Check this out!', metadata);
        });

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'send_message',
            expect.objectContaining({
                sessionId: 'session-123',
                content: 'Check this out!',
                type: 'image',
                imageUrl: 'https://example.com/image.jpg',
                timestamp: expect.any(String),
            })
        );
    });
});
