import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import {
    renderWithProviders,
    renderWithRedux,
    renderWithRouter,
    createMockUser,
    createMockAuthState,
} from './test-utils'
import { mockAxios, resetAllMocks } from './mocks'

/**
 * Example test suite demonstrating testing utilities
 * This file serves as a reference for writing tests
 */

// Simple component for testing
function SimpleComponent({ name }) {
    return <div>Hello, {name}!</div>
}

// Component with Redux
function ReduxComponent() {
    return <div>Redux Component</div>
}

// Component with Router
function RouterComponent() {
    return <div>Router Component</div>
}

describe('Testing Utilities Examples', () => {
    beforeEach(() => {
        resetAllMocks()
    })

    describe('renderWithProviders', () => {
        it('renders component with Redux and Router', () => {
            renderWithProviders(<SimpleComponent name="World" />)
            expect(screen.getByText('Hello, World!')).toBeInTheDocument()
        })

        it('renders with preloaded Redux state', () => {
            const preloadedState = {
                auth: createMockAuthState({
                    user: createMockUser({ name: 'Test User' }),
                }),
            }

            const { store } = renderWithProviders(<ReduxComponent />, {
                preloadedState,
            })

            expect(store.getState().auth.user.name).toBe('Test User')
        })
    })

    describe('renderWithRedux', () => {
        it('renders component with Redux only', () => {
            renderWithRedux(<ReduxComponent />)
            expect(screen.getByText('Redux Component')).toBeInTheDocument()
        })
    })

    describe('renderWithRouter', () => {
        it('renders component with Router only', () => {
            renderWithRouter(<RouterComponent />)
            expect(screen.getByText('Router Component')).toBeInTheDocument()
        })
    })

    describe('Mock Utilities', () => {
        it('creates mock user', () => {
            const user = createMockUser({ name: 'John Doe' })
            expect(user.name).toBe('John Doe')
            expect(user.phone_number).toBe('+1234567890')
        })

        it('creates mock auth state', () => {
            const authState = createMockAuthState()
            expect(authState.isAuthenticated).toBe(true)
            expect(authState.token).toBe('mock-jwt-token')
        })
    })

    describe('User Interactions', () => {
        it('handles button clicks', async () => {
            const handleClick = vi.fn()
            const user = userEvent.setup()

            const ButtonComponent = () => (
                <button onClick={handleClick}>Click me</button>
            )

            renderWithProviders(<ButtonComponent />)

            const button = screen.getByRole('button', { name: /click me/i })
            await user.click(button)

            expect(handleClick).toHaveBeenCalledTimes(1)
        })

        it('handles input changes', async () => {
            const user = userEvent.setup()

            const InputComponent = () => {
                const [value, setValue] = React.useState('')
                return (
                    <div>
                        <input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="Enter text"
                        />
                        <div>Value: {value}</div>
                    </div>
                )
            }

            renderWithProviders(<InputComponent />)

            const input = screen.getByPlaceholderText('Enter text')
            await user.type(input, 'Hello')

            expect(screen.getByText('Value: Hello')).toBeInTheDocument()
        })
    })

    describe('Async Operations', () => {
        it('waits for async content', async () => {
            const AsyncComponent = () => {
                const [data, setData] = React.useState(null)

                React.useEffect(() => {
                    setTimeout(() => {
                        setData('Loaded')
                    }, 100)
                }, [])

                return <div>{data ? data : 'Loading...'}</div>
            }

            renderWithProviders(<AsyncComponent />)

            expect(screen.getByText('Loading...')).toBeInTheDocument()

            await waitFor(() => {
                expect(screen.getByText('Loaded')).toBeInTheDocument()
            })
        })
    })

    describe('API Mocking', () => {
        it('mocks axios requests', async () => {
            mockAxios.get.mockResolvedValue({
                data: { message: 'Success' },
            })

            const ApiComponent = () => {
                const [message, setMessage] = React.useState('')

                React.useEffect(() => {
                    mockAxios.get('/api/test').then((response) => {
                        setMessage(response.data.message)
                    })
                }, [])

                return <div>{message}</div>
            }

            renderWithProviders(<ApiComponent />)

            await waitFor(() => {
                expect(screen.getByText('Success')).toBeInTheDocument()
            })

            expect(mockAxios.get).toHaveBeenCalledWith('/api/test')
        })
    })
})
