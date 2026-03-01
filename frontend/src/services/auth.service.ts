import { apiService } from './api';
import type { User } from '@/types/user.types';

/**
 * Login Credentials Interface
 */
export interface LoginCredentials {
    phone_number: string;
    password: string;
}

/**
 * Registration Data Interface
 * Matches backend UserRegister schema
 */
export interface RegisterData {
    phone_number: string;
    password: string;
    name?: string;
    preferred_language?: string;
}

/**
 * Authentication Response Interface
 */
export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

/**
 * Token Payload Interface (decoded JWT)
 */
interface TokenPayload {
    exp: number;
    sub: string;
    role: string;
}

/**
 * Authentication Service
 * Handles all authentication operations including login, registration, token management
 */
class AuthService {
    private readonly TOKEN_KEY = 'token';
    private readonly TOKEN_EXPIRY_BUFFER = 60; // 60 seconds buffer before expiry

    /**
     * Login user with credentials
     * @param credentials - User login credentials
     * @returns Authentication response with token and user data
     */
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        try {
            const response = await apiService.post<AuthResponse>('/auth/login', credentials);

            // Store token
            this.setToken(response.access_token);

            return response;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Register new user
     * Note: Backend returns user data without token, so user must login after registration
     * @param data - User registration data
     * @returns User data
     */
    async register(data: RegisterData): Promise<User> {
        try {
            const response = await apiService.post<User>('/auth/register', data);
            return response;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get current authenticated user
     * @returns Current user data
     */
    async getCurrentUser(): Promise<User> {
        try {
            const response = await apiService.get<User>('/auth/me');
            return response;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update user profile
     * @param data - Partial user data to update
     * @returns Updated user data
     */
    async updateProfile(data: Partial<User>): Promise<User> {
        try {
            const response = await apiService.put<User>('/auth/profile', data);
            return response;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Logout user
     * Clears token and notifies backend
     */
    async logout(): Promise<void> {
        try {
            // Notify backend about logout (optional, depends on backend implementation)
            await apiService.post('/auth/logout');
        } catch (error) {
            // Continue with logout even if backend call fails
            console.error('Logout API call failed:', error);
        } finally {
            // Always clear token locally
            this.removeToken();
        }
    }

    /**
     * Get JWT token from localStorage
     * @returns Token string or null if not found
     */
    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    /**
     * Set JWT token in localStorage
     * @param token - JWT token string
     */
    setToken(token: string): void {
        localStorage.setItem(this.TOKEN_KEY, token);
    }

    /**
     * Remove JWT token from localStorage
     */
    removeToken(): void {
        localStorage.removeItem(this.TOKEN_KEY);
    }

    /**
     * Check if JWT token is expired
     * @returns True if token is expired or about to expire, false otherwise
     */
    isTokenExpired(): boolean {
        const token = this.getToken();

        if (!token) {
            return true;
        }

        try {
            const payload = this.decodeToken(token);

            if (!payload || !payload.exp) {
                return true;
            }

            // Get current time in seconds
            const currentTime = Math.floor(Date.now() / 1000);

            // Check if token is expired or about to expire (within buffer time)
            return payload.exp <= (currentTime + this.TOKEN_EXPIRY_BUFFER);
        } catch (error) {
            // If token cannot be decoded, consider it expired
            console.error('Error decoding token:', error);
            return true;
        }
    }

    /**
     * Refresh JWT token
     * @returns New JWT token
     */
    async refreshToken(): Promise<string> {
        try {
            const response = await apiService.post<{ access_token: string }>('/auth/refresh');

            // Store new token
            this.setToken(response.access_token);

            return response.access_token;
        } catch (error) {
            // If refresh fails, remove token
            this.removeToken();
            throw error;
        }
    }

    /**
     * Decode JWT token to extract payload
     * @param token - JWT token string
     * @returns Decoded token payload
     */
    private decodeToken(token: string): TokenPayload | null {
        try {
            // JWT structure: header.payload.signature
            const parts = token.split('.');

            if (parts.length !== 3) {
                throw new Error('Invalid token structure');
            }

            // Decode base64 payload (second part)
            const payload = parts[1];
            if (!payload) {
                throw new Error('Missing token payload');
            }
            const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));

            return JSON.parse(decodedPayload) as TokenPayload;
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }

    /**
     * Get token expiration time
     * @returns Expiration timestamp in seconds, or null if token is invalid
     */
    getTokenExpiration(): number | null {
        const token = this.getToken();

        if (!token) {
            return null;
        }

        const payload = this.decodeToken(token);
        return payload?.exp || null;
    }

    /**
     * Get time remaining until token expires
     * @returns Seconds until expiration, or 0 if expired/invalid
     */
    getTokenTimeRemaining(): number {
        const expiration = this.getTokenExpiration();

        if (!expiration) {
            return 0;
        }

        const currentTime = Math.floor(Date.now() / 1000);
        const remaining = expiration - currentTime;

        return Math.max(0, remaining);
    }

    /**
     * Check if user is authenticated
     * @returns True if user has valid token, false otherwise
     */
    isAuthenticated(): boolean {
        const token = this.getToken();
        return token !== null && !this.isTokenExpired();
    }
}

// Create and export singleton instance
export const authService = new AuthService();
export default authService;
