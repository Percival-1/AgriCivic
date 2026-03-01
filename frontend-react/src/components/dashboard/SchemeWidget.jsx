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

            <div className="flex overflow-x-auto pb-4 space-x-4 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {schemesArray.map((scheme, index) => (
                    <div
                        key={scheme.id || index}
                        className="flex-none w-[90%] sm:w-[320px] snap-center bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 relative z-10 flex flex-col"
                    >
                        <div className="flex items-start space-x-3 mb-3">
                            <div className="bg-blue-50 p-2 rounded-lg">
                                <FaFileAlt className="text-blue-500 flex-shrink-0" size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold text-gray-800 leading-tight">
                                    {scheme.name || scheme.title}
                                </h3>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">
                            {scheme.description || scheme.summary || t('dashboard.noData')}
                        </p>

                        {scheme.eligible !== undefined && (
                            <div className="flex items-center mt-auto bg-gray-50 px-3 py-2 rounded-lg">
                                {scheme.eligible ? (
                                    <>
                                        <FaCheckCircle className="text-green-500 mr-2" size={16} />
                                        <span className="text-sm text-green-700 font-medium">
                                            {t('schemes.youAreEligible')}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-sm text-gray-600 font-medium">
                                        {t('schemes.checkEligibility')}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
