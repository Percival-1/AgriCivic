import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Sidebar from './Sidebar';
import authReducer from '../../store/slices/authSlice';

describe('Sidebar Component', () => {
    let store;

    beforeEach(() => {
        // Create a fresh store for each test
        store = configureStore({
            reducer: {
                auth: authReducer,
            },
            preloadedState: {
                auth: {
                    isAuthenticated: true,
                    user: {
                        name: 'Test User',
                        phone_number: '+1234567890',
                        role: 'user',
                    },
                    token: 'test-token',
                },
            },
        });
    });

    const renderSidebar = (props = {}) => {
        return render(
            <Provider store={store}>
                <BrowserRouter>
                    <Sidebar isOpen={true} onClose={vi.fn()} {...props} />
                </BrowserRouter>
            </Provider>
        );
    };

    it('renders user navigation items for regular user', () => {
        renderSidebar();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Chat Assistant')).toBeInTheDocument();
        expect(screen.getByText('Disease Detection')).toBeInTheDocument();
        expect(screen.getByText('Weather')).toBeInTheDocument();
        expect(screen.getByText('Market Intelligence')).toBeInTheDocument();
    });

    it('renders admin navigation items for admin user', () => {
        // Update store with admin user
        store = configureStore({
            reducer: {
                auth: authReducer,
            },
            preloadedState: {
                auth: {
                    isAuthenticated: true,
                    user: {
                        name: 'Admin User',
                        phone_number: '+1234567890',
                        role: 'admin',
                    },
                    token: 'test-token',
                },
            },
        });

        render(
            <Provider store={store}>
                <BrowserRouter>
                    <Sidebar isOpen={true} onClose={vi.fn()} />
                </BrowserRouter>
            </Provider>
        );

        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
        expect(screen.getByText('User Management')).toBeInTheDocument();
        expect(screen.getByText('System Monitoring')).toBeInTheDocument();
    });

    it('displays user information in footer', () => {
        renderSidebar();
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('Farmer')).toBeInTheDocument();
    });
});
