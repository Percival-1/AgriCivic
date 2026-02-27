import { useState, useEffect, useRef } from 'react';
import { FaMapMarkerAlt, FaSpinner, FaTimes } from 'react-icons/fa';
import mapsService from '../../api/services/mapsService';

/**
 * LocationAutocomplete Component
 * 
 * Provides location search with autocomplete suggestions using Geoapify API.
 * Converts selected address to coordinates automatically.
 * 
 * @param {Object} props
 * @param {string} props.value - Current location value
 * @param {Function} props.onChange - Callback when location is selected
 * @param {Function} props.onSelect - Callback when location is selected with full data
 * @param {string} props.placeholder - Input placeholder text
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.error - Whether to show error state
 * @param {string} props.errorMessage - Error message to display
 */
export default function LocationAutocomplete({
    value = '',
    onChange,
    onSelect,
    placeholder = 'Search for a location...',
    className = '',
    error = false,
    errorMessage = ''
}) {
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [apiError, setApiError] = useState(null);

    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const debounceTimer = useRef(null);

    // Update input value when prop changes
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Close suggestions when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    /**
     * Fetch location suggestions from API
     */
    const fetchSuggestions = async (searchText) => {
        if (!searchText || searchText.length < 2) {
            setSuggestions([]);
            setApiError(null);
            return;
        }

        setLoading(true);
        setApiError(null);
        try {
            const results = await mapsService.autocomplete(searchText, 5);
            console.log('=== AUTOCOMPLETE DEBUG ===');
            console.log('Raw API results:', results);
            console.log('Results type:', typeof results);
            console.log('Is array?:', Array.isArray(results));
            console.log('Results length:', results?.length);

            if (results && results.length > 0) {
                console.log('First result:', results[0]);
                console.log('First result keys:', Object.keys(results[0]));
                console.log('First result address:', results[0].address);
                console.log('Address type:', typeof results[0].address);
                console.log('Address length:', results[0].address?.length);
            }

            // Check if results are valid (not empty data)
            const validResults = results.filter(r => {
                const hasAddress = r.address && r.address.trim() !== '';
                console.log('Checking result:', r.address, '-> valid?', hasAddress);
                return hasAddress;
            });

            console.log('Valid results count:', validResults.length, 'out of', results.length);
            console.log('=== END DEBUG ===');

            if (validResults.length === 0 && results.length > 0) {
                // API returned results but they're all empty - likely API key issue
                console.error('Empty results detected - API key may be invalid');
                setApiError('Location service is not configured properly. Please contact support.');
                setSuggestions([]);
            } else if (validResults.length === 0) {
                // No results at all
                setSuggestions([]);
                setShowSuggestions(false);
            } else {
                // Valid results found
                setSuggestions(validResults);
                setShowSuggestions(true);
            }
        } catch (err) {
            console.error('Autocomplete error:', err);

            // Check for specific error messages
            if (err.response?.data?.detail) {
                const detail = err.response.data.detail;
                if (detail.includes('API key') || detail.includes('denied')) {
                    setApiError('Location service API key is invalid. Please contact administrator.');
                } else {
                    setApiError(detail);
                }
            } else if (err.message) {
                setApiError(err.message);
            } else {
                setApiError('Unable to fetch location suggestions. Please try again.');
            }

            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle input change with debouncing
     */
    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setSelectedIndex(-1);

        // Call onChange callback
        if (onChange) {
            onChange(newValue);
        }

        // Clear previous timer
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        // Set new timer for API call
        debounceTimer.current = setTimeout(() => {
            fetchSuggestions(newValue);
        }, 300); // 300ms debounce
    };

    /**
     * Handle suggestion selection
     */
    const handleSelectSuggestion = (suggestion) => {
        setInputValue(suggestion.address);
        setShowSuggestions(false);
        setSuggestions([]);
        setSelectedIndex(-1);

        // Call callbacks
        if (onChange) {
            onChange(suggestion.address);
        }

        if (onSelect) {
            onSelect({
                address: suggestion.address,
                latitude: suggestion.latitude,
                longitude: suggestion.longitude,
                district: suggestion.district,
                state: suggestion.state,
                country: suggestion.country,
                postal_code: suggestion.postal_code
            });
        }
    };

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;

            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;

            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    handleSelectSuggestion(suggestions[selectedIndex]);
                }
                break;

            case 'Escape':
                setShowSuggestions(false);
                setSelectedIndex(-1);
                break;

            default:
                break;
        }
    };

    /**
     * Clear input
     */
    const handleClear = () => {
        setInputValue('');
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);

        if (onChange) {
            onChange('');
        }

        if (onSelect) {
            onSelect(null);
        }

        inputRef.current?.focus();
    };

    return (
        <div ref={wrapperRef} className="relative">
            {/* Input Field */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaMapMarkerAlt className={`h-5 w-5 ${error ? 'text-red-400' : 'text-gray-400'}`} />
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (suggestions.length > 0) {
                            setShowSuggestions(true);
                        }
                    }}
                    placeholder={placeholder}
                    className={`appearance-none block w-full pl-10 pr-10 py-2 border ${error ? 'border-red-300' : 'border-gray-300'
                        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
                />

                {/* Loading Spinner or Clear Button */}
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {loading ? (
                        <FaSpinner className="h-4 w-4 text-gray-400 animate-spin" />
                    ) : inputValue ? (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            <FaTimes className="h-4 w-4" />
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Error Message */}
            {error && errorMessage && (
                <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={suggestion.place_id || index}
                            onClick={() => handleSelectSuggestion(suggestion)}
                            className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${index === selectedIndex
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-900 hover:bg-gray-100'
                                }`}
                        >
                            <div className="flex items-start">
                                <FaMapMarkerAlt className={`h-4 w-4 mt-0.5 mr-2 flex-shrink-0 ${index === selectedIndex ? 'text-white' : 'text-gray-400'
                                    }`} />
                                <div className="flex-1">
                                    <div className={`font-medium ${index === selectedIndex ? 'text-white' : 'text-gray-900'
                                        }`}>
                                        {suggestion.address}
                                    </div>
                                    {(suggestion.district || suggestion.state) && (
                                        <div className={`text-sm ${index === selectedIndex ? 'text-blue-100' : 'text-gray-500'
                                            }`}>
                                            {[suggestion.district, suggestion.state, suggestion.country]
                                                .filter(Boolean)
                                                .join(', ')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* API Error Message */}
            {apiError && inputValue.length >= 2 && (
                <div className="absolute z-10 mt-1 w-full bg-red-50 border border-red-200 shadow-lg rounded-md py-2 px-3 text-sm text-red-600">
                    <div className="font-medium">Error</div>
                    <div>{apiError}</div>
                </div>
            )}

            {/* No Results Message */}
            {!apiError && showSuggestions && !loading && inputValue.length >= 2 && suggestions.length === 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-2 px-3 text-sm text-gray-500">
                    No locations found. Try a different search term.
                </div>
            )}
        </div>
    );
}
