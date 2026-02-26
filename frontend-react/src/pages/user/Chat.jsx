import { useState, useEffect, useMemo } from 'react';
import { FaPlus } from 'react-icons/fa';
import { chatService } from '../../api/services';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { MessageList, ChatInput, ChatHeader } from '../../components/chat';
import Loader from '../../components/common/Loader';
import ErrorAlert from '../../components/common/ErrorAlert';
import Button from '../../components/common/Button';
import { useLocalStorage } from '../../hooks/useLocalStorage';

/**
 * Chat Page Component
 * 
 * Main chat interface with messaging, search, and export functionality
 * 
 * Requirements: 5.1-5.10
 */
export default function Chat() {
    // Get current user
    const { user, loading: userLoading } = useCurrentUser();

    // State management
    const [sessionId, setSessionId] = useLocalStorage('chatSessionId', null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isSending, setIsSending] = useState(false);

    /**
     * Initialize chat session
     * Requirement 5.1: Initialize session via Backend_API
     */
    const initializeNewSession = async () => {
        if (!user || !user.id) {
            console.error('User data missing:', { user, hasId: !!user?.id });
            setError('User data not available. Please refresh the page.');
            return;
        }

        console.log('=== INITIALIZING SESSION ===');
        console.log('User ID:', user.id);
        console.log('Language:', user.preferred_language || 'en');
        console.log('Full user object:', user);

        setLoading(true);
        try {
            const response = await chatService.initSession({
                userId: user.id,
                language: user.preferred_language || 'en',
                context: {}  // Changed to empty object like Vue
            });
            console.log('=== SESSION INITIALIZED ===');
            console.log('Session ID:', response.session_id);
            console.log('Full response:', response);
            setSessionId(response.session_id);
            setMessages([]);
            setError(null);
        } catch (err) {
            console.error('=== SESSION INITIALIZATION FAILED ===');
            console.error('Error:', err);
            setError(err.message || 'Failed to initialize chat session');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Don't auto-initialize - let user click "Start New Session" button
        // This gives users control over when to start a chat
    }, [sessionId, user]);

    /**
     * Load chat history
     * Requirement 5.5: Retrieve and display previous messages
     */
    useEffect(() => {
        const loadHistory = async () => {
            if (sessionId && messages.length === 0) {
                setIsLoadingHistory(true);
                try {
                    const response = await chatService.getHistory(sessionId);
                    if (response.messages && response.messages.length > 0) {
                        setMessages(response.messages);
                    }
                } catch (err) {
                    console.error('Failed to load chat history:', err);
                } finally {
                    setIsLoadingHistory(false);
                }
            }
        };

        loadHistory();
    }, [sessionId]);

    /**
     * Filter messages based on search query
     * Requirement 5.9: Filter messages client-side
     */
    const filteredMessages = useMemo(() => {
        if (!searchQuery.trim()) {
            return messages;
        }

        const query = searchQuery.toLowerCase();
        return messages.filter(msg => {
            const content = (msg.content || msg.message || '').toLowerCase();
            return content.includes(query);
        });
    }, [messages, searchQuery]);

    /**
     * Send message handler
     * Requirement 5.2: Transmit message to Backend_API and display response
     */
    const handleSendMessage = async ({ message, image }) => {
        if (!sessionId) {
            setError('No active session. Please refresh the page.');
            return;
        }

        console.log('=== SENDING MESSAGE ===');
        console.log('Session ID:', sessionId);
        console.log('Message:', message);
        console.log('Has image:', !!image);
        console.log('User language:', user?.preferred_language || 'en');

        setIsSending(true);
        try {
            setError(null);

            // Add user message to local state immediately
            const userMessage = {
                id: Date.now(),
                role: 'user',
                content: message,
                timestamp: new Date().toISOString(),
                image_url: image ? URL.createObjectURL(image) : null
            };
            setMessages(prev => [...prev, userMessage]);

            // Send to backend with user's preferred language
            const response = await chatService.sendMessage(
                sessionId,
                message,
                image,
                user?.preferred_language || 'en'
            );
            console.log('=== MESSAGE RESPONSE ===');
            console.log('Full response:', response);
            console.log('Content:', response.content);
            console.log('Sources:', response.sources);
            console.log('Number of sources:', response.sources?.length || 0);

            // Add assistant response to local state
            // Backend returns 'content' field in ChatMessageResponse
            if (response.content) {
                const assistantMessage = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: response.content,
                    timestamp: new Date().toISOString(),
                    sources: response.sources || []
                };
                setMessages(prev => [...prev, assistantMessage]);
            }
        } catch (err) {
            console.error('=== SEND MESSAGE FAILED ===');
            console.error('Error:', err);
            setError(err.message || 'Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    /**
     * Export chat history
     * Requirement 5.10: Generate downloadable file
     */
    const handleExport = async () => {
        if (!sessionId) return;

        try {
            const blob = await chatService.exportHistory(sessionId);
            chatService.downloadHistory(blob, `chat-${sessionId}-${Date.now()}.json`);
        } catch (err) {
            setError(err.message || 'Failed to export chat history');
        }
    };

    /**
     * Start new session handler
     */
    const handleStartSession = () => {
        initializeNewSession();
    };

    /**
     * End chat session
     * Requirement 5.7: Call Backend_API to close session
     */
    const handleEndSession = async () => {
        if (!sessionId) return;

        const confirmed = window.confirm('Are you sure you want to end this chat session? This will clear your chat history.');
        if (!confirmed) return;

        try {
            await chatService.endSession(sessionId);
            setSessionId(null);
            setMessages([]);
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to end session');
        }
    };

    /**
     * Search handler
     * Requirement 5.9: Search chat history
     */
    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
    };

    // Loading state
    if (loading || userLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader text={userLoading ? "Loading user data..." : "Initializing chat session..."} />
            </div>
        );
    }

    // Check if user is loaded
    if (!user) {
        return (
            <div className="flex items-center justify-center h-full">
                <ErrorAlert message="Unable to load user data. Please refresh the page." />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <ChatHeader
                onSearch={handleSearch}
                onExport={handleExport}
                onEndSession={handleEndSession}
                onStartSession={handleStartSession}
                onClearSearch={handleClearSearch}
                searchQuery={searchQuery}
                sessionId={sessionId}
            />

            {/* Error Display */}
            {error && (
                <div className="p-4">
                    <ErrorAlert message={error} onDismiss={() => setError(null)} />
                </div>
            )}

            {/* Loading History */}
            {isLoadingHistory && (
                <div className="p-4 text-center">
                    <Loader size={30} text="Loading chat history..." />
                </div>
            )}

            {/* No Session Welcome Message */}
            {!sessionId && !loading && (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                    <div className="text-center max-w-md px-4">
                        <div className="text-6xl mb-4">💬</div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Chat Assistant</h3>
                        <p className="text-gray-600 mb-6">
                            Get instant answers to your agricultural questions. Start a new session to begin chatting with our AI assistant.
                        </p>
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleStartSession}
                        >
                            <FaPlus size={16} className="mr-2" />
                            Start New Session
                        </Button>
                    </div>
                </div>
            )}

            {/* Message List - Only show when session exists */}
            {sessionId && (
                <>
                    {/* Requirements: 5.3, 5.4, 5.8 */}
                    <MessageList
                        messages={filteredMessages}
                        isTyping={isSending}
                    />

                    {/* Chat Input */}
                    {/* Requirement: 5.2 */}
                    <ChatInput
                        onSendMessage={handleSendMessage}
                        disabled={!sessionId || loading || isSending}
                        language={user?.preferred_language || 'en'}
                    />
                </>
            )}
        </div>
    );
}
