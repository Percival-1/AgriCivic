import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Custom hook for audio recording functionality
 * Provides microphone recording with pause/resume controls
 * 
 * @returns {object} Audio recorder state and controls
 */
export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [audioBlob, setAudioBlob] = useState(null)
    const [error, setError] = useState(null)

    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])
    const timerRef = useRef(null)
    const streamRef = useRef(null)

    /**
     * Start recording audio from microphone
     */
    const startRecording = useCallback(async () => {
        try {
            setError(null)

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                }
            })

            streamRef.current = stream

            // Determine supported MIME type
            let mimeType = 'audio/webm'
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus'
            } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
                mimeType = 'audio/ogg;codecs=opus'
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4'
            }

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType })
            chunksRef.current = []

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType })
                setAudioBlob(blob)

                // Stop all tracks
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((track) => track.stop())
                    streamRef.current = null
                }
            }

            mediaRecorderRef.current.onerror = (e) => {
                console.error('MediaRecorder error:', e)
                setError('Recording error occurred')
                stopRecording()
            }

            mediaRecorderRef.current.start(100) // Collect data every 100ms
            setIsRecording(true)
            setIsPaused(false)
            setRecordingTime(0)
            setAudioBlob(null)

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1)
            }, 1000)
        } catch (err) {
            console.error('Error starting recording:', err)

            if (err.name === 'NotAllowedError') {
                setError('Microphone access denied. Please allow microphone access.')
            } else if (err.name === 'NotFoundError') {
                setError('No microphone found. Please connect a microphone.')
            } else {
                setError('Failed to start recording. Please try again.')
            }
        }
    }, [])

    /**
     * Stop recording audio
     */
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            setIsPaused(false)

            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }, [isRecording])

    /**
     * Pause recording audio
     */
    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording && !isPaused) {
            mediaRecorderRef.current.pause()
            setIsPaused(true)

            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }, [isRecording, isPaused])

    /**
     * Resume recording audio
     */
    const resumeRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording && isPaused) {
            mediaRecorderRef.current.resume()
            setIsPaused(false)

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1)
            }, 1000)
        }
    }, [isRecording, isPaused])

    /**
     * Reset recording state
     */
    const resetRecording = useCallback(() => {
        setAudioBlob(null)
        setRecordingTime(0)
        setError(null)
        chunksRef.current = []
    }, [])

    /**
     * Cancel recording and cleanup
     */
    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            // Stop without saving
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }

            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop())
                streamRef.current = null
            }

            mediaRecorderRef.current = null
            setIsRecording(false)
            setIsPaused(false)
            setRecordingTime(0)
            setAudioBlob(null)
            chunksRef.current = []
        }
    }, [isRecording])

    /**
     * Format recording time for display
     */
    const formatTime = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }, [])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop())
            }
        }
    }, [])

    return {
        isRecording,
        isPaused,
        recordingTime,
        audioBlob,
        error,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        resetRecording,
        cancelRecording,
        formatTime,
    }
}

export default useAudioRecorder
