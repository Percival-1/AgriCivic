/**
 * Notification Slice Tests
 * 
 * Tests for notification Redux slice
 * Requirements: 11.5, 19.8
 */

import { describe, it, expect, beforeEach } from 'vitest';
import notificationReducer, {
    setNotifications,
    addNotification,
    updateNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    incrementUnreadCount,
    decrementUnreadCount,
    setUnreadCount,
    setLoading,
    setError,
    clearError,
    clearNotificationData,
    selectNotificationItems,
    selectUnreadCount,
    selectUnreadNotifications,
} from './notificationSlice';

describe('notificationSlice', () => {
    let initialState;

    beforeEach(() => {
        initialState = {
            items: [],
            unreadCount: 0,
            loading: false,
            error: null,
            lastUpdated: null,
        };
    });

    describe('reducers', () => {
        it('should return initial state', () => {
            expect(notificationReducer(undefined, { type: 'unknown' })).toEqual(initialState);
        });

        it('should handle setNotifications', () => {
            const notifications = [
                { id: 1, message: 'Test 1', read: false },
                { id: 2, message: 'Test 2', read: true },
            ];

            const state = notificationReducer(initialState, setNotifications(notifications));

            expect(state.items).toEqual(notifications);
            expect(state.unreadCount).toBe(1);
            expect(state.loading).toBe(false);
            expect(state.error).toBe(null);
            expect(state.lastUpdated).toBeTruthy();
        });

        it('should handle setNotifications with object payload', () => {
            const payload = {
                notifications: [
                    { id: 1, message: 'Test', read: false },
                ],
            };

            const state = notificationReducer(initialState, setNotifications(payload));

            expect(state.items).toEqual(payload.notifications);
            expect(state.unreadCount).toBe(1);
        });

        it('should handle addNotification', () => {
            const notification = { id: 1, message: 'New notification', read: false };
            const state = notificationReducer(initialState, addNotification(notification));

            expect(state.items).toHaveLength(1);
            expect(state.items[0]).toEqual(notification);
            expect(state.unreadCount).toBe(1);
            expect(state.lastUpdated).toBeTruthy();
        });

        it('should add notification to beginning of list', () => {
            const existingState = {
                ...initialState,
                items: [{ id: 1, message: 'Old', read: true }],
            };

            const newNotification = { id: 2, message: 'New', read: false };
            const state = notificationReducer(existingState, addNotification(newNotification));

            expect(state.items[0]).toEqual(newNotification);
            expect(state.items[1].id).toBe(1);
        });

        it('should not increment unread count for read notifications', () => {
            const notification = { id: 1, message: 'Read notification', read: true };
            const state = notificationReducer(initialState, addNotification(notification));

            expect(state.unreadCount).toBe(0);
        });

        it('should handle updateNotification', () => {
            const existingState = {
                ...initialState,
                items: [{ id: 1, message: 'Original', read: false }],
                unreadCount: 1,
            };

            const update = { id: 1, message: 'Updated', read: true };
            const state = notificationReducer(existingState, updateNotification(update));

            expect(state.items[0].message).toBe('Updated');
            expect(state.items[0].read).toBe(true);
            expect(state.unreadCount).toBe(0);
        });

        it('should handle markAsRead', () => {
            const existingState = {
                ...initialState,
                items: [{ id: 1, message: 'Test', read: false }],
                unreadCount: 1,
            };

            const state = notificationReducer(existingState, markAsRead(1));

            expect(state.items[0].read).toBe(true);
            expect(state.unreadCount).toBe(0);
        });

        it('should not change unread count if already read', () => {
            const existingState = {
                ...initialState,
                items: [{ id: 1, message: 'Test', read: true }],
                unreadCount: 0,
            };

            const state = notificationReducer(existingState, markAsRead(1));

            expect(state.unreadCount).toBe(0);
        });

        it('should handle markAllAsRead', () => {
            const existingState = {
                ...initialState,
                items: [
                    { id: 1, message: 'Test 1', read: false },
                    { id: 2, message: 'Test 2', read: false },
                ],
                unreadCount: 2,
            };

            const state = notificationReducer(existingState, markAllAsRead());

            expect(state.items.every((n) => n.read)).toBe(true);
            expect(state.unreadCount).toBe(0);
        });

        it('should handle removeNotification', () => {
            const existingState = {
                ...initialState,
                items: [
                    { id: 1, message: 'Test 1', read: false },
                    { id: 2, message: 'Test 2', read: true },
                ],
                unreadCount: 1,
            };

            const state = notificationReducer(existingState, removeNotification(1));

            expect(state.items).toHaveLength(1);
            expect(state.items[0].id).toBe(2);
            expect(state.unreadCount).toBe(0);
        });

        it('should handle clearAllNotifications', () => {
            const existingState = {
                ...initialState,
                items: [{ id: 1, message: 'Test', read: false }],
                unreadCount: 1,
            };

            const state = notificationReducer(existingState, clearAllNotifications());

            expect(state.items).toEqual([]);
            expect(state.unreadCount).toBe(0);
        });

        it('should handle incrementUnreadCount', () => {
            const state = notificationReducer(initialState, incrementUnreadCount());
            expect(state.unreadCount).toBe(1);

            const state2 = notificationReducer(state, incrementUnreadCount());
            expect(state2.unreadCount).toBe(2);
        });

        it('should handle decrementUnreadCount', () => {
            const existingState = { ...initialState, unreadCount: 2 };
            const state = notificationReducer(existingState, decrementUnreadCount());
            expect(state.unreadCount).toBe(1);
        });

        it('should not allow negative unread count', () => {
            const state = notificationReducer(initialState, decrementUnreadCount());
            expect(state.unreadCount).toBe(0);
        });

        it('should handle setUnreadCount', () => {
            const state = notificationReducer(initialState, setUnreadCount(5));
            expect(state.unreadCount).toBe(5);
        });

        it('should not allow negative unread count with setUnreadCount', () => {
            const state = notificationReducer(initialState, setUnreadCount(-5));
            expect(state.unreadCount).toBe(0);
        });

        it('should handle setLoading', () => {
            const state = notificationReducer(initialState, setLoading(true));
            expect(state.loading).toBe(true);
        });

        it('should handle setError', () => {
            const error = 'Failed to load notifications';
            const state = notificationReducer(initialState, setError(error));
            expect(state.error).toBe(error);
            expect(state.loading).toBe(false);
        });

        it('should handle clearError', () => {
            const existingState = { ...initialState, error: 'Some error' };
            const state = notificationReducer(existingState, clearError());
            expect(state.error).toBe(null);
        });

        it('should handle clearNotificationData', () => {
            const existingState = {
                items: [{ id: 1, message: 'Test', read: false }],
                unreadCount: 1,
                loading: true,
                error: 'Error',
                lastUpdated: Date.now(),
            };

            const state = notificationReducer(existingState, clearNotificationData());

            expect(state).toEqual(initialState);
        });
    });

    describe('selectors', () => {
        it('should select notification items', () => {
            const state = {
                notifications: {
                    items: [{ id: 1, message: 'Test', read: false }],
                },
            };

            const items = selectNotificationItems(state);
            expect(items).toEqual(state.notifications.items);
        });

        it('should select unread count', () => {
            const state = {
                notifications: {
                    unreadCount: 5,
                },
            };

            const count = selectUnreadCount(state);
            expect(count).toBe(5);
        });

        it('should select unread notifications', () => {
            const state = {
                notifications: {
                    items: [
                        { id: 1, message: 'Unread', read: false },
                        { id: 2, message: 'Read', read: true },
                        { id: 3, message: 'Unread 2', read: false },
                    ],
                },
            };

            const unread = selectUnreadNotifications(state);
            expect(unread).toHaveLength(2);
            expect(unread.every((n) => !n.read)).toBe(true);
        });
    });
});
