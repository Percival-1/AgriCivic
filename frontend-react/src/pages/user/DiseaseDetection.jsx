import { useState, useCallback, useRef, useEffect } from 'react';
import { FaUpload, FaImage, FaTimes, FaLeaf, FaInfoCircle, FaSave, FaShare, FaCamera } from 'react-icons/fa';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { visionService } from '../../api/services';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import ErrorAlert from '../../components/common/ErrorAlert';

// Register Chart.js components
ChartJS.register(
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function DiseaseDetection() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [detailedTreatment, setDetailedTreatment] = useState(null);
    const [error, setError] = useState(null);
    const [isLoadingTreatment, setIsLoadingTreatment] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [stream, setStream] = useState(null);

    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Handle file selection
    const handleFileSelect = useCallback((file) => {
        setError(null);

        try {
            // Validate file
            visionService.validateImageFile(file);

            // Create preview
            const preview = visionService.createImagePreview(file);

            // Clean up previous preview
            if (previewUrl) {
                visionService.revokeImagePreview(previewUrl);
            }

            setSelectedFile(file);
            setPreviewUrl(preview);
            setAnalysisResult(null);
            setDetailedTreatment(null);
        } catch (err) {
            setError(err.message);
        }
    }, [previewUrl]);

    // Handle file input change
    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    // Handle drag and drop
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    // Handle image upload and analysis
    const handleAnalyze = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        setUploadProgress(0);
        setError(null);

        try {
            // Simulate upload progress
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);

            // Analyze image
            const response = await visionService.analyzeImage(selectedFile);

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (response.success && response.analysis) {
                setAnalysisResult(response.analysis);
            } else {
                setError(response.error || 'Analysis failed');
            }
        } catch (err) {
            setError(err.message || 'Failed to analyze image');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // Handle detailed treatment request
    const handleGetDetailedTreatment = async () => {
        if (!analysisResult?.primary_disease?.disease_name) return;

        setIsLoadingTreatment(true);
        setError(null);

        try {
            const response = await visionService.getDetailedTreatment(
                analysisResult.primary_disease.disease_name,
                analysisResult.crop_type
            );

            if (response.success && response.treatment_info) {
                setDetailedTreatment(response.treatment_info);
            } else {
                setError('Failed to fetch detailed treatment');
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch detailed treatment');
        } finally {
            setIsLoadingTreatment(false);
        }
    };

    // Save to history
    const handleSaveToHistory = () => {
        if (!analysisResult) return;

        const historyKey = 'disease_detection_history';
        const existingHistory = localStorage.getItem(historyKey);
        const history = existingHistory ? JSON.parse(existingHistory) : [];

        const historyEntry = {
            ...analysisResult,
            saved_at: new Date().toISOString(),
        };

        history.unshift(historyEntry);
        const trimmedHistory = history.slice(0, 50);
        localStorage.setItem(historyKey, JSON.stringify(trimmedHistory));

        alert('Analysis saved to history!');
    };

    // Clear selection
    const handleClear = () => {
        if (previewUrl) {
            visionService.revokeImagePreview(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        setAnalysisResult(null);
        setDetailedTreatment(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Open camera
    const handleOpenCamera = async () => {
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
            });
            setStream(mediaStream);
            setIsCameraOpen(true);

            // Wait for video element to be ready
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            }, 100);
        } catch (err) {
            setError(
                'Failed to access camera. Please ensure camera permissions are granted.'
            );
            console.error('Camera access error:', err);
        }
    };

    // Close camera
    const handleCloseCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        setIsCameraOpen(false);
    };

    // Capture photo from camera
    const handleCapturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    // Create file from blob
                    const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
                        type: 'image/jpeg',
                    });

                    // Handle the captured file
                    handleFileSelect(file);

                    // Close camera
                    handleCloseCamera();
                }
            },
            'image/jpeg',
            0.95
        );
    };

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [stream]);

    // Prepare confidence chart data
    const getConfidenceChartData = () => {
        if (!analysisResult?.primary_disease?.confidence_score) return null;

        const confidence = analysisResult.primary_disease.confidence_score * 100;
        const remaining = 100 - confidence;

        const level = analysisResult.primary_disease.confidence_level?.toLowerCase();
        const color = level === 'high' ? '#10b981' : level === 'medium' ? '#f59e0b' : '#ef4444';

        return {
            labels: ['Confidence', 'Uncertainty'],
            datasets: [
                {
                    data: [confidence, remaining],
                    backgroundColor: [color, '#e5e7eb'],
                    borderWidth: 0,
                },
            ],
        };
    };

    // Prepare alternative diseases chart data
    const getAlternativesChartData = () => {
        if (!analysisResult?.diseases || analysisResult.diseases.length <= 1) {
            return null;
        }

        const topDiseases = analysisResult.diseases.slice(0, 5);

        return {
            labels: topDiseases.map((d) => d.disease_name),
            datasets: [
                {
                    label: 'Confidence (%)',
                    data: topDiseases.map((d) => d.confidence_score * 100),
                    backgroundColor: topDiseases.map((d) => {
                        const level = d.confidence_level?.toLowerCase();
                        if (level === 'high') return '#10b981';
                        if (level === 'medium') return '#f59e0b';
                        return '#ef4444';
                    }),
                },
            ],
        };
    };

    const primaryDisease = analysisResult?.primary_disease;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <FaLeaf className="text-green-600" />
                    Disease Detection
                </h1>
                <p className="text-gray-600 mt-2">
                    Upload a crop image to detect diseases and get treatment recommendations
                </p>
            </div>

            {error && (
                <div className="mb-6">
                    <ErrorAlert
                        message={error}
                        onDismiss={() => setError(null)}
                        onRetry={analysisResult ? null : handleAnalyze}
                    />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Section */}
                <Card title="Upload Image">
                    <div className="space-y-4">
                        {/* Camera Modal */}
                        {isCameraOpen && (
                            <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                                <div className="relative w-full h-full max-w-4xl max-h-screen p-4">
                                    <button
                                        onClick={handleCloseCamera}
                                        className="absolute top-6 right-6 bg-red-500 text-white p-3 rounded-full hover:bg-red-600 z-10"
                                    >
                                        <FaTimes size={24} />
                                    </button>

                                    <div className="flex flex-col items-center justify-center h-full gap-4">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className="max-w-full max-h-[calc(100vh-200px)] rounded-lg"
                                        />

                                        <Button
                                            variant="primary"
                                            size="lg"
                                            onClick={handleCapturePhoto}
                                            className="mt-4"
                                        >
                                            <FaCamera className="mr-2" />
                                            Capture Photo
                                        </Button>
                                    </div>

                                    {/* Hidden canvas for capturing */}
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>
                            </div>
                        )}

                        {/* Drag and Drop Area */}
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400'
                                }`}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            {previewUrl ? (
                                <div className="relative">
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="max-h-64 mx-auto rounded-lg"
                                    />
                                    <button
                                        onClick={handleClear}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <FaImage className="mx-auto text-gray-400 text-5xl" />
                                    <div>
                                        <p className="text-gray-600 mb-3">
                                            Drag and drop an image here, or
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <FaUpload className="mr-2" />
                                                Browse Files
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleOpenCamera}
                                            >
                                                <FaCamera className="mr-2" />
                                                Take Photo
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Supported formats: JPEG, PNG, WebP, HEIC (Max 10MB)
                                    </p>
                                </div>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
                            onChange={handleFileInputChange}
                            className="hidden"
                        />

                        {/* Upload Progress */}
                        {isUploading && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Analyzing image...</span>
                                    <span className="text-gray-900 font-medium">
                                        {uploadProgress}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <div className="flex justify-center mt-4">
                                    <Loader size={40} text="Processing image..." />
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {selectedFile && !isUploading && !analysisResult && (
                            <div className="flex gap-2">
                                <Button
                                    variant="primary"
                                    className="flex-1"
                                    onClick={handleAnalyze}
                                >
                                    Analyze Image
                                </Button>
                                <Button variant="secondary" onClick={handleClear}>
                                    Clear
                                </Button>
                            </div>
                        )}

                        {analysisResult && (
                            <Button variant="secondary" onClick={handleClear} className="w-full">
                                Analyze Another Image
                            </Button>
                        )}
                    </div>
                </Card>

                {/* Results Section */}
                {analysisResult && primaryDisease && (
                    <Card title="Analysis Results">
                        <div className="space-y-6">
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSaveToHistory}
                                >
                                    <FaSave className="mr-2" />
                                    Save to History
                                </Button>
                                <Button variant="outline" size="sm">
                                    <FaShare className="mr-2" />
                                    Share
                                </Button>
                            </div>

                            {/* Disease Information */}
                            <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-blue-900">
                                        {primaryDisease.disease_name}
                                    </h3>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${primaryDisease.confidence_level?.toLowerCase() === 'high'
                                            ? 'bg-green-100 text-green-800'
                                            : primaryDisease.confidence_level?.toLowerCase() === 'medium'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}
                                    >
                                        {primaryDisease.confidence_level?.toUpperCase()} CONFIDENCE
                                    </span>
                                </div>
                                {analysisResult.crop_type && (
                                    <p className="text-sm text-blue-700">
                                        Crop: {analysisResult.crop_type}
                                    </p>
                                )}
                            </div>

                            {/* Confidence Score */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Confidence Score
                                </h3>
                                <div className="flex items-center gap-6">
                                    <div className="w-32 h-32">
                                        {getConfidenceChartData() && (
                                            <Doughnut
                                                data={getConfidenceChartData()}
                                                options={{
                                                    plugins: {
                                                        legend: { display: false },
                                                        tooltip: {
                                                            callbacks: {
                                                                label: (context) =>
                                                                    `${context.label}: ${context.parsed.toFixed(1)}%`,
                                                            },
                                                        },
                                                    },
                                                    cutout: '70%',
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-4xl font-bold text-gray-900">
                                            {(primaryDisease.confidence_score * 100).toFixed(1)}%
                                        </p>
                                        <p
                                            className={`text-sm font-medium mt-1 ${visionService.getConfidenceColor(
                                                primaryDisease.confidence_level
                                            )}`}
                                        >
                                            {visionService.getConfidenceLevel(
                                                primaryDisease.confidence_level
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {primaryDisease.description && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Description
                                    </h3>
                                    <p className="text-gray-700">{primaryDisease.description}</p>
                                </div>
                            )}

                            {/* Affected Parts */}
                            {primaryDisease.affected_parts && primaryDisease.affected_parts.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Affected Parts
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {primaryDisease.affected_parts.map((part, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 bg-gray-100 border border-gray-300 rounded-full text-sm"
                                            >
                                                {part}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Severity */}
                            {primaryDisease.severity && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Severity Level
                                    </h3>
                                    <span
                                        className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold ${primaryDisease.severity.toLowerCase() === 'high' ||
                                            primaryDisease.severity.toLowerCase() === 'severe'
                                            ? 'bg-red-100 text-red-800'
                                            : primaryDisease.severity.toLowerCase() === 'medium' ||
                                                primaryDisease.severity.toLowerCase() === 'moderate'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-green-100 text-green-800'
                                            }`}
                                    >
                                        {primaryDisease.severity.toUpperCase()}
                                    </span>
                                </div>
                            )}

                            {/* Get Detailed Treatment Button */}
                            <Button
                                variant="success"
                                className="w-full"
                                onClick={handleGetDetailedTreatment}
                                loading={isLoadingTreatment}
                            >
                                <FaInfoCircle className="mr-2" />
                                Get Detailed Treatment Plan
                            </Button>
                        </div>
                    </Card>
                )}
            </div>

            {/* Treatment Recommendations */}
            {analysisResult?.treatment_recommendations && analysisResult.treatment_recommendations.length > 0 && (
                <Card title="Treatment Recommendations" className="mt-6">
                    <div className="space-y-4">
                        {analysisResult.treatment_recommendations.map((treatment, index) => (
                            <details key={index} className="border border-gray-200 rounded-lg">
                                <summary className="cursor-pointer p-4 font-medium hover:bg-gray-50">
                                    {treatment.treatment_type}
                                </summary>
                                <div className="p-4 pt-0 space-y-3">
                                    {treatment.active_ingredients && treatment.active_ingredients.length > 0 && (
                                        <div>
                                            <h5 className="font-semibold text-sm mb-1">Active Ingredients</h5>
                                            <ul className="list-disc list-inside text-sm text-gray-700">
                                                {treatment.active_ingredients.map((ingredient, i) => (
                                                    <li key={i}>{ingredient}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {treatment.dosage && (
                                        <div>
                                            <h5 className="font-semibold text-sm mb-1">Dosage</h5>
                                            <p className="text-sm text-gray-700">{treatment.dosage}</p>
                                        </div>
                                    )}
                                    {treatment.application_method && (
                                        <div>
                                            <h5 className="font-semibold text-sm mb-1">Application Method</h5>
                                            <p className="text-sm text-gray-700">{treatment.application_method}</p>
                                        </div>
                                    )}
                                    {treatment.timing && (
                                        <div>
                                            <h5 className="font-semibold text-sm mb-1">Timing</h5>
                                            <p className="text-sm text-gray-700">{treatment.timing}</p>
                                        </div>
                                    )}
                                    {treatment.precautions && treatment.precautions.length > 0 && (
                                        <div>
                                            <h5 className="font-semibold text-sm mb-1">Precautions</h5>
                                            <ul className="list-disc list-inside text-sm text-gray-700">
                                                {treatment.precautions.map((precaution, i) => (
                                                    <li key={i}>{precaution}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {treatment.cost_estimate && (
                                        <div className="pt-2">
                                            <span className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 rounded text-sm">
                                                Cost: {treatment.cost_estimate}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </details>
                        ))}
                    </div>
                </Card>
            )}

            {/* Prevention Strategies */}
            {analysisResult?.prevention_strategies && analysisResult.prevention_strategies.length > 0 && (
                <Card title="Prevention Strategies" className="mt-6">
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                        {analysisResult.prevention_strategies.map((strategy, index) => (
                            <li key={index}>{strategy}</li>
                        ))}
                    </ul>
                </Card>
            )}

            {/* Alternative Diseases Chart */}
            {analysisResult?.diseases && analysisResult.diseases.length > 1 && (
                <Card title="Confidence Distribution" className="mt-6">
                    <div className="h-64">
                        {getAlternativesChartData() && (
                            <Bar
                                data={getAlternativesChartData()}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            callbacks: {
                                                label: (context) =>
                                                    `Confidence: ${context.parsed.y.toFixed(1)}%`,
                                            },
                                        },
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            max: 100,
                                            ticks: {
                                                callback: (value) => `${value}%`,
                                            },
                                        },
                                    },
                                }}
                            />
                        )}
                    </div>
                </Card>
            )}

            {/* Detailed Treatment */}
            {detailedTreatment && (
                <Card title="Detailed Treatment Information" className="mt-6">
                    <div className="prose max-w-none">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded">
                            {JSON.stringify(detailedTreatment, null, 2)}
                        </pre>
                    </div>
                </Card>
            )}

            {/* Analysis Metadata */}
            {analysisResult && (
                <Card title="Analysis Metadata" className="mt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-gray-500">Analysis Time</p>
                            <p className="text-sm font-medium">
                                {visionService.formatTimestamp(analysisResult.timestamp)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Processing Time</p>
                            <p className="text-sm font-medium">
                                {analysisResult.processing_time?.toFixed(2)}s
                            </p>
                        </div>
                        {analysisResult.crop_type && (
                            <div>
                                <p className="text-xs text-gray-500">Crop Type</p>
                                <p className="text-sm font-medium">{analysisResult.crop_type}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-gray-500">Model Used</p>
                            <p className="text-sm font-medium">{analysisResult.model_used}</p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
