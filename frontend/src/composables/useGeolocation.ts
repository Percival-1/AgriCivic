/**
 * Composable for geolocation functionality
 * Provides methods to get user's current location
 */

import { ref, computed } from 'vue';

export interface GeolocationCoordinates {
    latitude: number;
    longitude: number;
    accuracy?: number;
}

export interface GeolocationError {
    code: number;
    message: string;
}

export function useGeolocation() {
    const coordinates = ref<GeolocationCoordinates | null>(null);
    const error = ref<GeolocationError | null>(null);
    const loading = ref(false);

    const isSupported = computed(() => 'geolocation' in navigator);

    /**
     * Get current position using browser Geolocation API
     */
    const getCurrentPosition = (): Promise<GeolocationCoordinates> => {
        return new Promise((resolve, reject) => {
            if (!isSupported.value) {
                const err: GeolocationError = {
                    code: 0,
                    message: 'Geolocation is not supported by your browser',
                };
                error.value = err;
                reject(err);
                return;
            }

            loading.value = true;
            error.value = null;

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords: GeolocationCoordinates = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                    };
                    coordinates.value = coords;
                    loading.value = false;
                    resolve(coords);
                },
                (err) => {
                    const geoError: GeolocationError = {
                        code: err.code,
                        message: getErrorMessage(err.code),
                    };
                    error.value = geoError;
                    loading.value = false;
                    reject(geoError);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000, // 5 minutes cache
                }
            );
        });
    };

    /**
     * Watch position for continuous updates
     */
    const watchPosition = (callback: (coords: GeolocationCoordinates) => void) => {
        if (!isSupported.value) {
            return null;
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const coords: GeolocationCoordinates = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                };
                coordinates.value = coords;
                callback(coords);
            },
            (err) => {
                error.value = {
                    code: err.code,
                    message: getErrorMessage(err.code),
                };
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
            }
        );

        return watchId;
    };

    /**
     * Clear position watch
     */
    const clearWatch = (watchId: number) => {
        if (isSupported.value) {
            navigator.geolocation.clearWatch(watchId);
        }
    };

    /**
     * Get error message from error code
     */
    const getErrorMessage = (code: number): string => {
        switch (code) {
            case 1:
                return 'Location permission denied. Please enable location access in your browser settings.';
            case 2:
                return 'Location information unavailable. Please check your device settings.';
            case 3:
                return 'Location request timed out. Please try again.';
            default:
                return 'An unknown error occurred while getting your location.';
        }
    };

    /**
     * Format coordinates as string for API calls
     */
    const formatCoordinates = (coords: GeolocationCoordinates): string => {
        return `${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`;
    };

    return {
        coordinates,
        error,
        loading,
        isSupported,
        getCurrentPosition,
        watchPosition,
        clearWatch,
        formatCoordinates,
    };
}
