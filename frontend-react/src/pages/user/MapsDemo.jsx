import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('geocoding');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [routeOrigin, setRouteOrigin] = useState(null);
    const [routeDestination, setRouteDestination] = useState(null);
    const [showRoute, setShowRoute] = useState(false);

    const tabs = [
        { id: 'geocoding', label: t('maps.geocodingSearch'), icon: FaMapMarkedAlt },
        { id: 'route', label: t('maps.routeDisplay'), icon: FaRoute },
        { id: 'distance', label: t('maps.distanceCalculator'), icon: FaCalculator }
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
                <h1 className="text-3xl font-bold text-gray-800">{t('maps.title')}</h1>
                <p className="text-sm text-gray-600 mt-1">
                    {t('maps.subtitle')}
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
                        <h2 className="text-xl font-bold mb-4">{t('maps.geocodingSearch')}</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            {t('maps.geocodingDesc')}
                        </p>

                        <GeocodingSearch
                            onLocationSelect={handleLocationSelect}
                            placeholder={t('maps.searchPlaceholder')}
                        />

                        {selectedLocation && (
                            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <h3 className="font-bold text-green-800 mb-2">{t('maps.selectedLocation')}</h3>
                                <div className="space-y-2 text-sm">
                                    <p>
                                        <span className="font-medium">{t('maps.name')}</span>{' '}
                                        {selectedLocation.name || 'N/A'}
                                    </p>
                                    <p>
                                        <span className="font-medium">{t('maps.address')}</span>{' '}
                                        {selectedLocation.address || 'N/A'}
                                    </p>
                                    <p>
                                        <span className="font-medium">{t('maps.latitude')}</span>{' '}
                                        {selectedLocation.latitude?.toFixed(6)}
                                    </p>
                                    <p>
                                        <span className="font-medium">{t('maps.longitude')}</span>{' '}
                                        {selectedLocation.longitude?.toFixed(6)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card>
                        <h2 className="text-xl font-bold mb-4">{t('maps.howItWorks')}</h2>
                        <div className="space-y-4 text-sm text-gray-700">
                            <div>
                                <h3 className="font-semibold mb-1">{t('maps.step1Title')}</h3>
                                <p>
                                    {t('maps.step1Desc')}
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">{t('maps.step2Title')}</h3>
                                <p>
                                    {t('maps.step2Desc')}
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">{t('maps.step3Title')}</h3>
                                <p>
                                    {t('maps.step3Desc')}
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
                        <h2 className="text-xl font-bold mb-4">{t('maps.routeDisplay')}</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            {t('maps.routeDesc')}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('maps.origin')}
                                </label>
                                <GeocodingSearch
                                    onLocationSelect={(loc) => {
                                        setRouteOrigin(loc);
                                        setShowRoute(false);
                                    }}
                                    placeholder={t('maps.enterOrigin')}
                                />
                                {routeOrigin && (
                                    <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-800">
                                        {routeOrigin.name || routeOrigin.address}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('maps.destination')}
                                </label>
                                <GeocodingSearch
                                    onLocationSelect={(loc) => {
                                        setRouteDestination(loc);
                                        setShowRoute(false);
                                    }}
                                    placeholder={t('maps.enterDestination')}
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
                                {t('maps.showRoute')}
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
                        <h2 className="text-xl font-bold mb-4">{t('maps.features')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-semibold mb-2">{t('maps.feature1Title')}</h3>
                                <p className="text-gray-700">
                                    {t('maps.feature1Desc')}
                                </p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg">
                                <h3 className="font-semibold mb-2">{t('maps.feature2Title')}</h3>
                                <p className="text-gray-700">
                                    {t('maps.feature2Desc')}
                                </p>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg">
                                <h3 className="font-semibold mb-2">{t('maps.feature3Title')}</h3>
                                <p className="text-gray-700">
                                    {t('maps.feature3Desc')}
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
                        <h2 className="text-xl font-bold mb-4">{t('maps.distanceCalculator')}</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            {t('maps.distanceDesc')}
                        </p>

                        <DistanceCalculator onDistanceCalculated={handleDistanceCalculated} />
                    </Card>

                    <Card>
                        <h2 className="text-xl font-bold mb-4">{t('maps.travelModes')}</h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold mb-2">{t('maps.driving')}</h3>
                                <p className="text-sm text-gray-700">
                                    {t('maps.drivingDesc')}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold mb-2">{t('maps.walking')}</h3>
                                <p className="text-sm text-gray-700">
                                    {t('maps.walkingDesc')}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold mb-2">{t('maps.bicycling')}</h3>
                                <p className="text-sm text-gray-700">
                                    {t('maps.bicyclingDesc')}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold mb-2">{t('maps.transit')}</h3>
                                <p className="text-sm text-gray-700">
                                    {t('maps.transitDesc')}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
