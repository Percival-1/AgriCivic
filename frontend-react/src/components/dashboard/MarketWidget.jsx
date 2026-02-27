import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaChartLine, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';

/**
 * Market Widget Component
 * Displays market prices for user crops
 * Requirement 20.3: Display market prices for user's crops
 */
export default function MarketWidget({ data, loading, error, crops }) {
    const { t } = useTranslation();

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">{t('dashboard.marketPrices')}</h2>
                <div className="flex items-center justify-center h-40">
                    <ClipLoader color="#3B82F6" size={40} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">{t('dashboard.marketPrices')}</h2>
                <div className="text-center text-red-500 py-8">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">{t('dashboard.marketPrices')}</h2>
                <div className="text-center text-gray-500 py-8">
                    <p>{t('dashboard.noMarketData')}</p>
                </div>
            </div>
        );
    }

    const prices = data.prices || [data];
    const cropName = Array.isArray(crops) ? crops[0] : crops;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">{t('dashboard.marketPrices')}</h2>
                <Link to="/market" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    {t('dashboard.viewDetails')} →
                </Link>
            </div>

            <div className="space-y-4">
                {/* Crop Name */}
                <div className="flex items-center space-x-2">
                    <FaChartLine className="text-green-500" size={20} />
                    <span className="text-gray-700 font-medium capitalize">
                        {cropName ? t('dashboard.priceFor', { crop: cropName }) : t('profile.crops')}
                    </span>
                </div>

                {/* Price Information */}
                {prices.slice(0, 3).map((price, index) => {
                    const priceChange = price.change || price.price_change || 0;
                    const isPositive = priceChange >= 0;

                    return (
                        <div key={index} className="border-b pb-3 last:border-b-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">
                                        {price.mandi || price.market || t('market.location')}
                                    </p>
                                    <p className="text-2xl font-bold text-gray-800">
                                        ₹{price.price || price.current_price || t('dashboard.noData')}
                                        <span className="text-sm text-gray-500 font-normal">{t('dashboard.perQuintal')}</span>
                                    </p>
                                </div>
                                <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {isPositive ? <FaArrowUp size={16} /> : <FaArrowDown size={16} />}
                                    <span className="font-semibold">
                                        {Math.abs(priceChange)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* MSP Information if available */}
                {data.msp && (
                    <div className="bg-blue-50 rounded p-3 mt-4">
                        <p className="text-xs text-gray-600">{t('market.msp')}</p>
                        <p className="text-lg font-bold text-blue-600">₹{data.msp}{t('dashboard.perQuintal')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
