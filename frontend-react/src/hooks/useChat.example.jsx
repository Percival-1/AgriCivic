import React, { useState, useEffect, useRef } from 'react';
import { useChat } from './useChat';

/**
 * Example: Chat Component using useChat hook
 * 
 * Demonstrates:
 * - Real-time message handling
 * - Typing indicators
 * - Message sending
 * - Auto-scroll to latest message
 * 
 * Requirements: 5.6, 12.9-12.10
 */
export default function ChatExample() {
    const [sessionId] = useState('example-session-123');
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);

    // Use the chat hook
    const {
        messages,
        isTyping,
        isConnected,
        error,
        sendMessage,
        emitTyping,
        emitStopTyping,
        clearMessages,
    } = useChat(sessionId);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleInputChange = (e) => {
        setInputValue(e.target.value);

        // Emit typing indicator when user types
        if (e.target.value.length > 0) {
            emitTyping();
        } else {
            emitStopTyping();
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();

        if (inputValue.trim() && isConnected) {
            // Send message
            sendMessage(inputValue.trim());

            // Clear input
            setInputValue('');

            // Stop typing indicator
            emitStopTyping();
        }
    };

    const handleClearMessages = () => {
        clearMessages();
    };

    return (
        <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 rounded-t-lg">
                <h1 className="text-xl font-bold">Chat Example</h1>
                <div className="text-sm mt-1">
                    {isConnected ? (
                        <span className="text-green-300">● Connected</span>
                    ) : (
                        <span className="text-red-300">● Disconnected</span>
                    )}
                    <span className="ml-4">Session: {sessionId}</span>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto bg-gray-100 p-4 space-y-2">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        No messages yet. Start chatting!
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div
                            key={index}
                            className={`p-3 rounded-lg max-w-xs ${message.sender === 'user'
                                    ? 'bg-blue-500 text-white ml-auto'
                                    : 'bg-white text-gray-800'
                                }`}
                        >
                            <div className="text-sm">{message.content}</div>
                            {message.timestamp && (
                                <div className="text-xs opacity-70 mt-1">
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                    ))
                )}

                {/* Typing Indicator */}
                {isTyping && (
                    <div className="bg-white p-3 rounded-lg max-w-xs">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                    </div>
                )}

                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="bg-white p-4 rounded-b-lg border-t">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!isConnected}
                    />
                    <button
                        type="submit"
                        disabled={!isConnected || !inputValue.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                    <button
                        type="button"
                        onClick={handleClearMessages}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                    >
                        Clear
                    </button>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                    {isConnected
                        ? 'Connected to chat server'
                        : 'Connecting to chat server...'}
                </div>
            </form>
        </div>
    );
}

/**
 * Example: Simple Chat Hook Usage
 */
export function SimpleChatExample() {
    const sessionId = 'simple-session-456';
    const { messages, sendMessage, isConnected } = useChat(sessionId);

    return (
        <div className="p-4">
            <h2 className="text-lg font-bold mb-4">Simple Chat Example</h2>

            <div className="mb-4">
                Status: {isConnected ? 'Connected' : 'Disconnected'}
            </div>

            <div className="space-y-2 mb-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className="p-2 bg-gray-100 rounded">
                        {msg.content}
                    </div>
                ))}
            </div>

            <button
                onClick={() => sendMessage('Hello!')}
                disabled={!isConnected}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
                Send "Hello!"
            </button>
        </div>
    );
}

/**
 * Example: Chat with Typing Indicators
 */
export function TypingIndicatorExample() {
    const sessionId = 'typing-session-789';
    const [input, setInput] = useState('');

    const {
        messages,
        isTyping,
        sendMessage,
        emitTyping,
        emitStopTyping,
    } = useChat(sessionId);

    const handleChange = (e) => {
        setInput(e.target.value);

        if (e.target.value) {
            emitTyping();
        } else {
            emitStopTyping();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim()) {
            sendMessage(input);
            setInput('');
            emitStopTyping();
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-lg font-bold mb-4">Typing Indicator Example</h2>

            {isTyping && (
                <div className="text-sm text-gray-600 mb-2">
                    Someone is typing...
                </div>
            )}

            <div className="space-y-2 mb-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className="p-2 bg-gray-100 rounded">
                        {msg.content}
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={handleChange}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border rounded"
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
