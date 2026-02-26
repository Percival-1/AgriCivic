import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
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
import mapsService from '../../api/services/mapsService';
import { Card, ErrorAlert, Input, Button } from '../../components/common';
import { GeocodingSearch } from '../../components/maps';
import { RouteMap } from '../../components/maps';

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

/**
 * Market Intelligence Page
 * 
 * Displays:
 * - Price comparison table
 * - Price trend charts
 * - Mandi map with nearest locations
 * - Selling recommendations
 * - Favorite mandis management
 * 
 * Requirements: 8.1-8.8
 */
export default function Market() {
    const profile = useSelector(selectProfile);

    // Predefined locations for quick selection
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

    // Data states
    const [currentPrices, setCurrentPrices] = useState([]);
    const [priceComparison, setPriceComparison] = useState(null);
    const [nearestMandis, setNearestMandis] = useState([]);
    const [priceTrends, setPriceTrends] = useState(null);
    const [sellingRecommendation, setSellingRecommendation] = useState(null);
    const [favoriteMandis, setFavoriteMandis] = useState([]);

    // Loading states
    const [loadingPrices, setLoadingPrices] = useState(false);
    const [loadingComparison, setLoadingComparison] = useState(false);
    const [loadingMandis, setLoadingMandis] = useState(false);
    const [loadingTrends, setLoadingTrends] = useState(false);
    const [loadingRecommendation, setLoadingRecommendation] = useState(false);
    const [loadingGeocode, setLoadingGeocode] = useState(false);

    // Error state
    const [error, setError] = useState(null);

    // Tab state
    const [activeTab, setActiveTab] = useState('prices'); // prices, comparison, map, trends, recommendation

    // Route state
    const [selectedMandiForRoute, setSelectedMandiForRoute] = useState(null);
    const [showRouteMap, setShowRouteMap] = useState(false);

    // Initialize from profile
    useEffect(() => {
        if (profile?.crops && profile.crops.length > 0 && !selectedCrop) {
            setSelectedCrop(profile.crops[0]);
        }

        // Set initial coordinates from profile or default to Delhi
        if (profile?.latitude && profile?.longitude && !currentCoordinates) {
            setCurrentCoordinates({
                latitude: profile.latitude,
                longitude: profile.longitude
            });
            setCurrentLocationName(profile.location || 'Your Location');
            setSelectedLocation('custom');
        } else if (!currentCoordinates) {
            // Default to Delhi if no profile location
            const delhiLocation = PREDEFINED_LOCATIONS[0];
            setCurrentCoordinates({
                latitude: delhiLocation.latitude,
                longitude: delhiLocation.longitude
            });
            setCurrentLocationName(delhiLocation.name);
            setSelectedLocation(delhiLocation.name);
        }
    }, [profile, selectedCrop, currentCoordinates]);

    // Load favorite mandis from localStorage
    useEffect(() => {
        const favorites = marketService.getFavoriteMandis();
        setFavoriteMandis(favorites);
    }, []);

    // Fetch data when crop or coordinates change
    useEffect(() => {
        if (selectedCrop && currentCoordinates) {
            fetchMarketData();
        }
    }, [selectedCrop, currentCoordinates]);

    /**
     * Fetch all market data using comprehensive intelligence endpoint
     */
    const fetchMarketData = async () => {
        if (!selectedCrop || !currentCoordinates) return;

        setError(null);
        setLoadingPrices(true);
        setLoadingComparison(true);
        setLoadingMandis(true);
        setLoadingTrends(true);
        setLoadingRecommendation(true);

        try {
            const { latitude, longitude } = currentCoordinates;

            // Fetch comprehensive market intelligence
            const intelligence = await marketService.getMarketIntelligence(
                selectedCrop,
                latitude,
                longitude,
                100
            );

            console.log('Market Intelligence Response:', intelligence);

            // Extract data from intelligence response
            if (intelligence.price_comparison?.prices) {
                setCurrentPrices(intelligence.price_comparison.prices);
                setPriceComparison(intelligence.price_comparison);
            } else {
                setCurrentPrices([]);
                setPriceComparison(null);
            }

            if (intelligence.nearest_mandis && intelligence.nearest_mandis.length > 0) {
                console.log('Nearest Mandis:', intelligence.nearest_mandis);
                // Map distance_km to distance for frontend compatibility
                const mandisWithDistance = intelligence.nearest_mandis.map(mandi => ({
                    ...mandi,
                    distance: mandi.distance_km || mandi.distance
                }));
                setNearestMandis(mandisWithDistance);
            } else {
                console.log('No nearest_mandis in response');
                setNearestMandis([]);
            }

            if (intelligence.price_trend && intelligence.price_trend.historical_prices?.length > 0) {
                setPriceTrends(intelligence.price_trend);
            } else {
                setPriceTrends(null);
            }

            // Build selling recommendation from intelligence
            if (intelligence.recommendation) {
                setSellingRecommendation({
                    recommendation: intelligence.reasoning,
                    best_mandis: intelligence.optimal_mandi ? [intelligence.optimal_mandi] : [],
                    timing_advice: intelligence.recommendation,
                    expected_returns: intelligence.demand_signals?.join(', ')
                });
            }
        } catch (err) {
            console.error('Error fetching market data:', err);
            // Show more detailed error message
            const errorMessage = err.message || err.detail || 'Failed to load market data. Please try again.';
            setError(errorMessage);
        } finally {
            setLoadingPrices(false);
            setLoadingComparison(false);
            setLoadingMandis(false);
            setLoadingTrends(false);
            setLoadingRecommendation(false);
        }
    };

    /**
     * Fetch price trends
     * Requirement 8.5: Render historical price charts using Chart.js
     */
    const fetchPriceTrends = async () => {
        setLoadingTrends(true);
        try {
            const latitude = profile?.latitude || 28.6139;
            const longitude = profile?.longitude || 77.2090;

            const response = await marketService.getPriceTrends(
                selectedCrop,
                latitude,
                longitude,
                30
            );
            setPriceTrends(response);
        } catch (err) {
            console.error('Error fetching price trends:', err);
        } finally {
            setLoadingTrends(false);
        }
    };

    /**
     * Handle crop selection change
     */
    const handleCropChange = (crop) => {
        setSelectedCrop(crop);
    };

    /**
     * Handle location selection from dropdown
     */
    const handleLocationChange = (locationName) => {
        setSelectedLocation(locationName);
        setError(null);

        if (locationName === 'custom' && profile?.latitude && profile?.longitude) {
            // Use profile location
            setCurrentCoordinates({
                latitude: profile.latitude,
                longitude: profile.longitude
            });
            setCurrentLocationName(profile.location || 'Your Location');
        } else {
            // Use predefined location
            const location = PREDEFINED_LOCATIONS.find(loc => loc.name === locationName);
            if (location) {
                setCurrentCoordinates({
                    latitude: location.latitude,
                    longitude: location.longitude
                });
                setCurrentLocationName(location.name);
            }
        }
    };

    /**
     * Toggle favorite mandi
     * Requirement 8.8: Allow users to save favorite mandis in localStorage
     */
    const toggleFavorite = (mandi) => {
        const isFavorite = marketService.isFavoriteMandi(mandi.id || mandi.name);

        if (isFavorite) {
            const updated = marketService.removeFavoriteMandi(mandi.id || mandi.name);
            setFavoriteMandis(updated);
        } else {
            const updated = marketService.saveFavoriteMandi(mandi);
            setFavoriteMandis(updated);
        }
    };

    /**
     * Show route to selected mandi
     */
    const handleShowRoute = (mandi) => {
        setSelectedMandiForRoute(mandi);
        setShowRouteMap(true);
    };

    /**
     * Close route map
     */
    const handleCloseRoute = () => {
        setSelectedMandiForRoute(null);
        setShowRouteMap(false);
    };

    /**
     * Get price change indicator
     */
    const getPriceChangeIcon = (direction) => {
        if (direction === 'up') return <FaArrowUp className="text-green-600" />;
        if (direction === 'down') return <FaArrowDown className="text-red-600" />;
        return <FaMinus className="text-gray-600" />;
    };

    /**
     * Prepare price trend chart data
     * Requirement 8.5: Render historical price charts using Chart.js
     */
    const getPriceTrendChartData = () => {
        if (!priceTrends?.historical_prices || priceTrends.historical_prices.length === 0) return null;

        const labels = priceTrends.historical_prices.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        });

        const prices = priceTrends.historical_prices.map(item => item.price);

        return {
            labels,
            datasets: [
                {
                    label: `${selectedCrop} Price (₹/quintal)`,
                    data: prices,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.4,
                },
            ],
        };
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: `${selectedCrop} Price Trends - Last 30 Days`,
            },
        },
        scales: {
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'Price (₹/quintal)',
                },
            },
        },
    };

    const isLoading = loadingPrices || loadingComparison || loadingMandis || loadingTrends || loadingRecommendation || loadingGeocode;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Market Intelligence</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Real-time market prices and selling recommendations
                        </p>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 items-center flex-wrap">
                        <select
                            value={selectedCrop}
                            onChange={(e) => handleCropChange(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        >
                            <option value="">Select Crop</option>
                            {profile?.crops && profile.crops.map((crop) => (
                                <option key={crop} value={crop}>{crop}</option>
                            ))}
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
                            value={selectedLocation}
                            onChange={(e) => handleLocationChange(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        >
                            <option value="">Select Location</option>
                            {profile?.location && (
                                <option value="custom">My Location ({profile.location})</option>
                            )}
                            {PREDEFINED_LOCATIONS.map((loc) => (
                                <option key={loc.name} value={loc.name}>{loc.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Geocoding Search */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FaSearch className="inline mr-2" />
                        Search Location by Address
                    </label>
                    <GeocodingSearch
                        onLocationSelect={(location) => {
                            setCurrentCoordinates({
                                latitude: location.latitude,
                                longitude: location.longitude
                            });
                            setCurrentLocationName(location.name || location.address);
                            setSelectedLocation('custom');
                        }}
                        placeholder="Search for a location..."
                    />
                </div>

                {/* Current Selection Display */}
                {selectedCrop && currentLocationName && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                        <p className="text-sm text-green-800">
                            <FaStore className="inline mr-2" />
                            Showing market data for: <span className="font-semibold">{selectedCrop}</span>
                            {' '}in <span className="font-semibold">{currentLocationName}</span>
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
                        { id: 'prices', label: 'Current Prices', icon: FaStore },
                        { id: 'comparison', label: 'Price Comparison', icon: FaFilter },
                        { id: 'trends', label: 'Price Trends', icon: FaChartLine },
                        { id: 'map', label: 'Nearest Mandis', icon: FaMapMarkerAlt },
                        { id: 'recommendation', label: 'Selling Advice', icon: FaChartLine },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
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

            {/* Current Prices Tab */}
            {
                activeTab === 'prices' && (
                    <Card>
                        <h2 className="text-xl font-bold mb-4">Current Market Prices</h2>
                        {loadingPrices ? (
                            <div className="flex justify-center py-8">
                                <ClipLoader color="#3B82F6" size={40} />
                            </div>
                        ) : currentPrices.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mandi</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price (₹/quintal)</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {currentPrices.map((price, index) => {
                                            const change = marketService.getPriceChange(
                                                price.price_per_quintal,
                                                price.previous_price
                                            );
                                            return (
                                                <tr key={index}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {price.mandi_name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {marketService.formatPrice(price.price_per_quintal)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <div className="flex items-center gap-2">
                                                            {getPriceChangeIcon(change.direction)}
                                                            <span>{change.percentage}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {marketService.formatDate(price.date)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <button
                                                            onClick={() => toggleFavorite({
                                                                name: price.mandi_name,
                                                                location: price.location?.state,
                                                                ...price.location
                                                            })}
                                                            className="text-yellow-500 hover:text-yellow-600"
                                                        >
                                                            {marketService.isFavoriteMandi(price.mandi_name) ? (
                                                                <FaStar />
                                                            ) : (
                                                                <FaRegStar />
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">No price data available</p>
                        )}
                    </Card>
                )
            }

            {/* Price Comparison Tab */}
            {
                activeTab === 'comparison' && (
                    <Card>
                        <h2 className="text-xl font-bold mb-4">Price Comparison Across Mandis</h2>
                        {loadingComparison ? (
                            <div className="flex justify-center py-8">
                                <ClipLoader color="#3B82F6" size={40} />
                            </div>
                        ) : priceComparison?.prices && priceComparison.prices.length > 0 ? (
                            <div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mandi</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price (₹/quintal)</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">vs Average</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {priceComparison.prices.map((comp, index) => {
                                                const avgDiff = priceComparison.average_price
                                                    ? ((comp.price_per_quintal - priceComparison.average_price) / priceComparison.average_price * 100).toFixed(1)
                                                    : 0;
                                                return (
                                                    <tr key={index}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {comp.mandi_name}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {marketService.formatPrice(comp.price_per_quintal)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <span className={avgDiff > 0 ? 'text-green-600' : 'text-red-600'}>
                                                                {avgDiff > 0 ? '+' : ''}{avgDiff}%
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {comp.location?.state || comp.location?.district || 'N/A'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {priceComparison.average_price && (
                                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                        <p className="text-sm text-blue-800">
                                            Average Price: <span className="font-semibold">
                                                {marketService.formatPrice(priceComparison.average_price)}
                                            </span>
                                        </p>
                                        {priceComparison.recommendation && (
                                            <p className="text-sm text-blue-700 mt-2">{priceComparison.recommendation}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">No comparison data available</p>
                        )}
                    </Card>
                )
            }

            {/* Price Trends Tab */}
            {
                activeTab === 'trends' && (
                    <Card>
                        <h2 className="text-xl font-bold mb-4">Price Trends</h2>
                        {loadingTrends ? (
                            <div className="flex justify-center py-8">
                                <ClipLoader color="#3B82F6" size={40} />
                            </div>
                        ) : priceTrends && getPriceTrendChartData() ? (
                            <div className="h-96">
                                <Line data={getPriceTrendChartData()} options={chartOptions} />
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">No trend data available</p>
                        )}
                    </Card>
                )
            }

            {/* Nearest Mandis Map Tab */}
            {
                activeTab === 'map' && (
                    <Card>
                        <h2 className="text-xl font-bold mb-4">Nearest Mandis</h2>
                        {loadingMandis ? (
                            <div className="flex justify-center py-8">
                                <ClipLoader color="#3B82F6" size={40} />
                            </div>
                        ) : nearestMandis.length > 0 ? (
                            <div className="space-y-4">
                                {/* Map */}
                                <div className="h-96 rounded-lg overflow-hidden">
                                    {currentCoordinates && (
                                        <MapContainer
                                            key={`${currentCoordinates.latitude}-${currentCoordinates.longitude}`}
                                            center={[
                                                currentCoordinates.latitude,
                                                currentCoordinates.longitude
                                            ]}
                                            zoom={10}
                                            style={{ height: '100%', width: '100%' }}
                                        >
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            />
                                            {nearestMandis.map((mandi, index) => {
                                                // Ensure we have valid coordinates
                                                const lat = mandi.latitude || mandi.location?.latitude;
                                                const lng = mandi.longitude || mandi.location?.longitude;

                                                if (!lat || !lng) {
                                                    console.warn('Mandi missing coordinates:', mandi);
                                                    return null;
                                                }

                                                return (
                                                    <Marker
                                                        key={index}
                                                        position={[lat, lng]}
                                                    >
                                                        <Popup>
                                                            <div className="p-2">
                                                                <h3 className="font-bold">{mandi.name || mandi.mandi_name}</h3>
                                                                <p className="text-sm">{mandi.state || mandi.district}</p>
                                                                <p className="text-sm text-gray-600">
                                                                    Distance: {mandi.distance_km || mandi.distance ? `${(mandi.distance_km || mandi.distance).toFixed(1)} km` : 'N/A'}
                                                                </p>
                                                            </div>
                                                        </Popup>
                                                    </Marker>
                                                );
                                            })}
                                        </MapContainer>
                                    )}
                                </div>

                                {/* Mandi List */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {nearestMandis.map((mandi, index) => (
                                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg">{mandi.name || mandi.mandi_name}</h3>
                                                    <p className="text-sm text-gray-600">{mandi.state || mandi.district}</p>
                                                    <p className="text-sm text-blue-600 mt-2">
                                                        <FaMapMarkerAlt className="inline mr-1" />
                                                        {mandi.distance_km || mandi.distance ? `${(mandi.distance_km || mandi.distance).toFixed(1)} km away` : 'Distance N/A'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => toggleFavorite(mandi)}
                                                    className="text-yellow-500 hover:text-yellow-600 text-xl"
                                                >
                                                    {marketService.isFavoriteMandi(mandi.name || mandi.mandi_name) ? (
                                                        <FaStar />
                                                    ) : (
                                                        <FaRegStar />
                                                    )}
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleShowRoute(mandi)}
                                                className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                                            >
                                                <FaRoute />
                                                Show Route
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div >
                        ) : (
                            <p className="text-gray-500 text-center py-8">
                                No mandis found nearby. Try selecting a different location or increasing the search radius.
                            </p>
                        )}
                    </Card >
                )
            }

            {/* Selling Recommendation Tab */}
            {
                activeTab === 'recommendation' && (
                    <Card>
                        <h2 className="text-xl font-bold mb-4">Selling Recommendation</h2>
                        {loadingRecommendation ? (
                            <div className="flex justify-center py-8">
                                <ClipLoader color="#3B82F6" size={40} />
                            </div>
                        ) : sellingRecommendation ? (
                            <div className="space-y-6">
                                {/* Overall Recommendation */}
                                {sellingRecommendation.recommendation && (
                                    <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
                                        <h3 className="font-bold text-lg text-green-800 mb-2">Recommendation</h3>
                                        <p className="text-gray-700">{sellingRecommendation.recommendation}</p>
                                    </div>
                                )}

                                {/* Best Mandis */}
                                {sellingRecommendation.best_mandis && sellingRecommendation.best_mandis.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-lg mb-3">Best Mandis to Sell</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {sellingRecommendation.best_mandis.map((mandi, index) => (
                                                <div key={index} className="bg-blue-50 p-4 rounded-lg">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-semibold">{mandi.name}</h4>
                                                            <p className="text-sm text-gray-600">{mandi.location}</p>
                                                            <p className="text-lg font-bold text-green-600 mt-2">
                                                                {marketService.formatPrice(mandi.price)}
                                                            </p>
                                                            {mandi.distance && (
                                                                <p className="text-sm text-gray-600 mt-1">
                                                                    Distance: {mandi.distance} km
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                                                            #{index + 1}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Timing Advice */}
                                {sellingRecommendation.timing_advice && (
                                    <div className="bg-yellow-50 p-4 rounded-lg">
                                        <h3 className="font-bold text-yellow-800 mb-2">Timing Advice</h3>
                                        <p className="text-gray-700">{sellingRecommendation.timing_advice}</p>
                                    </div>
                                )}

                                {/* MSP Information */}
                                {sellingRecommendation.msp && (
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <h3 className="font-bold text-blue-800 mb-2">Minimum Support Price (MSP)</h3>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {marketService.formatPrice(sellingRecommendation.msp)}
                                        </p>
                                    </div>
                                )}

                                {/* Expected Returns */}
                                {sellingRecommendation.expected_returns && (
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <h3 className="font-bold text-green-800 mb-2">Expected Returns</h3>
                                        <p className="text-gray-700">{sellingRecommendation.expected_returns}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">No recommendation available</p>
                        )}
                    </Card>
                )
            }

            {/* Favorite Mandis */}
            {
                favoriteMandis.length > 0 && (
                    <Card>
                        <h2 className="text-xl font-bold mb-4">
                            <FaStar className="inline text-yellow-500 mr-2" />
                            Favorite Mandis
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {favoriteMandis.map((mandi, index) => (
                                <div key={index} className="bg-yellow-50 p-4 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold">{mandi.name}</h3>
                                            <p className="text-sm text-gray-600">{mandi.location || mandi.mandi}</p>
                                        </div>
                                        <button
                                            onClick={() => toggleFavorite(mandi)}
                                            className="text-yellow-500 hover:text-yellow-600"
                                        >
                                            <FaStar />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )
            }

            {/* Route Map Modal */}
            {
                showRouteMap && selectedMandiForRoute && currentCoordinates && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold">
                                        Route to {selectedMandiForRoute.name || selectedMandiForRoute.mandi_name}
                                    </h2>
                                    <button
                                        onClick={handleCloseRoute}
                                        className="text-gray-500 hover:text-gray-700 text-2xl"
                                    >
                                        ×
                                    </button>
                                </div>

                                <RouteMap
                                    origin={{
                                        latitude: currentCoordinates.latitude,
                                        longitude: currentCoordinates.longitude,
                                        name: currentLocationName || 'Your Location'
                                    }}
                                    destination={{
                                        latitude: selectedMandiForRoute.latitude || selectedMandiForRoute.location?.latitude,
                                        longitude: selectedMandiForRoute.longitude || selectedMandiForRoute.location?.longitude,
                                        name: selectedMandiForRoute.name || selectedMandiForRoute.mandi_name
                                    }}
                                    mode="driving"
                                    showRoute={true}
                                    height="500px"
                                />

                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={handleCloseRoute}
                                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
