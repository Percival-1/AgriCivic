import { ClipLoader } from 'react-spinners';

/**
 * Loader Component
 * 
 * Displays a loading spinner using React Spinners.
 * Can be used inline or as a full-screen overlay.
 * 
 * @param {boolean} fullScreen - If true, displays as full-screen centered loader
 * @param {number} size - Size of the spinner in pixels (default: 50)
 * @param {string} color - Color of the spinner (default: primary-600)
 * @param {string} text - Optional loading text to display below spinner
 */

export default function Loader({
    fullScreen = false,
    size = 50,
    color = '#2563eb',
    text = ''
}) {
    const loaderContent = (
        <div className="flex flex-col items-center justify-center gap-4">
            <ClipLoader color={color} size={size} />
            {text && <p className="text-gray-600 text-sm">{text}</p>}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50">
                {loaderContent}
            </div>
        );
    }

    return loaderContent;
}
