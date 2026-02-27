import { useEffect, useRef } from 'react'
import { FaMicrophone, FaStop, FaPause, FaPlay, FaTimes } from 'react-icons/fa'
import { ClipLoader } from 'react-spinners'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'

/**
 * AudioRecorder Component
 * Provides microphone recording functionality with controls
 * 
 * @param {Function} onRecordingComplete - Callback when recording is complete
 * @param {Function} onCancel - Callback when recording is cancelled
 * @param {number} maxDuration - Maximum recording duration in seconds (default: 300)
 */
const AudioRecorder = ({ onRecordingComplete, onCancel, maxDuration = 300 }) => {
    const {
        isRecording,
        isPaused,
        recordingTime,
        audioBlob,
        error,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        cancelRecording,
        formatTime,
    } = useAudioRecorder()

    const canvasRef = useRef(null)
    const animationRef = useRef(null)
    const analyserRef = useRef(null)
    const audioContextRef = useRef(null)

    // Initialize audio visualization
    useEffect(() => {
        if (isRecording && !isPaused) {
            initializeVisualization()
        } else {
            stopVisualization()
        }

        return () => stopVisualization()
    }, [isRecording, isPaused])

    // Auto-stop at max duration
    useEffect(() => {
        if (recordingTime >= maxDuration && isRecording) {
            stopRecording()
        }
    }, [recordingTime, maxDuration, isRecording, stopRecording])

    // Handle recording completion
    useEffect(() => {
        if (audioBlob && !isRecording) {
            onRecordingComplete?.(audioBlob)
        }
    }, [audioBlob, isRecording, onRecordingComplete])

    /**
     * Initialize audio waveform visualization
     */
    const initializeVisualization = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
            analyserRef.current = audioContextRef.current.createAnalyser()
            const source = audioContextRef.current.createMediaStreamSource(stream)

            source.connect(analyserRef.current)
            analyserRef.current.fftSize = 256

            const bufferLength = analyserRef.current.frequencyBinCount
            const dataArray = new Uint8Array(bufferLength)

            drawWaveform(dataArray, bufferLength)
        } catch (err) {
            console.error('Visualization error:', err)
        }
    }

    /**
     * Draw audio waveform on canvas
     */
    const drawWaveform = (dataArray, bufferLength) => {
        const canvas = canvasRef.current
        if (!canvas || !analyserRef.current) return

        const canvasCtx = canvas.getContext('2d')
        const WIDTH = canvas.width
        const HEIGHT = canvas.height

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw)

            analyserRef.current.getByteTimeDomainData(dataArray)

            canvasCtx.fillStyle = 'rgb(243, 244, 246)' // gray-100
            canvasCtx.fillRect(0, 0, WIDTH, HEIGHT)

            canvasCtx.lineWidth = 2
            canvasCtx.strokeStyle = 'rgb(59, 130, 246)' // blue-500
            canvasCtx.beginPath()

            const sliceWidth = (WIDTH * 1.0) / bufferLength
            let x = 0

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0
                const y = (v * HEIGHT) / 2

                if (i === 0) {
                    canvasCtx.moveTo(x, y)
                } else {
                    canvasCtx.lineTo(x, y)
                }

                x += sliceWidth
            }

            canvasCtx.lineTo(WIDTH, HEIGHT / 2)
            canvasCtx.stroke()
        }

        draw()
    }

    /**
     * Stop visualization and cleanup
     */
    const stopVisualization = () => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
            animationRef.current = null
        }
        if (audioContextRef.current) {
            audioContextRef.current.close()
            audioContextRef.current = null
        }
    }

    /**
     * Handle start recording button click
     */
    const handleStart = () => {
        startRecording()
    }

    /**
     * Handle stop recording button click
     */
    const handleStop = () => {
        stopRecording()
    }

    /**
     * Handle pause recording button click
     */
    const handlePause = () => {
        pauseRecording()
    }

    /**
     * Handle resume recording button click
     */
    const handleResume = () => {
        resumeRecording()
    }

    /**
     * Handle cancel recording button click
     */
    const handleCancel = () => {
        cancelRecording()
        onCancel?.()
    }

    /**
     * Get progress percentage
     */
    const getProgress = () => {
        return (recordingTime / maxDuration) * 100
    }

    return (
        <div className="audio-recorder bg-white rounded-lg shadow-md p-6">
            {/* Error Display */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            {/* Recording Status */}
            <div className="mb-4 text-center">
                {!isRecording && !audioBlob && (
                    <p className="text-gray-600">Click the microphone to start recording</p>
                )}
                {isRecording && !isPaused && (
                    <div className="flex items-center justify-center gap-2">
                        <ClipLoader size={16} color="#ef4444" />
                        <p className="text-red-600 font-medium">Recording...</p>
                    </div>
                )}
                {isRecording && isPaused && (
                    <p className="text-yellow-600 font-medium">Paused</p>
                )}
                {audioBlob && !isRecording && (
                    <p className="text-green-600 font-medium">Recording Complete</p>
                )}
            </div>

            {/* Waveform Visualization */}
            {isRecording && (
                <div className="mb-4">
                    <canvas
                        ref={canvasRef}
                        width={400}
                        height={100}
                        className="w-full border border-gray-200 rounded-lg bg-gray-100"
                    />
                </div>
            )}

            {/* Recording Time and Progress */}
            {(isRecording || audioBlob) && (
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-2xl font-mono font-bold text-gray-800">
                            {formatTime(recordingTime)}
                        </span>
                        <span className="text-sm text-gray-500">
                            / {formatTime(maxDuration)}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getProgress()}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Audio Preview */}
            {audioBlob && !isRecording && (
                <div className="mb-4">
                    <audio
                        src={URL.createObjectURL(audioBlob)}
                        controls
                        className="w-full"
                    />
                </div>
            )}

            {/* Control Buttons */}
            <div className="flex justify-center gap-3">
                {!isRecording && !audioBlob && (
                    <button
                        onClick={handleStart}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        disabled={!!error}
                    >
                        <FaMicrophone size={20} />
                        <span>Start Recording</span>
                    </button>
                )}

                {isRecording && (
                    <>
                        {!isPaused ? (
                            <button
                                onClick={handlePause}
                                className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                            >
                                <FaPause size={20} />
                                <span>Pause</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleResume}
                                className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                                <FaPlay size={20} />
                                <span>Resume</span>
                            </button>
                        )}

                        <button
                            onClick={handleStop}
                            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                            <FaStop size={20} />
                            <span>Stop</span>
                        </button>

                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-2 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            <FaTimes size={20} />
                        </button>
                    </>
                )}
            </div>

            {/* Recording Info */}
            <div className="mt-4 text-center text-xs text-gray-500">
                <p>Maximum recording duration: {formatTime(maxDuration)}</p>
            </div>
        </div>
    )
}

export default AudioRecorder
