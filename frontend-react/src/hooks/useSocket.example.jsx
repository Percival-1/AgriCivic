import React, { useEffect } from 'react';
import { useSocket } from './useSocket';

/**
 * Example: Basic Socket.IO Connection Status
 * 
 * Demonstrates how to use the useSocket hook to:
 * - Monitor connection status
 * - Display connection state to users
 * - Access the socket instance for custom events
 */
export function SocketStatusExample() {
    const { socket, isConnected, isConnecting } = useSocket();

    return (
        <div className="p-4 border rounded">
            <h3 className="text-lg font-semibold mb-2">Socket Connection Status</h3>

            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    {isConnecting && (
                        <span className="text-yellow-600">Connecting...</span>
                    )}
                    {isConnected && (
                        <span className="text-green-600">✓ Connected</span>
                    )}
                    {!isConnected && !isConnecting && (
                        <span className="text-red-600">✗ Disconnected</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="font-medium">Socket ID:</span>
                    <span className="text-gray-600">
                        {socket?.id || 'N/A'}
                    </span>
                </div>
            </div>
        </div>
    );
}

/**
 * Example: Real-time Notifications with Socket.IO
 * 
 * Demonstrates how to:
 * - Listen for custom events from the server
 * - Handle real-time notifications
 * - Clean up event listeners
 */
export function NotificationExample() {
    const { socket, isConnected } = useSocket();
    const [notifications, setNotifications] = React.useState([]);

    useEffect(() => {
        if (socket && isConnected) {
            // Listen for notification events
            const handleNotification = (notification) => {
                console.log('Received notification:', notification);
                setNotifications(prev => [...prev, notification]);
            };

            socket.on('notification', handleNotification);

            // Cleanup listener on unmount
            return () => {
                socket.off('notification', handleNotification);
            };
        }
    }, [socket, isConnected]);

    return (
        <div className="p-4 border rounded">
            <h3 className="text-lg font-semibold mb-2">Real-time Notifications</h3>

            {!isConnected && (
                <p className="text-gray-500">Not connected to server</p>
            )}

            {isConnected && notifications.length === 0 && (
                <p className="text-gray-500">No notifications yet</p>
            )}

            {notifications.length > 0 && (
                <ul className="space-y-2">
                    {notifications.map((notif, index) => (
                        <li key={index} className="p-2 bg-blue-50 rounded">
                            <div className="font-medium">{notif.title}</div>
                            <div className="text-sm text-gray-600">{notif.message}</div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/**
 * Example: Chat with Socket.IO
 * 
 * Demonstrates how to:
 * - Send messages via Socket.IO
 * - Receive real-time messages
 * - Handle typing indicators
 */
export function ChatExample() {
    const { socket, isConnected } = useSocket();
    const [messages, setMessages] = React.useState([]);
    const [inputValue, setInputValue] = React.useState('');
    const [isTyping, setIsTyping] = React.useState(false);

    useEffect(() => {
        if (socket && isConnected) {
            // Listen for incoming messages
            const handleMessage = (message) => {
                setMessages(prev => [...prev, message]);
            };

            // Listen for typing indicators
            const handleTyping = () => {
                setIsTyping(true);
            };

            const handleStopTyping = () => {
                setIsTyping(false);
            };

            socket.on('message', handleMessage);
            socket.on('typing', handleTyping);
            socket.on('stop_typing', handleStopTyping);

            // Cleanup
            return () => {
                socket.off('message', handleMessage);
                socket.off('typing', handleTyping);
                socket.off('stop_typing', handleStopTyping);
            };
        }
    }, [socket, isConnected]);

    const sendMessage = () => {
        if (socket && isConnected && inputValue.trim()) {
            socket.emit('send_message', {
                content: inputValue,
                timestamp: new Date().toISOString(),
            });
            setInputValue('');
        }
    };

    const handleInputChange = (e) => {
        setInputValue(e.target.value);

        // Emit typing indicator
        if (socket && isConnected) {
            socket.emit('typing');
        }
    };

    return (
        <div className="p-4 border rounded">
            <h3 className="text-lg font-semibold mb-2">Chat Example</h3>

            {!isConnected && (
                <p className="text-red-500 mb-2">Not connected to server</p>
            )}

            <div className="h-64 overflow-y-auto border rounded p-2 mb-2 bg-gray-50">
                {messages.map((msg, index) => (
                    <div key={index} className="mb-2 p-2 bg-white rounded">
                        <div className="text-sm">{msg.content}</div>
                        <div className="text-xs text-gray-500">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="text-sm text-gray-500 italic">
                        Someone is typing...
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border rounded"
                    disabled={!isConnected}
                />
                <button
                    onClick={sendMessage}
                    disabled={!isConnected || !inputValue.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    Send
                </button>
            </div>
        </div>
    );
}

/**
 * Example: Room-based Communication
 * 
 * Demonstrates how to:
 * - Join and leave rooms
 * - Send messages to specific rooms
 * - Handle room-specific events
 */
export function RoomExample() {
    const { socket, isConnected } = useSocket();
    const [currentRoom, setCurrentRoom] = React.useState('');
    const [roomMessages, setRoomMessages] = React.useState([]);

    const joinRoom = (roomId) => {
        if (socket && isConnected) {
            // Leave current room if any
            if (currentRoom) {
                socket.emit('leave_room', { roomId: currentRoom });
            }

            // Join new room
            socket.emit('join_room', { roomId });
            setCurrentRoom(roomId);
            setRoomMessages([]);
        }
    };

    const leaveRoom = () => {
        if (socket && isConnected && currentRoom) {
            socket.emit('leave_room', { roomId: currentRoom });
            setCurrentRoom('');
            setRoomMessages([]);
        }
    };

    useEffect(() => {
        if (socket && isConnected) {
            const handleRoomMessage = (message) => {
                setRoomMessages(prev => [...prev, message]);
            };

            socket.on('room_message', handleRoomMessage);

            return () => {
                socket.off('room_message', handleRoomMessage);
            };
        }
    }, [socket, isConnected]);

    return (
        <div className="p-4 border rounded">
            <h3 className="text-lg font-semibold mb-2">Room Example</h3>

            <div className="mb-4">
                <div className="flex gap-2 mb-2">
                    <button
                        onClick={() => joinRoom('room1')}
                        disabled={!isConnected}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        Join Room 1
                    </button>
                    <button
                        onClick={() => joinRoom('room2')}
                        disabled={!isConnected}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                        Join Room 2
                    </button>
                    <button
                        onClick={leaveRoom}
                        disabled={!isConnected || !currentRoom}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                        Leave Room
                    </button>
                </div>

                <div className="text-sm text-gray-600">
                    Current Room: {currentRoom || 'None'}
                </div>
            </div>

            <div className="h-48 overflow-y-auto border rounded p-2 bg-gray-50">
                {roomMessages.length === 0 && (
                    <p className="text-gray-500">No messages in this room</p>
                )}
                {roomMessages.map((msg, index) => (
                    <div key={index} className="mb-2 p-2 bg-white rounded">
                        {msg.content}
                    </div>
                ))}
            </div>
        </div>
    );
}
