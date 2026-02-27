import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useSocket } from './useSocket';
import authReducer from '../store/slices/authSlice';
import * as socketModule from '../api/socket';

// Mock the socket module
vi.mock('../api/socket', () => ({
    initializeSocket: vi.fn(),
    disconnectSocket: vi.fn(),
    getSocket: vi.fn(),
}));

describe('useSocket', () => {
    let store;
    let mockSocket;

    beforeEach(() => {
        // Create a fresh store for each test
        store = configureStore({
            reducer: {
                auth: authReducer,
            },
            preloadedState: {
                auth: {
                    isAuthenticated: false,
                    token: null,
                    user: null,
                    loading: false,
                    error: null,
                    tokenExpiry: null,
                },
            },
        });

        // Create mock socket with event emitter functionality
        mockSocket = {
            connected: false,
            on: vi.fn(),
            off: vi.fn(),
            emit: vi.fn(),
            disconnect: vi.fn(),
        };

        // Setup default mock implementations
        socketModule.initializeSocket.mockReturnValue(mockSocket);
        socketModule.getSocket.mockReturnValue(mockSocket);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const wrapper = ({ children }) => (
        <Provider store={store}>{children}</Provider>
    );

    it('should not initialize socket when user is not authenticated', () => {
        const { result } = renderHook(() => useSocket(), { wrapper });

        expect(socketModule.initializeSocket).not.toHaveBeenCalled();
        expect(result.current.isConnected).toBe(false);
        expect(result.current.isConnecting).toBe(false);
        expect(result.current.socket).toBe(mockSocket);
    });

    it('should initialize socket when user is authenticated with token', async () => {
        // Update store to authenticated state
        store = configureStore({
            reducer: {
                auth: authReducer,
            },
            preloadedState: {
                auth: {
                    isAuthenticated: true,
                    token: 'test-token',
                    user: { id: 1, name: 'Test User' },
                    loading: false,
                    error: null,
                    tokenExpiry: null,
                },
            },
        });

        const { result } = renderHook(() => useSocket(), { wrapper });

        await waitFor(() => {
            expect(socketModule.initializeSocket).toHaveBeenCalledWith('test-token');
        });

        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should update connection status when socket connects', async () => {
        store = configureStore({
            reducer: {
                auth: authReducer,
            },
            preloadedState: {
                auth: {
                    isAuthenticated: true,
                    token: 'test-token',
                    user: { id: 1, name: 'Test User' },
                    loading: false,
                    error: null,
                    tokenExpiry: null,
                },
            },
        });

        const { result } = renderHook(() => useSocket(), { wrapper });

        // Get the connect handler that was registered
        const connectHandler = mockSocket.on.mock.calls.find(
            call => call[0] === 'connect'
        )?.[1];

        // Simulate socket connection
        if (connectHandler) {
            connectHandler();
        }

        await waitFor(() => {
            expect(result.current.isConnected).toBe(true);
            expect(result.current.isConnecting).toBe(false);
        });
    });

    it('should update connection status when socket disconnects', async () => {
        store = configureStore({
            reducer: {
                auth: authReducer,
            },
            preloadedState: {
                auth: {
                    isAuthenticated: true,
                    token: 'test-token',
                    user: { id: 1, name: 'Test User' },
                    loading: false,
                    error: null,
                    tokenExpiry: null,
                },
            },
        });

        const { result } = renderHook(() => useSocket(), { wrapper });

        // Get the disconnect handler
        const disconnectHandler = mockSocket.on.mock.calls.find(
            call => call[0] === 'disconnect'
        )?.[1];

        // Simulate socket disconnection
        if (disconnectHandler) {
            disconnectHandler();
        }

        await waitFor(() => {
            expect(result.current.isConnected).toBe(false);
            expect(result.current.isConnecting).toBe(false);
        });
    });

    it('should disconnect socket on unmount', async () => {
        store = configureStore({
            reducer: {
                auth: authReducer,
            },
            preloadedState: {
                auth: {
                    isAuthenticated: true,
                    token: 'test-token',
                    user: { id: 1, name: 'Test User' },
                    loading: false,
                    error: null,
                    tokenExpiry: null,
                },
            },
        });

        const { unmount } = renderHook(() => useSocket(), { wrapper });

        unmount();

        await waitFor(() => {
            expect(socketModule.disconnectSocket).toHaveBeenCalled();
        });
    });

    it('should disconnect socket when user logs out', async () => {
        // Start with authenticated state
        store = configureStore({
            reducer: {
                auth: authReducer,
            },
            preloadedState: {
                auth: {
                    isAuthenticated: true,
                    token: 'test-token',
                    user: { id: 1, name: 'Test User' },
                    loading: false,
                    error: null,
                    tokenExpiry: null,
                },
            },
        });

        const { rerender } = renderHook(() => useSocket(), { wrapper });

        // Simulate logout by updating store
        store.dispatch({ type: 'auth/logout' });

        rerender();

        await waitFor(() => {
            expect(socketModule.disconnectSocket).toHaveBeenCalled();
        });
    });

    it('should handle reconnection attempts', async () => {
        store = configureStore({
            reducer: {
                auth: authReducer,
            },
            preloadedState: {
                auth: {
                    isAuthenticated: true,
                    token: 'test-token',
                    user: { id: 1, name: 'Test User' },
                    loading: false,
                    error: null,
                    tokenExpiry: null,
                },
            },
        });

        const { result } = renderHook(() => useSocket(), { wrapper });

        // Get the reconnect_attempt handler
        const reconnectAttemptHandler = mockSocket.on.mock.calls.find(
            call => call[0] === 'reconnect_attempt'
        )?.[1];

        // Simulate reconnection attempt
        if (reconnectAttemptHandler) {
            reconnectAttemptHandler();
        }

        await waitFor(() => {
            expect(result.current.isConnecting).toBe(true);
        });
    });

    it('should handle successful reconnection', async () => {
        store = configureStore({
            reducer: {
                auth: authReducer,
            },
            preloadedState: {
                auth: {
                    isAuthenticated: true,
                    token: 'test-token',
                    user: { id: 1, name: 'Test User' },
                    loading: false,
                    error: null,
                    tokenExpiry: null,
                },
            },
        });

        const { result } = renderHook(() => useSocket(), { wrapper });

        // Get the reconnect handler
        const reconnectHandler = mockSocket.on.mock.calls.find(
            call => call[0] === 'reconnect'
        )?.[1];

        // Simulate successful reconnection
        if (reconnectHandler) {
            reconnectHandler();
        }

        await waitFor(() => {
            expect(result.current.isConnected).toBe(true);
            expect(result.current.isConnecting).toBe(false);
        });
    });
});
