import { useState, useEffect } from 'react'
import { FaMicrophone, FaStop, FaTimes, FaPaperPlane, FaPlay, FaPause } from 'react-icons/fa'
import { ClipLoader } from 'react-spinners'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { speechService } from '../../api/services'

const VoiceMessageButton = ({ onSendVoiceMessage, onTranscriptionReady, disabled = false, language = 'en' }) => {
    const {
        isRecording,
        recordingTime,
        audioBlob,
        error,
        startRecording,
        stopRecording,
        cancelRecording,
        resetRecording,
        formatTime,
    } = useAudioRecorder()

    const [isProcessing, setIsProcessing] = useState(false)
    const [transcription, setTranscription] = useState(null)
    const [showTranscription, setShowTranscription] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [audioElement, setAudioElement] = useState(null)

    // Auto-transcribe when recording stops
    useEffect(() => {
        console.log('=== Auto-transcribe useEffect triggered ===')
        console.log('audioBlob:', !!audioBlob)
        console.log('isRecording:', isRecording)
        console.log('isProcessing:', isProcessing)

        if (audioBlob && !isRecording && !isProcessing) {
            console.log('Conditions met, calling handleTranscribe()')
            handleTranscribe()
        } else {
            console.log('Conditions NOT met for auto-transcribe')
        }
    }, [audioBlob, isRecording])

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioElement) {
                audioElement.pause()
                URL.revokeObjectURL(audioElement.src)
            }
        }
    }, [audioElement])

    const handleStartRecording = async () => {
        try {
            setTranscription(null)
            setShowTranscription(false)
            await startRecording()
        } catch (err) {
            console.error('Failed to start recording:', err)
        }
    }

    const handleStopRecording = () => {
        stopRecording()
    }

    const handleCancel = () => {
        console.log('Cancel clicked - resetting all state')
        if (audioElement) {
            audioElement.pause()
            URL.revokeObjectURL(audioElement.src)
            setAudioElement(null)
        }
        // Use resetRecording instead of cancelRecording to properly reset state
        resetRecording()
        setTranscription(null)
        setShowTranscription(false)
        setIsPlaying(false)
        setIsProcessing(false)
    }

    const handleTranscribe = async () => {
        console.log('=== handleTranscribe called ===')
        console.log('audioBlob exists:', !!audioBlob)
        console.log('audioBlob type:', audioBlob?.type)
        console.log('audioBlob size:', audioBlob?.size)

        if (!audioBlob) {
            console.log('No audioBlob, returning early')
            return
        }

        setIsProcessing(true)
        console.log('Processing state set to true')

        try {
            const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
                type: audioBlob.type || 'audio/webm',
            })

            console.log('Created audio file:', {
                name: audioFile.name,
                type: audioFile.type,
                size: audioFile.size,
                lastModified: audioFile.lastModified
            })

            console.log('Calling speechService.transcribeAudio...')
            console.log('Language hint:', language)
            const result = await speechService.transcribeAudio(audioFile, language)
            console.log('API call completed, result:', result)

            const transcribedText = result.text
            console.log('Transcribed text:', transcribedText)

            setTranscription(transcribedText)
            setShowTranscription(true)
            console.log('Local state updated with transcription')

            // Call the callback to populate chat input
            if (onTranscriptionReady) {
                console.log('Calling onTranscriptionReady callback with:', transcribedText)
                onTranscriptionReady(transcribedText)
            } else {
                console.log('WARNING: onTranscriptionReady callback is not defined!')
            }
        } catch (err) {
            console.error('=== Transcription ERROR ===')
            console.error('Error object:', err)
            console.error('Error message:', err.message)
            console.error('Error status:', err.status)
            console.error('Error data:', err.data)

            const fallbackText = '[Transcription failed - you can edit the text]'
            setTranscription(fallbackText)
            setShowTranscription(true)

            // Populate the input field with fallback text so user can edit
            if (onTranscriptionReady) {
                console.log('Transcription failed, calling onTranscriptionReady with fallback text')
                onTranscriptionReady(fallbackText)
            }
        } finally {
            setIsProcessing(false)
            console.log('=== handleTranscribe completed ===')
        }
    }

    const handlePlayPause = () => {
        if (!audioBlob) return

        if (!audioElement) {
            const audio = new Audio(URL.createObjectURL(audioBlob))
            audio.onended = () => setIsPlaying(false)
            setAudioElement(audio)
            audio.play()
            setIsPlaying(true)
        } else {
            if (isPlaying) {
                audioElement.pause()
                setIsPlaying(false)
            } else {
                audioElement.play()
                setIsPlaying(true)
            }
        }
    }

    const handleSend = () => {
        if (!audioBlob || !transcription) return

        console.log('Sending voice message with transcription:', transcription)
        onSendVoiceMessage({
            audio: audioBlob,
            transcription: transcription,
        })

        // Clean up and reset
        if (audioElement) {
            audioElement.pause()
            URL.revokeObjectURL(audioElement.src)
            setAudioElement(null)
        }
        resetRecording()
        setTranscription(null)
        setShowTranscription(false)
        setIsPlaying(false)
        setIsProcessing(false)
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                <span className="text-red-600 text-sm">{error}</span>
                <button onClick={handleCancel} className="text-red-600 hover:text-red-700">
                    <FaTimes size={16} />
                </button>
            </div>
        )
    }

    if (!isRecording && !audioBlob) {
        return (
            <button
                onClick={handleStartRecording}
                disabled={disabled}
                className="flex-shrink-0 p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Record voice message"
            >
                <FaMicrophone size={20} />
            </button>
        )
    }

    if (isRecording) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                <ClipLoader size={16} color="#ef4444" />
                <span className="text-sm font-medium text-red-600">{formatTime(recordingTime)}</span>
                <button onClick={handleStopRecording} className="p-2 text-red-600 hover:text-red-700" title="Stop">
                    <FaStop size={16} />
                </button>
                <button
                    onClick={() => {
                        console.log('Cancel during recording')
                        cancelRecording()
                        setTranscription(null)
                        setShowTranscription(false)
                        setIsPlaying(false)
                        setIsProcessing(false)
                    }}
                    className="p-2 text-gray-600 hover:text-gray-700"
                    title="Cancel"
                >
                    <FaTimes size={16} />
                </button>
            </div>
        )
    }

    if (isProcessing) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                <ClipLoader size={16} color="#3b82f6" />
                <span className="text-sm font-medium text-blue-600">Transcribing...</span>
            </div>
        )
    }

    if (audioBlob && !isRecording && showTranscription) {
        return (
            <div className="flex items-center gap-2">
                <button onClick={handlePlayPause} className="p-2 text-blue-600 hover:text-blue-700" title={isPlaying ? "Pause" : "Play"}>
                    {isPlaying ? <FaPause size={16} /> : <FaPlay size={16} />}
                </button>
                <div className="px-2 py-1 bg-green-50 rounded text-xs text-green-700">
                    ✓ Transcribed
                </div>
                <button onClick={handleSend} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600" title="Send">
                    <FaPaperPlane size={16} />
                </button>
                <button onClick={handleCancel} className="p-2 text-gray-600 hover:text-red-600" title="Cancel">
                    <FaTimes size={16} />
                </button>
            </div>
        )
    }

    return null
}

export default VoiceMessageButton
