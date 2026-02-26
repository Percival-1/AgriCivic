import { useState } from 'react';
import { FaMapMarkedAlt, FaRoute, FaCalculator } from 'react-icons/fa';
import { Card } from '../../components/common';
import { GeocodingSearch, RouteMap, DistanceCalculator } from '../../components/maps';

/**
 * Maps Demo Page
 * 
 * Demonstrates all map and location service features:
 * - Geocoding search
 * - Route display with polylines
 * - Distance calculations
 * 
 * Requirements: 24.1-24.6
 */
export default function MapsDemo() {
    const [activeTab, setActiveTab] = useState('geocoding');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [routeOrigin, setRouteOrigin] = useState(null);
    const [routeDestination, setRouteDestination] = useState(null);
    const [showRoute, setShowRoute] = useState(false);

    const tabs = [
        { id: 'geocoding', label: 'Geocoding Search', icon: FaMapMarkedAlt },
        { id: 'route', label: 'Route Display', icon: FaRoute },
        { id: 'distance', label: 'Distance Calculator', icon: FaCalculator }
    ];

    /**
     * Handle location selection from geocoding
     */
    const handleLocationSelect = (location) => {
        setSelectedLocation(location);
        console.log('Selected location:', location);
    };

    /**
     * Handle route calculation
     */
    const handleRouteCalculated = (routeData) => {
        console.log('Route calculated:', routeData);
    };

    /**
     * Handle distance calculation
     */
    const handleDistanceCalculated = (distanceData) => {
        console.log('Distance calculated:', distanceData);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Maps & Location Services</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Geocoding, routing, and distance calculation features
                </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                    {tabs.map((tab) => (
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

            {/* Geocoding Search Tab */}
            {activeTab === 'geocoding' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <h2 className="text-xl font-bold mb-4">Geocoding Search</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Search for any address and get its coordinates. The search provides
                            autocomplete suggestions as you type.
                        </p>

                        <GeocodingSearch
                            onLocationSelect={handleLocationSelect}
                            placeholder="Search for any location..."
                        />

                        {selectedLocation && (
                            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <h3 className="font-bold text-green-800 mb-2">Selected Location</h3>
                                <div className="space-y-2 text-sm">
                                    <p>
                                        <span className="font-medium">Name:</span>{' '}
                                        {selectedLocation.name || 'N/A'}
                                    </p>
                                    <p>
                                        <span className="font-medium">Address:</span>{' '}
                                        {selectedLocation.address || 'N/A'}
                                    </p>
                                    <p>
                                        <span className="font-medium">Latitude:</span>{' '}
                                        {selectedLocation.latitude?.toFixed(6)}
                                    </p>
                                    <p>
                                        <span className="font-medium">Longitude:</span>{' '}
                                        {selectedLocation.longitude?.toFixed(6)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card>
                        <h2 className="text-xl font-bold mb-4">How It Works</h2>
                        <div className="space-y-4 text-sm text-gray-700">
                            <div>
                                <h3 className="font-semibold mb-1">1. Autocomplete</h3>
                                <p>
                                    As you type, the system fetches address suggestions from the
                                    backend API. Minimum 2 characters required.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">2. Geocoding</h3>
                                <p>
                                    When you select a suggestion or press Enter, the address is
                                    geocoded to get precise latitude and longitude coordinates.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">3. Validation</h3>
                                <p>
                                    The system validates the location coordinates to ensure they
                                    are within valid ranges and represent real locations.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Route Display Tab */}
            {activeTab === 'route' && (
                <div className="space-y-6">
                    <Card>
                        <h2 className="text-xl font-bold mb-4">Route Display</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Select origin and destination to display the route on the map with
                            polylines, distance, and turn-by-turn directions.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Origin
                                </label>
                                <GeocodingSearch
                                    onLocationSelect={(loc) => {
                                        setRouteOrigin(loc);
                                        setShowRoute(false);
                                    }}
                                    placeholder="Enter origin..."
                                />
                                {routeOrigin && (
                                    <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-800">
                                        {routeOrigin.name || routeOrigin.address}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Destination
                                </label>
                                <GeocodingSearch
                                    onLocationSelect={(loc) => {
                                        setRouteDestination(loc);
                                        setShowRoute(false);
                                    }}
                                    placeholder="Enter destination..."
                                />
                                {routeDestination && (
                                    <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-800">
                                        {routeDestination.name || routeDestination.address}
                                    </div>
                                )}
                            </div>
                        </div>

                        {routeOrigin && routeDestination && (
                            <button
                                onClick={() => setShowRoute(true)}
                                className="mb-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Show Route
                            </button>
                        )}

                        {showRoute && routeOrigin && routeDestination && (
                            <RouteMap
                                origin={routeOrigin}
                                destination={routeDestination}
                                mode="driving"
                                showRoute={true}
                                height="500px"
                                onRouteCalculated={handleRouteCalculated}
                            />
                        )}
                    </Card>

                    <Card>
                        <h2 className="text-xl font-bold mb-4">Features</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-semibold mb-2">Polyline Display</h3>
                                <p className="text-gray-700">
                                    Routes are displayed as blue polylines on the map showing the
                                    exact path between locations.
                                </p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg">
                                <h3 className="font-semibold mb-2">Distance & Duration</h3>
                                <p className="text-gray-700">
                                    Automatically calculates and displays the total distance and
                                    estimated travel time.
                                </p>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg">
                                <h3 className="font-semibold mb-2">Turn-by-Turn</h3>
                                <p className="text-gray-700">
                                    Provides step-by-step directions with distance for each turn
                                    along the route.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Distance Calculator Tab */}
            {activeTab === 'distance' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <h2 className="text-xl font-bold mb-4">Distance Calculator</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Calculate the distance and travel time between two locations using
                            different travel modes.
                        </p>

                        <DistanceCalculator onDistanceCalculated={handleDistanceCalculated} />
                    </Card>

                    <Card>
                        <h2 className="text-xl font-bold mb-4">Travel Modes</h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold mb-2">🚗 Driving</h3>
                                <p className="text-sm text-gray-700">
                                    Calculates distance and time for car travel via roads and
                                    highways. Best for long distances.
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold mb-2">🚶 Walking</h3>
                                <p className="text-sm text-gray-700">
                                    Calculates pedestrian routes using sidewalks and pedestrian
                                    paths. Best for short distances.
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold mb-2">🚴 Bicycling</h3>
                                <p className="text-sm text-gray-700">
                                    Calculates routes suitable for bicycles, including bike lanes
                                    and paths.
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold mb-2">🚌 Transit</h3>
                                <p className="text-sm text-gray-700">
                                    Calculates routes using public transportation like buses,
                                    trains, and metro.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
