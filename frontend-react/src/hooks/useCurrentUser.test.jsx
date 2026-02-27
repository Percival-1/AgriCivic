import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useCurrentUser } from './useCurrentUser';
import authReducer from '../store/slices/authSlice';
import userReducer from '../store/slices/userSlice';
import userService from '../api/services/userService';

// Mock the userService
vi.mock('../api/services/userService', () => ({
    default: {
        getProfile: vi.fn(),
        getCachedUser: vi.fn(),
        isProfileComplete: vi.fn(),
        getMissingProfileFields: vi.fn(),
    },
}));

describe('useCurrentUser', () => {
    let store;

    const createMockStore = (initialState = {}) => {
        return configureStore({
            reducer: {
                auth: authReducer,
                user: userReducer,
            },
            preloadedState: initialState,
        });
    };

    const wrapper = ({ children }) => (
        <Provider store={store}>{children}</Provider>
    );

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    it('should return initial state when not authenticated', () => {
        store = createMockStore({
            auth: {
                isAuthenticated: false,
                token: null,
                user: null,
            },
            user: {
                profile: null,
                loading: false,
                error: null,
                profileComplete: false,
                profileCompletionPercentage: 0,
            },
        });

        const { result } = renderHook(() => useCurrentUser({ autoFetch: false }), {
            wrapper,
        });

        expect(result.current.profile).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.hasProfile).toBe(false);
    });

    it('should fetch user data on mount when authenticated', async () => {
        const mockUserData = {
            id: '123',
            name: 'Test User',
            phone_number: '+1234567890',
            location: 'Test Location',
            crops: ['wheat', 'rice'],
            land_size: 10,
            language: 'en',
        };

        userService.getProfile.mockResolvedValue({ user: mockUserData });

        store = createMockStore({
            auth: {
                isAuthenticated: true,
                token: 'test-token',
                user: null,
            },
            user: {
                profile: null,
                loading: false,
                error: null,
                profileComplete: false,
                profileCompletionPercentage: 0,
            },
        });

        const { result } = renderHook(() => useCurrentUser({ autoFetch: true }), {
            wrapper,
        });

        // Should start loading
        await waitFor(() => {
            expect(userService.getProfile).toHaveBeenCalled();
        });

        // Wait for profile to be loaded
        await waitFor(() => {
            expect(result.current.profile).toEqual(mockUserData);
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.hasProfile).toBe(true);
    });

    it('should handle fetch errors', async () => {
        const mockError = new Error('Failed to fetch user');
        userService.getProfile.mockRejectedValue(mockError);

        store = createMockStore({
            auth: {
                isAuthenticated: true,
                token: 'test-token',
                user: null,
            },
            user: {
                profile: null,
                loading: false,
                error: null,
                profileComplete: false,
                profileCompletionPercentage: 0,
            },
        });

        const { result } = renderHook(() => useCurrentUser({ autoFetch: true }), {
            wrapper,
        });

        await waitFor(() => {
            expect(result.current.error).toBeTruthy();
        });

        expect(result.current.profile).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    it('should provide refreshUser function', async () => {
        const mockUserData = {
            id: '123',
            name: 'Test User',
            phone_number: '+1234567890',
        };

        userService.getProfile.mockResolvedValue({ user: mockUserData });

        store = createMockStore({
            auth: {
                isAuthenticated: true,
                token: 'test-token',
                user: null,
            },
            user: {
                profile: null,
                loading: false,
                error: null,
                profileComplete: false,
                profileCompletionPercentage: 0,
            },
        });

        const { result } = renderHook(() => useCurrentUser({ autoFetch: false }), {
            wrapper,
        });

        // Manually refresh
        await act(async () => {
            await result.current.refreshUser();
        });

        await waitFor(() => {
            expect(result.current.profile).toEqual(mockUserData);
        });

        expect(userService.getProfile).toHaveBeenCalled();
    });

    it('should not fetch when autoFetch is false', () => {
        store = createMockStore({
            auth: {
                isAuthenticated: true,
                token: 'test-token',
                user: null,
            },
            user: {
                profile: null,
                loading: false,
                error: null,
                profileComplete: false,
                profileCompletionPercentage: 0,
            },
        });

        renderHook(() => useCurrentUser({ autoFetch: false }), {
            wrapper,
        });

        expect(userService.getProfile).not.toHaveBeenCalled();
    });

    it('should call onSuccess callback on successful fetch', async () => {
        const mockUserData = {
            id: '123',
            name: 'Test User',
        };

        const onSuccess = vi.fn();
        userService.getProfile.mockResolvedValue({ user: mockUserData });

        store = createMockStore({
            auth: {
                isAuthenticated: true,
                token: 'test-token',
                user: null,
            },
            user: {
                profile: null,
                loading: false,
                error: null,
                profileComplete: false,
                profileCompletionPercentage: 0,
            },
        });

        renderHook(() => useCurrentUser({ autoFetch: true, onSuccess }), {
            wrapper,
        });

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledWith(mockUserData);
        });
    });

    it('should call onError callback on fetch failure', async () => {
        const mockError = new Error('Fetch failed');
        const onError = vi.fn();
        userService.getProfile.mockRejectedValue(mockError);

        store = createMockStore({
            auth: {
                isAuthenticated: true,
                token: 'test-token',
                user: null,
            },
            user: {
                profile: null,
                loading: false,
                error: null,
                profileComplete: false,
                profileCompletionPercentage: 0,
            },
        });

        renderHook(() => useCurrentUser({ autoFetch: true, onError }), {
            wrapper,
        });

        await waitFor(() => {
            expect(onError).toHaveBeenCalledWith(mockError);
        });
    });

    it('should provide getCachedUser function', () => {
        const mockCachedUser = { id: '123', name: 'Cached User' };
        userService.getCachedUser.mockReturnValue(mockCachedUser);

        store = createMockStore({
            auth: {
                isAuthenticated: true,
                token: 'test-token',
                user: null,
            },
            user: {
                profile: null,
                loading: false,
                error: null,
                profileComplete: false,
                profileCompletionPercentage: 0,
            },
        });

        const { result } = renderHook(() => useCurrentUser({ autoFetch: false }), {
            wrapper,
        });

        const cachedUser = result.current.getCachedUser();

        expect(cachedUser).toEqual(mockCachedUser);
        expect(userService.getCachedUser).toHaveBeenCalled();
    });

    it('should provide profile completion status', () => {
        const mockProfile = {
            id: '123',
            name: 'Test User',
        };

        store = createMockStore({
            auth: {
                isAuthenticated: true,
                token: 'test-token',
                user: null,
            },
            user: {
                profile: mockProfile,
                loading: false,
                error: null,
                profileComplete: true,
                profileCompletionPercentage: 100,
            },
        });

        const { result } = renderHook(() => useCurrentUser({ autoFetch: false }), {
            wrapper,
        });

        expect(result.current.profileComplete).toBe(true);
        expect(result.current.profileCompletionPercentage).toBe(100);
        expect(result.current.needsProfileCompletion).toBe(false);
    });

    it('should indicate when profile completion is needed', () => {
        store = createMockStore({
            auth: {
                isAuthenticated: true,
                token: 'test-token',
                user: null,
            },
            user: {
                profile: null,
                loading: false,
                error: null,
                profileComplete: false,
                profileCompletionPercentage: 0,
            },
        });

        const { result } = renderHook(() => useCurrentUser({ autoFetch: false }), {
            wrapper,
        });

        expect(result.current.needsProfileCompletion).toBe(true);
    });
});
