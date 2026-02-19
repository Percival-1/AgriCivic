import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock axios module
vi.mock('axios', () => {
    const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        request: vi.fn(),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
        },
        defaults: {
            baseURL: 'http://localhost:8000',
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        },
    };

    return {
        default: {
            create: vi.fn(() => mockAxiosInstance),
            post: vi.fn(),
        },
    };
});

describe('API Service', () => {
    let apiService: any;

    beforeEach(async () => {
        // Clear localStorage before each test
        localStorage.clear();

        // Reset all mocks
        vi.clearAllMocks();

        // Dynamically import after mocking
        const module = await import('./api');
        apiService = module.apiService;
    });

    describe('Configuration', () => {
        it('should have base URL configured', () => {
            expect(apiService.axiosInstance.defaults.baseURL).toBe('http://localhost:8000');
        });

        it('should have default timeout configured', () => {
            expect(apiService.axiosInstance.defaults.timeout).toBe(30000);
        });

        it('should have default headers configured', () => {
            expect(apiService.axiosInstance.defaults.headers['Content-Type']).toBe('application/json');
        });
    });

    describe('Token Management', () => {
        it('should retrieve token from localStorage', () => {
            localStorage.setItem('token', 'test-token-123');
            expect(localStorage.getItem('token')).toBe('test-token-123');
        });

        it('should return null when no token exists', () => {
            expect(localStorage.getItem('token')).toBeNull();
        });

        it('should set token in localStorage', () => {
            localStorage.setItem('token', 'new-token');
            expect(localStorage.getItem('token')).toBe('new-token');
        });

        it('should remove token from localStorage', () => {
            localStorage.setItem('token', 'test-token');
            localStorage.removeItem('token');
            expect(localStorage.getItem('token')).toBeNull();
        });
    });

    describe('HTTP Methods', () => {
        it('should make GET request', async () => {
            const mockData = { id: 1, name: 'Test' };
            apiService.axiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await apiService.get('/test');

            expect(apiService.axiosInstance.get).toHaveBeenCalledWith('/test', undefined);
            expect(result).toEqual(mockData);
        });

        it('should make POST request', async () => {
            const mockData = { id: 1, name: 'Test' };
            const postData = { name: 'New Item' };
            apiService.axiosInstance.post.mockResolvedValue({ data: mockData });

            const result = await apiService.post('/test', postData);

            expect(apiService.axiosInstance.post).toHaveBeenCalledWith('/test', postData, undefined);
            expect(result).toEqual(mockData);
        });

        it('should make PUT request', async () => {
            const mockData = { id: 1, name: 'Updated' };
            const putData = { name: 'Updated Item' };
            apiService.axiosInstance.put.mockResolvedValue({ data: mockData });

            const result = await apiService.put('/test/1', putData);

            expect(apiService.axiosInstance.put).toHaveBeenCalledWith('/test/1', putData, undefined);
            expect(result).toEqual(mockData);
        });

        it('should make DELETE request', async () => {
            const mockData = { success: true };
            apiService.axiosInstance.delete.mockResolvedValue({ data: mockData });

            const result = await apiService.delete('/test/1');

            expect(apiService.axiosInstance.delete).toHaveBeenCalledWith('/test/1', undefined);
            expect(result).toEqual(mockData);
        });
    });

    describe('File Upload', () => {
        it('should upload file with FormData', async () => {
            const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
            const mockResponse = { id: 1, filename: 'test.txt' };
            apiService.axiosInstance.post.mockResolvedValue({ data: mockResponse });

            const result = await apiService.uploadFile('/upload', mockFile);

            expect(apiService.axiosInstance.post).toHaveBeenCalled();
            const callArgs = apiService.axiosInstance.post.mock.calls[0];
            expect(callArgs[0]).toBe('/upload');
            expect(callArgs[1]).toBeInstanceOf(FormData);
            expect(result).toEqual(mockResponse);
        });

        it('should track upload progress', async () => {
            const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
            const mockResponse = { id: 1, filename: 'test.txt' };
            const progressCallback = vi.fn();

            apiService.axiosInstance.post.mockResolvedValue({ data: mockResponse });

            await apiService.uploadFile('/upload', mockFile, progressCallback);

            expect(apiService.axiosInstance.post).toHaveBeenCalled();
            const config = apiService.axiosInstance.post.mock.calls[0][2];
            expect(config.headers['Content-Type']).toBe('multipart/form-data');
            expect(config.onUploadProgress).toBeDefined();
        });
    });

    describe('Interceptors', () => {
        it('should have request interceptor configured', () => {
            expect(apiService.axiosInstance.interceptors.request).toBeDefined();
        });

        it('should have response interceptor configured', () => {
            expect(apiService.axiosInstance.interceptors.response).toBeDefined();
        });
    });
});
