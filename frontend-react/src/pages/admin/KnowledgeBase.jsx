import { useState, useEffect, useRef } from 'react';
import {
    FaSearch,
    FaUpload,
    FaDatabase,
    FaCheckCircle,
    FaExclamationTriangle,
    FaTrash,
    FaSync,
    FaFileAlt,
    FaChartBar,
    FaPlus,
    FaFilter,
    FaTimes,
} from 'react-icons/fa';
import Loader from '../../components/common/Loader';
import ErrorAlert from '../../components/common/ErrorAlert';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ragService from '../../api/services/ragService';

export default function KnowledgeBase() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Active tab
    const [activeTab, setActiveTab] = useState('search'); // search, ingest, stats, collections

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState('');
    const [searchLimit, setSearchLimit] = useState(10);
    const [searchThreshold, setSearchThreshold] = useState(0.7);

    // Ingestion state
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [ingestionCollection, setIngestionCollection] = useState('');
    const [ingesting, setIngesting] = useState(false);
    const [ingestionProgress, setIngestionProgress] = useState(null);
    const fileInputRef = useRef(null);

    // Statistics state
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Collections state
    const [collections, setCollections] = useState([]);
    const [loadingCollections, setLoadingCollections] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [creatingCollection, setCreatingCollection] = useState(false);
    const [selectedCollectionDocs, setSelectedCollectionDocs] = useState(null);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [collectionDocuments, setCollectionDocuments] = useState([]);
    const [docsTotal, setDocsTotal] = useState(0);

    // Validation state
    const [validationResults, setValidationResults] = useState(null);
    const [validating, setValidating] = useState(false);

    // Confirmation dialog
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    // Fetch initial data
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setError(null);
            const [collectionsData, statsData] = await Promise.all([
                ragService.listCollections().catch((err) => {
                    console.error('Failed to fetch collections:', err);
                    return { collections: [] };
                }),
                ragService.getKnowledgeBaseStats().catch((err) => {
                    console.error('Failed to fetch stats:', err);
                    return null;
                }),
            ]);

            console.log('Collections data:', collectionsData);
            console.log('Stats data:', statsData);

            // Backend returns array of strings, convert to objects for consistency
            const collectionsArray = collectionsData?.collections || [];
            const formattedCollections = Array.isArray(collectionsArray)
                ? collectionsArray.map((col) =>
                    typeof col === 'string' ? { name: col } : col
                )
                : [];

            setCollections(formattedCollections);
            setStats(statsData?.stats || statsData);
        } catch (err) {
            console.error('Error fetching initial data:', err);
            setError(err.message || 'Failed to fetch knowledge base data');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchInitialData().finally(() => setRefreshing(false));
    };

    // Search functionality
    const handleSearch = async (e) => {
        e?.preventDefault();
        if (!searchQuery.trim()) {
            setError('Please enter a search query');
            return;
        }

        try {
            setSearching(true);
            setError(null);
            setSuccess(null);
            setSearchResults([]);

            console.log('Searching with params:', {
                query: searchQuery,
                collection: selectedCollection,
                limit: searchLimit,
                threshold: searchThreshold,
            });

            const results = await ragService.searchKnowledgeBase(searchQuery, {
                collection: selectedCollection || undefined,
                limit: searchLimit,
                threshold: searchThreshold,
            });

            console.log('Search results:', results);

            // Handle different response formats
            const resultsArray = results?.results || results?.data?.results || [];

            setSearchResults(resultsArray);

            if (resultsArray.length === 0) {
                setSuccess('No results found for your query');
            } else {
                setSuccess(`Found ${resultsArray.length} result(s)`);
            }
        } catch (err) {
            console.error('Search error:', err);
            setError(err.message || 'Failed to search knowledge base');
        } finally {
            setSearching(false);
        }
    };

    // File selection
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = [];
        const errors = [];

        files.forEach((file) => {
            try {
                ragService.validateDocumentFile(file);
                validFiles.push(file);
            } catch (err) {
                errors.push(`${file.name}: ${err.message}`);
            }
        });

        if (errors.length > 0) {
            setError(`Some files were invalid:\n${errors.join('\n')}`);
        }

        setSelectedFiles((prev) => [...prev, ...validFiles]);
    };

    const removeFile = (index) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    // Document ingestion
    const handleIngestDocuments = async () => {
        if (selectedFiles.length === 0) {
            setError('Please select at least one file');
            return;
        }

        try {
            setIngesting(true);
            setError(null);
            setSuccess(null);
            setIngestionProgress('Uploading documents...');

            const result = await ragService.ingestDocuments(selectedFiles, {
                collection: ingestionCollection || undefined,
            });

            setSuccess(
                `Successfully ingested ${result.ingested_count || selectedFiles.length} document(s)`
            );
            setSelectedFiles([]);
            setIngestionCollection('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            // Refresh stats and collections
            fetchInitialData();
        } catch (err) {
            console.error('Ingestion error:', err);
            setError(err.message || 'Failed to ingest documents');
        } finally {
            setIngesting(false);
            setIngestionProgress(null);
        }
    };

    // Fetch statistics
    const fetchStats = async (collection = null) => {
        try {
            setLoadingStats(true);
            setError(null);
            const statsData = await ragService.getKnowledgeBaseStats(collection);
            console.log('Fetched stats:', statsData);
            setStats(statsData?.stats || statsData);
        } catch (err) {
            console.error('Error fetching stats:', err);
            setError(err.message || 'Failed to fetch statistics');
        } finally {
            setLoadingStats(false);
        }
    };

    // Create collection
    const handleCreateCollection = async () => {
        if (!newCollectionName.trim()) {
            setError('Please enter a collection name');
            return;
        }

        try {
            setCreatingCollection(true);
            setError(null);
            await ragService.createCollection(newCollectionName);
            setSuccess(`Collection "${newCollectionName}" created successfully`);
            setNewCollectionName('');
            fetchInitialData();
        } catch (err) {
            console.error('Error creating collection:', err);
            setError(err.message || 'Failed to create collection');
        } finally {
            setCreatingCollection(false);
        }
    };

    // Delete collection
    const confirmDeleteCollection = (collectionName) => {
        setConfirmMessage(
            `Are you sure you want to delete the collection "${collectionName}"? This action cannot be undone.`
        );
        setConfirmAction(() => () => handleDeleteCollection(collectionName));
        setShowConfirmDialog(true);
    };

    const handleDeleteCollection = async (collectionName) => {
        try {
            setError(null);
            await ragService.deleteCollection(collectionName);
            setSuccess(`Collection "${collectionName}" deleted successfully`);
            setShowConfirmDialog(false);
            fetchInitialData();
        } catch (err) {
            console.error('Error deleting collection:', err);
            setError(err.message || 'Failed to delete collection');
        }
    };

    // Reset collection
    const confirmResetCollection = (collectionName) => {
        setConfirmMessage(
            `Are you sure you want to reset the collection "${collectionName}"? All documents will be removed.`
        );
        setConfirmAction(() => () => handleResetCollection(collectionName));
        setShowConfirmDialog(true);
    };

    const handleResetCollection = async (collectionName) => {
        try {
            setError(null);
            await ragService.resetCollection(collectionName);
            setSuccess(`Collection "${collectionName}" reset successfully`);
            setShowConfirmDialog(false);
            fetchInitialData();
        } catch (err) {
            console.error('Error resetting collection:', err);
            setError(err.message || 'Failed to reset collection');
        }
    };

    // Validate knowledge base
    const handleValidate = async () => {
        try {
            setValidating(true);
            setError(null);
            const results = await ragService.validateKnowledgeBase(selectedCollection || null);
            setValidationResults(results);
            setSuccess('Validation completed');
        } catch (err) {
            console.error('Validation error:', err);
            setError(err.message || 'Failed to validate knowledge base');
        } finally {
            setValidating(false);
        }
    };

    // View documents in a collection
    const handleViewDocuments = async (collectionName) => {
        try {
            setLoadingDocs(true);
            setError(null);
            setSuccess(null);
            setSelectedCollectionDocs(collectionName);

            const docsData = await ragService.getDocuments(collectionName, {
                page: 1,
                limit: 50
            });

            console.log('Documents data:', docsData);
            setCollectionDocuments(docsData?.documents || []);
            setDocsTotal(docsData?.total || 0);

            if ((docsData?.documents || []).length === 0) {
                setSuccess(`No documents found in collection "${collectionName}"`);
            }
        } catch (err) {
            console.error('Error fetching documents:', err);
            const errorMessage = err?.message || err?.detail || 'Failed to fetch documents';
            setError(errorMessage);
            setCollectionDocuments([]);
            setDocsTotal(0);
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleCloseDocuments = () => {
        setSelectedCollectionDocs(null);
        setCollectionDocuments([]);
        setDocsTotal(0);
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    if (loading) {
        return <Loader fullScreen text="Loading knowledge base..." />;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Knowledge Base Management</h1>
                    <p className="text-gray-600 mt-1">
                        Manage RAG knowledge base, search, and document ingestion
                    </p>
                </div>
                <Button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    variant="secondary"
                    className="flex items-center gap-2"
                >
                    <FaSync className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                </Button>
            </div>

            {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
            {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 flex items-center gap-2">
                        <FaCheckCircle />
                        {success}
                    </p>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                    {[
                        { id: 'search', label: 'Search', icon: FaSearch },
                        { id: 'ingest', label: 'Ingest Documents', icon: FaUpload },
                        { id: 'stats', label: 'Statistics', icon: FaChartBar },
                        { id: 'collections', label: 'Collections', icon: FaDatabase },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <tab.icon />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Search Tab */}
            {activeTab === 'search' && (
                <div className="space-y-6">
                    <Card>
                        <h2 className="text-xl font-semibold mb-4">Search Knowledge Base</h2>
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search Query
                                </label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Enter your search query..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Collection (Optional)
                                    </label>
                                    <select
                                        value={selectedCollection}
                                        onChange={(e) => setSelectedCollection(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">All Collections</option>
                                        {collections.map((col, index) => (
                                            <option key={col.name || `collection-${index}`} value={col.name}>
                                                {col.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Max Results
                                    </label>
                                    <input
                                        type="number"
                                        value={searchLimit}
                                        onChange={(e) => setSearchLimit(parseInt(e.target.value))}
                                        min="1"
                                        max="100"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Similarity Threshold
                                    </label>
                                    <input
                                        type="number"
                                        value={searchThreshold}
                                        onChange={(e) => setSearchThreshold(parseFloat(e.target.value))}
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={searching}
                                className="flex items-center gap-2"
                            >
                                <FaSearch />
                                {searching ? 'Searching...' : 'Search'}
                            </Button>
                        </form>
                    </Card>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <Card>
                            <h2 className="text-xl font-semibold mb-4">
                                Search Results ({searchResults.length})
                            </h2>
                            <div className="space-y-4">
                                {searchResults.map((result, index) => (
                                    <div
                                        key={result.id || result.document_id || `result-${index}`}
                                        className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-medium text-lg">
                                                {result.metadata?.title ||
                                                    result.title ||
                                                    `Document ${index + 1}`}
                                            </h3>
                                            {(result.score || result.similarity || result.distance) && (
                                                <span className="text-sm text-gray-600">
                                                    Score: {((result.score || result.similarity || (1 - result.distance)) * 100).toFixed(1)}%
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-700 mb-2">
                                            {result.content || result.document || result.text || 'No content available'}
                                        </p>
                                        {result.metadata && (
                                            <div className="text-sm text-gray-600">
                                                {result.metadata.source && (
                                                    <span>Source: {result.metadata.source}</span>
                                                )}
                                                {result.metadata.collection && (
                                                    <span className="ml-4">
                                                        Collection: {result.metadata.collection}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* Ingest Tab */}
            {activeTab === 'ingest' && (
                <Card>
                    <h2 className="text-xl font-semibold mb-4">Ingest Documents</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Target Collection (Optional)
                            </label>
                            <select
                                value={ingestionCollection}
                                onChange={(e) => setIngestionCollection(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Default Collection</option>
                                {collections.map((col, index) => (
                                    <option key={col.name || `ingest-collection-${index}`} value={col.name}>
                                        {col.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Files
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    onChange={handleFileSelect}
                                    accept=".pdf,.txt,.md,.doc,.docx,.html,.json"
                                    className="hidden"
                                />
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    variant="secondary"
                                    className="flex items-center gap-2"
                                >
                                    <FaUpload />
                                    Choose Files
                                </Button>
                                <span className="text-sm text-gray-600">
                                    Supported: PDF, TXT, MD, DOC, DOCX, HTML, JSON (Max 50MB each)
                                </span>
                            </div>
                        </div>

                        {/* Selected Files */}
                        {selectedFiles.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-medium">Selected Files ({selectedFiles.length})</h3>
                                {selectedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FaFileAlt className="text-blue-500" />
                                            <div>
                                                <p className="font-medium">{file.name}</p>
                                                <p className="text-sm text-gray-600">
                                                    {formatFileSize(file.size)}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {ingestionProgress && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-blue-800">{ingestionProgress}</p>
                            </div>
                        )}

                        <Button
                            onClick={handleIngestDocuments}
                            disabled={ingesting || selectedFiles.length === 0}
                            className="flex items-center gap-2"
                        >
                            <FaUpload />
                            {ingesting ? 'Ingesting...' : 'Ingest Documents'}
                        </Button>
                    </div>
                </Card>
            )}

            {/* Statistics Tab */}
            {activeTab === 'stats' && (
                <div className="space-y-6">
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Knowledge Base Statistics</h2>
                            <Button
                                onClick={() => fetchStats(selectedCollection || null)}
                                disabled={loadingStats}
                                variant="secondary"
                                size="sm"
                            >
                                {loadingStats ? 'Loading...' : 'Refresh Stats'}
                            </Button>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Filter by Collection
                            </label>
                            <select
                                value={selectedCollection}
                                onChange={(e) => {
                                    setSelectedCollection(e.target.value);
                                    fetchStats(e.target.value || null);
                                }}
                                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Collections</option>
                                {collections.map((col, index) => (
                                    <option key={col.name || `stats-collection-${index}`} value={col.name}>
                                        {col.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {stats && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Total Documents</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {stats.total_documents || 0}
                                    </p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Total Collections</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {stats.collections ? Object.keys(stats.collections).length : 0}
                                    </p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Embedding Dimension</p>
                                    <p className="text-2xl font-bold text-purple-600">
                                        {stats.embedding_dimension || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Collection Details */}
                        {stats && stats.collections && Object.keys(stats.collections).length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-lg font-semibold mb-3">Collection Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.entries(stats.collections).map(([name, collectionStats]) => (
                                        <div key={name} className="p-4 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FaDatabase className="text-blue-500" />
                                                <p className="font-medium text-gray-900">{name}</p>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-3">
                                                Documents: {typeof collectionStats === 'object' ? collectionStats.count || 0 : collectionStats}
                                            </p>
                                            <Button
                                                onClick={() => handleViewDocuments(name)}
                                                variant="secondary"
                                                size="sm"
                                                className="flex items-center gap-2"
                                            >
                                                <FaFileAlt />
                                                View Documents
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Documents Viewer */}
                        {selectedCollectionDocs && (
                            <div className="mt-6 p-4 bg-white border-2 border-blue-200 rounded-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <FaDatabase className="text-blue-500" />
                                        Documents in "{selectedCollectionDocs}"
                                        {docsTotal > 0 && (
                                            <span className="text-sm font-normal text-gray-600">
                                                ({docsTotal} total)
                                            </span>
                                        )}
                                    </h3>
                                    <button
                                        onClick={handleCloseDocuments}
                                        className="text-gray-500 hover:text-gray-700 p-2"
                                        title="Close"
                                    >
                                        <FaTimes size={20} />
                                    </button>
                                </div>

                                {loadingDocs ? (
                                    <div className="text-center py-8">
                                        <Loader text="Loading documents..." />
                                    </div>
                                ) : collectionDocuments.length > 0 ? (
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {collectionDocuments.map((doc, index) => (
                                            <div
                                                key={doc.id || `doc-${index}`}
                                                className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900">
                                                            {doc.metadata?.title || `Document ${index + 1}`}
                                                        </p>
                                                        {doc.id && (
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                ID: {doc.id}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                                                    {doc.content?.substring(0, 300) || 'No content available'}
                                                    {doc.content?.length > 300 && '...'}
                                                </p>

                                                {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                                                    <div className="flex flex-wrap gap-2 text-xs">
                                                        {doc.metadata.source && (
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                                                Source: {doc.metadata.source}
                                                            </span>
                                                        )}
                                                        {doc.metadata.crop && (
                                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                                                                Crop: {doc.metadata.crop}
                                                            </span>
                                                        )}
                                                        {doc.metadata.category && (
                                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                                                                Category: {doc.metadata.category}
                                                            </span>
                                                        )}
                                                        {doc.metadata.language && (
                                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                                                                Language: {doc.metadata.language}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <FaFileAlt className="text-gray-400 text-4xl mx-auto mb-2" />
                                        <p className="text-gray-600">No documents found in this collection</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>

                    {/* Validation */}
                    <Card>
                        <h2 className="text-xl font-semibold mb-4">Validation</h2>
                        <Button
                            onClick={handleValidate}
                            disabled={validating}
                            className="flex items-center gap-2 mb-4"
                        >
                            <FaCheckCircle />
                            {validating ? 'Validating...' : 'Validate Knowledge Base'}
                        </Button>

                        {validationResults && (
                            <div className="space-y-2">
                                <div
                                    className={`p-4 rounded-lg ${validationResults.valid
                                        ? 'bg-green-50 border border-green-200'
                                        : 'bg-red-50 border border-red-200'
                                        }`}
                                >
                                    <p
                                        className={`font-medium ${validationResults.valid ? 'text-green-800' : 'text-red-800'
                                            }`}
                                    >
                                        {validationResults.valid
                                            ? 'Knowledge base is valid'
                                            : 'Knowledge base has issues'}
                                    </p>
                                    {validationResults.message && (
                                        <p className="text-sm mt-1">{validationResults.message}</p>
                                    )}
                                </div>
                                {validationResults.errors && validationResults.errors.length > 0 && (
                                    <div className="space-y-1">
                                        {validationResults.errors.map((error, index) => (
                                            <div
                                                key={index}
                                                className="p-2 bg-red-50 text-red-700 text-sm rounded"
                                            >
                                                {error}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Collections Tab */}
            {activeTab === 'collections' && (
                <div className="space-y-6">
                    {/* Create Collection */}
                    <Card>
                        <h2 className="text-xl font-semibold mb-4">Create New Collection</h2>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                placeholder="Enter collection name..."
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <Button
                                onClick={handleCreateCollection}
                                disabled={creatingCollection || !newCollectionName.trim()}
                                className="flex items-center gap-2"
                            >
                                <FaPlus />
                                {creatingCollection ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    </Card>

                    {/* Collections List */}
                    <Card>
                        <h2 className="text-xl font-semibold mb-4">
                            Collections ({collections.length})
                        </h2>
                        {collections.length > 0 ? (
                            <div className="space-y-3">
                                {collections.map((collection) => (
                                    <div
                                        key={collection.name}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FaDatabase className="text-blue-500 text-xl" />
                                            <div>
                                                <p className="font-medium text-lg">{collection.name}</p>
                                                <p className="text-sm text-gray-600">
                                                    Documents: {collection.document_count || 0}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => confirmResetCollection(collection.name)}
                                                variant="secondary"
                                                size="sm"
                                                className="flex items-center gap-2"
                                            >
                                                <FaSync />
                                                Reset
                                            </Button>
                                            <Button
                                                onClick={() => confirmDeleteCollection(collection.name)}
                                                variant="danger"
                                                size="sm"
                                                className="flex items-center gap-2"
                                            >
                                                <FaTrash />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <FaDatabase className="text-gray-400 text-4xl mx-auto mb-2" />
                                <p className="text-gray-600">No collections found</p>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Confirm Dialog */}
            {showConfirmDialog && (
                <ConfirmDialog
                    isOpen={showConfirmDialog}
                    title="Confirm Action"
                    message={confirmMessage}
                    onConfirm={confirmAction}
                    onCancel={() => setShowConfirmDialog(false)}
                    onClose={() => setShowConfirmDialog(false)}
                />
            )}
        </div>
    );
}
