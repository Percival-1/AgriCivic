import { useState } from 'react'
import { FaCopy, FaCheck, FaEdit, FaSave, FaTimes, FaDownload } from 'react-icons/fa'
import { speechService } from '../../api/services'

/**
 * TranscriptionResult Component
 * Displays transcribed text with editing and copy functionality
 * 
 * @param {string} text - Transcribed text
 * @param {number} confidence - Confidence score (0-1)
 * @param {string} language - Language of transcription
 * @param {Function} onTextChange - Callback when text is edited
 * @param {boolean} editable - Allow editing transcription (default: true)
 */
const TranscriptionResult = ({
    text,
    confidence,
    language,
    onTextChange,
    editable = true,
}) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editedText, setEditedText] = useState(text)
    const [isCopied, setIsCopied] = useState(false)

    /**
     * Handle copy to clipboard
     */
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(editedText)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    /**
     * Handle edit mode toggle
     */
    const handleEdit = () => {
        setIsEditing(true)
    }

    /**
     * Handle save edited text
     */
    const handleSave = () => {
        setIsEditing(false)
        onTextChange?.(editedText)
    }

    /**
     * Handle cancel editing
     */
    const handleCancel = () => {
        setEditedText(text)
        setIsEditing(false)
    }

    /**
     * Handle text change in textarea
     */
    const handleTextChange = (e) => {
        setEditedText(e.target.value)
    }

    /**
     * Handle download as text file
     */
    const handleDownload = () => {
        const blob = new Blob([editedText], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `transcription-${Date.now()}.txt`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    /**
     * Get confidence level and color
     */
    const confidenceLevel = speechService.getConfidenceLevel(confidence)
    const confidenceColor = speechService.getConfidenceColor(confidence)

    /**
     * Get word count
     */
    const wordCount = editedText.trim().split(/\s+/).filter(Boolean).length

    /**
     * Get character count
     */
    const charCount = editedText.length

    return (
        <div className="transcription-result bg-white rounded-lg shadow-md p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                    Transcription Result
                </h3>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {!isEditing && editable && (
                        <button
                            onClick={handleEdit}
                            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                            title="Edit transcription"
                        >
                            <FaEdit size={18} />
                        </button>
                    )}

                    {isEditing && (
                        <>
                            <button
                                onClick={handleSave}
                                className="p-2 text-green-600 hover:text-green-700 transition-colors"
                                title="Save changes"
                            >
                                <FaSave size={18} />
                            </button>
                            <button
                                onClick={handleCancel}
                                className="p-2 text-red-600 hover:text-red-700 transition-colors"
                                title="Cancel editing"
                            >
                                <FaTimes size={18} />
                            </button>
                        </>
                    )}

                    {!isEditing && (
                        <>
                            <button
                                onClick={handleCopy}
                                className={`p-2 transition-colors ${isCopied
                                        ? 'text-green-600'
                                        : 'text-gray-600 hover:text-blue-600'
                                    }`}
                                title="Copy to clipboard"
                            >
                                {isCopied ? <FaCheck size={18} /> : <FaCopy size={18} />}
                            </button>

                            <button
                                onClick={handleDownload}
                                className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                                title="Download as text file"
                            >
                                <FaDownload size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Confidence Score */}
            {confidence !== undefined && confidence !== null && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                            Confidence Score:
                        </span>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${confidenceColor}`}>
                                {confidenceLevel}
                            </span>
                            <span className="text-sm text-gray-500">
                                ({(confidence * 100).toFixed(1)}%)
                            </span>
                        </div>
                    </div>

                    {/* Confidence Bar */}
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all duration-300 ${confidence >= 0.9
                                    ? 'bg-green-500'
                                    : confidence >= 0.7
                                        ? 'bg-yellow-500'
                                        : confidence >= 0.5
                                            ? 'bg-orange-500'
                                            : 'bg-red-500'
                                }`}
                            style={{ width: `${confidence * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Language Info */}
            {language && (
                <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                        Language: {language.toUpperCase()}
                    </span>
                </div>
            )}

            {/* Transcription Text */}
            <div className="mb-4">
                {isEditing ? (
                    <textarea
                        value={editedText}
                        onChange={handleTextChange}
                        className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                        placeholder="Edit transcription..."
                    />
                ) : (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[200px] whitespace-pre-wrap">
                        {editedText || (
                            <span className="text-gray-400 italic">No transcription text</span>
                        )}
                    </div>
                )}
            </div>

            {/* Statistics */}
            <div className="flex items-center gap-6 text-sm text-gray-600">
                <div>
                    <span className="font-medium">Words:</span>{' '}
                    <span className="text-gray-800">{wordCount}</span>
                </div>
                <div>
                    <span className="font-medium">Characters:</span>{' '}
                    <span className="text-gray-800">{charCount}</span>
                </div>
            </div>

            {/* Copy Success Message */}
            {isCopied && (
                <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-600 text-sm text-center">
                        ✓ Copied to clipboard!
                    </p>
                </div>
            )}

            {/* Low Confidence Warning */}
            {confidence !== undefined && confidence < 0.5 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-700 text-sm">
                        ⚠️ Low confidence score. Please review and edit the transcription for accuracy.
                    </p>
                </div>
            )}
        </div>
    )
}

export default TranscriptionResult
