import BaseService from './BaseService';

/**
 * Weather Service
 * Handles all weather-related API calls
 * Requirements: 7.1-7.7
 */
class WeatherService extends BaseService {
    /**
     * Get current weather for a location
     * @param {string} location - Location (city name, coordinates, etc.)
     * @returns {Promise} Current weather data
     */
    async getCurrentWeather(location) {
        return this.get('/api/v1/weather/current', {
            params: { location },
        });
    }

    /**
     * Get weather forecast
     * @param {string} location - Location (city name, coordinates, etc.)
     * @param {number} days - Number of days for forecast (default: 7)
     * @returns {Promise} Weather forecast data
     */
    async getForecast(location, days = 7) {
        return this.get('/api/v1/weather/forecast', {
            params: { location, days },
        });
    }

    /**
     * Get weather alerts for a location
     * @param {string} location - Location (city name, coordinates, etc.)
     * @returns {Promise} Weather alerts data
     */
    async getAlerts(location) {
        return this.get('/api/v1/weather/alerts', {
            params: { location },
        });
    }

    /**
     * Get agricultural insights based on weather
     * @param {string} location - Location (city name, coordinates, etc.)
     * @returns {Promise} Agricultural insights data
     */
    async getAgriculturalInsights(location) {
        return this.get('/api/v1/weather/agricultural-insights', {
            params: { location },
        });
    }
}

export default new WeatherService();
