/**
 * Security Utilities
 * 
 * Helper functions for implementing security best practices.
 * 
 * Requirements: 18.1-18.6
 */

/**
 * Enforce HTTPS in production
 * Redirects to HTTPS if accessed via HTTP
 */
export const enforceHTTPS = () => {
    if (
        import.meta.env.PROD &&
        window.location.protocol === 'http:' &&
        window.location.hostname !== 'localhost'
    ) {
        window.location.href = window.location.href.replace('http:', 'https:');
    }
};

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes potentially dangerous HTML tags and attributes
 * 
 * @param {string} html - HTML string to sanitize
 * @returns {string} - Sanitized HTML
 */
export const sanitizeHTML = (html) => {
    if (!html) return '';

    // Create a temporary div to parse HTML
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
};

/**
 * Advanced HTML sanitization with allowed tags
 * Allows specific safe HTML tags while removing dangerous ones
 * 
 * @param {string} html - HTML string to sanitize
 * @param {Array<string>} allowedTags - Array of allowed HTML tags (default: safe tags)
 * @returns {string} - Sanitized HTML
 */
export const sanitizeHTMLWithTags = (html, allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li']) => {
    if (!html) return '';

    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove script tags
    const scripts = temp.querySelectorAll('script');
    scripts.forEach((script) => script.remove());

    // Remove event handlers
    const allElements = temp.querySelectorAll('*');
    allElements.forEach((el) => {
        // Remove event handler attributes
        Array.from(el.attributes).forEach((attr) => {
            if (attr.name.startsWith('on')) {
                el.removeAttribute(attr.name);
            }
        });

        // Remove dangerous attributes
        const dangerousAttrs = ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'];
        dangerousAttrs.forEach((attr) => {
            if (el.hasAttribute(attr)) {
                el.removeAttribute(attr);
            }
        });

        // Remove elements not in allowed list
        if (!allowedTags.includes(el.tagName.toLowerCase())) {
            el.replaceWith(...el.childNodes);
        }
    });

    return temp.innerHTML;
};

/**
 * Sanitize user input for display
 * Escapes HTML special characters
 * 
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
    if (!input) return '';

    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };

    return String(input).replace(/[&<>"'/]/g, (char) => map[char]);
};

/**
 * Sanitize URL to prevent javascript: and data: URI XSS
 * 
 * @param {string} url - URL to sanitize
 * @returns {string} - Sanitized URL or empty string if dangerous
 */
export const sanitizeURL = (url) => {
    if (!url) return '';

    const urlString = String(url).trim().toLowerCase();

    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    for (const protocol of dangerousProtocols) {
        if (urlString.startsWith(protocol)) {
            console.warn('Blocked dangerous URL protocol:', protocol);
            return '';
        }
    }

    return url;
};

/**
 * Sanitize object by sanitizing all string values
 * Useful for sanitizing form data
 * 
 * @param {Object} obj - Object to sanitize
 * @param {Array<string>} excludeKeys - Keys to exclude from sanitization
 * @returns {Object} - Sanitized object
 */
export const sanitizeObject = (obj, excludeKeys = []) => {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
        if (excludeKeys.includes(key)) {
            sanitized[key] = value;
        } else if (typeof value === 'string') {
            sanitized[key] = sanitizeInput(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map((item) =>
                typeof item === 'string' ? sanitizeInput(item) : item
            );
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value, excludeKeys);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
};

/**
 * Sanitize filename to prevent path traversal
 * 
 * @param {string} filename - Filename to sanitize
 * @returns {string} - Sanitized filename
 */
export const sanitizeFilename = (filename) => {
    if (!filename) return '';

    // Remove path separators and special characters
    return String(filename)
        .replace(/[\/\\]/g, '')
        .replace(/\.\./g, '')
        .replace(/[<>:"|?*]/g, '')
        .trim();
};

/**
 * Validate URL to prevent open redirect vulnerabilities
 * Only allows relative URLs or URLs from same origin
 * 
 * @param {string} url - URL to validate
 * @returns {boolean} - True if URL is safe
 */
export const isValidRedirectURL = (url) => {
    if (!url) return false;

    try {
        // Allow relative URLs
        if (url.startsWith('/')) {
            return true;
        }

        // Check if URL is from same origin
        const urlObj = new URL(url, window.location.origin);
        return urlObj.origin === window.location.origin;
    } catch {
        return false;
    }
};

/**
 * Safe redirect that prevents open redirect vulnerabilities
 * 
 * @param {string} url - URL to redirect to
 * @param {string} fallback - Fallback URL if validation fails (default: '/')
 */
export const safeRedirect = (url, fallback = '/') => {
    if (isValidRedirectURL(url)) {
        window.location.href = url;
    } else {
        console.warn('Invalid redirect URL, using fallback:', url);
        window.location.href = fallback;
    }
};

/**
 * Generate a secure random string
 * Useful for CSRF tokens, nonces, etc.
 * 
 * @param {number} length - Length of random string (default: 32)
 * @returns {string} - Random string
 */
export const generateSecureRandom = (length = 32) => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Check if browser supports required security features
 * 
 * @returns {Object} - Object with feature support flags
 */
export const checkSecurityFeatures = () => {
    return {
        crypto: typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function',
        localStorage: (() => {
            try {
                const test = '__storage_test__';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch {
                return false;
            }
        })(),
        serviceWorker: 'serviceWorker' in navigator,
        https: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
    };
};

/**
 * Validate Content Security Policy compliance
 * Checks if inline scripts/styles are being used
 * 
 * @returns {Object} - CSP compliance report
 */
export const validateCSP = () => {
    const issues = [];

    // Check for inline scripts
    const inlineScripts = document.querySelectorAll('script:not([src])');
    if (inlineScripts.length > 0) {
        issues.push(`Found ${inlineScripts.length} inline script(s)`);
    }

    // Check for inline styles
    const inlineStyles = document.querySelectorAll('style:not([data-styled])');
    if (inlineStyles.length > 0) {
        issues.push(`Found ${inlineStyles.length} inline style(s)`);
    }

    // Check for inline event handlers
    const elementsWithHandlers = document.querySelectorAll('[onclick], [onload], [onerror]');
    if (elementsWithHandlers.length > 0) {
        issues.push(`Found ${elementsWithHandlers.length} inline event handler(s)`);
    }

    return {
        compliant: issues.length === 0,
        issues,
    };
};

/**
 * Secure localStorage wrapper with encryption
 * Note: This provides obfuscation, not true encryption
 * For sensitive data, use server-side storage
 * 
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
export const secureStorage = {
    set: (key, value) => {
        try {
            const encoded = btoa(JSON.stringify(value));
            localStorage.setItem(key, encoded);
        } catch (error) {
            console.error('Failed to store data:', error);
        }
    },

    get: (key) => {
        try {
            const encoded = localStorage.getItem(key);
            if (!encoded) return null;
            return JSON.parse(atob(encoded));
        } catch (error) {
            console.error('Failed to retrieve data:', error);
            return null;
        }
    },

    remove: (key) => {
        localStorage.removeItem(key);
    },

    clear: () => {
        localStorage.clear();
    },
};

/**
 * Rate limiting helper for client-side actions
 * Prevents abuse of API endpoints
 * 
 * @param {string} key - Unique key for the action
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - True if action is allowed
 */
export const rateLimit = (() => {
    const attempts = new Map();

    return (key, maxAttempts = 5, windowMs = 60000) => {
        const now = Date.now();
        const record = attempts.get(key) || { count: 0, resetAt: now + windowMs };

        // Reset if window has passed
        if (now > record.resetAt) {
            record.count = 0;
            record.resetAt = now + windowMs;
        }

        // Check if limit exceeded
        if (record.count >= maxAttempts) {
            return false;
        }

        // Increment count
        record.count++;
        attempts.set(key, record);
        return true;
    };
})();

/**
 * Initialize security features on app load
 */
export const initializeSecurity = () => {
    // Enforce HTTPS in production
    enforceHTTPS();

    // Check security features
    const features = checkSecurityFeatures();

    if (!features.crypto) {
        console.warn('Crypto API not available - some security features may not work');
    }

    if (!features.localStorage) {
        console.warn('localStorage not available - session persistence disabled');
    }

    if (!features.https && import.meta.env.PROD) {
        console.error('HTTPS not enabled - application is not secure');
    }

    // Validate CSP in development
    if (import.meta.env.DEV) {
        const cspReport = validateCSP();
        if (!cspReport.compliant) {
            console.warn('CSP compliance issues:', cspReport.issues);
        }
    }

    // Disable right-click in production (optional)
    if (import.meta.env.PROD) {
        // Uncomment to disable right-click
        // document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Disable text selection for sensitive elements (optional)
    // document.querySelectorAll('.no-select').forEach((el) => {
    //   el.style.userSelect = 'none';
    // });
};

/**
 * Example usage:
 * 
 * // Initialize security on app load
 * import { initializeSecurity } from './utils/security';
 * initializeSecurity();
 * 
 * // Sanitize user input
 * const safeInput = sanitizeInput(userInput);
 * 
 * // Safe redirect
 * safeRedirect(redirectUrl);
 * 
 * // Rate limiting
 * if (rateLimit('login', 5, 60000)) {
 *   // Proceed with login
 * } else {
 *   // Show rate limit error
 * }
 */
