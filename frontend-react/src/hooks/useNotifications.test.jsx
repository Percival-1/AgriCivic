import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import notificationReducer from '../store/slices/notificationSlice';
import authReducer from '../store/slices/authSlice';
import userReducer from '../store/slices/userSlice';

// Mock useSocket hook before importing useNotifications
const mockUseSocket = vi.fn();
vi.mock('./useSocket', () => ({
    useSocket: () => mockUseSocket(),
}));

// Import after mocking
const { useNotifications } = await import('./useNotifications');

describe('useNotifications', () => {
    let store;
    let mockSocket;
    let wrapper;

    beforeEach(() => {
        // Create a fresh store for each test
        store = configureStore({
            reducer: {
                auth: authReducer,
                user: userReducer,
                notifications: notificationReducer,
            },
            preloadedState: {
                auth: {
                    isAuthenticated: true,
                    token: 'test-token',
                    user: { id: 1, phone: '+1234567890' },
                },
                notifications: {
                    items: [],
                    unreadCount: 0,
                    loading: false,
                    error: null,
                },
            },
        });

        // Create wrapper component
        wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;

        // Mock socket instance
        mockSocket = {
            on: vi.fn(),
            off: vi.fn(),
            emit: vi.fn(),
            connected: true,
        };

        // Mock Notification API
        global.Notification = vi.fn().mockImplementation((title, options) => ({
            title,
            ...options,
            close: vi.fn(),
            onclick: null,
        }));
        global.Notification.permission = 'granted';
        global.Notification.requestPermission = vi.fn().mockResolvedValue('granted');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with empty notifications and zero unread count', () => {
        mockUseSocket.mockReturnValue({
            socket: mockSocket,
            isConnected: true,
        });

        const { result } = renderHook(() => useNotifications(), { wrapper });

        expect(result.current.notifications).toEqual([]);
        expect(result.current.unreadCount).toBe(0);
        expect(result.current.isConnected).toBe(true);
    });

    it('should set up Socket.IO event listeners when connected', () => {
        mockUseSocket.mockReturnValue({
            socket: mockSocket,
            isConnected: true,
        });

        renderHook(() => useNotifications(), { wrapper });

        // Verify event listeners are attached
        expect(mockSocket.on).toHaveBeenCalledWith('notification', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('notification:read', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('notification:update', expect.any(Function));
    });

    it('should handle incoming notification event', async () => {
        mockUseSocket.mockReturnValue({
            socket: mockSocket,
            isConnected: true,
        });

        const { result } = renderHook(() => useNotifications(), { wrapper });

        // Get the notification handler
        const notificationHandler = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'notification'
        )[1];

        // Simulate receiving a notification
        const testNotification = {
            id: '1',
            title: 'Test Notification',
            message: 'This is a test',
            read: false,
            priority: 'medium',
        };

        act(() => {
            notificationHandler(testNotification);
        });

        // Wait for state update
        await waitFor(() => {
            expect(result.current.notifications).toHaveLength(1);
            expect(result.current.unreadCount).toBe(1);
        });

        expect(result.current.notifications[0]).toEqual(testNotification);
    });

    it('should show browser notification when receiving notification', async () => {
        mockUseSocket.mockReturnValue({
            socket: mockSocket,
            isConnected: true,
        });

        renderHook(() => useNotifications(), { wrapper });

        // Get the notification handler
        const notificationHandler = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'notification'
        )[1];

        // Simulate receiving a notification
        const testNotification = {
            id: '1',
            title: 'Test Notification',
            message: 'This is a test',
            read: false,
        };

        act(() => {
            notificationHandler(testNotification);
        });

        // Wait for browser notification
        await waitFor(() => {
            expect(global.Notification).toHaveBeenCalledWith(
                'Test Notification',
                expect.objectContaining({
                    body: 'This is a test',
                    icon: '/favicon.ico',
                })
            );
        });
    });

    it('should handle notification:read event', async () => {
        mockUseSocket.mockReturnValue({
            socket: mockSocket,
            isConnected: true,
        });

        // Add a notification to the store first
        store.dispatch({
            type: 'notifications/addNotification',
            payload: {
                id: '1',
                title: 'Test',
                message: 'Test message',
                read: false,
            },
        });

        const { result } = renderHook(() => useNotifications(), { wrapper });

        // Get the notification:read handler
        const readHandler = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'notification:read'
        )[1];

        // Simulate marking notification as read
        act(() => {
            readHandler({ notificationId: '1' });
        });

        // Wait for state update
        await waitFor(() => {
            const notification = result.current.notifications.find((n) => n.id === '1');
            expect(notification && notification.read).toBe(true);
            expect(result.current.unreadCount).toBe(0);
        });
    });

    it('should clean up event listeners on unmount', () => {
        mockUseSocket.mockReturnValue({
            socket: mockSocket,
            isConnected: true,
        });

        const { unmount } = renderHook(() => useNotifications(), { wrapper });

        unmount();

        // Verify event listeners are removed
        expect(mockSocket.off).toHaveBeenCalledWith('notification', expect.any(Function));
        expect(mockSocket.off).toHaveBeenCalledWith('notification:read', expect.any(Function));
        expect(mockSocket.off).toHaveBeenCalledWith('notification:update', expect.any(Function));
    });

    it('should not set up listeners when socket is not connected', () => {
        mockUseSocket.mockReturnValue({
            socket: null,
            isConnected: false,
        });

        renderHook(() => useNotifications(), { wrapper });

        // Verify no event listeners are attached
        expect(mockSocket.on).not.toHaveBeenCalled();
    });

    it('should request notification permission', async () => {
        mockUseSocket.mockReturnValue({
            socket: mockSocket,
            isConnected: true,
        });

        global.Notification.permission = 'default';

        const { result } = renderHook(() => useNotifications(), { wrapper });

        await act(async () => {
            await result.current.requestNotificationPermission();
        });

        expect(global.Notification.requestPermission).toHaveBeenCalled();
    });

    it('should handle multiple notifications', async () => {
        mockUseSocket.mockReturnValue({
            socket: mockSocket,
            isConnected: true,
        });

        const { result } = renderHook(() => useNotifications(), { wrapper });

        // Get the notification handler
        const notificationHandler = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'notification'
        )[1];

        // Simulate receiving multiple notifications
        const notifications = [
            { id: '1', title: 'Notification 1', message: 'Message 1', read: false },
            { id: '2', title: 'Notification 2', message: 'Message 2', read: false },
            { id: '3', title: 'Notification 3', message: 'Message 3', read: false },
        ];

        act(() => {
            notifications.forEach((notification) => {
                notificationHandler(notification);
            });
        });

        // Wait for state update
        await waitFor(() => {
            expect(result.current.notifications).toHaveLength(3);
            expect(result.current.unreadCount).toBe(3);
        });
    });
});
