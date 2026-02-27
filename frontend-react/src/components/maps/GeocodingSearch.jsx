import { useState } from 'react';
import { FaSearch, FaMapMarkerAlt, FaTimes } from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import mapsService from '../../api/services/mapsService';

/**
 * Geocoding Search Component
 * 
 * Allows users to search for addresses and get coordinates
 * Requirement 24.1: Geocode addresses via Backend_API
 */
export default function GeocodingSearch({ onLocationSelect, placeholder = "Search for a location..." }) {
    const [searchText, setSearchText] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Handle search input change
     */
    const handleInputChange = (e) => {
        setSearchText(e.target.value);
        setError(null);
    };

    /**
     * Handle geocoding when user submits search
     */
    const handleSearch = async (e) => {
        e.preventDefault();

        const trimmedText = searchText.trim();
        if (!trimmedText) {
            setError('Please enter a location');
            return;
        }

        setIsSearching(true);
        setError(null);

        try {
            const result = await mapsService.geocode(trimmedText);

            if (result && result.latitude && result.longitude) {
                onLocationSelect({
                    latitude: result.latitude,
                    longitude: result.longitude,
                    address: result.formatted_address || trimmedText,
                    name: result.name || trimmedText
                });
                // Optionally clear the search after successful selection
                // setSearchText('');
            } else {
                setError('Location not found');
            }
        } catch (err) {
            console.error('Error geocoding address:', err);
            setError(err.message || 'Failed to find location');
        } finally {
            setIsSearching(false);
        }
    };

    /**
     * Clear search
     */
    const handleClear = () => {
        setSearchText('');
        setError(null);
    };

    return (
        <div className="relative w-full">
            <form onSubmit={handleSearch} className="relative">
                <div className="relative">
                    <input
                        type="text"
                        value={searchText}
                        onChange={handleInputChange}
                        placeholder={placeholder}
                        className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSearching}
                    />
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />

                    {searchText && !isSearching && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <FaTimes />
                        </button>
                    )}

                    {isSearching && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <ClipLoader color="#3B82F6" size={16} />
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    className="hidden"
                    aria-label="Search"
                >
                    Search
                </button>
            </form>

            {/* Helper text */}
            <p className="mt-2 text-xs text-gray-500">
                Press Enter to search for the location
            </p>

            {/* Error Message */}
            {error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                    {error}
                </div>
            )}
        </div>
    );
}
