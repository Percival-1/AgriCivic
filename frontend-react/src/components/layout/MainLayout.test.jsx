import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MainLayout from './MainLayout';
import authReducer from '../../store/slices/authSlice';
import userReducer from '../../store/slices/userSlice';
import notificationReducer from '../../store/slices/notificationSlice';

// Mock useAuth hook
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({
        logout: vi.fn(),
    }),
}));

// Mock useSocket hook to prevent Socket.IO connection
vi.mock('../../hooks/useSocket', () => ({
    useSocket: () => ({
        socket: null,
        isConnected: false,
    }),
}));

// Mock useNotifications hook
vi.mock('../../hooks/useNotifications', () => ({
    useNotifications: () => ({
        notifications: [],
        unreadCount: 0,
        isConnected: false,
    }),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
        i18n: {
            changeLanguage: vi.fn(),
            language: 'en',
        },
    }),
}));

describe('MainLayout Component', () => {
    const renderMainLayout = () => {
        const store = configureStore({
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
                    loading: false,
                    error: null,
                },
                user: {
                    currentUser: {
                        name: 'Test User',
                        phone_number: '+1234567890',
                    },
                    preferences: {
                        language: 'en',
                    },
                    loading: false,
                    error: null,
                },
                notifications: {
                    items: [],
                    unreadCount: 0,
                    loading: false,
                    error: null,
                },
            },
        });

        return render(
            <Provider store={store}>
                <BrowserRouter>
                    <MainLayout />
                </BrowserRouter>
            </Provider>
        );
    };

    it('renders MainLayout with Header and Sidebar', () => {
        renderMainLayout();
        // Check if header is rendered
        expect(screen.getByText('Agri-Civic Intelligence')).toBeInTheDocument();
        // Check if sidebar navigation items are rendered
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders content area with Outlet', () => {
        renderMainLayout();
        // The main content area should be present
        const main = document.querySelector('main');
        expect(main).toBeInTheDocument();
    });
});
