import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaFileAlt, FaCheckCircle } from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';

/**
 * Scheme Widget Component
 * Displays scheme recommendations
 * Requirement 20.4: Show relevant scheme recommendations based on user profile
 */
export default function SchemeWidget({ schemes, loading, error }) {
    const { t } = useTranslation();
    // Ensure schemes is always an array
    const schemesArray = Array.isArray(schemes) ? schemes : [];

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">{t('dashboard.schemeRecommendations')}</h2>
                <div className="flex items-center justify-center h-40">
                    <ClipLoader color="#3B82F6" size={40} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">{t('dashboard.schemeRecommendations')}</h2>
                <div className="text-center text-red-500 py-8">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!schemesArray || schemesArray.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">{t('dashboard.schemeRecommendations')}</h2>
                <div className="text-center text-gray-500 py-8">
                    <p>{t('dashboard.noSchemeRecommendations')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">{t('dashboard.schemeRecommendations')}</h2>
                <Link to="/schemes" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    {t('dashboard.viewAll')} →
                </Link>
            </div>

            <div className="space-y-3">
                {schemesArray.slice(0, 4).map((scheme, index) => (
                    <div
                        key={scheme.id || index}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-start space-x-3">
                            <FaFileAlt className="text-blue-500 mt-1 flex-shrink-0" size={20} />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-gray-800 truncate">
                                    {scheme.name || scheme.title}
                                </h3>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {scheme.description || scheme.summary || t('dashboard.noData')}
                                </p>
                                {scheme.eligible !== undefined && (
                                    <div className="flex items-center space-x-1 mt-2">
                                        {scheme.eligible ? (
                                            <>
                                                <FaCheckCircle className="text-green-500" size={14} />
                                                <span className="text-xs text-green-600 font-medium">
                                                    {t('schemes.youAreEligible')}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-xs text-gray-500">
                                                {t('schemes.checkEligibility')}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
