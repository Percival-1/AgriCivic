import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import App from './App'

// Mock all route components to prevent full rendering
vi.mock('./routes', () => ({
    publicRoutes: [],
    protectedRoutes: [],
    adminRoutes: [],
}))

// Mock security utils
vi.mock('./utils/security', () => ({
    initializeSecurity: vi.fn(),
}))

// Mock components
vi.mock('./components/common/Loader', () => ({
    default: () => <div>Loading...</div>,
}))

vi.mock('./components/common/ErrorBoundary', () => ({
    default: ({ children }) => <div>{children}</div>,
}))

vi.mock('./components/layout', () => ({
    MainLayout: () => <div>MainLayout</div>,
}))

vi.mock('./routes/ProtectedRoute', () => ({
    default: ({ children }) => <div>{children}</div>,
}))

vi.mock('./routes/AdminRoute', () => ({
    default: ({ children }) => <div>{children}</div>,
}))

describe('App', () => {
    it('renders without crashing', () => {
        const { container } = render(<App />)
        expect(container).toBeInTheDocument()
    })

    it('has error boundary wrapper', () => {
        const { container } = render(<App />)
        expect(container.querySelector('.min-h-screen')).toBeInTheDocument()
    })
})
