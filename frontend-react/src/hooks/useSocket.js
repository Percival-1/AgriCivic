import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { initializeSocket, disconnectSocket, getSocket } from '../api/socket';
import { selectToken, selectIsAuthenticated } from '../store/slices/authSlice';

/**
 * Custom hook for Socket.IO connection management
 * 
 * Provides:
 * - Automatic Socket.IO connection on authentication
 * - Connection status tracking
 * - Auto-reconnect on connection loss
 * - Automatic cleanup on logout
 * 
 * Requirements: 12.6-12.8, 19.7
 */
export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const token = useSelector(selectToken);
    const isAuthenticated = useSelector(selectIsAuthenticated);

    useEffect(() => {
        // Only initialize socket if user is authenticated and has token
        // Requirement 12.6: Establish Socket.IO connection on user login
        if (isAuthenticated && token) {
            setIsConnecting(true);

            const socket = initializeSocket(token);

            // Set up connection status listeners
            const handleConnect = () => {
                setIsConnected(true);
                setIsConnecting(false);
            };

            const handleDisconnect = () => {
                setIsConnected(false);
                setIsConnecting(false);
            };

            const handleConnecting = () => {
                setIsConnecting(true);
            };

            const handleReconnect = () => {
                setIsConnected(true);
                setIsConnecting(false);
            };

            const handleReconnectAttempt = () => {
                setIsConnecting(true);
            };

            const handleReconnectError = () => {
                setIsConnecting(false);
            };

            const handleReconnectFailed = () => {
                setIsConnected(false);
                setIsConnecting(false);
            };

            // Attach event listeners
            socket.on('connect', handleConnect);
            socket.on('disconnect', handleDisconnect);
            socket.on('connecting', handleConnecting);
            socket.on('reconnect', handleReconnect);
            socket.on('reconnect_attempt', handleReconnectAttempt);
            socket.on('reconnect_error', handleReconnectError);
            socket.on('reconnect_failed', handleReconnectFailed);

            // Set initial connection state
            if (socket.connected) {
                setIsConnected(true);
                setIsConnecting(false);
            }

            // Cleanup function
            // Requirement 12.7: Disconnect Socket.IO connection on user logout
            return () => {
                socket.off('connect', handleConnect);
                socket.off('disconnect', handleDisconnect);
                socket.off('connecting', handleConnecting);
                socket.off('reconnect', handleReconnect);
                socket.off('reconnect_attempt', handleReconnectAttempt);
                socket.off('reconnect_error', handleReconnectError);
                socket.off('reconnect_failed', handleReconnectFailed);

                disconnectSocket();
                setIsConnected(false);
                setIsConnecting(false);
            };
        } else {
            // User is not authenticated, ensure socket is disconnected
            disconnectSocket();
            setIsConnected(false);
            setIsConnecting(false);
        }
    }, [isAuthenticated, token]);

    return {
        socket: getSocket(),
        isConnected,
        isConnecting,
    };
};

export default useSocket;
