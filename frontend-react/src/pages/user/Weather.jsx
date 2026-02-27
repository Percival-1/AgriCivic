import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
    FaCloudSun,
    FaTemperatureHigh,
    FaTint,
    FaWind,
    FaExclamationTriangle,
    FaSeedling,
    FaMapMarkerAlt
} from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import { Line } from 'react-chartjs-2';
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
import weatherService from '../../api/services/weatherService';
import { Card, ErrorAlert, Input, Button } from '../../components/common';

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
 * Weather Dashboard Page
 * 
 * Displays:
 * - Current weather conditions
 * - 7-day weather forecast
 * - Weather alerts
 * - Agricultural insights
 * - Temperature trend chart
 * 
 * Requirements: 7.1-7.7
 */
export default function Weather() {
    const profile = useSelector(selectProfile);

    // Location state
    const [searchLocation, setSearchLocation] = useState('');
    const [currentLocation, setCurrentLocation] = useState('');
    const [isUsingProfileLocation, setIsUsingProfileLocation] = useState(true);

    // Data states
    const [currentWeather, setCurrentWeather] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [insights, setInsights] = useState(null);

    // Loading states
    const [loadingCurrent, setLoadingCurrent] = useState(false);
    const [loadingForecast, setLoadingForecast] = useState(false);
    const [loadingAlerts, setLoadingAlerts] = useState(false);
    const [loadingInsights, setLoadingInsights] = useState(false);

    // Error states
    const [error, setError] = useState(null);

    // Initialize location from profile
    useEffect(() => {
        if (profile?.location && !currentLocation) {
            setSearchLocation(profile.location);
            setCurrentLocation(profile.location);
            setIsUsingProfileLocation(true);
        }
    }, [profile?.location, currentLocation]);

    // Fetch all weather data when location changes
    useEffect(() => {
        if (currentLocation) {
            fetchAllWeatherData(currentLocation);
        }
    }, [currentLocation]);

    /**
     * Fetch all weather data for a location
     * Requirements: 7.1-7.7
     */
    const fetchAllWeatherData = async (loc) => {
        setError(null);

        // Fetch current weather
        fetchCurrentWeather(loc);

        // Fetch forecast
        fetchForecast(loc);

        // Fetch alerts
        fetchAlerts(loc);

        // Fetch agricultural insights
        fetchInsights(loc);
    };

    /**
     * Fetch current weather
     * Requirement 7.1: Fetch current weather from Backend_API for user's location
     */
    const fetchCurrentWeather = async (loc) => {
        setLoadingCurrent(true);
        try {
            const response = await weatherService.getCurrentWeather(loc);
            // Backend returns { success: true, data: {...} }
            const data = response.data || response;
            setCurrentWeather(data);
        } catch (err) {
            console.error('Error fetching current weather:', err);
            setError('Failed to load current weather data');
        } finally {
            setLoadingCurrent(false);
        }
    };

    /**
     * Fetch 7-day forecast
     * Requirement 7.2: Display 7-day forecast with temperature, rainfall, and wind data
     */
    const fetchForecast = async (loc) => {
        setLoadingForecast(true);
        try {
            const response = await weatherService.getForecast(loc, 7);
            // Backend returns { success: true, data: [...] }
            const data = response.data || response;
            setForecast({ daily: data });
        } catch (err) {
            console.error('Error fetching forecast:', err);
            setError('Failed to load forecast data');
        } finally {
            setLoadingForecast(false);
        }
    };

    /**
     * Fetch weather alerts
     * Requirement 7.3: Display weather alerts with alert severity
     */
    const fetchAlerts = async (loc) => {
        setLoadingAlerts(true);
        try {
            const response = await weatherService.getAlerts(loc);
            // Backend returns { success: true, data: [...] }
            const data = response.data || response;
            setAlerts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching alerts:', err);
            // Don't set error for alerts as they might not always exist
        } finally {
            setLoadingAlerts(false);
        }
    };

    /**
     * Fetch agricultural insights
     * Requirement 7.4: Display agricultural insights based on weather conditions
     */
    const fetchInsights = async (loc) => {
        setLoadingInsights(true);
        try {
            const response = await weatherService.getAgriculturalInsights(loc);
            // Backend returns { success: true, data: {...} }
            const data = response.data || response;
            setInsights(data);
        } catch (err) {
            console.error('Error fetching insights:', err);
            // Don't set error for insights as they might not always be available
        } finally {
            setLoadingInsights(false);
        }
    };

    /**
     * Handle location change
     * Requirement 7.6: Fetch weather for new location when user changes location
     */
    const handleLocationChange = () => {
        if (searchLocation.trim()) {
            setCurrentLocation(searchLocation.trim());
            setIsUsingProfileLocation(false);
        }
    };

    /**
     * Reset to profile location
     */
    const handleResetToProfileLocation = () => {
        if (profile?.location) {
            setSearchLocation(profile.location);
            setCurrentLocation(profile.location);
            setIsUsingProfileLocation(true);
        }
    };

    /**
     * Get alert severity color
     */
    const getAlertSeverityColor = (severity) => {
        const colors = {
            extreme: 'bg-red-100 border-red-500 text-red-800',
            severe: 'bg-orange-100 border-orange-500 text-orange-800',
            moderate: 'bg-yellow-100 border-yellow-500 text-yellow-800',
            minor: 'bg-blue-100 border-blue-500 text-blue-800',
        };
        return colors[severity?.toLowerCase()] || colors.minor;
    };

    /**
     * Prepare temperature chart data
     * Requirement 7.5: Render temperature trends using Chart.js
     */
    const getTemperatureChartData = () => {
        if (!forecast?.daily || forecast.daily.length === 0) return null;

        const labels = forecast.daily.map(day => {
            const date = new Date(day.date);
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        });

        const maxTemps = forecast.daily.map(day => day.temperature_max || day.temp_max);
        const minTemps = forecast.daily.map(day => day.temperature_min || day.temp_min);

        return {
            labels,
            datasets: [
                {
                    label: 'Max Temperature (°C)',
                    data: maxTemps,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                },
                {
                    label: 'Min Temperature (°C)',
                    data: minTemps,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
                text: '7-Day Temperature Forecast',
            },
        },
        scales: {
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'Temperature (°C)',
                },
            },
        },
    };

    const isLoading = loadingCurrent || loadingForecast || loadingAlerts || loadingInsights;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Weather Dashboard</h1>
                        {profile?.location && (
                            <p className="text-sm text-gray-600 mt-1">
                                <FaMapMarkerAlt className="inline mr-1" />
                                Your location: <span className="font-semibold">{profile.location}</span>
                            </p>
                        )}
                    </div>

                    {/* Location Search */}
                    <div className="flex gap-2 items-center">
                        <Input
                            type="text"
                            value={searchLocation}
                            onChange={(e) => setSearchLocation(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleLocationChange()}
                            placeholder="Search other location..."
                            className="w-64"
                        />
                        <Button onClick={handleLocationChange} disabled={isLoading}>
                            Search
                        </Button>
                        {!isUsingProfileLocation && profile?.location && (
                            <Button
                                onClick={handleResetToProfileLocation}
                                disabled={isLoading}
                                className="bg-gray-500 hover:bg-gray-600"
                            >
                                My Location
                            </Button>
                        )}
                    </div>
                </div>

                {/* Current Location Display */}
                {currentLocation && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                        <p className="text-sm text-blue-800">
                            <FaMapMarkerAlt className="inline mr-2" />
                            Showing weather for: <span className="font-semibold">{currentLocation}</span>
                            {isUsingProfileLocation && (
                                <span className="ml-2 text-xs bg-blue-200 px-2 py-1 rounded">Your Location</span>
                            )}
                        </p>
                    </div>
                )}
            </div>

            {/* Error Alert */}
            {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

            {/* Weather Alerts */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((alert, index) => (
                        <div
                            key={index}
                            className={`p-4 border-l-4 rounded ${getAlertSeverityColor(alert.severity)}`}
                        >
                            <div className="flex items-start gap-3">
                                <FaExclamationTriangle className="text-xl mt-1" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg">{alert.event || alert.title}</h3>
                                    <p className="text-sm mt-1">{alert.description || alert.message}</p>
                                    {alert.expires && (
                                        <p className="text-xs mt-2">
                                            Expires: {new Date(alert.expires).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Current Weather */}
            <Card>
                <h2 className="text-xl font-bold mb-4">Current Weather</h2>
                {loadingCurrent ? (
                    <div className="flex justify-center py-8">
                        <ClipLoader color="#3B82F6" size={40} />
                    </div>
                ) : currentWeather ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="flex items-center gap-4">
                            <FaCloudSun className="text-5xl text-yellow-500" />
                            <div>
                                <p className="text-sm text-gray-600">Condition</p>
                                <p className="text-lg font-semibold">
                                    {currentWeather.description || currentWeather.condition || currentWeather.weather}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <FaTemperatureHigh className="text-5xl text-red-500" />
                            <div>
                                <p className="text-sm text-gray-600">Temperature</p>
                                <p className="text-lg font-semibold">
                                    {currentWeather.temperature || currentWeather.temp}°C
                                </p>
                                {currentWeather.feels_like && (
                                    <p className="text-xs text-gray-500">
                                        Feels like {currentWeather.feels_like}°C
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <FaTint className="text-5xl text-blue-500" />
                            <div>
                                <p className="text-sm text-gray-600">Humidity</p>
                                <p className="text-lg font-semibold">
                                    {currentWeather.humidity}%
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <FaWind className="text-5xl text-gray-500" />
                            <div>
                                <p className="text-sm text-gray-600">Wind Speed</p>
                                <p className="text-lg font-semibold">
                                    {currentWeather.wind_speed || currentWeather.windSpeed} km/h
                                </p>
                                {currentWeather.wind_direction && (
                                    <p className="text-xs text-gray-500">
                                        {currentWeather.wind_direction}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8">No current weather data available</p>
                )}
            </Card>

            {/* Temperature Chart */}
            {forecast && getTemperatureChartData() && (
                <Card>
                    <div className="h-80">
                        <Line data={getTemperatureChartData()} options={chartOptions} />
                    </div>
                </Card>
            )}

            {/* 7-Day Forecast */}
            <Card>
                <h2 className="text-xl font-bold mb-4">7-Day Forecast</h2>
                {loadingForecast ? (
                    <div className="flex justify-center py-8">
                        <ClipLoader color="#3B82F6" size={40} />
                    </div>
                ) : forecast?.daily && forecast.daily.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                        {forecast.daily.map((day, index) => (
                            <div
                                key={index}
                                className="bg-gray-50 p-4 rounded-lg text-center hover:bg-gray-100 transition"
                            >
                                <p className="font-semibold text-sm mb-2">
                                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                </p>
                                <FaCloudSun className="text-3xl text-yellow-500 mx-auto mb-2" />
                                <p className="text-xs text-gray-600 mb-2">
                                    {day.description || day.condition || day.weather}
                                </p>
                                <div className="flex justify-center gap-2 text-sm">
                                    <span className="text-red-600 font-semibold">
                                        {Math.round(day.temperature_max || day.temp_max)}°
                                    </span>
                                    <span className="text-blue-600">
                                        {Math.round(day.temperature_min || day.temp_min)}°
                                    </span>
                                </div>
                                {(day.rainfall_amount !== undefined || day.rainfall_probability !== undefined) && (
                                    <p className="text-xs text-blue-600 mt-2">
                                        <FaTint className="inline mr-1" />
                                        {day.rainfall_amount ? `${day.rainfall_amount}mm` : `${day.rainfall_probability}%`}
                                    </p>
                                )}
                                {day.wind_speed !== undefined && (
                                    <p className="text-xs text-gray-600 mt-1">
                                        <FaWind className="inline mr-1" />
                                        {Math.round(day.wind_speed)}km/h
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8">No forecast data available</p>
                )}
            </Card>

            {/* Agricultural Insights */}
            {insights && (
                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <FaSeedling className="text-2xl text-green-600" />
                        <h2 className="text-xl font-bold">Agricultural Insights</h2>
                    </div>
                    {loadingInsights ? (
                        <div className="flex justify-center py-8">
                            <ClipLoader color="#3B82F6" size={40} />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {insights.recommendation && (
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-blue-700 mb-2">Recommendation</h3>
                                    <p className="text-gray-700">{insights.recommendation}</p>
                                </div>
                            )}

                            {insights.suitable_activities && insights.suitable_activities.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-green-700 mb-2">Suitable Activities</h3>
                                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                                        {insights.suitable_activities.map((activity, index) => (
                                            <li key={index}>{activity}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {insights.activities_to_avoid && insights.activities_to_avoid.length > 0 &&
                                insights.activities_to_avoid[0] !== 'None' && (
                                    <div>
                                        <h3 className="font-semibold text-orange-700 mb-2">Activities to Avoid</h3>
                                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                                            {insights.activities_to_avoid.map((activity, index) => (
                                                <li key={index}>{activity}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                            {insights.irrigation_advice && (
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-blue-700 mb-2">Irrigation Advice</h3>
                                    <p className="text-gray-700">{insights.irrigation_advice}</p>
                                </div>
                            )}

                            {insights.pest_risk_level && (
                                <div className={`p-4 rounded-lg ${insights.pest_risk_level === 'High' ? 'bg-red-50' :
                                    insights.pest_risk_level === 'Medium' ? 'bg-yellow-50' :
                                        'bg-green-50'
                                    }`}>
                                    <h3 className={`font-semibold mb-2 ${insights.pest_risk_level === 'High' ? 'text-red-700' :
                                        insights.pest_risk_level === 'Medium' ? 'text-yellow-700' :
                                            'text-green-700'
                                        }`}>
                                        Pest Risk Level: {insights.pest_risk_level}
                                    </h3>
                                </div>
                            )}

                            {/* Legacy format support */}
                            {insights.recommendations && !insights.recommendation && (
                                <div>
                                    <h3 className="font-semibold text-green-700 mb-2">Recommendations</h3>
                                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                                        {Array.isArray(insights.recommendations) ? (
                                            insights.recommendations.map((rec, index) => (
                                                <li key={index}>{rec}</li>
                                            ))
                                        ) : (
                                            <li>{insights.recommendations}</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                            {insights.warnings && (
                                <div>
                                    <h3 className="font-semibold text-orange-700 mb-2">Warnings</h3>
                                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                                        {Array.isArray(insights.warnings) ? (
                                            insights.warnings.map((warning, index) => (
                                                <li key={index}>{warning}</li>
                                            ))
                                        ) : (
                                            <li>{insights.warnings}</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                            {insights.best_practices && (
                                <div>
                                    <h3 className="font-semibold text-blue-700 mb-2">Best Practices</h3>
                                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                                        {Array.isArray(insights.best_practices) ? (
                                            insights.best_practices.map((practice, index) => (
                                                <li key={index}>{practice}</li>
                                            ))
                                        ) : (
                                            <li>{insights.best_practices}</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
