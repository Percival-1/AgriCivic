import { describe, it, expect, beforeEach, vi } from 'vitest';
import userReducer, {
    setProfile,
    updateProfile,
    setPreferences,
    setLanguage,
    setTheme,
    setNotificationPreferences,
    setDashboardPreferences,
    setDashboardWidgets,
    setDashboardLayout,
    toggleWelcomeMessage,
    setLoading,
    setUpdating,
    setError,
    clearError,
    clearUserData,
    resetUserState,
    setProfileComplete,
    selectUser,
    selectProfile,
    selectPreferences,
    selectLanguage,
    selectTheme,
    selectNotificationPreferences,
    selectDashboardPreferences,
    selectDashboardWidgets,
    selectDashboardLayout,
    selectShowWelcome,
    selectProfileComplete,
    selectProfileCompletionPercentage,
    selectUserLoading,
    selectUserUpdating,
    selectUserError,
    selectLastUpdated,
} from './userSlice';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();

global.localStorage = localStorageMock;

describe('userSlice', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('initial state', () => {
        it('should have correct initial state', () => {
            const state = userReducer(undefined, { type: '@@INIT' });

            expect(state.profile).toBe(null);
            expect(state.preferences).toEqual({
                language: 'en',
                theme: 'light',
                notifications: {
                    email: true,
                    sms: true,
                    push: true,
                    weather: true,
                    market: true,
                    schemes: true,
                },
            });
            expect(state.dashboardPreferences).toEqual({
                widgets: ['weather', 'market', 'schemes', 'notifications'],
                layout: 'grid',
                showWelcome: true,
            });
            expect(state.profileComplete).toBe(false);
            expect(state.profileCompletionPercentage).toBe(0);
            expect(state.loading).toBe(false);
            expect(state.updating).toBe(false);
            expect(state.error).toBe(null);
            expect(state.lastUpdated).toBe(null);
        });
    });

    describe('setProfile', () => {
        it('should set profile and calculate completion percentage', () => {
            const profile = {
                id: '123',
                name: 'Test User',
                location: 'Test Location',
                crops: ['wheat', 'rice'],
                land_size: 10,
                language: 'en',
            };

            const state = userReducer(undefined, setProfile(profile));

            expect(state.profile).toEqual(profile);
            expect(state.profileComplete).toBe(true);
            expect(state.profileCompletionPercentage).toBe(100);
            expect(state.error).toBe(null);
            expect(state.lastUpdated).toBeGreaterThan(0);
        });

        it('should calculate partial completion percentage', () => {
            const profile = {
                id: '123',
                name: 'Test User',
                location: 'Test Location',
                // Missing crops, land_size, language
            };

            const state = userReducer(undefined, setProfile(profile));

            expect(state.profileComplete).toBe(false);
            expect(state.profileCompletionPercentage).toBe(40); // 2 out of 5 fields
        });
    });

    describe('updateProfile', () => {
        it('should merge new data with existing profile', () => {
            const initialState = {
                profile: {
                    id: '123',
                    name: 'Old Name',
                    location: 'Old Location',
                },
                preferences: {
                    language: 'en',
                    theme: 'light',
                    notifications: {
                        email: true,
                        sms: true,
                        push: true,
                        weather: true,
                        market: true,
                        schemes: true,
                    },
                },
                dashboardPreferences: {
                    widgets: ['weather', 'market', 'schemes', 'notifications'],
                    layout: 'grid',
                    showWelcome: true,
                },
                profileComplete: false,
                profileCompletionPercentage: 0,
                loading: false,
                updating: false,
                error: null,
                lastUpdated: null,
            };

            const updates = {
                name: 'New Name',
                crops: ['wheat'],
            };

            const state = userReducer(initialState, updateProfile(updates));

            expect(state.profile).toEqual({
                id: '123',
                name: 'New Name',
                location: 'Old Location',
                crops: ['wheat'],
            });
            expect(state.error).toBe(null);
            expect(state.lastUpdated).toBeGreaterThan(0);
        });

        it('should create profile if none exists', () => {
            const profile = {
                name: 'Test User',
                location: 'Test Location',
            };

            const state = userReducer(undefined, updateProfile(profile));

            expect(state.profile).toEqual(profile);
        });
    });

    describe('setPreferences', () => {
        it('should update preferences and persist to localStorage', () => {
            const newPreferences = {
                language: 'hi',
                theme: 'dark',
            };

            const state = userReducer(undefined, setPreferences(newPreferences));

            expect(state.preferences.language).toBe('hi');
            expect(state.preferences.theme).toBe('dark');
            expect(state.error).toBe(null);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'user_preferences',
                expect.any(String)
            );
        });
    });

    describe('setLanguage', () => {
        it('should update language preference', () => {
            const state = userReducer(undefined, setLanguage('hi'));

            expect(state.preferences.language).toBe('hi');
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });

    describe('setTheme', () => {
        it('should update theme preference', () => {
            const state = userReducer(undefined, setTheme('dark'));

            expect(state.preferences.theme).toBe('dark');
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });

    describe('setNotificationPreferences', () => {
        it('should update notification preferences', () => {
            const updates = {
                email: false,
                weather: false,
            };

            const state = userReducer(undefined, setNotificationPreferences(updates));

            expect(state.preferences.notifications.email).toBe(false);
            expect(state.preferences.notifications.weather).toBe(false);
            expect(state.preferences.notifications.sms).toBe(true); // Unchanged
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });

    describe('setDashboardPreferences', () => {
        it('should update dashboard preferences', () => {
            const updates = {
                layout: 'list',
                showWelcome: false,
            };

            const state = userReducer(undefined, setDashboardPreferences(updates));

            expect(state.dashboardPreferences.layout).toBe('list');
            expect(state.dashboardPreferences.showWelcome).toBe(false);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'dashboard_preferences',
                expect.any(String)
            );
        });
    });

    describe('setDashboardWidgets', () => {
        it('should update dashboard widgets', () => {
            const widgets = ['weather', 'market'];

            const state = userReducer(undefined, setDashboardWidgets(widgets));

            expect(state.dashboardPreferences.widgets).toEqual(widgets);
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });

    describe('setDashboardLayout', () => {
        it('should update dashboard layout', () => {
            const state = userReducer(undefined, setDashboardLayout('list'));

            expect(state.dashboardPreferences.layout).toBe('list');
            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });

    describe('toggleWelcomeMessage', () => {
        it('should toggle welcome message visibility', () => {
            const state1 = userReducer(undefined, toggleWelcomeMessage());
            expect(state1.dashboardPreferences.showWelcome).toBe(false);

            const state2 = userReducer(state1, toggleWelcomeMessage());
            expect(state2.dashboardPreferences.showWelcome).toBe(true);
        });
    });

    describe('setLoading', () => {
        it('should set loading state', () => {
            const state = userReducer(undefined, setLoading(true));
            expect(state.loading).toBe(true);
        });
    });

    describe('setUpdating', () => {
        it('should set updating state', () => {
            const state = userReducer(undefined, setUpdating(true));
            expect(state.updating).toBe(true);
        });
    });

    describe('setError', () => {
        it('should set error and clear loading states', () => {
            const initialState = {
                profile: null,
                preferences: {
                    language: 'en',
                    theme: 'light',
                    notifications: {
                        email: true,
                        sms: true,
                        push: true,
                        weather: true,
                        market: true,
                        schemes: true,
                    },
                },
                dashboardPreferences: {
                    widgets: ['weather', 'market', 'schemes', 'notifications'],
                    layout: 'grid',
                    showWelcome: true,
                },
                profileComplete: false,
                profileCompletionPercentage: 0,
                loading: true,
                updating: true,
                error: null,
                lastUpdated: null,
            };

            const errorMessage = 'Failed to update profile';
            const state = userReducer(initialState, setError(errorMessage));

            expect(state.error).toBe(errorMessage);
            expect(state.loading).toBe(false);
            expect(state.updating).toBe(false);
        });
    });

    describe('clearError', () => {
        it('should clear error state', () => {
            const initialState = {
                profile: null,
                preferences: {
                    language: 'en',
                    theme: 'light',
                    notifications: {
                        email: true,
                        sms: true,
                        push: true,
                        weather: true,
                        market: true,
                        schemes: true,
                    },
                },
                dashboardPreferences: {
                    widgets: ['weather', 'market', 'schemes', 'notifications'],
                    layout: 'grid',
                    showWelcome: true,
                },
                profileComplete: false,
                profileCompletionPercentage: 0,
                loading: false,
                updating: false,
                error: 'Some error',
                lastUpdated: null,
            };

            const state = userReducer(initialState, clearError());
            expect(state.error).toBe(null);
        });
    });

    describe('clearUserData', () => {
        it('should clear user data but keep preferences', () => {
            const initialState = {
                profile: { id: '123', name: 'Test' },
                preferences: {
                    language: 'hi',
                    theme: 'dark',
                    notifications: {
                        email: false,
                        sms: true,
                        push: true,
                        weather: true,
                        market: true,
                        schemes: true,
                    },
                },
                dashboardPreferences: {
                    widgets: ['weather'],
                    layout: 'list',
                    showWelcome: false,
                },
                profileComplete: true,
                profileCompletionPercentage: 100,
                loading: false,
                updating: false,
                error: null,
                lastUpdated: Date.now(),
            };

            const state = userReducer(initialState, clearUserData());

            expect(state.profile).toBe(null);
            expect(state.profileComplete).toBe(false);
            expect(state.profileCompletionPercentage).toBe(0);
            expect(state.lastUpdated).toBe(null);
            // Preferences should be kept
            expect(state.preferences.language).toBe('hi');
            expect(state.dashboardPreferences.layout).toBe('list');
        });
    });

    describe('resetUserState', () => {
        it('should reset all state including preferences', () => {
            const initialState = {
                profile: { id: '123', name: 'Test' },
                preferences: {
                    language: 'hi',
                    theme: 'dark',
                    notifications: {
                        email: false,
                        sms: false,
                        push: false,
                        weather: false,
                        market: false,
                        schemes: false,
                    },
                },
                dashboardPreferences: {
                    widgets: ['weather'],
                    layout: 'list',
                    showWelcome: false,
                },
                profileComplete: true,
                profileCompletionPercentage: 100,
                loading: false,
                updating: false,
                error: null,
                lastUpdated: Date.now(),
            };

            const state = userReducer(initialState, resetUserState());

            expect(state.profile).toBe(null);
            expect(state.preferences.language).toBe('en');
            expect(state.preferences.theme).toBe('light');
            expect(state.dashboardPreferences.layout).toBe('grid');
            expect(state.profileComplete).toBe(false);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('user_preferences');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('dashboard_preferences');
        });
    });

    describe('setProfileComplete', () => {
        it('should set profile completion status', () => {
            const state = userReducer(undefined, setProfileComplete(true));
            expect(state.profileComplete).toBe(true);
        });
    });

    describe('selectors', () => {
        const mockState = {
            user: {
                profile: { id: '123', name: 'Test User' },
                preferences: {
                    language: 'hi',
                    theme: 'dark',
                    notifications: {
                        email: true,
                        sms: false,
                        push: true,
                        weather: true,
                        market: false,
                        schemes: true,
                    },
                },
                dashboardPreferences: {
                    widgets: ['weather', 'market'],
                    layout: 'list',
                    showWelcome: false,
                },
                profileComplete: true,
                profileCompletionPercentage: 100,
                loading: false,
                updating: false,
                error: null,
                lastUpdated: 1234567890,
            },
        };

        it('selectUser should return user state', () => {
            expect(selectUser(mockState)).toEqual(mockState.user);
        });

        it('selectProfile should return profile', () => {
            expect(selectProfile(mockState)).toEqual({ id: '123', name: 'Test User' });
        });

        it('selectPreferences should return preferences', () => {
            expect(selectPreferences(mockState)).toEqual(mockState.user.preferences);
        });

        it('selectLanguage should return language', () => {
            expect(selectLanguage(mockState)).toBe('hi');
        });

        it('selectTheme should return theme', () => {
            expect(selectTheme(mockState)).toBe('dark');
        });

        it('selectNotificationPreferences should return notification preferences', () => {
            expect(selectNotificationPreferences(mockState)).toEqual(
                mockState.user.preferences.notifications
            );
        });

        it('selectDashboardPreferences should return dashboard preferences', () => {
            expect(selectDashboardPreferences(mockState)).toEqual(
                mockState.user.dashboardPreferences
            );
        });

        it('selectDashboardWidgets should return widgets', () => {
            expect(selectDashboardWidgets(mockState)).toEqual(['weather', 'market']);
        });

        it('selectDashboardLayout should return layout', () => {
            expect(selectDashboardLayout(mockState)).toBe('list');
        });

        it('selectShowWelcome should return showWelcome', () => {
            expect(selectShowWelcome(mockState)).toBe(false);
        });

        it('selectProfileComplete should return profile completion status', () => {
            expect(selectProfileComplete(mockState)).toBe(true);
        });

        it('selectProfileCompletionPercentage should return completion percentage', () => {
            expect(selectProfileCompletionPercentage(mockState)).toBe(100);
        });

        it('selectUserLoading should return loading state', () => {
            expect(selectUserLoading(mockState)).toBe(false);
        });

        it('selectUserUpdating should return updating state', () => {
            expect(selectUserUpdating(mockState)).toBe(false);
        });

        it('selectUserError should return error', () => {
            expect(selectUserError(mockState)).toBe(null);
        });

        it('selectLastUpdated should return last updated timestamp', () => {
            expect(selectLastUpdated(mockState)).toBe(1234567890);
        });
    });
});
