import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { FaMapMarkerAlt, FaRoute, FaClock, FaTimes } from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import mapsService from '../../api/services/mapsService';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/**
 * Component to update map view when bounds change
 */
function MapBoundsUpdater({ bounds }) {
    const map = useMap();

    useEffect(() => {
        if (bounds && bounds.length === 2) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);

    return null;
}

/**
 * Route Map Component
 * 
 * Displays a map with route between origin and destination
 * Requirements: 24.3, 24.4 - Calculate distance and display routes with polylines
 */
export default function RouteMap({
    origin,
    destination,
    mode = 'driving',
    showRoute = true,
    markers = [],
    height = '400px',
    onRouteCalculated
}) {
    const [route, setRoute] = useState(null);
    const [distance, setDistance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mapBounds, setMapBounds] = useState(null);

    /**
     * Calculate route and distance when origin/destination change
     */
    useEffect(() => {
        if (showRoute && origin && destination) {
            calculateRoute();
        } else if (origin && destination) {
            calculateDistance();
        }
    }, [origin, destination, mode, showRoute]);

    /**
     * Calculate route with polyline
     * Requirement 24.4: Display route information with steps and polyline on map
     */
    const calculateRoute = async () => {
        setLoading(true);
        setError(null);

        try {
            const routeData = await mapsService.getRoute(origin, destination, mode);

            if (routeData) {
                setRoute(routeData);

                // Extract polyline coordinates
                if (routeData.polyline) {
                    // Decode polyline if it's encoded
                    const coordinates = decodePolyline(routeData.polyline);
                    setRoute({ ...routeData, coordinates });
                }

                // Set distance
                if (routeData.distance) {
                    setDistance(routeData.distance);
                }

                // Calculate bounds for map
                const bounds = [
                    [origin.latitude, origin.longitude],
                    [destination.latitude, destination.longitude]
                ];
                setMapBounds(bounds);

                // Callback with route data
                if (onRouteCalculated) {
                    onRouteCalculated(routeData);
                }
            }
        } catch (err) {
            console.error('Error calculating route:', err);
            const errorMessage = err.response?.data?.detail || err.message || 'Failed to calculate route. The routing service may be unavailable.';
            setError(errorMessage);

            // Still show the map with markers even if route fails
            const bounds = [
                [origin.latitude, origin.longitude],
                [destination.latitude, destination.longitude]
            ];
            setMapBounds(bounds);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Calculate distance only (no route)
     * Requirement 24.3: Calculate distance between two locations
     */
    const calculateDistance = async () => {
        setLoading(true);
        setError(null);

        try {
            const distanceData = await mapsService.calculateDistance(origin, destination, mode);

            if (distanceData) {
                setDistance(distanceData);
            }
        } catch (err) {
            console.error('Error calculating distance:', err);
            setError('Failed to calculate distance');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Decode polyline string to coordinates
     */
    const decodePolyline = (encoded) => {
        if (!encoded) return [];

        // If already an array of coordinates, return as is
        if (Array.isArray(encoded)) {
            return encoded;
        }

        // Decode Google polyline format
        const coordinates = [];
        let index = 0;
        let lat = 0;
        let lng = 0;

        while (index < encoded.length) {
            let b;
            let shift = 0;
            let result = 0;

            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;

            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            coordinates.push([lat / 1e5, lng / 1e5]);
        }

        return coordinates;
    };

    /**
     * Get center point for map
     */
    const getCenter = () => {
        if (origin) {
            return [origin.latitude, origin.longitude];
        }
        return [28.6139, 77.2090]; // Default to Delhi
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
        <div className="relative">
            {/* Loading Overlay */}
            {loading && (
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-white bg-opacity-75 z-10 flex items-center justify-center">
                    <ClipLoader color="#3B82F6" size={40} />
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-yellow-800 mb-1">Route Unavailable</p>
                            <p className="text-sm text-yellow-700">{error}</p>
                            <p className="text-xs text-yellow-600 mt-2">
                                Showing location markers only. The map below displays the origin and destination points.
                            </p>
                        </div>
                        <button onClick={() => setError(null)} className="text-yellow-600 hover:text-yellow-800">
                            <FaTimes />
                        </button>
                    </div>
                </div>
            )}

            {/* Distance and Duration Info */}
            {(distance || route) && !loading && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-6">
                        {distance && (
                            <div className="flex items-center gap-2">
                                <FaRoute className="text-blue-600" />
                                <div>
                                    <p className="text-xs text-gray-600">Distance</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {formatDistance(distance.distance || distance)}
                                    </p>
                                </div>
                            </div>
                        )}
                        {(distance?.duration || route?.duration) && (
                            <div className="flex items-center gap-2">
                                <FaClock className="text-blue-600" />
                                <div>
                                    <p className="text-xs text-gray-600">Duration</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {formatDuration(distance?.duration || route?.duration)}
                                    </p>
                                </div>
                            </div>
                        )}
                        {mode && (
                            <div className="flex items-center gap-2">
                                <FaMapMarkerAlt className="text-blue-600" />
                                <div>
                                    <p className="text-xs text-gray-600">Mode</p>
                                    <p className="text-sm font-semibold text-gray-900 capitalize">
                                        {mode}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Map */}
            <div style={{ height }} className="rounded-lg overflow-hidden border border-gray-300">
                <MapContainer
                    center={getCenter()}
                    zoom={10}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {/* Update map bounds */}
                    {mapBounds && <MapBoundsUpdater bounds={mapBounds} />}

                    {/* Origin Marker */}
                    {origin && (
                        <Marker position={[origin.latitude, origin.longitude]}>
                            <Popup>
                                <div className="p-2">
                                    <h3 className="font-bold text-sm">Origin</h3>
                                    <p className="text-xs text-gray-600">
                                        {origin.name || origin.address || 'Start Point'}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Destination Marker */}
                    {destination && (
                        <Marker position={[destination.latitude, destination.longitude]}>
                            <Popup>
                                <div className="p-2">
                                    <h3 className="font-bold text-sm">Destination</h3>
                                    <p className="text-xs text-gray-600">
                                        {destination.name || destination.address || 'End Point'}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Additional Markers */}
                    {markers.map((marker, index) => (
                        <Marker key={index} position={[marker.latitude, marker.longitude]}>
                            <Popup>
                                <div className="p-2">
                                    <h3 className="font-bold text-sm">{marker.name}</h3>
                                    {marker.description && (
                                        <p className="text-xs text-gray-600">{marker.description}</p>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Route Polyline */}
                    {route?.coordinates && route.coordinates.length > 0 && (
                        <Polyline
                            positions={route.coordinates}
                            color="blue"
                            weight={4}
                            opacity={0.7}
                        />
                    )}
                </MapContainer>
            </div>

            {/* Route Steps */}
            {route?.steps && route.steps.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                    <h3 className="font-bold text-sm mb-3">Route Steps</h3>
                    <ol className="space-y-2">
                        {route.steps.map((step, index) => (
                            <li key={index} className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                                    {index + 1}
                                </span>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-900">{step.instruction || step.html_instructions}</p>
                                    {step.distance && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {formatDistance(step.distance)}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}
