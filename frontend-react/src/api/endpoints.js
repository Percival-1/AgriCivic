// API endpoint constants
export const ENDPOINTS = {
    // Auth
    AUTH: {
        LOGIN: '/v1/auth/login',
        REGISTER: '/v1/auth/register',
        LOGOUT: '/v1/auth/logout',
        CURRENT_USER: '/v1/auth/me',
        REFRESH: '/v1/auth/refresh',
    },

    // Chat
    CHAT: {
        INIT_SESSION: '/v1/chat/init',
        SEND_MESSAGE: '/v1/chat/message',
        GET_HISTORY: '/v1/chat/history',
        END_SESSION: '/v1/chat/end',
    },

    // Vision
    VISION: {
        ANALYZE: '/v1/vision/analyze',
        TREATMENT: '/v1/vision/treatment',
    },

    // Weather
    WEATHER: {
        CURRENT: '/v1/weather/current',
        FORECAST: '/v1/weather/forecast',
        ALERTS: '/v1/weather/alerts',
        INSIGHTS: '/v1/weather/insights',
    },

    // Market
    MARKET: {
        PRICES: '/v1/market/prices',
        COMPARE: '/v1/market/compare',
        MANDIS: '/v1/market/mandis',
        TRENDS: '/v1/market/trends',
        RECOMMENDATION: '/v1/market/recommendation',
    },

    // Schemes
    SCHEMES: {
        SEARCH: '/v1/schemes/search',
        DETAILS: '/v1/schemes/details',
        RECOMMENDATIONS: '/v1/schemes/recommendations',
        ELIGIBILITY: '/v1/schemes/eligibility',
    },

    // Notifications
    NOTIFICATIONS: {
        LIST: '/v1/notifications',
        MARK_READ: '/v1/notifications/read',
        PREFERENCES: '/v1/notifications/preferences',
    },

    // Speech
    SPEECH: {
        TRANSCRIBE: '/v1/speech/transcribe',
        SYNTHESIZE: '/v1/speech/synthesize',
        FORMATS: '/v1/speech/formats',
        LANGUAGES: '/v1/speech/languages',
        VOICES: '/v1/speech/voices',
    },

    // Translation
    TRANSLATION: {
        TRANSLATE: '/v1/translation/translate',
        BATCH: '/v1/translation/batch',
        DETECT: '/v1/translation/detect',
        LANGUAGES: '/v1/translation/languages',
    },

    // Admin
    ADMIN: {
        USERS: '/v1/admin/users',
        MONITORING: '/v1/monitoring',
        CACHE: '/v1/admin/cache',
        PERFORMANCE: '/v1/performance',
    },

    // Cache
    CACHE: {
        METRICS: '/v1/cache/metrics',
        INVALIDATE: '/v1/cache/invalidate',
        HEALTH: '/v1/cache/health',
        NAMESPACES: '/v1/cache/namespaces',
        RESET_METRICS: '/v1/cache/reset-metrics',
    },

    // LLM
    LLM: {
        METRICS: '/v1/llm/metrics',
        HEALTH: '/v1/llm/health',
        PROVIDERS: '/v1/llm/providers',
        RESET_METRICS: '/v1/llm/metrics/reset',
    },
}