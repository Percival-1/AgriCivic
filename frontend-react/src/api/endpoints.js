// API endpoint constants
export const ENDPOINTS = {
    // Auth
    AUTH: {
        LOGIN: '/api/v1/auth/login',
        REGISTER: '/api/v1/auth/register',
        LOGOUT: '/api/v1/auth/logout',
        CURRENT_USER: '/api/v1/auth/me',
        REFRESH: '/api/v1/auth/refresh',
    },

    // Chat
    CHAT: {
        INIT_SESSION: '/chat/init',
        SEND_MESSAGE: '/chat/message',
        GET_HISTORY: '/chat/history',
        END_SESSION: '/chat/end',
    },

    // Vision
    VISION: {
        ANALYZE: '/vision/analyze',
        TREATMENT: '/vision/treatment',
    },

    // Weather
    WEATHER: {
        CURRENT: '/weather/current',
        FORECAST: '/weather/forecast',
        ALERTS: '/weather/alerts',
        INSIGHTS: '/weather/insights',
    },

    // Market
    MARKET: {
        PRICES: '/market/prices',
        COMPARE: '/market/compare',
        MANDIS: '/market/mandis',
        TRENDS: '/market/trends',
        RECOMMENDATION: '/market/recommendation',
    },

    // Schemes
    SCHEMES: {
        SEARCH: '/schemes/search',
        DETAILS: '/schemes/details',
        RECOMMENDATIONS: '/schemes/recommendations',
        ELIGIBILITY: '/schemes/eligibility',
    },

    // Notifications
    NOTIFICATIONS: {
        LIST: '/notifications',
        MARK_READ: '/notifications/read',
        PREFERENCES: '/notifications/preferences',
    },

    // Speech
    SPEECH: {
        TRANSCRIBE: '/speech/transcribe',
        SYNTHESIZE: '/speech/synthesize',
        FORMATS: '/speech/formats',
        LANGUAGES: '/speech/languages',
        VOICES: '/speech/voices',
    },

    // Translation
    TRANSLATION: {
        TRANSLATE: '/translation/translate',
        BATCH: '/translation/batch',
        DETECT: '/translation/detect',
        LANGUAGES: '/translation/languages',
    },

    // Admin
    ADMIN: {
        USERS: '/admin/users',
        MONITORING: '/api/v1/monitoring',
        CACHE: '/admin/cache',
        PERFORMANCE: '/api/v1/performance',
    },

    // Cache
    CACHE: {
        METRICS: '/api/v1/cache/metrics',
        INVALIDATE: '/api/v1/cache/invalidate',
        HEALTH: '/api/v1/cache/health',
        NAMESPACES: '/api/v1/cache/namespaces',
        RESET_METRICS: '/api/v1/cache/reset-metrics',
    },

    // LLM
    LLM: {
        METRICS: '/api/v1/llm/metrics',
        HEALTH: '/api/v1/llm/health',
        PROVIDERS: '/api/v1/llm/providers',
        RESET_METRICS: '/api/v1/llm/metrics/reset',
    },
}
