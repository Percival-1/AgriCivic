import { io } from 'socket.io-client';

/**
 * Socket.IO Client Configuration
 * 
 * Manages Socket.IO connection lifecycle:
 * - Initialize connection with JWT authentication
 * - Handle connection/disconnection events
 * - Auto-reconnect on connection loss
 * - Provide singleton socket instance
 * 
 * Requirements: 12.6-12.8, 19.7
 */

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

let socket = null;

/**
 * Initialize Socket.IO connection with authentication
 * 
 * @param {string} token - JWT token for authentication
 * @returns {Socket} Socket.IO client instance
 * 
 * Requirement 12.6: Establish Socket.IO connection on user login
 * Requirement 12.8: Handle Socket.IO connection errors and reconnection
 */
export const initializeSocket = (token) => {
    // Disconnect existing socket if any
    if (socket) {
        socket.disconnect();
    }

    // Create new socket connection with authentication
    socket = io(SOCKET_URL, {
        auth: {
            token: token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: 3, // Reduced from 5 to 3
        timeout: 10000, // Reduced from 20000 to 10000
        autoConnect: true,
    });

    // Connection event handlers
    socket.on('connect', () => {
        console.log('✅ Socket.IO connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
        if (reason !== 'io client disconnect') {
            console.log('⚠️ Socket.IO disconnected:', reason);
        }

        // Auto-reconnect on unexpected disconnection (Requirement 12.8)
        if (reason === 'io server disconnect') {
            // Server initiated disconnect, manually reconnect
            socket.connect();
        }
    });

    socket.on('connect_error', (error) => {
        // Only log if it's not a connection refused error (backend not running)
        if (error.message !== 'websocket error' && !error.message.includes('ECONNREFUSED')) {
            console.error('❌ Socket.IO connection error:', error.message);
        }
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log('✅ Socket.IO reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
        // Only log every 3rd attempt to reduce noise
        if (attemptNumber % 3 === 0) {
            console.log('🔄 Socket.IO reconnection attempt:', attemptNumber);
        }
    });

    socket.on('reconnect_error', (error) => {
        // Suppress errors when backend is not running
        if (!error.message.includes('ECONNREFUSED') && !error.message.includes('websocket error')) {
            console.error('❌ Socket.IO reconnection error:', error.message);
        }
    });

    socket.on('reconnect_failed', () => {
        console.warn('⚠️ Socket.IO: Backend server not available. Real-time features disabled.');
    });

    return socket;
};

/**
 * Get current socket instance
 * 
 * @returns {Socket|null} Current socket instance or null if not initialized
 */
export const getSocket = () => socket;

/**
 * Disconnect and cleanup socket connection
 * 
 * Requirement 12.7: Disconnect Socket.IO connection on user logout
 */
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

/**
 * Check if socket is connected
 * 
 * @returns {boolean} True if socket is connected
 */
export const isSocketConnected = () => {
    return socket && socket.connected;
};
