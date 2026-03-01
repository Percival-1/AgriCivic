import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService, type LoginCredentials, type RegisterData, type AuthResponse } from './auth.service';
import { apiService } from './api';
import type { User } from '@/types/user.types';

// Mock the API service
vi.mock('./api', () => ({
    apiService: {
        post: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
    },
}));

describe('AuthService', () => {
    const mockUser: User = {
        id: '123',
        phone_number: '+1234567890',
        name: 'Test User',
        role: 'user',
        preferred_language: 'en',
        is_active: true,
    };

    const mockAuthResponse: AuthResponse = {
        access_token: 'mock.jwt.token',
        token_type: 'Bearer',
        user: mockUser,
    };

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('login', () => {
        it('should login successfully and store token', async () => {
            const credentials: LoginCredentials = {
                phone_number: '+1234567890',
                password: 'password123',
            };

            vi.mocked(apiService.post).mockResolvedValue(mockAuthResponse);

            const result = await authService.login(credentials);

            expect(apiService.post).toHaveBeenCalledWith('/auth/login', credentials);
            expect(result).toEqual(mockAuthResponse);
            expect(authService.getToken()).toBe(mockAuthResponse.access_token);
        });

        it('should throw error on login failure', async () => {
            const credentials: LoginCredentials = {
                phone_number: '+1234567890',
                password: 'wrongpassword',
            };

            const error = new Error('Invalid credentials');
            vi.mocked(apiService.post).mockRejectedValue(error);

            await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
            expect(authService.getToken()).toBeNull();
        });
    });

    describe('register', () => {
        it('should register successfully and store token', async () => {
            const registerData: RegisterData = {
                phone_number: '+1234567890',
                password: 'password123',
                name: 'Test User',
                preferred_language: 'en',
            };

            vi.mocked(apiService.post).mockResolvedValue(mockUser);

            const result = await authService.register(registerData);

            expect(apiService.post).toHaveBeenCalledWith('/auth/register', registerData);
            expect(result).toEqual(mockUser);
        });

        it('should throw error on registration failure', async () => {
            const registerData: RegisterData = {
                phone_number: '+1234567890',
                password: 'password123',
                name: 'Test User',
            };

            const error = new Error('Phone number already exists');
            vi.mocked(apiService.post).mockRejectedValue(error);

            await expect(authService.register(registerData)).rejects.toThrow('Phone number already exists');
        });
    });

    describe('getCurrentUser', () => {
        it('should fetch current user', async () => {
            vi.mocked(apiService.get).mockResolvedValue(mockUser);

            const result = await authService.getCurrentUser();

            expect(apiService.get).toHaveBeenCalledWith('/auth/me');
            expect(result).toEqual(mockUser);
        });

        it('should throw error if user fetch fails', async () => {
            const error = new Error('Unauthorized');
            vi.mocked(apiService.get).mockRejectedValue(error);

            await expect(authService.getCurrentUser()).rejects.toThrow('Unauthorized');
        });
    });

    describe('updateProfile', () => {
        it('should update user profile', async () => {
            const updateData: Partial<User> = {
                name: 'Updated Name',
                preferred_language: 'hi',
            };

            const updatedUser = { ...mockUser, ...updateData };
            vi.mocked(apiService.put).mockResolvedValue(updatedUser);

            const result = await authService.updateProfile(updateData);

            expect(apiService.put).toHaveBeenCalledWith('/auth/profile', updateData);
            expect(result).toEqual(updatedUser);
        });
    });

    describe('logout', () => {
        it('should logout and remove token', async () => {
            authService.setToken('test-token');
            vi.mocked(apiService.post).mockResolvedValue({});

            await authService.logout();

            expect(apiService.post).toHaveBeenCalledWith('/auth/logout');
            expect(authService.getToken()).toBeNull();
        });

        it('should remove token even if API call fails', async () => {
            authService.setToken('test-token');
            vi.mocked(apiService.post).mockRejectedValue(new Error('Network error'));

            await authService.logout();

            expect(authService.getToken()).toBeNull();
        });
    });

    describe('token management', () => {
        it('should get token from localStorage', () => {
            const token = 'test-token';
            authService.setToken(token);

            expect(authService.getToken()).toBe(token);
        });

        it('should set token in localStorage', () => {
            const token = 'test-token';
            authService.setToken(token);

            expect(localStorage.getItem('token')).toBe(token);
        });

        it('should remove token from localStorage', () => {
            authService.setToken('test-token');
            authService.removeToken();

            expect(authService.getToken()).toBeNull();
            expect(localStorage.getItem('token')).toBeNull();
        });

        it('should return null when no token exists', () => {
            expect(authService.getToken()).toBeNull();
        });
    });

    describe('token expiration', () => {
        it('should detect expired token', () => {
            // Create a token that expired 1 hour ago
            const expiredTime = Math.floor(Date.now() / 1000) - 3600;
            const expiredToken = createMockToken(expiredTime);

            authService.setToken(expiredToken);

            expect(authService.isTokenExpired()).toBe(true);
        });

        it('should detect valid token', () => {
            // Create a token that expires in 1 hour
            const futureTime = Math.floor(Date.now() / 1000) + 3600;
            const validToken = createMockToken(futureTime);

            authService.setToken(validToken);

            expect(authService.isTokenExpired()).toBe(false);
        });

        it('should detect token about to expire (within buffer)', () => {
            // Create a token that expires in 30 seconds (within 60 second buffer)
            const soonExpireTime = Math.floor(Date.now() / 1000) + 30;
            const soonExpireToken = createMockToken(soonExpireTime);

            authService.setToken(soonExpireToken);

            expect(authService.isTokenExpired()).toBe(true);
        });

        it('should return true for missing token', () => {
            expect(authService.isTokenExpired()).toBe(true);
        });

        it('should return true for invalid token format', () => {
            authService.setToken('invalid-token');

            expect(authService.isTokenExpired()).toBe(true);
        });
    });

    describe('refreshToken', () => {
        it('should refresh token successfully', async () => {
            const newToken = 'new.jwt.token';
            vi.mocked(apiService.post).mockResolvedValue({ access_token: newToken });

            const result = await authService.refreshToken();

            expect(apiService.post).toHaveBeenCalledWith('/auth/refresh');
            expect(result).toBe(newToken);
            expect(authService.getToken()).toBe(newToken);
        });

        it('should remove token on refresh failure', async () => {
            authService.setToken('old-token');
            vi.mocked(apiService.post).mockRejectedValue(new Error('Refresh failed'));

            await expect(authService.refreshToken()).rejects.toThrow('Refresh failed');
            expect(authService.getToken()).toBeNull();
        });
    });

    describe('token utilities', () => {
        it('should get token expiration time', () => {
            const expTime = Math.floor(Date.now() / 1000) + 3600;
            const token = createMockToken(expTime);

            authService.setToken(token);

            expect(authService.getTokenExpiration()).toBe(expTime);
        });

        it('should return null for missing token', () => {
            expect(authService.getTokenExpiration()).toBeNull();
        });

        it('should calculate time remaining until expiration', () => {
            const expTime = Math.floor(Date.now() / 1000) + 3600;
            const token = createMockToken(expTime);

            authService.setToken(token);

            const remaining = authService.getTokenTimeRemaining();
            expect(remaining).toBeGreaterThan(3500);
            expect(remaining).toBeLessThanOrEqual(3600);
        });

        it('should return 0 for expired token', () => {
            const expTime = Math.floor(Date.now() / 1000) - 3600;
            const token = createMockToken(expTime);

            authService.setToken(token);

            expect(authService.getTokenTimeRemaining()).toBe(0);
        });
    });

    describe('isAuthenticated', () => {
        it('should return true for valid token', () => {
            const expTime = Math.floor(Date.now() / 1000) + 3600;
            const token = createMockToken(expTime);

            authService.setToken(token);

            expect(authService.isAuthenticated()).toBe(true);
        });

        it('should return false for expired token', () => {
            const expTime = Math.floor(Date.now() / 1000) - 3600;
            const token = createMockToken(expTime);

            authService.setToken(token);

            expect(authService.isAuthenticated()).toBe(false);
        });

        it('should return false for missing token', () => {
            expect(authService.isAuthenticated()).toBe(false);
        });
    });
});

/**
 * Helper function to create a mock JWT token
 * @param exp - Expiration timestamp in seconds
 * @returns Mock JWT token string
 */
function createMockToken(exp: number): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        sub: '123',
        role: 'user',
        exp: exp,
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}
