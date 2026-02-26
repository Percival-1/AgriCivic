import { useState, useRef } from 'react'
import { FaUpload, FaFileAudio, FaTimes, FaPlay, FaPause } from 'react-icons/fa'
import { ClipLoader } from 'react-spinners'
import { speechService } from '../../api/services'

/**
 * AudioUpload Component
 * Provides drag-and-drop and file selection for audio uploads
 * 
 * @param {Function} onFileSelect - Callback when file is selected
 * @param {Function} onFileRemove - Callback when file is removed
 * @param {boolean} showPreview - Show audio preview player (default: true)
 * @param {number} maxSizeMB - Maximum file size in MB (default: 10)
 * @param {boolean} multiple - Allow multiple file selection (default: false)
 */
const AudioUpload = ({
    onFileSelect,
    onFileRemove,
    showPreview = true,
    maxSizeMB = 10,
    multiple = false,
}) => {
    const [selectedFile, setSelectedFile] = useState(null)
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isUploading, setIsUploading] = useState(false)

    const fileInputRef = useRef(null)
    const audioRef = useRef(null)

    /**
     * Handle file selection
     */
    const handleFileSelect = (files) => {
        setError(null)

        if (!files || files.length === 0) return

        const file = files[0] // Take first file if multiple not allowed

        try {
            // Validate file
            speechService.validateAudioFile(file, maxSizeMB)

            setSelectedFile(file)
            onFileSelect?.(file)
        } catch (err) {
            setError(err.message)
            setSelectedFile(null)
        }
    }

    /**
     * Handle file input change
     */
    const handleInputChange = (e) => {
        handleFileSelect(e.target.files)
    }

    /**
     * Handle drag over
     */
    const handleDragOver = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    /**
     * Handle drag leave
     */
    const handleDragLeave = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    /**
     * Handle drop
     */
    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const files = e.dataTransfer.files
        handleFileSelect(files)
    }

    /**
     * Handle click to open file dialog
     */
    const handleClick = () => {
        fileInputRef.current?.click()
    }

    /**
     * Handle file remove
     */
    const handleRemove = () => {
        setSelectedFile(null)
        setError(null)
        setIsPlaying(false)
        setUploadProgress(0)
        setIsUploading(false)

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }

        onFileRemove?.()
    }

    /**
     * Handle audio play/pause
     */
    const handlePlayPause = () => {
        if (!audioRef.current) return

        if (isPlaying) {
            audioRef.current.pause()
            setIsPlaying(false)
        } else {
            audioRef.current.play()
            setIsPlaying(true)
        }
    }

    /**
     * Handle audio ended
     */
    const handleAudioEnded = () => {
        setIsPlaying(false)
    }

    /**
     * Get file extension
     */
    const getFileExtension = (filename) => {
        return filename.split('.').pop().toUpperCase()
    }

    /**
     * Format file size
     */
    const formatFileSize = (bytes) => {
        return speechService.formatFileSize(bytes)
    }

    /**
     * Simulate upload progress (for demo purposes)
     */
    const simulateUpload = () => {
        setIsUploading(true)
        setUploadProgress(0)

        const interval = setInterval(() => {
            setUploadProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval)
                    setIsUploading(false)
                    return 100
                }
                return prev + 10
            })
        }, 200)
    }

    return (
        <div className="audio-upload">
            {/* Error Display */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            {/* Upload Area */}
            {!selectedFile && (
                <div
                    className={`
                        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                        transition-colors duration-200
                        ${isDragging
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                        }
                    `}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleClick}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleInputChange}
                        multiple={multiple}
                        className="hidden"
                    />

                    <FaUpload className="mx-auto text-4xl text-gray-400 mb-4" />

                    <p className="text-lg font-medium text-gray-700 mb-2">
                        {isDragging ? 'Drop audio file here' : 'Drag & drop audio file here'}
                    </p>

                    <p className="text-sm text-gray-500 mb-4">or click to browse</p>

                    <div className="text-xs text-gray-400">
                        <p>Supported formats: WAV, MP3, OGG, WebM, FLAC, M4A</p>
                        <p>Maximum file size: {maxSizeMB}MB</p>
                    </div>
                </div>
            )}

            {/* Selected File Display */}
            {selectedFile && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                        {/* File Icon */}
                        <div className="flex-shrink-0">
                            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FaFileAudio className="text-3xl text-blue-500" />
                            </div>
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-800 truncate">
                                        {selectedFile.name}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                                            {getFileExtension(selectedFile.name)}
                                        </span>
                                        <span>{formatFileSize(selectedFile.size)}</span>
                                    </div>
                                </div>

                                {/* Remove Button */}
                                <button
                                    onClick={handleRemove}
                                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Remove file"
                                >
                                    <FaTimes size={18} />
                                </button>
                            </div>

                            {/* Upload Progress */}
                            {isUploading && (
                                <div className="mt-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-600">Uploading...</span>
                                        <span className="text-sm font-medium text-blue-600">
                                            {uploadProgress}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Audio Preview */}
                            {showPreview && !isUploading && (
                                <div className="mt-3">
                                    <audio
                                        ref={audioRef}
                                        src={URL.createObjectURL(selectedFile)}
                                        onEnded={handleAudioEnded}
                                        className="hidden"
                                    />

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handlePlayPause}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                                        >
                                            {isPlaying ? (
                                                <>
                                                    <FaPause size={14} />
                                                    <span>Pause</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaPlay size={14} />
                                                    <span>Play Preview</span>
                                                </>
                                            )}
                                        </button>

                                        {isPlaying && (
                                            <ClipLoader size={16} color="#3b82f6" />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Instructions */}
            {selectedFile && !isUploading && (
                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                        File ready for transcription
                    </p>
                </div>
            )}
        </div>
    )
}

export default AudioUpload
