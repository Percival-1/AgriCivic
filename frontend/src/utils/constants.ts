// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Local Storage Keys
export const STORAGE_KEYS = {
    TOKEN: 'auth_token',
    USER: 'user_data',
    LANGUAGE: 'language_preference',
    THEME: 'theme_preference',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        LOGOUT: '/api/auth/logout',
        CURRENT_USER: '/api/auth/me',
    },
    CHAT: {
        INIT_SESSION: '/api/chat/init',
        SEND_MESSAGE: '/api/chat/message',
        HISTORY: '/api/chat/history',
        END_SESSION: '/api/chat/end',
    },
    VISION: {
        ANALYZE: '/api/vision/analyze',
        TREATMENT: '/api/vision/treatment',
    },
    WEATHER: {
        CURRENT: '/api/weather/current',
        FORECAST: '/api/weather/forecast',
        ALERTS: '/api/weather/alerts',
    },
    MARKET: {
        PRICES: '/api/market/prices',
        MANDIS: '/api/market/mandis',
        TRENDS: '/api/market/trends',
    },
    SCHEMES: {
        SEARCH: '/api/schemes/search',
        DETAILS: '/api/schemes/details',
        RECOMMENDATIONS: '/api/schemes/recommendations',
    },
    NOTIFICATIONS: {
        LIST: '/api/notifications',
        MARK_READ: '/api/notifications/read',
        PREFERENCES: '/api/notifications/preferences',
    },
} as const;

// Supported Languages
export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'te', name: 'తెలుగు' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'മലയാളം' },
    { code: 'mr', name: 'मराठी' },
    { code: 'gu', name: 'ગુજરાતી' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ' },
    { code: 'bn', name: 'বাংলা' },
] as const;
