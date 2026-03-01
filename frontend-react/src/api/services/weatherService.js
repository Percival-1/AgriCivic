import BaseService from './BaseService';

/**
 * Weather Service
 */
class WeatherService extends BaseService {
    async getCurrentWeather(location) {
        // 🔥 FIX: Removed /api
        return this.get('/v1/weather/current', { params: { location } });
    }

    async getForecast(location, days = 7) {
        // 🔥 FIX: Removed /api
        return this.get('/v1/weather/forecast', { params: { location, days } });
    }

    async getAlerts(location) {
        // 🔥 FIX: Removed /api
        return this.get('/v1/weather/alerts', { params: { location } });
    }

    async getAgriculturalInsights(location) {
        // 🔥 FIX: Removed /api
        return this.get('/v1/weather/agricultural-insights', { params: { location } });
    }
}

export default new WeatherService();