import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    FaSearch,
    FaBookmark,
    FaRegBookmark,
    FaCheckCircle,
    FaTimesCircle,
    FaInfoCircle,
    FaExternalLinkAlt,
    FaFileAlt,
    FaTags,
    FaComments
} from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import { selectProfile } from '../../store/slices/userSlice';
import schemeService from '../../api/services/schemeService';
import { Card, ErrorAlert, Input, Button } from '../../components/common';

/**
 * Government Schemes Page - Redesigned
 * 
 * Features:
 * - Auto-loads schemes based on user profile (state + central schemes)
 * - Manual search for specific schemes
 * - Chat integration for scheme assistance
 * - Bookmark functionality
 */
export default function Schemes() {
    const profile = useSelector(selectProfile);
    const navigate = useNavigate();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

    // Data states
    const [schemes, setSchemes] = useState([]);
    const [selectedScheme, setSelectedScheme] = useState(null);
    const [eligibilityResult, setEligibilityResult] = useState(null);
    const [bookmarkedSchemes, setBookmarkedSchemes] = useState([]);

    // Loading states
    const [loadingSchemes, setLoadingSchemes] = useState(false);
    const [loadingEligibility, setLoadingEligibility] = useState(false);

    // Error state
    const [error, setError] = useState(null);

    // View state
    const [activeView, setActiveView] = useState('search'); // search, details

    // Load bookmarked schemes from localStorage
    useEffect(() => {
        const bookmarks = JSON.parse(localStorage.getItem('bookmarkedSchemes') || '[]');
        setBookmarkedSchemes(bookmarks);
    }, []);

    // Auto-load schemes on mount based on user profile
    useEffect(() => {
        autoLoadSchemes();
    }, [profile]);

    /**
     * Auto-load schemes based on user profile (state + central schemes)
     */
    const autoLoadSchemes = async () => {
        setLoadingSchemes(true);
        setError(null);

        try {
            const userId = profile?.id || 'anonymous';
            const state = profile?.state || null;
            const language = profile?.language || 'en';

            const response = await schemeService.getSchemesForUser(userId, state, language);
            const data = response.schemes || [];
            setSchemes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error auto-loading schemes:', err);
            // Don't show error on initial load, just log it
        } finally {
            setLoadingSchemes(false);
        }
    };

    /**
     * Search schemes manually
     */
    const handleSearch = async () => {
        const searchTerm = searchQuery.trim() || 'government schemes for farmers';

        setLoadingSchemes(true);
        setError(null);

        try {
            const response = await schemeService.searchSchemes(searchTerm, profile);
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
     * View scheme details
     */
    const handleViewDetails = async (scheme) => {
        setLoadingSchemes(true);
        setError(null);
        setEligibilityResult(null);

        try {
            const schemeId = scheme.scheme_name || scheme.name || scheme.scheme_id;
            const response = await schemeService.getSchemeDetails(schemeId, profile);
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
            const response = await schemeService.checkEligibility(schemeId, profile);
            setEligibilityResult(response);
        } catch (err) {
            console.error('Error checking eligibility:', err);
            setError('Failed to check eligibility. Please try again.');
        } finally {
            setLoadingEligibility(false);
        }
    };

    /**
     * Chat about scheme - redirect to chat with context
     */
    const handleChatAboutScheme = async (scheme) => {
        try {
            const schemeId = scheme.scheme_name || scheme.name || scheme.scheme_id;

            console.log('Preparing chat context for scheme:', schemeId);

            // Prepare chat context
            const response = await schemeService.prepareChatContext(schemeId, profile);

            console.log('Chat context response:', response);

            // Navigate to chat with context
            navigate('/chat', {
                state: {
                    context: response.context,
                    initialMessage: response.initial_message,
                    schemeId: response.scheme_id,
                    schemeName: response.scheme_name
                }
            });
        } catch (err) {
            console.error('Error preparing chat context:', err);
            console.error('Error details:', err.response?.data || err.message);
            setError('Failed to open chat. Please try again.');
        }
    };

    /**
     * Toggle bookmark for a scheme
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
     * Get displayed schemes
     */
    const getDisplayedSchemes = () => {
        return showBookmarksOnly ? bookmarkedSchemes : schemes;
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
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChatAboutScheme(scheme)}
                        >
                            <FaComments className="mr-1" />
                            Chat
                        </Button>
                    </div>
                </div>
            </Card>
        );
    };

    const isLoading = loadingSchemes || loadingEligibility;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Government Schemes</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            {profile?.state
                                ? `Schemes for ${profile.state} + Central Schemes`
                                : 'Central Government Schemes'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

            {/* Search View */}
            {activeView === 'search' && (
                <>
                    {/* Search Bar */}
                    <Card>
                        <div className="space-y-4">
                            {/* Search Input */}
                            <div className="flex gap-2 items-stretch">
                                <div className="flex-1">
                                    <Input
                                        type="text"
                                        id="scheme-search"
                                        name="search"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="Search schemes by name, keyword, or benefit..."
                                        icon={<FaSearch />}
                                        className="h-full"
                                    />
                                </div>
                                <Button
                                    onClick={handleSearch}
                                    disabled={isLoading}
                                    className="whitespace-nowrap"
                                >
                                    {isLoading ? (
                                        <ClipLoader color="#ffffff" size={16} />
                                    ) : (
                                        <>
                                            <FaSearch className="mr-2" />
                                            Search
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Bookmarks Filter */}
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
                    </Card>

                    {/* Schemes Grid */}
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
                                        : 'No schemes found. Try different search terms.'}
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

                            {/* Chat Button - Prominent */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Need Help?</h3>
                                        <p className="text-sm text-gray-600">Chat with AI to get personalized assistance about this scheme</p>
                                    </div>
                                    <Button
                                        onClick={() => handleChatAboutScheme(selectedScheme)}
                                        className="whitespace-nowrap"
                                    >
                                        <FaComments className="mr-2" />
                                        Chat About This Scheme
                                    </Button>
                                </div>
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
                                                        : 'You may not be eligible for this scheme'}
                                                </h4>
                                                {eligibilityResult.eligibility_reasons && eligibilityResult.eligibility_reasons.length > 0 && (
                                                    <div className="mt-2">
                                                        <p className="text-sm font-medium text-gray-700">Reasons:</p>
                                                        <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                                                            {eligibilityResult.eligibility_reasons.map((reason, index) => (
                                                                <li key={index}>{reason}</li>
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
