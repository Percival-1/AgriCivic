import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
    FaSearch,
    FaFilter,
    FaBookmark,
    FaRegBookmark,
    FaCheckCircle,
    FaTimesCircle,
    FaInfoCircle,
    FaExternalLinkAlt,
    FaFileAlt,
    FaCalendarAlt,
    FaTags
} from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import { selectProfile } from '../../store/slices/userSlice';
import schemeService from '../../api/services/schemeService';
import { Card, ErrorAlert, Input, Button } from '../../components/common';

/**
 * Government Schemes Page
 * 
 * Displays:
 * - Scheme search and filters
 * - Scheme cards with details
 * - Eligibility checker
 * - Bookmarked schemes
 * 
 * Requirements: 9.1-9.7
 */
export default function Schemes() {
    const profile = useSelector(selectProfile);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

    // Data states
    const [schemes, setSchemes] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [selectedScheme, setSelectedScheme] = useState(null);
    const [eligibilityResult, setEligibilityResult] = useState(null);
    const [bookmarkedSchemes, setBookmarkedSchemes] = useState([]);

    // Loading states
    const [loadingSchemes, setLoadingSchemes] = useState(false);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);
    const [loadingEligibility, setLoadingEligibility] = useState(false);

    // Error state
    const [error, setError] = useState(null);

    // View state
    const [activeView, setActiveView] = useState('search'); // search, recommendations, details

    // Categories and types for filters
    const CATEGORIES = [
        'Agriculture',
        'Subsidy',
        'Loan',
        'Insurance',
        'Training',
        'Equipment',
        'Marketing',
        'Other'
    ];

    const TYPES = [
        'Central',
        'State',
        'District',
        'Block'
    ];

    // Load bookmarked schemes from localStorage
    useEffect(() => {
        const bookmarks = JSON.parse(localStorage.getItem('bookmarkedSchemes') || '[]');
        setBookmarkedSchemes(bookmarks);
    }, []);

    // Fetch recommendations on mount
    useEffect(() => {
        if (profile) {
            fetchRecommendations();
        }
    }, [profile]);

    /**
     * Search schemes
     * Requirement 9.1: Query Backend_API with search terms
     */
    const handleSearch = async () => {
        if (!searchQuery.trim() && !selectedCategory && !selectedType) {
            setError('Please enter a search term or select filters');
            return;
        }

        setLoadingSchemes(true);
        setError(null);

        try {
            const filters = {};
            if (selectedCategory) filters.category = selectedCategory;
            if (selectedType) filters.type = selectedType;

            const response = await schemeService.searchSchemes(searchQuery, filters);
            // Backend returns { success: true, recommendations: [...] }
            const data = response.recommendations || response.schemes || [];
            setSchemes(Array.isArray(data) ? data : []);
            setActiveView('search');
        } catch (err) {
            console.error('Error searching schemes:', err);
            setError('Failed to search schemes. Please try again.');
        } finally {
            setLoadingSchemes(false);
        }
    };

    /**
     * Fetch personalized recommendations
     * Requirement 9.2: Fetch personalized scheme recommendations from Backend_API
     */
    const fetchRecommendations = async () => {
        setLoadingRecommendations(true);
        setError(null);

        try {
            const userProfile = profile ? {
                id: profile.id,
                location: profile.location,
                crops: profile.crops,
                landSize: profile.landSize,
                state: profile.state,
                district: profile.district,
                income: profile.income,
                age: profile.age,
                gender: profile.gender
            } : null;

            const response = await schemeService.getRecommendations(userProfile);
            // Backend returns { success: true, recommendations: [...] }
            const data = response.recommendations || [];
            setRecommendations(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching recommendations:', err);
            // Don't show error for recommendations as they might not always be available
        } finally {
            setLoadingRecommendations(false);
        }
    };

    /**
     * View scheme details
     * Requirement 9.3: Display eligibility criteria, benefits, and application process
     */
    const handleViewDetails = async (scheme) => {
        setLoadingSchemes(true);
        setError(null);
        setEligibilityResult(null);

        try {
            const schemeId = scheme.scheme_name || scheme.name || scheme.scheme_id;
            const response = await schemeService.getSchemeDetails(schemeId);
            // Backend returns { success: true, scheme: {...} }
            const data = response.scheme || response.data || response;
            setSelectedScheme(data);
            setActiveView('details');
        } catch (err) {
            console.error('Error fetching scheme details:', err);
            setError('Failed to load scheme details. Please try again.');
        } finally {
            setLoadingSchemes(false);
        }
    };

    /**
     * Check eligibility for a scheme
     * Requirement 9.5: Evaluate criteria client-side or via Backend_API
     */
    const handleCheckEligibility = async () => {
        if (!selectedScheme || !profile) {
            setError('Profile information required to check eligibility');
            return;
        }

        setLoadingEligibility(true);
        setError(null);

        try {
            const schemeId = selectedScheme.scheme_name || selectedScheme.name || selectedScheme.scheme_id;
            const userProfile = {
                id: profile.id,
                location: profile.location,
                crops: profile.crops,
                landSize: profile.landSize,
                state: profile.state,
                district: profile.district,
                age: profile.age,
                income: profile.income,
                gender: profile.gender
            };

            const response = await schemeService.checkEligibility(schemeId, userProfile);
            // Backend returns eligibility result
            const data = response.data || response;
            setEligibilityResult(data);
        } catch (err) {
            console.error('Error checking eligibility:', err);
            setError('Failed to check eligibility. Please try again.');
        } finally {
            setLoadingEligibility(false);
        }
    };

    /**
     * Toggle bookmark for a scheme
     * Requirement 9.6: Allow users to bookmark schemes in localStorage
     */
    const toggleBookmark = (scheme) => {
        const schemeId = scheme.scheme_name || scheme.name || scheme.scheme_id || scheme.id;
        const isBookmarked = bookmarkedSchemes.some(s =>
            (s.scheme_name || s.name || s.scheme_id || s.id) === schemeId
        );

        let updatedBookmarks;
        if (isBookmarked) {
            updatedBookmarks = bookmarkedSchemes.filter(s =>
                (s.scheme_name || s.name || s.scheme_id || s.id) !== schemeId
            );
        } else {
            updatedBookmarks = [...bookmarkedSchemes, scheme];
        }

        setBookmarkedSchemes(updatedBookmarks);
        localStorage.setItem('bookmarkedSchemes', JSON.stringify(updatedBookmarks));
    };

    /**
     * Check if scheme is bookmarked
     */
    const isBookmarked = (scheme) => {
        const schemeId = scheme.scheme_name || scheme.name || scheme.scheme_id || scheme.id;
        return bookmarkedSchemes.some(s =>
            (s.scheme_name || s.name || s.scheme_id || s.id) === schemeId
        );
    };

    /**
     * Get filtered schemes based on bookmarks filter
     */
    const getDisplayedSchemes = () => {
        if (showBookmarksOnly) {
            return bookmarkedSchemes;
        }
        return schemes;
    };

    /**
     * Render scheme card
     */
    const renderSchemeCard = (scheme) => {
        const schemeId = scheme.scheme_id || scheme.id || scheme.scheme_name;
        const schemeName = scheme.scheme_name || scheme.name || scheme.title;
        const schemeDescription = scheme.description || scheme.summary || '';
        const schemeCategory = scheme.category || scheme.scheme_type || 'General';
        const schemeType = scheme.type || scheme.scheme_type || 'Central';

        return (
            <Card
                key={schemeId}
                hoverable
                className="relative"
            >
                {/* Bookmark button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(scheme);
                    }}
                    className="absolute top-4 right-4 text-yellow-500 hover:text-yellow-600 text-xl"
                >
                    {isBookmarked(scheme) ? <FaBookmark /> : <FaRegBookmark />}
                </button>

                <div className="pr-8">
                    <div className="flex items-start gap-3 mb-3">
                        <FaFileAlt className="text-3xl text-blue-600 mt-1" />
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                {schemeName}
                            </h3>
                            <div className="flex gap-2 mb-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <FaTags className="mr-1" />
                                    {schemeCategory}
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {schemeType}
                                </span>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                        {schemeDescription}
                    </p>

                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={() => handleViewDetails(scheme)}
                        >
                            View Details
                        </Button>
                    </div>
                </div>
            </Card>
        );
    };

    const isLoading = loadingSchemes || loadingRecommendations || loadingEligibility;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Government Schemes</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Discover subsidies and benefits you're eligible for
                        </p>
                    </div>

                    {/* View Toggle */}
                    <div className="flex gap-2">
                        <Button
                            variant={activeView === 'search' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setActiveView('search')}
                        >
                            <FaSearch className="mr-2" />
                            Search
                        </Button>
                        <Button
                            variant={activeView === 'recommendations' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => {
                                setActiveView('recommendations');
                                if (recommendations.length === 0) {
                                    fetchRecommendations();
                                }
                            }}
                        >
                            <FaInfoCircle className="mr-2" />
                            Recommendations
                        </Button>
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

            {/* Search View */}
            {activeView === 'search' && (
                <>
                    {/* Search and Filters */}
                    <Card>
                        <div className="space-y-4">
                            {/* Search Input */}
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="Search schemes by name, keyword, or benefit..."
                                        icon={<FaSearch />}
                                    />
                                </div>
                                <Button onClick={handleSearch} disabled={isLoading}>
                                    <FaSearch className="mr-2" />
                                    Search
                                </Button>
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <select
                                        id="category-filter"
                                        name="category"
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={isLoading}
                                    >
                                        <option value="">All Categories</option>
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex-1 min-w-[200px]">
                                    <select
                                        id="type-filter"
                                        name="type"
                                        value={selectedType}
                                        onChange={(e) => setSelectedType(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={isLoading}
                                    >
                                        <option value="">All Types</option>
                                        {TYPES.map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="bookmarks-only"
                                        checked={showBookmarksOnly}
                                        onChange={(e) => setShowBookmarksOnly(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="bookmarks-only" className="text-sm text-gray-700">
                                        <FaBookmark className="inline mr-1 text-yellow-500" />
                                        Bookmarks Only
                                    </label>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Search Results */}
                    {loadingSchemes ? (
                        <div className="flex justify-center py-12">
                            <ClipLoader color="#3B82F6" size={50} />
                        </div>
                    ) : getDisplayedSchemes().length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {getDisplayedSchemes().map((scheme) => renderSchemeCard(scheme))}
                        </div>
                    ) : (
                        <Card>
                            <div className="text-center py-12">
                                <FaSearch className="text-6xl text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">
                                    {showBookmarksOnly
                                        ? 'No bookmarked schemes yet. Start exploring and bookmark schemes you\'re interested in!'
                                        : 'No schemes found. Try different search terms or filters.'}
                                </p>
                            </div>
                        </Card>
                    )}
                </>
            )}

            {/* Recommendations View */}
            {activeView === 'recommendations' && (
                <>
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Personalized Recommendations</h2>
                            <Button
                                size="sm"
                                onClick={fetchRecommendations}
                                disabled={loadingRecommendations}
                            >
                                Refresh
                            </Button>
                        </div>
                        <p className="text-sm text-gray-600">
                            Based on your profile: {profile?.location && `${profile.location}, `}
                            {profile?.crops && `Crops: ${profile.crops.join(', ')}`}
                        </p>
                    </Card>

                    {loadingRecommendations ? (
                        <div className="flex justify-center py-12">
                            <ClipLoader color="#3B82F6" size={50} />
                        </div>
                    ) : recommendations.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recommendations.map((scheme) => renderSchemeCard(scheme))}
                        </div>
                    ) : (
                        <Card>
                            <div className="text-center py-12">
                                <FaInfoCircle className="text-6xl text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">
                                    No recommendations available. Complete your profile to get personalized scheme recommendations.
                                </p>
                            </div>
                        </Card>
                    )}
                </>
            )}

            {/* Scheme Details View */}
            {activeView === 'details' && selectedScheme && (
                <div className="space-y-6">
                    {/* Back Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveView('search')}
                    >
                        ← Back to Search
                    </Button>

                    {/* Scheme Details Card */}
                    <Card>
                        <div className="space-y-6">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                        {selectedScheme.name || selectedScheme.scheme_name || selectedScheme.title}
                                    </h2>
                                    <div className="flex gap-2 mb-4">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                            {selectedScheme.category || 'General'}
                                        </span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                            {selectedScheme.type || selectedScheme.scheme_type || 'Central'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleBookmark(selectedScheme)}
                                    className="text-yellow-500 hover:text-yellow-600 text-2xl"
                                >
                                    {isBookmarked(selectedScheme) ? <FaBookmark /> : <FaRegBookmark />}
                                </button>
                            </div>

                            {/* Description */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                                <p className="text-gray-700">
                                    {selectedScheme.description || selectedScheme.summary || 'No description available'}
                                </p>
                            </div>

                            {/* Benefits */}
                            {selectedScheme.benefits && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Benefits</h3>
                                    {Array.isArray(selectedScheme.benefits) ? (
                                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                                            {selectedScheme.benefits.map((benefit, index) => (
                                                <li key={index}>{benefit}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-700">{selectedScheme.benefits}</p>
                                    )}
                                </div>
                            )}

                            {/* Eligibility Criteria */}
                            {selectedScheme.eligibility_criteria && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Eligibility Criteria</h3>
                                    {Array.isArray(selectedScheme.eligibility_criteria) ? (
                                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                                            {selectedScheme.eligibility_criteria.map((criteria, index) => (
                                                <li key={index}>{criteria}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-700">{selectedScheme.eligibility_criteria}</p>
                                    )}
                                </div>
                            )}

                            {/* Required Documents */}
                            {selectedScheme.required_documents && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        <FaFileAlt className="inline mr-2" />
                                        Required Documents
                                    </h3>
                                    {Array.isArray(selectedScheme.required_documents) ? (
                                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                                            {selectedScheme.required_documents.map((doc, index) => (
                                                <li key={index}>{doc}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-700">{selectedScheme.required_documents}</p>
                                    )}
                                </div>
                            )}

                            {/* Application Process */}
                            {selectedScheme.application_process && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Application Process</h3>
                                    {Array.isArray(selectedScheme.application_process) ? (
                                        <ol className="list-decimal list-inside space-y-1 text-gray-700">
                                            {selectedScheme.application_process.map((step, index) => (
                                                <li key={index}>{step}</li>
                                            ))}
                                        </ol>
                                    ) : (
                                        <p className="text-gray-700">{selectedScheme.application_process}</p>
                                    )}
                                </div>
                            )}

                            {/* Application Link */}
                            {selectedScheme.application_url && (
                                <div>
                                    <a
                                        href={selectedScheme.application_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        <FaExternalLinkAlt className="mr-2" />
                                        Apply Online
                                    </a>
                                </div>
                            )}

                            {/* Eligibility Checker */}
                            <div className="border-t pt-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Check Your Eligibility</h3>
                                <Button
                                    onClick={handleCheckEligibility}
                                    disabled={loadingEligibility || !profile}
                                    loading={loadingEligibility}
                                >
                                    Check Eligibility
                                </Button>

                                {!profile && (
                                    <p className="text-sm text-gray-500 mt-2">
                                        Complete your profile to check eligibility
                                    </p>
                                )}

                                {/* Eligibility Result */}
                                {eligibilityResult && (
                                    <div className={`mt-4 p-4 rounded-lg border-l-4 ${eligibilityResult.eligible || eligibilityResult.is_eligible
                                        ? 'bg-green-50 border-green-500'
                                        : 'bg-red-50 border-red-500'
                                        }`}>
                                        <div className="flex items-start gap-3">
                                            {eligibilityResult.eligible || eligibilityResult.is_eligible ? (
                                                <FaCheckCircle className="text-2xl text-green-600 mt-1" />
                                            ) : (
                                                <FaTimesCircle className="text-2xl text-red-600 mt-1" />
                                            )}
                                            <div className="flex-1">
                                                <h4 className={`font-semibold mb-2 ${eligibilityResult.eligible || eligibilityResult.is_eligible
                                                    ? 'text-green-800'
                                                    : 'text-red-800'
                                                    }`}>
                                                    {eligibilityResult.eligible || eligibilityResult.is_eligible
                                                        ? 'You are eligible for this scheme!'
                                                        : 'You are not eligible for this scheme'}
                                                </h4>
                                                {eligibilityResult.reason && (
                                                    <p className="text-sm text-gray-700">{eligibilityResult.reason}</p>
                                                )}
                                                {eligibilityResult.missing_criteria && eligibilityResult.missing_criteria.length > 0 && (
                                                    <div className="mt-2">
                                                        <p className="text-sm font-medium text-gray-700">Missing criteria:</p>
                                                        <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                                                            {eligibilityResult.missing_criteria.map((criteria, index) => (
                                                                <li key={index}>{criteria}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
