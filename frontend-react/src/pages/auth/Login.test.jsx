import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Login from './Login';
import authReducer from '../../store/slices/authSlice';

// Mock useAuth hook
vi.mock('../../hooks/useAuth', () => ({
    default: () => ({
        login: vi.fn(),
        loading: false,
        error: null,
        clearError: vi.fn(),
        checkPasswordStrength: vi.fn(() => ({
            strength: 3,
            label: 'Medium',
            feedback: []
        }))
    })
}));

// Create mock store
const createMockStore = () => {
    return configureStore({
        reducer: {
            auth: authReducer
        }
    });
};

// Wrapper component with providers
const renderWithProviders = (component) => {
    const store = createMockStore();
    return render(
        <Provider store={store}>
            <BrowserRouter>
                {component}
            </BrowserRouter>
        </Provider>
    );
};

describe('Login Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders login form with all fields', () => {
        renderWithProviders(<Login />);

        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
        expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('displays validation error for invalid phone number', async () => {
        renderWithProviders(<Login />);

        const phoneInput = screen.getByLabelText(/phone number/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        fireEvent.change(phoneInput, { target: { value: 'invalid' } });
        fireEvent.blur(phoneInput);
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument();
        });
    });

    it('displays validation error for empty password', async () => {
        renderWithProviders(<Login />);

        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        fireEvent.blur(passwordInput);
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/password is required/i)).toBeInTheDocument();
        });
    });

    it('shows register link', () => {
        renderWithProviders(<Login />);

        const registerLink = screen.getByText(/sign up here/i);
        expect(registerLink).toBeInTheDocument();
        expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
    });

    it('toggles password visibility', () => {
        renderWithProviders(<Login />);

        const passwordInput = screen.getByLabelText(/password/i);
        const toggleButton = passwordInput.nextElementSibling;

        expect(passwordInput).toHaveAttribute('type', 'password');

        fireEvent.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'text');

        fireEvent.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'password');
    });
});
