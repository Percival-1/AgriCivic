import { useState } from 'react';
import { useDebounce } from './useDebounce';

/**
 * Example: Search Input with Debounce
 * 
 * This example demonstrates how to use useDebounce for search inputs
 * to avoid making API calls on every keystroke.
 */
export function SearchExample() {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // This effect will only run when debouncedSearchTerm changes
    // which happens 500ms after the user stops typing
    useState(() => {
        if (debouncedSearchTerm) {
            // Make API call with debouncedSearchTerm
            console.log('Searching for:', debouncedSearchTerm);
            // fetch(`/api/search?q=${debouncedSearchTerm}`)
        }
    }, [debouncedSearchTerm]);

    return (
        <div>
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
            />
            <p>Immediate value: {searchTerm}</p>
            <p>Debounced value: {debouncedSearchTerm}</p>
        </div>
    );
}

/**
 * Example: Filter List with Debounce
 * 
 * This example shows how to use useDebounce for filtering a list
 * without re-filtering on every keystroke.
 */
export function FilterExample() {
    const [filterText, setFilterText] = useState('');
    const debouncedFilterText = useDebounce(filterText, 300);

    const items = [
        'Apple',
        'Banana',
        'Cherry',
        'Date',
        'Elderberry',
        'Fig',
        'Grape',
    ];

    const filteredItems = items.filter((item) =>
        item.toLowerCase().includes(debouncedFilterText.toLowerCase())
    );

    return (
        <div>
            <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter items..."
            />
            <ul>
                {filteredItems.map((item) => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        </div>
    );
}

/**
 * Example: Auto-save with Debounce
 * 
 * This example demonstrates using useDebounce for auto-saving
 * form data without saving on every keystroke.
 */
export function AutoSaveExample() {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
    });
    const debouncedFormData = useDebounce(formData, 1000);

    useState(() => {
        if (debouncedFormData.title || debouncedFormData.content) {
            // Auto-save to backend
            console.log('Auto-saving:', debouncedFormData);
            // fetch('/api/save', { method: 'POST', body: JSON.stringify(debouncedFormData) })
        }
    }, [debouncedFormData]);

    return (
        <div>
            <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Title"
            />
            <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Content"
            />
            <p>Last saved: {JSON.stringify(debouncedFormData)}</p>
        </div>
    );
}

/**
 * Example: Window Resize Handler with Debounce
 * 
 * This example shows how to use useDebounce for handling
 * window resize events efficiently.
 */
export function ResizeExample() {
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });
    const debouncedWindowSize = useDebounce(windowSize, 250);

    useState(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div>
            <p>Current size: {windowSize.width} x {windowSize.height}</p>
            <p>Debounced size: {debouncedWindowSize.width} x {debouncedWindowSize.height}</p>
        </div>
    );
}
