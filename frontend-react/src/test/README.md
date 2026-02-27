# Testing Infrastructure

This directory contains the testing infrastructure for the React frontend application.

## Overview

The testing setup uses:
- **Vitest**: Fast unit test framework
- **React Testing Library**: Testing utilities for React components
- **@testing-library/jest-dom**: Custom matchers for DOM assertions

## Files

### setup.js
Global test setup file that runs before all tests. Includes:
- Automatic cleanup after each test
- Mocks for browser APIs (matchMedia, IntersectionObserver, ResizeObserver)
- Mocks for Web Storage APIs (localStorage, sessionStorage)
- Mock for Notification API
- Console suppression for cleaner test output

### test-utils.jsx
Reusable testing utilities including:
- `renderWithProviders()`: Render components with Redux and Router
- `renderWithRedux()`: Render components with Redux only
- `renderWithRouter()`: Render components with Router only
- `createTestStore()`: Create a test Redux store
- `createMockUser()`: Generate mock user data
- `createMockAuthState()`: Generate mock auth state
- `createMockNotification()`: Generate mock notification
- `createMockChatMessage()`: Generate mock chat message

### mocks.js
Common mocks for external dependencies:
- Axios HTTP client
- Socket.IO client
- React Router navigation
- File objects for upload testing
- Geolocation API
- MediaRecorder API
- Chart.js
- Leaflet maps

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Writing Tests

### Basic Component Test

```javascript
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/test-utils'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
    it('renders correctly', () => {
        renderWithProviders(<MyComponent />)
        expect(screen.getByText('Hello')).toBeInTheDocument()
    })
})
```

### Testing with Redux State

```javascript
import { renderWithProviders, createMockAuthState } from '../test/test-utils'

it('shows user name when authenticated', () => {
    const preloadedState = {
        auth: createMockAuthState({ user: { name: 'John Doe' } })
    }
    
    renderWithProviders(<MyComponent />, { preloadedState })
    expect(screen.getByText('John Doe')).toBeInTheDocument()
})
```

### Testing User Interactions

```javascript
import { userEvent } from '@testing-library/user-event'

it('handles button click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MyComponent />)
    
    const button = screen.getByRole('button', { name: /submit/i })
    await user.click(button)
    
    expect(screen.getByText('Submitted')).toBeInTheDocument()
})
```

### Testing Async Operations

```javascript
import { waitFor } from '@testing-library/react'

it('loads data asynchronously', async () => {
    renderWithProviders(<MyComponent />)
    
    await waitFor(() => {
        expect(screen.getByText('Data loaded')).toBeInTheDocument()
    })
})
```

### Mocking API Calls

```javascript
import { vi } from 'vitest'
import { mockAxios } from '../test/mocks'

it('fetches data from API', async () => {
    mockAxios.get.mockResolvedValue({ data: { message: 'Success' } })
    
    renderWithProviders(<MyComponent />)
    
    await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument()
    })
    
    expect(mockAxios.get).toHaveBeenCalledWith('/api/data')
})
```

## Best Practices

1. **Test user behavior, not implementation**: Focus on what users see and do
2. **Use semantic queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Avoid testing implementation details**: Don't test internal state or methods
4. **Keep tests simple**: One assertion per test when possible
5. **Use descriptive test names**: Clearly state what is being tested
6. **Clean up after tests**: Use cleanup utilities and reset mocks
7. **Mock external dependencies**: Don't make real API calls in tests
8. **Test edge cases**: Empty states, error states, loading states

## Common Matchers

```javascript
// Existence
expect(element).toBeInTheDocument()
expect(element).not.toBeInTheDocument()

// Visibility
expect(element).toBeVisible()
expect(element).not.toBeVisible()

// Text content
expect(element).toHaveTextContent('text')
expect(element).toContainHTML('<span>text</span>')

// Attributes
expect(element).toHaveAttribute('href', '/path')
expect(element).toHaveClass('active')

// Form elements
expect(input).toHaveValue('value')
expect(checkbox).toBeChecked()
expect(button).toBeDisabled()

// Async
await waitFor(() => expect(element).toBeInTheDocument())
```

## Troubleshooting

### Tests fail with "Not wrapped in act(...)"
- Use `waitFor` for async operations
- Use `userEvent` instead of `fireEvent`

### Mock not working
- Ensure mock is set up before component renders
- Reset mocks between tests using `vi.clearAllMocks()`

### Can't find element
- Check if element is rendered conditionally
- Use `findBy` queries for async elements
- Use `screen.debug()` to see current DOM

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
