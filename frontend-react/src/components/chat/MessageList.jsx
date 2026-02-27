import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { FaUser, FaRobot } from 'react-icons/fa';

/**
 * MessageList Component
 * 
 * Displays chat messages with auto-scroll functionality
 * Renders markdown in messages and displays source citations
 * 
 * Requirements: 5.3, 5.4, 5.8
 */
export default function MessageList({ messages, isTyping }) {
    const messagesEndRef = useRef(null);
    const containerRef = useRef(null);

    // Auto-scroll to latest message
    // Requirement 5.8: Auto-scroll to latest message when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
        >
            {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                        <FaRobot className="mx-auto text-6xl mb-4 text-gray-400" />
                        <p className="text-lg">Start a conversation</p>
                        <p className="text-sm mt-2">Ask me anything about agriculture!</p>
                    </div>
                </div>
            )}

            {messages.map((message, index) => {
                const isUser = message.role === 'user' || message.sender === 'user';

                return (
                    <div
                        key={message.id || index}
                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`flex gap-3 max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'
                                }`}
                        >
                            {/* Avatar */}
                            <div
                                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-600' : 'bg-green-600'
                                    }`}
                            >
                                {isUser ? (
                                    <FaUser className="text-white text-sm" />
                                ) : (
                                    <FaRobot className="text-white text-sm" />
                                )}
                            </div>

                            {/* Message Content */}
                            <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
                                <div
                                    className={`inline-block px-4 py-3 rounded-lg ${isUser
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                                        }`}
                                    style={{ maxWidth: '100%' }}
                                >
                                    {/* Requirement 5.4: Render markdown formatting in chat responses */}
                                    <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : ''}`}>
                                        <ReactMarkdown
                                            components={{
                                                // Custom rendering for better formatting
                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
                                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                                em: ({ children }) => <em className="italic">{children}</em>,
                                                code: ({ inline, children }) =>
                                                    inline ? (
                                                        <code className={`px-1 py-0.5 rounded text-sm ${isUser ? 'bg-blue-700' : 'bg-gray-200 text-gray-800'}`}>{children}</code>
                                                    ) : (
                                                        <code className={`block p-2 rounded text-sm overflow-x-auto ${isUser ? 'bg-blue-700' : 'bg-gray-200 text-gray-800'}`}>{children}</code>
                                                    ),
                                                h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-2 first:mt-0">{children}</h1>,
                                                h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-2 first:mt-0">{children}</h2>,
                                                h3: ({ children }) => <h3 className="text-base font-bold mb-1 mt-1 first:mt-0">{children}</h3>,
                                            }}
                                        >
                                            {message.content || message.message}
                                        </ReactMarkdown>
                                    </div>

                                    {/* Display image if present */}
                                    {message.image_url && (
                                        <img
                                            src={message.image_url}
                                            alt="Uploaded"
                                            className="mt-2 rounded max-w-xs"
                                        />
                                    )}
                                </div>

                                {/* Timestamp */}
                                <div className="text-xs text-gray-500 mt-1">
                                    {message.timestamp && formatTimestamp(message.timestamp)}
                                </div>

                                {/* Requirement 5.3: Display source citations */}
                                {message.sources && message.sources.length > 0 && (
                                    <div className="mt-2 text-xs">
                                        <div className="text-gray-600 font-medium mb-1">Sources:</div>
                                        <div className="space-y-1">
                                            {message.sources.map((source, idx) => {
                                                // Handle both string sources and object sources
                                                const sourceText = typeof source === 'string'
                                                    ? source
                                                    : (source.title || source.name || source.id || `Source ${idx + 1}`);

                                                return (
                                                    <div
                                                        key={idx}
                                                        className="bg-gray-100 px-2 py-1 rounded text-gray-700"
                                                    >
                                                        {sourceText}
                                                        {typeof source === 'object' && source.url && (
                                                            <a
                                                                href={source.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="ml-2 text-blue-600 hover:underline"
                                                            >
                                                                View
                                                            </a>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Typing Indicator */}
            {/* Requirement 5.6: Display typing indicator while waiting for response */}
            {isTyping && (
                <div className="flex justify-start">
                    <div className="flex gap-3 max-w-3xl">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                            <FaRobot className="text-white text-sm" />
                        </div>
                        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}
