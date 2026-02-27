import React from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * Example component demonstrating useLocalStorage hook usage
 * 
 * This example shows:
 * - Basic string storage
 * - Object storage
 * - Array storage
 * - Remove functionality
 * - Get functionality
 */
export default function LocalStorageExample() {
    // Example 1: Simple string value
    const [name, setName, removeName] = useLocalStorage('userName', 'Guest');

    // Example 2: Object storage
    const [userPreferences, setUserPreferences, removePreferences] = useLocalStorage(
        'userPreferences',
        {
            theme: 'light',
            language: 'en',
            notifications: true,
        }
    );

    // Example 3: Array storage
    const [favoriteItems, setFavoriteItems, removeFavorites] = useLocalStorage(
        'favoriteItems',
        []
    );

    // Example 4: Counter with function update
    const [counter, setCounter, resetCounter] = useLocalStorage('counter', 0);

    const handleAddFavorite = () => {
        const newItem = `Item ${favoriteItems.length + 1}`;
        setFavoriteItems([...favoriteItems, newItem]);
    };

    const handleRemoveFavorite = (index) => {
        setFavoriteItems(favoriteItems.filter((_, i) => i !== index));
    };

    const handleToggleTheme = () => {
        setUserPreferences({
            ...userPreferences,
            theme: userPreferences.theme === 'light' ? 'dark' : 'light',
        });
    };

    const handleIncrementCounter = () => {
        // Using function update like useState
        setCounter((prev) => prev + 1);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">useLocalStorage Hook Examples</h1>

            {/* Example 1: String Storage */}
            <div className="mb-8 p-4 border rounded">
                <h2 className="text-xl font-semibold mb-3">Example 1: String Storage</h2>
                <div className="space-y-2">
                    <p>Current Name: <strong>{name}</strong></p>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border px-3 py-2 rounded"
                        placeholder="Enter your name"
                    />
                    <button
                        onClick={removeName}
                        className="ml-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Reset Name
                    </button>
                </div>
            </div>

            {/* Example 2: Object Storage */}
            <div className="mb-8 p-4 border rounded">
                <h2 className="text-xl font-semibold mb-3">Example 2: Object Storage</h2>
                <div className="space-y-2">
                    <p>Theme: <strong>{userPreferences.theme}</strong></p>
                    <p>Language: <strong>{userPreferences.language}</strong></p>
                    <p>Notifications: <strong>{userPreferences.notifications ? 'On' : 'Off'}</strong></p>
                    <button
                        onClick={handleToggleTheme}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Toggle Theme
                    </button>
                    <button
                        onClick={removePreferences}
                        className="ml-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Reset Preferences
                    </button>
                </div>
            </div>

            {/* Example 3: Array Storage */}
            <div className="mb-8 p-4 border rounded">
                <h2 className="text-xl font-semibold mb-3">Example 3: Array Storage</h2>
                <div className="space-y-2">
                    <p>Favorite Items ({favoriteItems.length}):</p>
                    <ul className="list-disc list-inside">
                        {favoriteItems.map((item, index) => (
                            <li key={index} className="flex items-center gap-2">
                                {item}
                                <button
                                    onClick={() => handleRemoveFavorite(index)}
                                    className="text-red-500 text-sm"
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                    <button
                        onClick={handleAddFavorite}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                        Add Favorite
                    </button>
                    <button
                        onClick={removeFavorites}
                        className="ml-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Clear All
                    </button>
                </div>
            </div>

            {/* Example 4: Counter with Function Update */}
            <div className="mb-8 p-4 border rounded">
                <h2 className="text-xl font-semibold mb-3">Example 4: Counter (Function Update)</h2>
                <div className="space-y-2">
                    <p>Counter: <strong>{counter}</strong></p>
                    <button
                        onClick={handleIncrementCounter}
                        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                    >
                        Increment
                    </button>
                    <button
                        onClick={() => setCounter(counter - 1)}
                        className="ml-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                    >
                        Decrement
                    </button>
                    <button
                        onClick={resetCounter}
                        className="ml-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Reset Counter
                    </button>
                </div>
            </div>

            {/* Info Section */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-semibold mb-2">How it works:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Values are automatically saved to localStorage</li>
                    <li>Changes sync across all components using the same key</li>
                    <li>Storage events sync across browser tabs</li>
                    <li>Supports all JSON-serializable data types</li>
                    <li>Provides get, set, and remove functions</li>
                    <li>Handles errors gracefully with fallback to initial value</li>
                </ul>
            </div>
        </div>
    );
}
