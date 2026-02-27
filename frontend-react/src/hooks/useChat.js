import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';

/**
 * Custom hook for real-time chat functionality via Socket.IO
 * 
 * Provides:
 * - Real-time chat message handling
 * - Typing indicators (emit and receive)
 * - Chat room management (join/leave)
 * - Message history management
 * 
 * Requirements: 5.6, 12.9-12.10
 * 
 * @param {string} sessionId - Chat session ID to join
 * @returns {Object} Chat state and methods
 */
export const useChat = (sessionId) => {
    const { socket, isConnected } = useSocket();
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState(null);

    // Use ref to track typing timeout
    const typingTimeoutRef = useRef(null);
    const hasJoinedRoomRef = useRef(false);

    /**
     * Join chat room
     * Requirement 5.6: Handle real-time chat messages via Socket.IO
     */
    const joinRoom = useCallback(() => {
        if (socket && isConnected && sessionId && !hasJoinedRoomRef.current) {
            socket.emit('join_room', { sessionId });
            hasJoinedRoomRef.current = true;
            console.log('Joined chat room:', sessionId);
        }
    }, [socket, isConnected, sessionId]);

    /**
     * Leave chat room
     * Requirement 5.6: Handle real-time chat messages via Socket.IO
     */
    const leaveRoom = useCallback(() => {
        if (socket && sessionId && hasJoinedRoomRef.current) {
            socket.emit('leave_room', { sessionId });
            hasJoinedRoomRef.current = false;
            console.log('Left chat room:', sessionId);
        }
    }, [socket, sessionId]);

    /**
     * Send a chat message
     * Requirement 12.9: Emit typing indicators via Socket.IO
     */
    const sendMessage = useCallback((content, metadata = {}) => {
        if (socket && isConnected && sessionId) {
            const message = {
                sessionId,
                content,
                timestamp: new Date().toISOString(),
                ...metadata,
            };

            socket.emit('send_message', message);

            // Stop typing indicator when message is sent
            emitStopTyping();
        } else {
            setError('Cannot send message: Not connected to chat');
        }
    }, [socket, isConnected, sessionId]);

    /**
     * Emit typing indicator
     * Requirement 12.9: Emit typing indicators via Socket.IO
     */
    const emitTyping = useCallback(() => {
        if (socket && isConnected && sessionId) {
            socket.emit('typing', { sessionId });

            // Clear existing timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Auto-stop typing after 3 seconds of inactivity
            typingTimeoutRef.current = setTimeout(() => {
                emitStopTyping();
            }, 3000);
        }
    }, [socket, isConnected, sessionId]);

    /**
     * Emit stop typing indicator
     * Requirement 12.9: Emit typing indicators via Socket.IO
     */
    const emitStopTyping = useCallback(() => {
        if (socket && isConnected && sessionId) {
            socket.emit('stop_typing', { sessionId });

            // Clear timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
        }
    }, [socket, isConnected, sessionId]);

    /**
     * Clear all messages
     */
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    /**
     * Add a message to the local state
     */
    const addMessage = useCallback((message) => {
        setMessages((prev) => [...prev, message]);
    }, []);

    /**
     * Set up Socket.IO event listeners
     * Requirements: 5.6, 12.9-12.10
     */
    useEffect(() => {
        if (socket && isConnected && sessionId) {
            // Join room when connected
            joinRoom();

            /**
             * Listen for incoming messages
             * Requirement 12.10: Update chat interface in real-time
             */
            const handleMessage = (message) => {
                console.log('Received message:', message);
                addMessage(message);
            };

            /**
             * Listen for typing indicators from other users
             * Requirement 12.10: Update chat interface in real-time
             */
            const handleTyping = (data) => {
                console.log('User is typing:', data);
                setIsTyping(true);
            };

            /**
             * Listen for stop typing indicators
             * Requirement 12.10: Update chat interface in real-time
             */
            const handleStopTyping = (data) => {
                console.log('User stopped typing:', data);
                setIsTyping(false);
            };

            /**
             * Handle chat errors
             */
            const handleChatError = (error) => {
                console.error('Chat error:', error);
                setError(error.message || 'An error occurred in chat');
            };

            /**
             * Handle room joined confirmation
             */
            const handleRoomJoined = (data) => {
                console.log('Room joined successfully:', data);
                setError(null);
            };

            /**
             * Handle room left confirmation
             */
            const handleRoomLeft = (data) => {
                console.log('Room left successfully:', data);
            };

            // Attach event listeners
            socket.on('message', handleMessage);
            socket.on('typing', handleTyping);
            socket.on('stop_typing', handleStopTyping);
            socket.on('chat_error', handleChatError);
            socket.on('room_joined', handleRoomJoined);
            socket.on('room_left', handleRoomLeft);

            // Cleanup function
            return () => {
                // Remove event listeners
                socket.off('message', handleMessage);
                socket.off('typing', handleTyping);
                socket.off('stop_typing', handleStopTyping);
                socket.off('chat_error', handleChatError);
                socket.off('room_joined', handleRoomJoined);
                socket.off('room_left', handleRoomLeft);

                // Leave room
                leaveRoom();

                // Clear typing timeout
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                }
            };
        }
    }, [socket, isConnected, sessionId, joinRoom, leaveRoom, addMessage]);

    return {
        // State
        messages,
        isTyping,
        isConnected,
        error,

        // Methods
        sendMessage,
        emitTyping,
        emitStopTyping,
        clearMessages,
        joinRoom,
        leaveRoom,
    };
};

export default useChat;
