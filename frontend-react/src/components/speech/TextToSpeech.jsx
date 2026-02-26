import { useState, useEffect, useRef } from 'react'
import { FaPlay, FaPause, FaStop, FaDownload, FaVolumeUp } from 'react-icons/fa'
import { ClipLoader } from 'react-spinners'
import { speechService } from '../../api/services'

/**
 * TextToSpeech Component
 * Converts text to speech with voice and language selection
 * 
 * @param {string} initialText - Initial text to convert (optional)
 * @param {Function} onSynthesisComplete - Callback when synthesis is complete
 */
const TextToSpeech = ({ initialText = '', onSynthesisComplete }) => {
    const [text, setText] = useState(initialText)
    const [selectedVoice, setSelectedVoice] = useState('default')
    const [selectedLanguage, setSelectedLanguage] = useState('en')
    const [speechSpeed, setSpeechSpeed] = useState(1.0)
    const [voices, setVoices] = useState([])
    const [languages, setLanguages] = useState([
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'ja', name: 'Japanese' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ar', name: 'Arabic' },
    ])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [audioBlob, setAudioBlob] = useState(null)
    const [isPlaying, setIsPlaying] = useState(false)

    const audioRef = useRef(null)

    // Load voices and languages on mount
    useEffect(() => {
        loadVoices()
        loadLanguages()
    }, [])

    // Load voices when language changes
    useEffect(() => {
        if (selectedLanguage) {
            loadVoices(selectedLanguage)
        }
    }, [selectedLanguage])

    /**
     * Load available voices
     */
    const loadVoices = async (language = null) => {
        try {
            const data = await speechService.getSupportedVoices(language)
            setVoices(data.voices || [])
        } catch (err) {
            console.error('Failed to load voices:', err)
        }
    }

    /**
     * Load supported languages
     */
    const loadLanguages = async () => {
        try {
            const data = await speechService.getSupportedLanguages()
            if (data.languages && data.languages.length > 0) {
                setLanguages(data.languages)
            }
            // Keep default languages if API returns empty or fails
        } catch (err) {
            console.error('Failed to load languages:', err)
            // Keep default languages if API fails
        }
    }

    /**
     * Handle text change
     */
    const handleTextChange = (e) => {
        setText(e.target.value)
        setError(null)
    }

    /**
     * Handle voice selection
     */
    const handleVoiceChange = (e) => {
        setSelectedVoice(e.target.value)
    }

    /**
     * Handle language selection
     */
    const handleLanguageChange = (e) => {
        setSelectedLanguage(e.target.value)
        setSelectedVoice('default') // Reset voice when language changes
    }

    /**
     * Handle speed change
     */
    const handleSpeedChange = (e) => {
        setSpeechSpeed(parseFloat(e.target.value))
    }

    /**
     * Handle synthesize speech
     */
    const handleSynthesize = async () => {
        if (!text.trim()) {
            setError('Please enter text to convert to speech')
            return
        }

        setIsLoading(true)
        setError(null)
        setAudioBlob(null)

        try {
            const blob = await speechService.synthesizeSpeech(
                text,
                selectedVoice,
                selectedLanguage,
                speechSpeed
            )

            setAudioBlob(blob)
            onSynthesisComplete?.(blob)
        } catch (err) {
            console.error('Synthesis error:', err)
            setError(err.message || 'Failed to synthesize speech')
        } finally {
            setIsLoading(false)
        }
    }

    /**
     * Handle play audio
     */
    const handlePlay = () => {
        if (audioRef.current) {
            audioRef.current.play()
            setIsPlaying(true)
        }
    }

    /**
     * Handle pause audio
     */
    const handlePause = () => {
        if (audioRef.current) {
            audioRef.current.pause()
            setIsPlaying(false)
        }
    }

    /**
     * Handle stop audio
     */
    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
            setIsPlaying(false)
        }
    }

    /**
     * Handle audio ended
     */
    const handleAudioEnded = () => {
        setIsPlaying(false)
    }

    /**
     * Handle download audio
     */
    const handleDownload = () => {
        if (audioBlob) {
            speechService.downloadAudio(audioBlob, `speech-${Date.now()}.mp3`)
        }
    }

    /**
     * Get character count
     */
    const charCount = text.length
    const maxChars = 5000

    return (
        <div className="text-to-speech bg-white rounded-lg shadow-md p-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <FaVolumeUp className="text-2xl text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-800">
                    Text-to-Speech
                </h3>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            {/* Text Input */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text to Convert
                </label>
                <textarea
                    value={text}
                    onChange={handleTextChange}
                    placeholder="Enter text to convert to speech..."
                    className="w-full min-h-[150px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    maxLength={maxChars}
                />
                <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">
                        {charCount} / {maxChars} characters
                    </span>
                    {charCount > maxChars * 0.9 && (
                        <span className="text-xs text-orange-500">
                            Approaching character limit
                        </span>
                    )}
                </div>
            </div>

            {/* Voice and Language Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Language Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                    </label>
                    <select
                        value={selectedLanguage}
                        onChange={handleLanguageChange}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {languages.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                                {lang.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Voice Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voice
                    </label>
                    <select
                        value={selectedVoice}
                        onChange={handleVoiceChange}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="default">Default Voice</option>
                        {voices.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                                {voice.name} {voice.gender && `(${voice.gender})`}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Speech Speed Slider */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Speech Speed: {speechSpeed.toFixed(1)}x
                </label>
                <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speechSpeed}
                    onChange={handleSpeedChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Slower (0.5x)</span>
                    <span>Normal (1.0x)</span>
                    <span>Faster (2.0x)</span>
                </div>
            </div>

            {/* Synthesize Button */}
            <div className="mb-4">
                <button
                    onClick={handleSynthesize}
                    disabled={isLoading || !text.trim()}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <ClipLoader size={20} color="#ffffff" />
                            <span>Generating Speech...</span>
                        </>
                    ) : (
                        <>
                            <FaVolumeUp size={20} />
                            <span>Generate Speech</span>
                        </>
                    )}
                </button>
            </div>

            {/* Audio Player */}
            {audioBlob && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <audio
                        ref={audioRef}
                        src={URL.createObjectURL(audioBlob)}
                        onEnded={handleAudioEnded}
                        className="hidden"
                    />

                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">
                            Generated Audio
                        </span>
                        <span className="text-xs text-gray-500">
                            {speechService.formatFileSize(audioBlob.size)}
                        </span>
                    </div>

                    {/* Playback Controls */}
                    <div className="flex items-center gap-2">
                        {!isPlaying ? (
                            <button
                                onClick={handlePlay}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                                <FaPlay size={16} />
                                <span>Play</span>
                            </button>
                        ) : (
                            <button
                                onClick={handlePause}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                            >
                                <FaPause size={16} />
                                <span>Pause</span>
                            </button>
                        )}

                        <button
                            onClick={handleStop}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                            <FaStop size={16} />
                            <span>Stop</span>
                        </button>

                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ml-auto"
                        >
                            <FaDownload size={16} />
                            <span>Download</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TextToSpeech
