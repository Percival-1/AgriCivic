import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import notificationReducer from './slices/notificationSlice';

/**
 * Redux Store Configuration
 * 
 * This store is configured with:
 * - Redux Toolkit for simplified Redux logic
 * - Redux DevTools integration for debugging
 * - Custom middleware configuration
 * - Serializable check disabled for flexibility with complex data types
 * 
 * Slices will be imported and added to the reducer object as they are created.
 */

// Root reducer combining all slices
const rootReducer = {
    auth: authReducer,
    user: userReducer,
    notifications: notificationReducer,
    // Chat slice will be added here (chatSlice)
    // Additional slices will be added as needed
};

// Configure the Redux store
export const store = configureStore({
    reducer: rootReducer,

    // Middleware configuration
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            // Disable serializable check to allow non-serializable values
            // (e.g., File objects, Date objects, functions in actions)
            serializableCheck: {
                // Ignore these action types
                ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
                // Ignore these field paths in all actions
                ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
                // Ignore these paths in the state
                ignoredPaths: ['socket.connection'],
            },
            // Enable thunk middleware (included by default)
            thunk: true,
            // Enable immutability check in development
            immutableCheck: process.env.NODE_ENV !== 'production',
        }),

    // Redux DevTools configuration
    devTools: process.env.NODE_ENV !== 'production' && {
        // DevTools options
        name: 'Agri-Civic Intelligence Platform',
        trace: true,
        traceLimit: 25,
        // Customize action sanitizer if needed
        actionSanitizer: (action) => action,
        // Customize state sanitizer if needed
        stateSanitizer: (state) => state,
    },
});

// Export RootState and AppDispatch types for TypeScript support (if migrating to TS)
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;

export default store;
