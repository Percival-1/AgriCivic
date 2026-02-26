import { vi } from 'vitest'

/**
 * Mock Axios instance
 */
export const mockAxios = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    interceptors: {
        request: {
            use: vi.fn(),
            eject: vi.fn(),
        },
        response: {
            use: vi.fn(),
            eject: vi.fn(),
        },
    },
}

/**
 * Mock Socket.IO client
 */
export const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    id: 'mock-socket-id',
}

/**
 * Mock React Router navigation
 */
export const mockNavigate = vi.fn()

/**
 * Mock location object
 */
export const mockLocation = {
    pathname: '/',
    search: '',
    hash: '',
    state: null,
}

/**
 * Mock file for upload testing
 */
export function createMockFile(name = 'test.jpg', size = 1024, type = 'image/jpeg') {
    const file = new File(['test content'], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
}

/**
 * Mock audio file
 */
export function createMockAudioFile(name = 'test.mp3', size = 2048) {
    return createMockFile(name, size, 'audio/mp3')
}

/**
 * Mock Blob
 */
export function createMockBlob(content = 'test', type = 'text/plain') {
    return new Blob([content], { type })
}

/**
 * Mock geolocation
 */
export const mockGeolocation = {
    getCurrentPosition: vi.fn((success) => {
        success({
            coords: {
                latitude: 28.6139,
                longitude: 77.2090,
                accuracy: 100,
            },
        })
    }),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
}

/**
 * Mock MediaRecorder
 */
export class MockMediaRecorder {
    constructor() {
        this.state = 'inactive'
        this.ondataavailable = null
        this.onstop = null
        this.onerror = null
    }

    start() {
        this.state = 'recording'
    }

    stop() {
        this.state = 'inactive'
        if (this.onstop) {
            this.onstop()
        }
    }

    pause() {
        this.state = 'paused'
    }

    resume() {
        this.state = 'recording'
    }
}

/**
 * Mock getUserMedia
 */
export const mockGetUserMedia = vi.fn().mockResolvedValue({
    getTracks: () => [
        {
            stop: vi.fn(),
            kind: 'audio',
        },
    ],
})

/**
 * Mock Chart.js
 */
export const mockChart = {
    register: vi.fn(),
    defaults: {
        font: {},
        color: '',
    },
}

/**
 * Mock Leaflet map
 */
export const mockLeafletMap = {
    setView: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
}

/**
 * Reset all mocks
 */
export function resetAllMocks() {
    vi.clearAllMocks()
    mockAxios.get.mockReset()
    mockAxios.post.mockReset()
    mockAxios.put.mockReset()
    mockAxios.patch.mockReset()
    mockAxios.delete.mockReset()
    mockSocket.on.mockReset()
    mockSocket.off.mockReset()
    mockSocket.emit.mockReset()
    mockNavigate.mockReset()
}
