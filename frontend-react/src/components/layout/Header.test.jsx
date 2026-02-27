import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Header from './Header';
import authReducer from '../../store/slices/authSlice';
import userReducer from '../../store/slices/userSlice';
import notificationReducer from '../../store/slices/notificationSlice';

// Mock useAuth hook
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({
        logout: vi.fn(),
    }),
}));

describe('Header Component', () => {
    let store;

    beforeEach(() => {
        // Create a fresh store for each test
        store = configureStore({
            reducer: {
                auth: authReducer,
                user: userReducer,
                notifications: notificationReducer,
            },
            preloadedState: {
                auth: {
                    isAuthenticated: true,
                    user: {
                        name: 'Test User',
                        phone_number: '+1234567890',
                    },
                    token: 'test-token',
                },
                user: {
                    preferences: {
                        language: 'en',
                    },
                },
                notifications: {
                    items: [],
                    unreadCount: 5,
                },
            },
        });
    });

    const renderHeader = (props = {}) => {
        return render(
            <Provider store={store}>
                <BrowserRouter>
                    <Header
                        onMenuToggle={vi.fn()}
                        isMobileMenuOpen={false}
                        {...props}
                    />
                </BrowserRouter>
            </Provider>
        );
    };

    it('renders header with logo and title', () => {
        renderHeader();
        expect(screen.getByText('Agri-Civic Intelligence')).toBeInTheDocument();
        expect(screen.getByText('Empowering Farmers')).toBeInTheDocument();
    });

    it('displays notification badge with unread count', () => {
        renderHeader();
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('displays user name in user menu', () => {
        renderHeader();
        expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('opens language menu when language button is clicked', () => {
        renderHeader();
        const languageButton = screen.getByLabelText('Select language');
        fireEvent.click(languageButton);
        expect(screen.getByText('Select Language')).toBeInTheDocument();
    });

    it('opens user menu when user button is clicked', () => {
        renderHeader();
        const userButton = screen.getByLabelText('User menu');
        fireEvent.click(userButton);
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('calls onMenuToggle when mobile menu button is clicked', () => {
        const onMenuToggle = vi.fn();
        renderHeader({ onMenuToggle });
        const menuButton = screen.getByLabelText('Toggle menu');
        fireEvent.click(menuButton);
        expect(onMenuToggle).toHaveBeenCalledTimes(1);
    });
});
