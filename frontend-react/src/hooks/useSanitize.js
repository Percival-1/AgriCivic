/**
 * useSanitize Hook
 * 
 * Custom hook for sanitizing user inputs throughout the application
 * Provides easy access to sanitization functions
 * 
 * Requirements: 18.1-18.6
 */

import { useCallback } from 'react';
import {
    sanitizeInput,
    sanitizeHTML,
    sanitizeHTMLWithTags,
    sanitizeURL,
    sanitizeObject,
    sanitizeFilename,
} from '../utils/security';

/**
 * Hook for sanitizing user inputs
 * 
 * @returns {Object} - Sanitization functions
 */
export const useSanitize = () => {
    const sanitizeText = useCallback((text) => {
        return sanitizeInput(text);
    }, []);

    const sanitizeHtml = useCallback((html, allowedTags) => {
        if (allowedTags) {
            return sanitizeHTMLWithTags(html, allowedTags);
        }
        return sanitizeHTML(html);
    }, []);

    const sanitizeUrl = useCallback((url) => {
        return sanitizeURL(url);
    }, []);

    const sanitizeFormData = useCallback((data, excludeKeys = []) => {
        return sanitizeObject(data, excludeKeys);
    }, []);

    const sanitizeFile = useCallback((filename) => {
        return sanitizeFilename(filename);
    }, []);

    return {
        sanitizeText,
        sanitizeHtml,
        sanitizeUrl,
        sanitizeFormData,
        sanitizeFile,
    };
};

export default useSanitize;
