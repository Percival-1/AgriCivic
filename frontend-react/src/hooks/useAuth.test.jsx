import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { useAuth } from './useAuth';
import authReducer from '../store/slices/authSlice';
import authService from '../api/services/authService';

// Mock authService
vi.mock('../api/services/authService', () => ({
    default: {
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        validatePhoneNumber: vi.fn(),
        checkPasswordStrength: vi.fn(),
        getToken: vi.fn(),
        isAuthenticated: vi.fn(),
    },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('useAuth Hook', () => {
    let store;

    // Helper to create a wrapper with Redux and Router
    const createWrapper = () => {
        store = configureStore({
            reducer: {
                auth: authReducer,
            },
        });

        return ({ children }) => (
            <Provider store={store}>
                <BrowserRouter>
                    {children}
                </BrowserRouter>
            </Provider>
        );
    };

    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Initial State', () => {
        it('should return initial authentication state', () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper(),
            });

            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.user).toBeNull();
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    describe('login', () => {
        it('should successfully login with valid credentials', async () => {
            const mockResponse = {
                access_token: 'test-token',
                user: {
                    id: 1,
                    phone_number: '+1234567890',
                    name: 'Test User',
                    profile_completed: true,
                },
                expires_in: 3600,
            };

            authService.validatePhoneNumber.mockReturnValue(true);
            authService.login.mockResolvedValue(mockResponse);

            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper(),
            });

            let loginResult;
            await act(async () => {
                loginResult = await result.current.login('+1234567890', 'password123');
            });

            expect(loginResult.success).toBe(true);
            expect(result.current.isAuthenticated).toBe(true);
            expect(result.current.user).toEqual(mockResponse.user);
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });

        it('should redirect to profile completion if profile is incomplete', async () => {
            const mockResponse = {
                access_token: 'test-token',
                user: {
                    id: 1,
                    phone_number: '+1234567890',
                    profile_completed: false,
                },
            };

            authService.validatePhoneNumber.mockReturnValue(true);
            authService.login.mockResolvedValue(mockResponse);

            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.login('+1234567890', 'password123');
            });

            expect(mockNavigate).toHaveBeenCalledWith('/profile-completion');
        });

        it('should handle invalid phone number format', async () => {
            authService.validatePhoneNumber.mockReturnValue(false);

            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper(),
            });

            let loginResult;
            await act(async () => {
                loginResult = await result.current.login('invalid-phone', 'password123');
            });

            expect(loginResult.success).toBe(false);
            expect(loginResult.error).toContain('Invalid phone number format');
            expect(result.current.isAuthenticated).toBe(false);
        });

        it('should handle login failure', async () => {
            authService.validatePhoneNumber.mockReturnValue(true);
            authService.login.mockRejectedValue(new Error('Invalid credentials'));

            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper(),
            });

            let loginResult;
            await act(async () => {
                loginResult = await result.current.login('+1234567890', 'wrong-password');
            });

            expect(loginResult.success).toBe(false);
            expect(result.current.error).toBeTruthy();
            expect(result.current.isAuthenticated).toBe(false);
        });
    });

    describe('register', () => {
        it('should successfully register a new user', async () => {
            const userData = {
                phone_number: '+1234567890',
                password: 'password123',
                name: 'New User',
            };

            const mockResponse = {
                access_token: 'test-token',
                user: {
                    id: 1,
                    ...userData,
                    profile_completed: false,
                },
            };

            authService.validatePhoneNumber.mockReturnValue(true);
            authService.register.mockResolvedValue(mockResponse);

            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper(),
            });

            let registerResult;
            await act(async () => {
                registerResult = await result.current.register(userData);
            });

            expect(registerResult.success).toBe(true);
            expect(result.current.isAuthenticated).toBe(true);
            expect(mockNavigate).toHaveBeenCalledWith('/profile-completion');
        });

        it('should handle invalid phone number during registration', async () => {
            authService.validatePhoneNumber.mockReturnValue(false);

            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper(),
            });

            let registerResult;
            await act(async () => {
                registerResult = await result.current.register({
                    phone_number: 'invalid',
                    password: 'password123',
                });
            });

            expect(registerResult.success).toBe(false);
            expect(registerResult.error).toContain('Invalid phone number format');
        });
    });

    describe('logout', () => {
        it('should successfully logout user', async () => {
            authService.logout.mockResolvedValue({});

            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.logout();
            });

            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.user).toBeNull();
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });

        it('should logout even if backend call fails', async () => {
            authService.logout.mockRejectedValue(new Error('Network error'));

            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.logout();
            });

            expect(result.current.isAuthenticated).toBe(false);
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    describe('Utility Functions', () => {
        it('should validate phone number', () => {
            authService.validatePhoneNumber.mockReturnValue(true);

            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper(),
            });

            const isValid = result.current.validatePhoneNumber('+1234567890');
            expect(isValid).toBe(true);
            expect(authService.validatePhoneNumber).toHaveBeenCalledWith('+1234567890');
        });

        it('should check password strength', () => {
            const mockStrength = {
                strength: 4,
                label: 'Strong',
                feedback: ['Password is strong'],
            };

            authService.checkPasswordStrength.mockReturnValue(mockStrength);

            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper(),
            });

            const strength = result.current.checkPasswordStrength('StrongP@ss123');
            expect(strength).toEqual(mockStrength);
        });

        it('should get token', () => {
            authService.getToken.mockReturnValue('test-token');

            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper(),
            });

            const token = result.current.getToken();
            expect(token).toBe('test-token');
        });

        it('should check authentication status', () => {
            authService.isAuthenticated.mockReturnValue(true);

            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper(),
            });

            const isAuth = result.current.checkAuth();
            expect(isAuth).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should clear error', async () => {
            authService.validatePhoneNumber.mockReturnValue(false);

            const { result } = renderHook(() => useAuth(), {
                wrapper: createWrapper(),
            });

            // Trigger an error
            await act(async () => {
                await result.current.login('invalid', 'password');
            });

            expect(result.current.error).toBeTruthy();

            // Clear error
            act(() => {
                result.current.clearError();
            });

            await waitFor(() => {
                expect(result.current.error).toBeNull();
            });
        });
    });
});
