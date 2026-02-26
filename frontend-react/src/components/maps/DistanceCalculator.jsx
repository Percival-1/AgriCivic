import { useState } from 'react';
import { FaMapMarkerAlt, FaExchangeAlt, FaCalculator } from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import mapsService from '../../api/services/mapsService';
import GeocodingSearch from './GeocodingSearch';

/**
 * Distance Calculator Component
 * 
 * Allows users to calculate distance between two locations
 * Requirement 24.3: Calculate distance between two locations via Backend_API
 */
export default function DistanceCalculator({ onDistanceCalculated }) {
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [mode, setMode] = useState('driving');
    const [distance, setDistance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const travelModes = [
        { value: 'driving', label: 'Driving', icon: '🚗' },
        { value: 'walking', label: 'Walking', icon: '🚶' },
        { value: 'bicycling', label: 'Bicycling', icon: '🚴' },
        { value: 'transit', label: 'Transit', icon: '🚌' }
    ];

    /**
     * Calculate distance between origin and destination
     */
    const calculateDistance = async () => {
        if (!origin || !destination) {
            setError('Please select both origin and destination');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await mapsService.calculateDistance(origin, destination, mode);

            if (result) {
                setDistance(result);

                if (onDistanceCalculated) {
                    onDistanceCalculated(result);
                }
            }
        } catch (err) {
            console.error('Error calculating distance:', err);
            setError(err.message || 'Failed to calculate distance');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Swap origin and destination
     */
    const swapLocations = () => {
        const temp = origin;
        setOrigin(destination);
        setDestination(temp);
        setDistance(null);
    };

    /**
     * Format distance for display
     */
    const formatDistance = (dist) => {
        if (!dist) return 'N/A';

        if (typeof dist === 'object') {
            return dist.text || `${dist.value ? (dist.value / 1000).toFixed(1) : 'N/A'} km`;
        }

        return `${dist.toFixed(1)} km`;
    };

    /**
     * Format duration for display
     */
    const formatDuration = (dur) => {
        if (!dur) return 'N/A';

        if (typeof dur === 'object') {
            return dur.text || `${dur.value ? Math.round(dur.value / 60) : 'N/A'} min`;
        }

        return `${Math.round(dur)} min`;
    };

    return (
        <div className="space-y-4">
            {/* Origin Search */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaMapMarkerAlt className="inline mr-2 text-green-600" />
                    Origin
                </label>
                <GeocodingSearch
                    onLocationSelect={setOrigin}
                    placeholder="Enter origin address..."
                />
                {origin && (
                    <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-800">
                        {origin.name || origin.address}
                    </div>
                )}
            </div>

            {/* Swap Button */}
            {origin && destination && (
                <div className="flex justify-center">
                    <button
                        onClick={swapLocations}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                        title="Swap locations"
                    >
                        <FaExchangeAlt size={20} />
                    </button>
                </div>
            )}

            {/* Destination Search */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaMapMarkerAlt className="inline mr-2 text-red-600" />
                    Destination
                </label>
                <GeocodingSearch
                    onLocationSelect={setDestination}
                    placeholder="Enter destination address..."
                />
                {destination && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-800">
                        {destination.name || destination.address}
                    </div>
                )}
            </div>

            {/* Travel Mode Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Travel Mode
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {travelModes.map((travelMode) => (
                        <button
                            key={travelMode.value}
                            onClick={() => setMode(travelMode.value)}
                            className={`p-3 border rounded-lg text-sm font-medium transition-colors ${mode === travelMode.value
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <span className="text-2xl block mb-1">{travelMode.icon}</span>
                            {travelMode.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Calculate Button */}
            <button
                onClick={calculateDistance}
                disabled={!origin || !destination || loading}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <ClipLoader color="#ffffff" size={16} />
                        Calculating...
                    </>
                ) : (
                    <>
                        <FaCalculator />
                        Calculate Distance
                    </>
                )}
            </button>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Distance Result */}
            {distance && !loading && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
                    <h3 className="font-bold text-lg mb-3 text-gray-900">Distance Result</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Distance</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {formatDistance(distance.distance || distance)}
                            </p>
                        </div>
                        {distance.duration && (
                            <div className="bg-white p-3 rounded-lg">
                                <p className="text-xs text-gray-600 mb-1">Duration</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {formatDuration(distance.duration)}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="mt-3 text-xs text-gray-600">
                        <p>Mode: <span className="font-medium capitalize">{mode}</span></p>
                    </div>
                </div>
            )}
        </div>
    );
}
