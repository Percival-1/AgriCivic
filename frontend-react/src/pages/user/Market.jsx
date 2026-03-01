import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
    FaStore,
    FaChartLine,
    FaMapMarkerAlt,
    FaStar,
    FaRegStar,
    FaArrowUp,
    FaArrowDown,
    FaMinus,
    FaFilter,
    FaSearch,
    FaRoute
} from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import { Line } from 'react-chartjs-2';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { selectProfile } from '../../store/slices/userSlice';
import marketService from '../../api/services/marketService';
import { Card, ErrorAlert } from '../../components/common';
import { GeocodingSearch } from '../../components/maps';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function Market() {
    const { t } = useTranslation();
    const profile = useSelector(selectProfile);

    // Predefined locations
    const PREDEFINED_LOCATIONS = [
        { name: 'Delhi', latitude: 28.6139, longitude: 77.2090 },
        { name: 'Haryana', latitude: 29.0588, longitude: 76.0856 },
        { name: 'Punjab', latitude: 31.1471, longitude: 75.3412 },
        { name: 'Karnal', latitude: 29.6857, longitude: 76.9905 },
        { name: 'Rohtak', latitude: 28.8955, longitude: 76.6066 },
        { name: 'Ludhiana', latitude: 30.9010, longitude: 75.8573 },
        { name: 'Amritsar', latitude: 31.6340, longitude: 74.8723 },
    ];

    // Search and filter state
    const [selectedCrop, setSelectedCrop] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [currentCoordinates, setCurrentCoordinates] = useState(null);
    const [currentLocationName, setCurrentLocationName] = useState('');

    // Tab state
    const [activeTab, setActiveTab] = useState('prices');

    // INDIVIDUAL Data states (Lazy Loading ke liye)
    const [currentPrices, setCurrentPrices] = useState([]);
    const [priceComparison, setPriceComparison] = useState(null);
    const [nearestMandis, setNearestMandis] = useState([]);
    const [priceTrends, setPriceTrends] = useState(null);
    const [sellingRecommendation, setSellingRecommendation] = useState(null);
    const [favoriteMandis, setFavoriteMandis] = useState([]);

    // INDIVIDUAL Loading states
    const [loadingPrices, setLoadingPrices] = useState(false);
    const [loadingComparison, setLoadingComparison] = useState(false);
    const [loadingMandis, setLoadingMandis] = useState(false);
    const [loadingTrends, setLoadingTrends] = useState(false);
    const [loadingRecommendation, setLoadingRecommendation] = useState(false);

    const [error, setError] = useState(null);

    // Initialize from profile
    useEffect(() => {
        if (profile?.crops && profile.crops.length > 0 && !selectedCrop) {
            setSelectedCrop(profile.crops[0]);
        }
        if (profile?.latitude && profile?.longitude && !currentCoordinates) {
            setCurrentCoordinates({ latitude: profile.latitude, longitude: profile.longitude });
            setCurrentLocationName(profile.location || 'Your Location');
            setSelectedLocation('custom');
        } else if (!currentCoordinates) {
            const delhiLocation = PREDEFINED_LOCATIONS[0];
            setCurrentCoordinates({ latitude: delhiLocation.latitude, longitude: delhiLocation.longitude });
            setCurrentLocationName(delhiLocation.name);
            setSelectedLocation(delhiLocation.name);
        }
    }, [profile, selectedCrop, currentCoordinates]);

    // Load favorite mandis
    useEffect(() => {
        setFavoriteMandis(marketService.getFavoriteMandis());
    }, []);

    // RESET DATA WHER CROP OR LOCATION CHANGES (Taki naya data fetch ho)
    useEffect(() => {
        setCurrentPrices([]);
        setPriceComparison(null);
        setNearestMandis([]);
        setPriceTrends(null);
        setSellingRecommendation(null);
        setError(null);
    }, [selectedCrop, currentCoordinates]);

    // 🔥 LAZY LOADING LOGIC: Sirf active tab ka data fetch karega
    useEffect(() => {
        if (!selectedCrop || !currentCoordinates) return;

        const fetchTabData = async () => {
            const { latitude, longitude } = currentCoordinates;
            try {
                setError(null);

                // 1. Current Prices Tab
                if (activeTab === 'prices' && currentPrices.length === 0) {
                    setLoadingPrices(true);
                    const res = await marketService.getCurrentPrices(selectedCrop, latitude, longitude);
                    // Safe parsing based on what API might return
                    const parsedPrices = res.prices || res.data || (Array.isArray(res) ? res : []);
                    setCurrentPrices(parsedPrices);
                    setLoadingPrices(false);
                }

                // 2. Comparison Tab
                else if (activeTab === 'comparison' && !priceComparison) {
                    setLoadingComparison(true);
                    const res = await marketService.comparePrices(selectedCrop, latitude, longitude);
                    setPriceComparison(res);
                    setLoadingComparison(false);
                }

                // 3. Trends Tab
                else if (activeTab === 'trends' && !priceTrends) {
                    setLoadingTrends(true);
                    const res = await marketService.getPriceTrends(selectedCrop, latitude, longitude, 30);
                    setPriceTrends(res);
                    setLoadingTrends(false);
                }

                // 4. Mandis & Recommendation Tabs (Requires heavy Intelligence API)
                else if ((activeTab === 'map' && nearestMandis.length === 0) ||
                    (activeTab === 'recommendation' && !sellingRecommendation)) {

                    if (activeTab === 'map') setLoadingMandis(true);
                    if (activeTab === 'recommendation') setLoadingRecommendation(true);

                    const intelligence = await marketService.getMarketIntelligence(selectedCrop, latitude, longitude, 100);

                    // Set Mandis
                    if (intelligence.nearest_mandis && intelligence.nearest_mandis.length > 0) {
                        const mandisWithDistance = intelligence.nearest_mandis.map(mandi => ({
                            ...mandi,
                            distance: mandi.distance_km || mandi.distance
                        }));
                        setNearestMandis(mandisWithDistance);
                    } else {
                        setNearestMandis([]);
                    }

                    // Set Recommendations
                    if (intelligence.recommendation || intelligence.reasoning) {
                        setSellingRecommendation({
                            recommendation: intelligence.reasoning || intelligence.recommendation,
                            best_mandis: intelligence.optimal_mandi ? [intelligence.optimal_mandi] : [],
                            timing_advice: intelligence.recommendation,
                            expected_returns: intelligence.demand_signals?.join(', ')
                        });
                    }

                    // Bonus: Pre-fill other data so it doesn't load again if user clicks other tabs later
                    if (intelligence.price_comparison?.prices) {
                        setCurrentPrices(intelligence.price_comparison.prices);
                        setPriceComparison(intelligence.price_comparison);
                    }
                    if (intelligence.price_trend) {
                        setPriceTrends(intelligence.price_trend);
                    }

                    setLoadingMandis(false);
                    setLoadingRecommendation(false);
                }
            } catch (err) {
                console.error(`Error fetching data for ${activeTab}:`, err);
                setError(err.message || 'Failed to load data. Please try again.');
                setLoadingPrices(false); setLoadingComparison(false); setLoadingTrends(false);
                setLoadingMandis(false); setLoadingRecommendation(false);
            }
        };

        fetchTabData();
    }, [activeTab, selectedCrop, currentCoordinates]);

    // Handlers
    const handleCropChange = (crop) => setSelectedCrop(crop);

    const handleLocationChange = (locationName) => {
        setSelectedLocation(locationName);
        setError(null);
        if (locationName === 'custom' && profile?.latitude && profile?.longitude) {
            setCurrentCoordinates({ latitude: profile.latitude, longitude: profile.longitude });
            setCurrentLocationName(profile.location || 'Your Location');
        } else {
            const location = PREDEFINED_LOCATIONS.find(loc => loc.name === locationName);
            if (location) {
                setCurrentCoordinates({ latitude: location.latitude, longitude: location.longitude });
                setCurrentLocationName(location.name);
            }
        }
    };

    const toggleFavorite = (mandi) => {
        const isFav = marketService.isFavoriteMandi(mandi.id || mandi.name || mandi.mandi_name);
        if (isFav) {
            setFavoriteMandis(marketService.removeFavoriteMandi(mandi.id || mandi.name || mandi.mandi_name));
        } else {
            setFavoriteMandis(marketService.saveFavoriteMandi(mandi));
        }
    };

    // Google Maps Direct Route Opener
    const handleShowRoute = (mandi) => {
        const oLat = currentCoordinates?.latitude;
        const oLng = currentCoordinates?.longitude;
        const dLat = mandi.latitude || mandi.location?.latitude;
        const dLng = mandi.longitude || mandi.location?.longitude;

        if (oLat && oLng && dLat && dLng) {
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}&travelmode=driving`;
            window.open(googleMapsUrl, '_blank');
        } else {
            alert("Location coordinates not found. Please try again.");
        }
    };

    const getPriceChangeIcon = (direction) => {
        if (direction === 'up') return <FaArrowUp className="text-green-600" />;
        if (direction === 'down') return <FaArrowDown className="text-red-600" />;
        return <FaMinus className="text-gray-600" />;
    };

    const getPriceTrendChartData = () => {
        if (!priceTrends?.historical_prices || priceTrends.historical_prices.length === 0) return null;
        const labels = priceTrends.historical_prices.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        });
        const prices = priceTrends.historical_prices.map(item => item.price);
        return {
            labels,
            datasets: [{
                label: `${selectedCrop} Price (₹/quintal)`,
                data: prices,
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                fill: true,
                tension: 0.4,
            }],
        };
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' }, title: { display: true, text: `${selectedCrop} Price Trends` } },
        scales: { y: { beginAtZero: false, title: { display: true, text: 'Price (₹/quintal)' } } },
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">{t('market.marketIntelligence')}</h1>
                        <p className="text-sm text-gray-600 mt-1">{t('market.currentPrices')} & {t('market.sellingRecommendation')}</p>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 items-center flex-wrap">
                        <select
                            id="crop-select"
                            name="crop"
                            value={selectedCrop}
                            onChange={(e) => handleCropChange(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{t('market.selectCrop')}</option>
                            {profile?.crops && profile.crops.map((crop) => <option key={crop} value={crop}>{crop}</option>)}
                            <option value="Wheat">Wheat</option>
                            <option value="Rice">Rice</option>
                            <option value="Cotton">Cotton</option>
                            <option value="Sugarcane">Sugarcane</option>
                            <option value="Maize">Maize</option>
                            <option value="Soybean">Soybean</option>
                            <option value="Potato">Potato</option>
                            <option value="Onion">Onion</option>
                        </select>

                        <select
                            id="location-select"
                            name="location"
                            value={selectedLocation}
                            onChange={(e) => handleLocationChange(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{t('weather.changeLocation')}</option>
                            {profile?.location && <option value="custom">{t('profile.location')}: {profile.location}</option>}
                            {PREDEFINED_LOCATIONS.map((loc) => <option key={loc.name} value={loc.name}>{loc.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Geocoding Search */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FaSearch className="inline mr-2" /> {t('common.search')} {t('profile.location')}
                    </label>
                    <GeocodingSearch
                        onLocationSelect={(location) => {
                            setCurrentCoordinates({ latitude: location.latitude, longitude: location.longitude });
                            setCurrentLocationName(location.name || location.address);
                            setSelectedLocation('custom');
                        }}
                        placeholder={t('common.search') + "..."}
                    />
                </div>

                {/* Current Selection Display */}
                {selectedCrop && currentLocationName && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                        <p className="text-sm text-green-800">
                            <FaStore className="inline mr-2" />
                            {t('dashboard.weatherStatus').split(' ')[0] || ''} {t('dashboard.priceFor', { crop: selectedCrop })} {t('dashboard.forLocation', { location: currentLocationName })}
                        </p>
                    </div>
                )}
            </div>

            {/* Error Alert */}
            {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                    {[
                        { id: 'prices', label: t('market.currentPrices'), icon: FaStore },
                        { id: 'comparison', label: t('market.priceComparison'), icon: FaFilter },
                        { id: 'trends', label: t('market.priceTrends'), icon: FaChartLine },
                        { id: 'map', label: t('market.nearestMandis'), icon: FaMapMarkerAlt },
                        { id: 'recommendation', label: t('market.recommendation'), icon: FaChartLine },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            <tab.icon /> {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Current Prices Tab */}
            {activeTab === 'prices' && (
                <Card>
                    <h2 className="text-xl font-bold mb-4">{t('market.currentPrices')}</h2>
                    {loadingPrices ? (
                        <div className="flex justify-center py-8"><ClipLoader color="#3B82F6" size={40} /></div>
                    ) : currentPrices.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('market.location')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('market.price')} (₹/{t('market.perQuintal')})</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('market.priceChange')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('market.lastUpdated')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.edit') || 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentPrices.map((price, index) => {
                                        const change = marketService.getPriceChange(price.price_per_quintal, price.previous_price);
                                        return (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{price.mandi_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{marketService.formatPrice(price.price_per_quintal)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex items-center gap-2">{getPriceChangeIcon(change.direction)}<span>{change.percentage}%</span></div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{marketService.formatDate(price.date)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <button
                                                        onClick={() => toggleFavorite({ name: price.mandi_name, location: price.location?.state, ...price.location })}
                                                        className="text-yellow-500 hover:text-yellow-600"
                                                    >
                                                        {marketService.isFavoriteMandi(price.mandi_name) ? <FaStar /> : <FaRegStar />}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="text-gray-500 text-center py-8">{t('market.noPriceData')}</p>}
                </Card>
            )}

            {/* Price Comparison Tab */}
            {activeTab === 'comparison' && (
                <Card>
                    <h2 className="text-xl font-bold mb-4">{t('market.priceComparison')}</h2>
                    {loadingComparison ? (
                        <div className="flex justify-center py-8"><ClipLoader color="#3B82F6" size={40} /></div>
                    ) : priceComparison?.prices && priceComparison.prices.length > 0 ? (
                        <div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('market.location')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('market.price')} (₹/{t('market.perQuintal')})</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('market.compareWith')} Average</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('market.location')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {priceComparison.prices.map((comp, index) => {
                                            const avgDiff = priceComparison.average_price ? ((comp.price_per_quintal - priceComparison.average_price) / priceComparison.average_price * 100).toFixed(1) : 0;
                                            return (
                                                <tr key={index}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{comp.mandi_name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{marketService.formatPrice(comp.price_per_quintal)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={avgDiff > 0 ? 'text-green-600' : 'text-red-600'}>{avgDiff > 0 ? '+' : ''}{avgDiff}%</span></td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comp.location?.state || comp.location?.district || 'N/A'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {priceComparison.average_price && (
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-blue-800">{t('market.averagePrice')}: <span className="font-semibold">{marketService.formatPrice(priceComparison.average_price)}</span></p>
                                    {priceComparison.recommendation && <p className="text-sm text-blue-700 mt-2">{priceComparison.recommendation}</p>}
                                </div>
                            )}
                        </div>
                    ) : <p className="text-gray-500 text-center py-8">{t('dashboard.noData')}</p>}
                </Card>
            )}

            {/* Price Trends Tab */}
            {activeTab === 'trends' && (
                <Card>
                    <h2 className="text-xl font-bold mb-4">{t('market.priceTrends')}</h2>
                    {loadingTrends ? (
                        <div className="flex justify-center py-8"><ClipLoader color="#3B82F6" size={40} /></div>
                    ) : priceTrends && getPriceTrendChartData() ? (
                        <div className="h-96"><Line data={getPriceTrendChartData()} options={chartOptions} /></div>
                    ) : <p className="text-gray-500 text-center py-8">{t('dashboard.noData')}</p>}
                </Card>
            )}

            {/* Nearest Mandis Map Tab */}
            {activeTab === 'map' && (
                <Card>
                    <h2 className="text-xl font-bold mb-4">{t('market.nearestMandis')}</h2>
                    {loadingMandis ? (
                        <div className="flex justify-center py-8"><ClipLoader color="#3B82F6" size={40} /></div>
                    ) : nearestMandis.length > 0 ? (
                        <div className="space-y-4">
                            <div className="h-96 rounded-lg overflow-hidden">
                                {currentCoordinates && (
                                    <MapContainer key={`${currentCoordinates.latitude}-${currentCoordinates.longitude}`} center={[currentCoordinates.latitude, currentCoordinates.longitude]} zoom={10} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                                        {nearestMandis.map((mandi, index) => {
                                            const lat = mandi.latitude || mandi.location?.latitude;
                                            const lng = mandi.longitude || mandi.location?.longitude;
                                            if (!lat || !lng) return null;
                                            return (
                                                <Marker key={index} position={[lat, lng]}>
                                                    <Popup>
                                                        <div className="p-2">
                                                            <h3 className="font-bold">{mandi.name || mandi.mandi_name}</h3>
                                                            <p className="text-sm">{mandi.state || mandi.district}</p>
                                                            <p className="text-sm text-gray-600">{t('market.distance')}: {mandi.distance_km || mandi.distance ? `${(mandi.distance_km || mandi.distance).toFixed(1)} km` : 'N/A'}</p>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            );
                                        })}
                                    </MapContainer>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {nearestMandis.map((mandi, index) => (
                                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-lg">{mandi.name || mandi.mandi_name}</h3>
                                                <p className="text-sm text-gray-600">{mandi.state || mandi.district}</p>
                                                <p className="text-sm text-blue-600 mt-2">
                                                    <FaMapMarkerAlt className="inline mr-1" />
                                                    {mandi.distance_km || mandi.distance ? `${(mandi.distance_km || mandi.distance).toFixed(1)} km` : 'Distance N/A'}
                                                </p>
                                            </div>
                                            <button onClick={() => toggleFavorite(mandi)} className="text-yellow-500 hover:text-yellow-600 text-xl">
                                                {marketService.isFavoriteMandi(mandi.name || mandi.mandi_name) ? <FaStar /> : <FaRegStar />}
                                            </button>
                                        </div>
                                        <button onClick={() => handleShowRoute(mandi)} className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                                            <FaRoute /> {t('market.getDirections')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : <p className="text-gray-500 text-center py-8">{t('dashboard.noData')}</p>}
                </Card>
            )}

            {/* Selling Recommendation Tab */}
            {activeTab === 'recommendation' && (
                <Card>
                    <h2 className="text-xl font-bold mb-4">{t('market.sellingRecommendation')}</h2>
                    {loadingRecommendation ? (
                        <div className="flex justify-center py-8"><ClipLoader color="#3B82F6" size={40} /></div>
                    ) : sellingRecommendation ? (
                        <div className="space-y-6">
                            {sellingRecommendation.recommendation && (
                                <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
                                    <h3 className="font-bold text-lg text-green-800 mb-2">{t('market.recommendation')}</h3>
                                    <p className="text-gray-700">{sellingRecommendation.recommendation}</p>
                                </div>
                            )}
                            {sellingRecommendation.best_mandis?.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-lg mb-3">{t('market.bestPrice')} {t('market.nearestMandis')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {sellingRecommendation.best_mandis.map((mandi, index) => (
                                            <div key={index} className="bg-blue-50 p-4 rounded-lg flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-semibold">{mandi.name}</h4>
                                                    <p className="text-sm text-gray-600">{mandi.location}</p>
                                                    <p className="text-lg font-bold text-green-600 mt-2">{marketService.formatPrice(mandi.price)}</p>
                                                    {mandi.distance && <p className="text-sm text-gray-600 mt-1">{t('market.distance')}: {mandi.distance} km</p>}
                                                </div>
                                                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">#{index + 1}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {sellingRecommendation.timing_advice && (
                                <div className="bg-yellow-50 p-4 rounded-lg">
                                    <h3 className="font-bold text-yellow-800 mb-2">{t('market.goodTimeToSell').split(' ').slice(0, 2).join(' ')}</h3>
                                    <p className="text-gray-700">{sellingRecommendation.timing_advice}</p>
                                </div>
                            )}
                            {sellingRecommendation.expected_returns && (
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <h3 className="font-bold text-green-800 mb-2">{t('market.priceTrends')}</h3>
                                    <p className="text-gray-700">{sellingRecommendation.expected_returns}</p>
                                </div>
                            )}
                        </div>
                    ) : <p className="text-gray-500 text-center py-8">{t('dashboard.noData')}</p>}
                </Card>
            )}

            {/* Favorite Mandis */}
            {favoriteMandis.length > 0 && (
                <Card>
                    <h2 className="text-xl font-bold mb-4"><FaStar className="inline text-yellow-500 mr-2" /> {t('market.favorites')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {favoriteMandis.map((mandi, index) => (
                            <div key={index} className="bg-yellow-50 p-4 rounded-lg flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold">{mandi.name || mandi.mandi_name}</h3>
                                    <p className="text-sm text-gray-600">{mandi.location?.state || mandi.state || mandi.mandi}</p>
                                </div>
                                <button onClick={() => toggleFavorite(mandi)} className="text-yellow-500 hover:text-yellow-600"><FaStar /></button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}