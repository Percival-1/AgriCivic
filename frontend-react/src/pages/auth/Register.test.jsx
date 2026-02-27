import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Register from './Register';
import authReducer from '../../store/slices/authSlice';

// Mock useAuth hook
vi.mock('../../hooks/useAuth', () => ({
    default: () => ({
        register: vi.fn(),
        loading: false,
        error: null,
        clearError: vi.fn(),
        checkPasswordStrength: vi.fn(() => ({
            strength: 3,
            label: 'Medium',
            feedback: ['Include special characters']
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

describe('Register Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders registration form with all fields', () => {
        renderWithProviders(<Register />);

        expect(screen.getByText('Create Your Account')).toBeInTheDocument();
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('displays validation error for invalid phone number', async () => {
        renderWithProviders(<Register />);

        const phoneInput = screen.getByLabelText(/phone number/i);
        const submitButton = screen.getByRole('button', { name: /create account/i });

        fireEvent.change(phoneInput, { target: { value: 'invalid' } });
        fireEvent.blur(phoneInput);
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument();
        });
    });

    it('displays validation error when passwords do not match', async () => {
        renderWithProviders(<Register />);

        const passwordInput = screen.getByLabelText(/^password$/i);
        const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

        fireEvent.change(passwordInput, { target: { value: 'Password123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'Password456' } });
        fireEvent.blur(confirmPasswordInput);

        await waitFor(() => {
            expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
        });
    });

    it('displays password strength indicator', async () => {
        renderWithProviders(<Register />);

        const passwordInput = screen.getByLabelText(/^password$/i);

        fireEvent.change(passwordInput, { target: { value: 'TestPass123' } });

        await waitFor(() => {
            expect(screen.getByText(/password strength/i)).toBeInTheDocument();
        });
    });

    it('shows login link', () => {
        renderWithProviders(<Register />);

        const loginLink = screen.getByText(/sign in here/i);
        expect(loginLink).toBeInTheDocument();
        expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
    });

    it('validates password requirements', async () => {
        renderWithProviders(<Register />);

        const passwordInput = screen.getByLabelText(/^password$/i);
        const submitButton = screen.getByRole('button', { name: /create account/i });

        fireEvent.change(passwordInput, { target: { value: 'weak' } });
        fireEvent.blur(passwordInput);
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
        });
    });
});
