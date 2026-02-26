import { useState, useEffect } from 'react';
import {
    FaLanguage,
    FaExchangeAlt,
    FaClipboard,
    FaTrash,
    FaPlus,
    FaDownload,
} from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import translationService from '../../api/services/translationService';
import Card from '../../components/common/Card';
import ErrorAlert from '../../components/common/ErrorAlert';
import Button from '../../components/common/Button';

export default function Translation() {
    const [activeTab, setActiveTab] = useState('single'); // 'single' or 'batch'
    const [supportedLanguages, setSupportedLanguages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Single translation state
    const [singleText, setSingleText] = useState('');
    const [singleSourceLang, setSingleSourceLang] = useState('');
    const [singleTargetLang, setSingleTargetLang] = useState('en');
    const [singleResult, setSingleResult] = useState(null);

    // Batch translation state
    const [batchTexts, setBatchTexts] = useState(['']);
    const [batchSourceLang, setBatchSourceLang] = useState('');
    const [batchTargetLang, setBatchTargetLang] = useState('en');
    const [batchResults, setBatchResults] = useState([]);

    // Language detection state
    const [detectText, setDetectText] = useState('');
    const [detectResult, setDetectResult] = useState(null);

    useEffect(() => {
        fetchSupportedLanguages();
    }, []);

    const fetchSupportedLanguages = async () => {
        try {
            const response = await translationService.getSupportedLanguages();
            // API returns { languages: ['en', 'hi', 'ta', ...], total_count: N }
            const languageCodes = response.languages || [];

            // Create language objects with names
            const languageObjects = languageCodes.map(code => ({
                code: code,
                name: getLanguageNameFromCode(code),
                native_name: getLanguageNameFromCode(code)
            }));

            setSupportedLanguages(languageObjects);
        } catch (err) {
            console.error('Error fetching supported languages:', err);
            setError('Failed to load supported languages');
        }
    };

    // Helper function to get language name from code
    const getLanguageNameFromCode = (code) => {
        const languageNames = {
            'en': 'English',
            'hi': 'Hindi (हिंदी)',
            'ta': 'Tamil (தமிழ்)',
            'te': 'Telugu (తెలుగు)',
            'bn': 'Bengali (বাংলা)',
            'mr': 'Marathi (मराठी)',
            'gu': 'Gujarati (ગુજરાતી)',
            'kn': 'Kannada (ಕನ್ನಡ)',
            'ml': 'Malayalam (മലയാളം)',
            'pa': 'Punjabi (ਪੰਜਾਬੀ)',
            'or': 'Odia (ଓଡ଼ିଆ)',
            'as': 'Assamese (অসমীয়া)',
            'ur': 'Urdu (اردو)',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'zh': 'Chinese',
            'ar': 'Arabic',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
        };
        return languageNames[code] || code.toUpperCase();
    };

    const handleSingleTranslate = async () => {
        // Validate input
        const validation = translationService.validateText(singleText);
        if (!validation.isValid) {
            setError(validation.errors.join(', '));
            return;
        }

        if (!singleTargetLang) {
            setError('Please select a target language');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setSingleResult(null);

            const result = await translationService.translateText(
                singleText,
                singleTargetLang,
                singleSourceLang || null
            );

            setSingleResult(result);
            setSuccess('Translation completed successfully');
        } catch (err) {
            console.error('Error translating text:', err);
            setError(err.message || 'Failed to translate text');
        } finally {
            setLoading(false);
        }
    };

    const handleBatchTranslate = async () => {
        // Filter out empty texts
        const validTexts = batchTexts.filter((text) => text.trim().length > 0);

        // Validate batch
        const validation = translationService.validateBatchRequest(validTexts);
        if (!validation.isValid) {
            setError(validation.errors.join(', '));
            return;
        }

        if (!batchTargetLang) {
            setError('Please select a target language');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setBatchResults([]);

            const results = await translationService.batchTranslate(
                validTexts,
                batchTargetLang,
                batchSourceLang || null
            );

            // The API returns an array directly, pair with original texts
            const pairedResults = (Array.isArray(results) ? results : []).map((result, index) => ({
                text: validTexts[index],
                translated_text: result.translated_text,
                source_language: result.source_language,
                target_language: result.target_language,
                confidence: result.confidence,
            }));

            setBatchResults(pairedResults);
            setSuccess(`Successfully translated ${validTexts.length} texts`);
        } catch (err) {
            console.error('Error batch translating:', err);
            setError(err.message || 'Failed to translate texts');
        } finally {
            setLoading(false);
        }
    };

    const handleDetectLanguage = async () => {
        if (!detectText.trim()) {
            setError('Please enter text to detect language');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setDetectResult(null);

            const result = await translationService.detectLanguage(detectText);
            setDetectResult(result);
            setSuccess('Language detected successfully');
        } catch (err) {
            console.error('Error detecting language:', err);
            setError(err.message || 'Failed to detect language');
        } finally {
            setLoading(false);
        }
    };

    const addBatchTextField = () => {
        if (batchTexts.length < 100) {
            setBatchTexts([...batchTexts, '']);
        } else {
            setError('Maximum 100 texts allowed per batch');
        }
    };

    const removeBatchTextField = (index) => {
        const newTexts = batchTexts.filter((_, i) => i !== index);
        setBatchTexts(newTexts.length > 0 ? newTexts : ['']);
    };

    const updateBatchTextField = (index, value) => {
        const newTexts = [...batchTexts];
        newTexts[index] = value;
        setBatchTexts(newTexts);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setSuccess('Copied to clipboard');
        setTimeout(() => setSuccess(null), 2000);
    };

    const exportBatchResults = () => {
        const data = JSON.stringify(batchResults, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `batch-translations-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setSuccess('Results exported successfully');
    };

    const getLanguageName = (code) => {
        return translationService.getLanguageName(code, supportedLanguages);
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Translation Service</h1>
                <p className="text-gray-600">
                    Translate text between multiple languages using AI-powered translation
                </p>
            </div>

            {/* Alerts */}
            {error && (
                <div className="mb-6">
                    <ErrorAlert message={error} onClose={() => setError(null)} />
                </div>
            )}

            {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800">{success}</p>
                </div>
            )}

            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-gray-200">
                    <nav className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('single')}
                            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'single'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Single Translation
                        </button>
                        <button
                            onClick={() => setActiveTab('batch')}
                            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'batch'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Batch Translation
                        </button>
                        <button
                            onClick={() => setActiveTab('detect')}
                            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'detect'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Language Detection
                        </button>
                    </nav>
                </div>
            </div>

            {/* Single Translation Tab */}
            {activeTab === 'single' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input Section */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FaLanguage className="text-blue-500" />
                            Input Text
                        </h2>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Source Language (Optional)
                            </label>
                            <select
                                value={singleSourceLang}
                                onChange={(e) => setSingleSourceLang(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Auto-detect</option>
                                {supportedLanguages.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.name} ({lang.native_name})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Text to Translate
                            </label>
                            <textarea
                                value={singleText}
                                onChange={(e) => setSingleText(e.target.value)}
                                placeholder="Enter text to translate..."
                                rows={8}
                                maxLength={5000}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                {singleText.length} / 5000 characters
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Target Language
                            </label>
                            <select
                                value={singleTargetLang}
                                onChange={(e) => setSingleTargetLang(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {supportedLanguages.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.name} ({lang.native_name})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <Button
                            onClick={handleSingleTranslate}
                            disabled={loading || !singleText.trim()}
                            className="w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <ClipLoader color="#ffffff" size={16} />
                                    Translating...
                                </>
                            ) : (
                                <>
                                    <FaExchangeAlt />
                                    Translate
                                </>
                            )}
                        </Button>
                    </Card>

                    {/* Result Section */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <FaLanguage className="text-green-500" />
                            Translation Result
                        </h2>

                        {singleResult ? (
                            <div>
                                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                                    <p className="text-sm text-gray-600 mb-1">
                                        {getLanguageName(singleResult.source_language)} →{' '}
                                        {getLanguageName(singleResult.target_language)}
                                    </p>
                                    {singleResult.confidence && (
                                        <p className="text-sm text-gray-600">
                                            Confidence: {(singleResult.confidence * 100).toFixed(1)}%
                                        </p>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <div className="relative">
                                        <textarea
                                            value={singleResult.translated_text}
                                            readOnly
                                            rows={8}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white resize-none"
                                        />
                                        <button
                                            onClick={() =>
                                                copyToClipboard(singleResult.translated_text)
                                            }
                                            className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 bg-white rounded-md shadow-sm"
                                            title="Copy to clipboard"
                                        >
                                            <FaClipboard />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-64 text-gray-400">
                                <div className="text-center">
                                    <FaLanguage className="text-6xl mb-4 mx-auto" />
                                    <p>Translation result will appear here</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Batch Translation Tab */}
            {activeTab === 'batch' && (
                <div>
                    <Card className="p-6 mb-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">
                            Batch Translation Settings
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Source Language (Optional)
                                </label>
                                <select
                                    value={batchSourceLang}
                                    onChange={(e) => setBatchSourceLang(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Auto-detect</option>
                                    {supportedLanguages.map((lang) => (
                                        <option key={lang.code} value={lang.code}>
                                            {lang.name} ({lang.native_name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Target Language
                                </label>
                                <select
                                    value={batchTargetLang}
                                    onChange={(e) => setBatchTargetLang(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {supportedLanguages.map((lang) => (
                                        <option key={lang.code} value={lang.code}>
                                            {lang.name} ({lang.native_name})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-800">
                                Texts to Translate ({batchTexts.length})
                            </h2>
                            <Button
                                variant="secondary"
                                onClick={addBatchTextField}
                                className="flex items-center gap-2"
                                disabled={batchTexts.length >= 100}
                            >
                                <FaPlus />
                                Add Text
                            </Button>
                        </div>

                        <div className="space-y-4 mb-4">
                            {batchTexts.map((text, index) => (
                                <div key={index} className="flex gap-2">
                                    <div className="flex-1">
                                        <textarea
                                            value={text}
                                            onChange={(e) =>
                                                updateBatchTextField(index, e.target.value)
                                            }
                                            placeholder={`Text ${index + 1}...`}
                                            rows={3}
                                            maxLength={5000}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        />
                                    </div>
                                    {batchTexts.length > 1 && (
                                        <button
                                            onClick={() => removeBatchTextField(index)}
                                            className="p-2 text-red-500 hover:text-red-700"
                                            title="Remove"
                                        >
                                            <FaTrash />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <Button
                            onClick={handleBatchTranslate}
                            disabled={
                                loading ||
                                batchTexts.filter((t) => t.trim().length > 0).length === 0
                            }
                            className="w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <ClipLoader color="#ffffff" size={16} />
                                    Translating...
                                </>
                            ) : (
                                <>
                                    <FaExchangeAlt />
                                    Translate All
                                </>
                            )}
                        </Button>
                    </Card>

                    {/* Batch Results */}
                    {batchResults.length > 0 && (
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-800">
                                    Translation Results ({batchResults.length})
                                </h2>
                                <Button
                                    variant="secondary"
                                    onClick={exportBatchResults}
                                    className="flex items-center gap-2"
                                >
                                    <FaDownload />
                                    Export Results
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {batchResults.map((result, index) => (
                                    <div
                                        key={index}
                                        className="p-4 border border-gray-200 rounded-lg"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 mb-2">
                                                    Original
                                                </p>
                                                <p className="text-gray-600">{result.text}</p>
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-sm font-medium text-gray-700">
                                                        Translation
                                                    </p>
                                                    <button
                                                        onClick={() =>
                                                            copyToClipboard(result.translated_text)
                                                        }
                                                        className="text-gray-500 hover:text-gray-700"
                                                        title="Copy"
                                                    >
                                                        <FaClipboard />
                                                    </button>
                                                </div>
                                                <p className="text-gray-600">
                                                    {result.translated_text}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    {getLanguageName(result.source_language)} →{' '}
                                                    {getLanguageName(result.target_language)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* Language Detection Tab */}
            {activeTab === 'detect' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">
                            Detect Language
                        </h2>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Text to Analyze
                            </label>
                            <textarea
                                value={detectText}
                                onChange={(e) => setDetectText(e.target.value)}
                                placeholder="Enter text to detect language..."
                                rows={8}
                                maxLength={5000}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>

                        <Button
                            onClick={handleDetectLanguage}
                            disabled={loading || !detectText.trim()}
                            className="w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <ClipLoader color="#ffffff" size={16} />
                                    Detecting...
                                </>
                            ) : (
                                <>
                                    <FaLanguage />
                                    Detect Language
                                </>
                            )}
                        </Button>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">
                            Detection Result
                        </h2>

                        {detectResult ? (
                            <div>
                                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Detected Language</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {getLanguageName(detectResult.detected_language)}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-2">
                                        Confidence: {(detectResult.confidence * 100).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-64 text-gray-400">
                                <div className="text-center">
                                    <FaLanguage className="text-6xl mb-4 mx-auto" />
                                    <p>Detection result will appear here</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
