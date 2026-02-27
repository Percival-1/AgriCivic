import { FaSearch, FaDownload, FaTrash, FaTimes, FaPlus } from 'react-icons/fa';
import Button from '../common/Button';

/**
 * ChatHeader Component
 * 
 * Header with search and export functionality
 * 
 * Requirements: 5.9, 5.10
 */
export default function ChatHeader({
    onSearch,
    onExport,
    onEndSession,
    onStartSession,
    onClearSearch,
    searchQuery = '',
    sessionId
}) {
    return (
        <div className="border-b border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
                {/* Title */}
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Chat Assistant</h2>
                    {sessionId ? (
                        <p className="text-xs text-gray-500">Session: {sessionId.substring(0, 8)}...</p>
                    ) : (
                        <p className="text-xs text-gray-500">No active session</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {sessionId ? (
                        <>
                            {/* Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => onSearch(e.target.value)}
                                    placeholder="Search messages..."
                                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-64"
                                />
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                                {searchQuery && (
                                    <button
                                        onClick={onClearSearch}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <FaTimes size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Export Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onExport}
                                title="Export chat history"
                            >
                                <FaDownload size={14} className="mr-2" />
                                Export
                            </Button>

                            {/* End Session Button */}
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={onEndSession}
                                title="End chat session"
                            >
                                <FaTrash size={14} className="mr-2" />
                                End Session
                            </Button>
                        </>
                    ) : (
                        /* Start Session Button */
                        <Button
                            variant="primary"
                            size="md"
                            onClick={onStartSession}
                            title="Start a new chat session"
                        >
                            <FaPlus size={14} className="mr-2" />
                            Start New Session
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
