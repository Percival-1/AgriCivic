import { useState, useEffect } from 'react'
import { FaMicrophone, FaFileAudio, FaVolumeUp, FaInfoCircle } from 'react-icons/fa'
import { AudioRecorder, AudioUpload, TranscriptionResult, TextToSpeech } from '../../components/speech'
import { speechService } from '../../api/services'
import { ClipLoader } from 'react-spinners'

/**
 * SpeechServices Page
 * Provides speech-to-text and text-to-speech functionality
 */
export default function SpeechServices() {
    const [activeTab, setActiveTab] = useState('stt') // 'stt' or 'tts'
    const [transcriptionMode, setTranscriptionMode] = useState('upload') // 'upload' or 'record'

    // Speech-to-Text state
    const [selectedAudioFile, setSelectedAudioFile] = useState(null)
    const [recordedAudio, setRecordedAudio] = useState(null)
    const [transcriptionResult, setTranscriptionResult] = useState(null)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [transcriptionError, setTranscriptionError] = useState(null)

    // Batch transcription state
    const [batchFiles, setBatchFiles] = useState([])
    const [batchResults, setBatchResults] = useState([])
    const [isBatchProcessing, setIsBatchProcessing] = useState(false)

    // Supported formats and languages
    const [supportedFormats, setSupportedFormats] = useState([])
    const [supportedLanguages, setSupportedLanguages] = useState([
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
        { code: 'bn', name: 'Bengali' },
        { code: 'ta', name: 'Tamil' },
        { code: 'te', name: 'Telugu' },
        { code: 'mr', name: 'Marathi' },
        { code: 'gu', name: 'Gujarati' },
    ])
    const [selectedLanguage, setSelectedLanguage] = useState('en')

    // Audio library (saved recordings)
    const [audioLibrary, setAudioLibrary] = useState([])

    // Load supported formats and languages on mount
    useEffect(() => {
        loadSupportedData()
        loadAudioLibrary()
    }, [])

    /**
     * Load supported formats and languages
     */
    const loadSupportedData = async () => {
        try {
            const [formatsData, languagesData] = await Promise.all([
                speechService.getSupportedFormats(),
                speechService.getSupportedLanguages(),
            ])

            if (formatsData.formats && formatsData.formats.length > 0) {
                setSupportedFormats(formatsData.formats)
            }

            if (languagesData.languages && languagesData.languages.length > 0) {
                setSupportedLanguages(languagesData.languages)
            }
        } catch (err) {
            console.error('Failed to load supported data:', err)
            // Keep default languages if API fails
        }
    }

    /**
     * Load audio library from localStorage
     */
    const loadAudioLibrary = () => {
        try {
            const saved = localStorage.getItem('audioLibrary')
            if (saved) {
                setAudioLibrary(JSON.parse(saved))
            }
        } catch (err) {
            console.error('Failed to load audio library:', err)
        }
    }

    /**
     * Save audio to library
     */
    const saveToLibrary = (audioBlob, transcription) => {
        const newEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            transcription: transcription,
            size: audioBlob.size,
        }

        const updated = [newEntry, ...audioLibrary].slice(0, 20) // Keep last 20
        setAudioLibrary(updated)
        localStorage.setItem('audioLibrary', JSON.stringify(updated))
    }

    /**
     * Handle file selection for upload
     */
    const handleFileSelect = (file) => {
        setSelectedAudioFile(file)
        setTranscriptionResult(null)
        setTranscriptionError(null)
    }

    /**
     * Handle file removal
     */
    const handleFileRemove = () => {
        setSelectedAudioFile(null)
        setTranscriptionResult(null)
        setTranscriptionError(null)
    }

    /**
     * Handle recording complete
     */
    const handleRecordingComplete = (audioBlob) => {
        setRecordedAudio(audioBlob)
        setTranscriptionResult(null)
        setTranscriptionError(null)
    }

    /**
     * Handle recording cancel
     */
    const handleRecordingCancel = () => {
        setRecordedAudio(null)
        setTranscriptionResult(null)
        setTranscriptionError(null)
    }

    /**
     * Handle transcribe audio
     */
    const handleTranscribe = async () => {
        const audioFile = transcriptionMode === 'upload' ? selectedAudioFile : recordedAudio

        if (!audioFile) {
            setTranscriptionError('Please select or record an audio file')
            return
        }

        setIsTranscribing(true)
        setTranscriptionError(null)
        setTranscriptionResult(null)

        try {
            // Convert blob to file if needed
            const file = audioFile instanceof Blob && !(audioFile instanceof File)
                ? new File([audioFile], `recording-${Date.now()}.webm`, { type: audioFile.type })
                : audioFile

            const result = await speechService.transcribeAudio(file, selectedLanguage)

            setTranscriptionResult({
                text: result.text,
                confidence: result.confidence,
                language: result.language || selectedLanguage,
            })

            // Save to library
            saveToLibrary(audioFile, result.text)
        } catch (err) {
            console.error('Transcription error:', err)
            setTranscriptionError(err.message || 'Failed to transcribe audio')
        } finally {
            setIsTranscribing(false)
        }
    }

    /**
     * Handle transcription text change
     */
    const handleTranscriptionChange = (newText) => {
        setTranscriptionResult((prev) => ({
            ...prev,
            text: newText,
        }))
    }

    /**
     * Handle TTS synthesis complete
     */
    const handleSynthesisComplete = (audioBlob) => {
        console.log('Speech synthesis complete:', audioBlob)
    }

    return (
        <div className="speech-services-page p-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Speech Services
                </h1>
                <p className="text-gray-600">
                    Convert speech to text and text to speech
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 border-b border-gray-200">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('stt')}
                        className={`
                            flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors
                            ${activeTab === 'stt'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-800'
                            }
                        `}
                    >
                        <FaMicrophone />
                        <span>Speech-to-Text</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('tts')}
                        className={`
                            flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors
                            ${activeTab === 'tts'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-800'
                            }
                        `}
                    >
                        <FaVolumeUp />
                        <span>Text-to-Speech</span>
                    </button>
                </div>
            </div>

            {/* Speech-to-Text Tab */}
            {activeTab === 'stt' && (
                <div className="space-y-6">
                    {/* Supported Formats and Languages Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <FaInfoCircle className="text-blue-500 text-xl flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-medium text-blue-900 mb-2">
                                    Supported Formats & Languages
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                                    <div>
                                        <span className="font-medium">Formats:</span>{' '}
                                        {supportedFormats.length > 0
                                            ? supportedFormats.join(', ')
                                            : 'WAV, MP3, OGG, WebM, FLAC, M4A'
                                        }
                                    </div>
                                    <div>
                                        <span className="font-medium">Languages:</span>{' '}
                                        {supportedLanguages.length > 0
                                            ? `${supportedLanguages.length} languages supported`
                                            : 'Multiple languages'
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Language Selector */}
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Language
                        </label>
                        <select
                            id="language-select"
                            name="language"
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="w-full md:w-64 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {supportedLanguages.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Transcription Mode Toggle */}
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="flex gap-4">
                            <button
                                onClick={() => setTranscriptionMode('upload')}
                                className={`
                                    flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors
                                    ${transcriptionMode === 'upload'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }
                                `}
                            >
                                <FaFileAudio />
                                <span>Upload Audio</span>
                            </button>

                            <button
                                onClick={() => setTranscriptionMode('record')}
                                className={`
                                    flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors
                                    ${transcriptionMode === 'record'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }
                                `}
                            >
                                <FaMicrophone />
                                <span>Record Audio</span>
                            </button>
                        </div>
                    </div>

                    {/* Audio Input */}
                    <div>
                        {transcriptionMode === 'upload' ? (
                            <AudioUpload
                                onFileSelect={handleFileSelect}
                                onFileRemove={handleFileRemove}
                                showPreview={true}
                                maxSizeMB={10}
                            />
                        ) : (
                            <AudioRecorder
                                onRecordingComplete={handleRecordingComplete}
                                onCancel={handleRecordingCancel}
                                maxDuration={300}
                            />
                        )}
                    </div>

                    {/* Transcribe Button */}
                    {(selectedAudioFile || recordedAudio) && (
                        <div>
                            <button
                                onClick={handleTranscribe}
                                disabled={isTranscribing}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {isTranscribing ? (
                                    <>
                                        <ClipLoader size={20} color="#ffffff" />
                                        <span>Transcribing...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaMicrophone size={20} />
                                        <span>Transcribe Audio</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Transcription Error */}
                    {transcriptionError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600">{transcriptionError}</p>
                        </div>
                    )}

                    {/* Transcription Result */}
                    {transcriptionResult && (
                        <TranscriptionResult
                            text={transcriptionResult.text}
                            confidence={transcriptionResult.confidence}
                            language={transcriptionResult.language}
                            onTextChange={handleTranscriptionChange}
                            editable={true}
                        />
                    )}

                    {/* Audio Library */}
                    {audioLibrary.length > 0 && (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                Recent Transcriptions
                            </h3>
                            <div className="space-y-3">
                                {audioLibrary.slice(0, 5).map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs text-gray-500">
                                                {new Date(entry.timestamp).toLocaleString()}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {speechService.formatFileSize(entry.size)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 line-clamp-2">
                                            {entry.transcription}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Text-to-Speech Tab */}
            {activeTab === 'tts' && (
                <div>
                    <TextToSpeech
                        initialText=""
                        onSynthesisComplete={handleSynthesisComplete}
                    />
                </div>
            )}
        </div>
    )
}
