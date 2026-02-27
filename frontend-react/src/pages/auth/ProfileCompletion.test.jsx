import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ProfileCompletion from './ProfileCompletion';
import authReducer from '../../store/slices/authSlice';

// Mock userService
vi.mock('../../api/services/userService', () => ({
    default: {
        completeProfile: vi.fn(),
        isProfileComplete: vi.fn(() => false),
        validateProfileData: vi.fn(() => ({ isValid: true, errors: {} }))
    }
}));

// Create mock store with user
const createMockStore = (user = null) => {
    return configureStore({
        reducer: {
            auth: authReducer
        },
        preloadedState: {
            auth: {
                isAuthenticated: true,
                token: 'mock-token',
                user: user || {
                    phone_number: '+1234567890',
                    name: '',
                    location: '',
                    crops: [],
                    land_size: null,
                    language: 'en'
                },
                loading: false,
                error: null
            }
        }
    });
};

// Wrapper component with providers
const renderWithProviders = (component, user = null) => {
    const store = createMockStore(user);
    return render(
        <Provider store={store}>
            <BrowserRouter>
                {component}
            </BrowserRouter>
        </Provider>
    );
};

describe('ProfileCompletion Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders profile completion form with all fields', () => {
        renderWithProviders(<ProfileCompletion />);

        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/crops/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/land size/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/preferred language/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument();
    });

    it('displays validation error for empty name', async () => {
        renderWithProviders(<ProfileCompletion />);

        const nameInput = screen.getByLabelText(/full name/i);
        const submitButton = screen.getByRole('button', { name: /complete profile/i });

        fireEvent.blur(nameInput);
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        });
    });

    it('displays validation error for empty location', async () => {
        renderWithProviders(<ProfileCompletion />);

        const locationInput = screen.getByLabelText(/location/i);
        const submitButton = screen.getByRole('button', { name: /complete profile/i });

        fireEvent.blur(locationInput);
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/location is required/i)).toBeInTheDocument();
        });
    });

    it('allows adding crops from suggestions', () => {
        renderWithProviders(<ProfileCompletion />);

        const riceButton = screen.getByRole('button', { name: 'Rice' });
        fireEvent.click(riceButton);

        // Check that Rice appears in the selected crops area (as a span, not button)
        const selectedCrops = screen.getAllByText('Rice');
        expect(selectedCrops.length).toBeGreaterThan(1); // Button + selected tag
        expect(riceButton).toBeDisabled();
    });

    it('allows adding custom crops', () => {
        renderWithProviders(<ProfileCompletion />);

        const cropInput = screen.getByLabelText(/crops/i);

        fireEvent.change(cropInput, { target: { value: 'Tomatoes' } });
        fireEvent.keyPress(cropInput, { key: 'Enter', code: 'Enter', charCode: 13 });

        expect(screen.getByText('Tomatoes')).toBeInTheDocument();
    });

    it('allows removing added crops', () => {
        renderWithProviders(<ProfileCompletion />);

        const riceButton = screen.getByRole('button', { name: 'Rice' });
        fireEvent.click(riceButton);

        // Find the remove button within the selected crop tag
        const selectedCropTags = screen.getAllByText('Rice');
        const selectedCropTag = selectedCropTags.find(el => el.tagName === 'SPAN');
        const removeButton = selectedCropTag.querySelector('button');

        fireEvent.click(removeButton);

        // The suggestion button should be enabled again
        expect(riceButton).not.toBeDisabled();
    });

    it('validates land size is positive', async () => {
        renderWithProviders(<ProfileCompletion />);

        const landSizeInput = screen.getByLabelText(/land size/i);
        const submitButton = screen.getByRole('button', { name: /complete profile/i });

        fireEvent.change(landSizeInput, { target: { value: '-5' } });
        fireEvent.blur(landSizeInput);
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/land size must be greater than 0/i)).toBeInTheDocument();
        });
    });

    it('shows skip button', () => {
        renderWithProviders(<ProfileCompletion />);

        const skipButton = screen.getByText(/skip for now/i);
        expect(skipButton).toBeInTheDocument();
    });

    it('displays language options', () => {
        renderWithProviders(<ProfileCompletion />);

        const languageSelect = screen.getByLabelText(/preferred language/i);
        expect(languageSelect).toBeInTheDocument();

        // Check for some language options
        expect(screen.getByRole('option', { name: /english/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /hindi/i })).toBeInTheDocument();
    });
});
