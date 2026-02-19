import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';

/**
 * API Configuration Interface
 */
interface ApiConfig {
    baseURL: string;
    timeout: number;
    headers: Record<string, string>;
}

/**
 * API Error Interface
 */
export interface ApiError {
    code: string;
    message: string;
    details?: unknown;
}

/**
 * Retry Configuration
 */
interface RetryConfig {
    maxRetries: number;
    retryDelay: number;
    retryableStatuses: number[];
}

/**
 * API Service Class
 * Provides centralized HTTP client with authentication, error handling, and retry logic
 */
class ApiService {
    public axiosInstance: AxiosInstance;
    private retryConfig: RetryConfig;

    constructor(config: ApiConfig) {
        // Create Axios instance with base configuration
        this.axiosInstance = axios.create({
            baseURL: config.baseURL,
            timeout: config.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...config.headers,
            },
        });

        // Retry configuration for transient failures
        this.retryConfig = {
            maxRetries: 3,
            retryDelay: 1000, // 1 second base delay
            retryableStatuses: [408, 429, 500, 502, 503, 504], // Timeout, rate limit, server errors
        };

        // Setup interceptors
        this.setupRequestInterceptor();
        this.setupResponseInterceptor();
    }

    /**
     * Request Interceptor
     * Adds JWT token to all requests
     */
    private setupRequestInterceptor(): void {
        this.axiosInstance.interceptors.request.use(
            (config) => {
                // Get token from localStorage
                const token = this.getToken();

                // Add Authorization header if token exists
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }

                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );
    }

    /**
     * Response Interceptor
     * Handles errors, token refresh, and retry logic
     */
    private setupResponseInterceptor(): void {
        this.axiosInstance.interceptors.response.use(
            (response: AxiosResponse) => {
                // Success response - return as is
                return response;
            },
            async (error: AxiosError) => {
                const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

                // Handle 401 Unauthorized - Token expired or invalid
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        // Attempt to refresh token
                        const newToken = await this.refreshToken();

                        // Update token in storage
                        this.setToken(newToken);

                        // Retry original request with new token
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        }

                        return this.axiosInstance.request(originalRequest);
                    } catch (refreshError) {
                        // Token refresh failed - clear auth and redirect to login
                        this.removeToken();

                        // Dispatch event for auth store to handle logout
                        window.dispatchEvent(new CustomEvent('auth:logout'));

                        return Promise.reject(refreshError);
                    }
                }

                // Retry logic for transient failures
                if (this.shouldRetry(error, originalRequest)) {
                    originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

                    // Exponential backoff delay
                    const delay = this.retryConfig.retryDelay * Math.pow(2, originalRequest._retryCount - 1);

                    await this.sleep(delay);

                    return this.axiosInstance.request(originalRequest);
                }

                // Transform error to ApiError format
                return Promise.reject(this.handleError(error));
            }
        );
    }

    /**
     * Determine if request should be retried
     */
    private shouldRetry(error: AxiosError, config: AxiosRequestConfig & { _retryCount?: number }): boolean {
        const retryCount = config._retryCount || 0;

        // Don't retry if max retries reached
        if (retryCount >= this.retryConfig.maxRetries) {
            return false;
        }

        // Don't retry if no response (network error) - these are typically not transient
        if (!error.response) {
            return false;
        }

        // Retry only for specific status codes
        return this.retryConfig.retryableStatuses.includes(error.response.status);
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Handle and transform errors
     */
    private handleError(error: AxiosError): ApiError {
        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;

            return {
                code: `HTTP_${status}`,
                message: (data as any)?.message || error.message || 'An error occurred',
                details: data,
            };
        } else if (error.request) {
            // Request made but no response received
            return {
                code: 'NETWORK_ERROR',
                message: 'Network error. Please check your connection.',
                details: error.request,
            };
        } else {
            // Error in request setup
            return {
                code: 'REQUEST_ERROR',
                message: error.message || 'An error occurred while making the request',
                details: error,
            };
        }
    }

    /**
     * Refresh JWT token
     */
    private async refreshToken(): Promise<string> {
        try {
            const response = await axios.post(
                `${this.axiosInstance.defaults.baseURL}/auth/refresh`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${this.getToken()}`,
                    },
                }
            );

            return response.data.access_token;
        } catch (error) {
            throw new Error('Token refresh failed');
        }
    }

    /**
     * Get token from localStorage
     */
    private getToken(): string | null {
        return localStorage.getItem('token');
    }

    /**
     * Set token in localStorage
     */
    private setToken(token: string): void {
        localStorage.setItem('token', token);
    }

    /**
     * Remove token from localStorage
     */
    private removeToken(): void {
        localStorage.removeItem('token');
    }

    /**
     * Generic GET request
     */
    public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.axiosInstance.get<T>(url, config);
        return response.data;
    }

    /**
     * Generic POST request
     */
    public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.axiosInstance.post<T>(url, data, config);
        return response.data;
    }

    /**
     * Generic PUT request
     */
    public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.axiosInstance.put<T>(url, data, config);
        return response.data;
    }

    /**
     * Generic DELETE request
     */
    public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.axiosInstance.delete<T>(url, config);
        return response.data;
    }

    /**
     * File upload with progress tracking
     */
    public async uploadFile<T>(
        url: string,
        file: File,
        onProgress?: (progress: number) => void
    ): Promise<T> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await this.axiosInstance.post<T>(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percentCompleted);
                }
            },
        });

        return response.data;
    }
}

// Create and export singleton instance
const apiConfig: ApiConfig = {
    baseURL: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/api/v1',
    timeout: 30000, // 30 seconds
    headers: {},
};

export const apiService = new ApiService(apiConfig);
export default apiService;
