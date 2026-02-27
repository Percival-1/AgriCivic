import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../store/slices/authSlice'
import userReducer from '../store/slices/userSlice'
import notificationReducer from '../store/slices/notificationSlice'
import chatReducer from '../store/slices/chatSlice'

/**
 * Create a test store with optional preloaded state
 */
export function createTestStore(preloadedState = {}) {
    return configureStore({
        reducer: {
            auth: authReducer,
            user: userReducer,
            notifications: notificationReducer,
            chat: chatReducer,
        },
        preloadedState,
    })
}

/**
 * Render component with Redux Provider and Router
 */
export function renderWithProviders(
    ui,
    {
        preloadedState = {},
        store = createTestStore(preloadedState),
        ...renderOptions
    } = {}
) {
    function Wrapper({ children }) {
        return (
            <Provider store={store}>
                <BrowserRouter>
                    {children}
                </BrowserRouter>
            </Provider>
        )
    }

    return {
        store,
        ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    }
}

/**
 * Render component with only Redux Provider (no router)
 */
export function renderWithRedux(
    ui,
    {
        preloadedState = {},
        store = createTestStore(preloadedState),
        ...renderOptions
    } = {}
) {
    function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>
    }

    return {
        store,
        ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    }
}

/**
 * Render component with only Router (no Redux)
 */
export function renderWithRouter(ui, { route = '/', ...renderOptions } = {}) {
    window.history.pushState({}, 'Test page', route)

    return render(ui, {
        wrapper: BrowserRouter,
        ...renderOptions,
    })
}

/**
 * Create mock user data
 */
export function createMockUser(overrides = {}) {
    return {
        id: 1,
        phone_number: '+1234567890',
        name: 'Test User',
        location: 'Test Location',
        crops: ['wheat', 'rice'],
        land_size: 10.5,
        preferred_language: 'en',
        is_active: true,
        is_admin: false,
        profile_completed: true,
        created_at: '2024-01-01T00:00:00Z',
        ...overrides,
    }
}

/**
 * Create mock auth state
 */
export function createMockAuthState(overrides = {}) {
    return {
        isAuthenticated: true,
        token: 'mock-jwt-token',
        user: createMockUser(),
        loading: false,
        error: null,
        ...overrides,
    }
}

/**
 * Create mock notification
 */
export function createMockNotification(overrides = {}) {
    return {
        id: 1,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'info',
        read: false,
        created_at: '2024-01-01T00:00:00Z',
        ...overrides,
    }
}

/**
 * Create mock chat message
 */
export function createMockChatMessage(overrides = {}) {
    return {
        id: 1,
        content: 'Test message',
        role: 'user',
        timestamp: '2024-01-01T00:00:00Z',
        ...overrides,
    }
}

/**
 * Wait for async operations
 */
export function waitFor(callback, options = {}) {
    return new Promise((resolve) => {
        const timeout = options.timeout || 1000
        const interval = options.interval || 50
        const startTime = Date.now()

        const check = () => {
            try {
                const result = callback()
                if (result) {
                    resolve(result)
                } else if (Date.now() - startTime > timeout) {
                    throw new Error('Timeout waiting for condition')
                } else {
                    setTimeout(check, interval)
                }
            } catch (error) {
                if (Date.now() - startTime > timeout) {
                    throw error
                } else {
                    setTimeout(check, interval)
                }
            }
        }

        check()
    })
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
