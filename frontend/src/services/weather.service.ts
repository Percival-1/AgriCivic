/**
 * Weather Service for weather information and agricultural insights
 */

import apiService from './api';
import type {
    WeatherCurrent,
    WeatherForecast,
    WeatherAlert,
    AgriculturalInsight,
    CurrentWeatherResponse,
    ForecastResponse,
    AlertsResponse,
    AgriculturalInsightsResponse,
    WeatherHealthResponse,
} from '@/types/weather.types';

class WeatherService {
    /**
     * Get current weather conditions for a location
     * @param location - Location string (city, coordinates, etc.)
     * @returns Current weather data
     */
    async getCurrentWeather(location: string): Promise<WeatherCurrent> {
        const response = await apiService.get<CurrentWeatherResponse>('/weather/current', {
            params: { location },
        });
        // API service already returns response.data, so response is the CurrentWeatherResponse
        return (response as any).data || response;
    }

    /**
     * Get weather forecast for a location
     * @param location - Location string (city, coordinates, etc.)
     * @param days - Number of days to forecast (default: 7)
     * @returns Array of weather forecasts
     */
    async getForecast(location: string, days: number = 7): Promise<WeatherForecast[]> {
        try {
            const response = await apiService.get<ForecastResponse>('/weather/forecast', {
                params: { location, days },
            });

            console.log('[WeatherService] Raw forecast response:', response);

            // Handle different response formats
            let forecastData: any;

            if (response && typeof response === 'object') {
                // If response has 'data' property, use it
                if ('data' in response) {
                    forecastData = (response as any).data;
                } else {
                    // Response itself might be the data
                    forecastData = response;
                }
            } else {
                forecastData = response;
            }

            // Ensure we return an array
            if (Array.isArray(forecastData)) {
                console.log('[WeatherService] Forecast array length:', forecastData.length);
                console.log('[WeatherService] First forecast item:', forecastData[0]);
                return forecastData;
            }

            console.warn('[WeatherService] Unexpected forecast format, returning empty array');
            return [];
        } catch (error) {
            console.error('[WeatherService] Error fetching forecast:', error);
            throw error;
        }
    }

    /**
     * Get weather alerts for a location
     * @param location - Location string (city, coordinates, etc.)
     * @returns Array of weather alerts
     */
    async getAlerts(location: string): Promise<WeatherAlert[]> {
        const response = await apiService.get<AlertsResponse>('/weather/alerts', {
            params: { location },
        });
        // API service already returns response.data, so response is the AlertsResponse
        return (response as any).data || response;
    }

    /**
     * Get agricultural insights based on weather conditions
     * @param location - Location string (city, coordinates, etc.)
     * @returns Agricultural insights and recommendations
     */
    async getAgriculturalInsights(location: string): Promise<AgriculturalInsight> {
        const response = await apiService.get<AgriculturalInsightsResponse>(
            '/weather/agricultural-insights',
            {
                params: { location },
            }
        );
        // API service already returns response.data, so response is the AgriculturalInsightsResponse
        return (response as any).data || response;
    }

    /**
     * Check weather service health
     * @returns Health status
     */
    async healthCheck(): Promise<WeatherHealthResponse> {
        return apiService.get<WeatherHealthResponse>('/weather/health');
    }

    /**
     * Format temperature with unit
     * @param temperature - Temperature value
     * @param unit - Temperature unit ('C' or 'F')
     * @returns Formatted temperature string
     */
    formatTemperature(temperature: number, unit: 'C' | 'F' = 'C'): string {
        return `${temperature.toFixed(1)}°${unit}`;
    }

    /**
     * Get severity color for weather alerts
     * @param severity - Alert severity level
     * @returns Color code for UI display
     */
    getAlertSeverityColor(severity: WeatherAlert['severity']): string {
        const colors = {
            low: '#4CAF50', // Green
            medium: '#FF9800', // Orange
            high: '#F44336', // Red
            extreme: '#9C27B0', // Purple
        };
        return colors[severity];
    }

    /**
     * Get icon name for weather condition
     * @param icon - Weather icon code from API
     * @returns Material Design icon name
     */
    getWeatherIcon(icon: string): string {
        // Map weather icon codes to Material Design Icons
        const iconMap: Record<string, string> = {
            '01d': 'mdi-weather-sunny',
            '01n': 'mdi-weather-night',
            '02d': 'mdi-weather-partly-cloudy',
            '02n': 'mdi-weather-night-partly-cloudy',
            '03d': 'mdi-weather-cloudy',
            '03n': 'mdi-weather-cloudy',
            '04d': 'mdi-weather-cloudy',
            '04n': 'mdi-weather-cloudy',
            '09d': 'mdi-weather-rainy',
            '09n': 'mdi-weather-rainy',
            '10d': 'mdi-weather-pouring',
            '10n': 'mdi-weather-pouring',
            '11d': 'mdi-weather-lightning',
            '11n': 'mdi-weather-lightning',
            '13d': 'mdi-weather-snowy',
            '13n': 'mdi-weather-snowy',
            '50d': 'mdi-weather-fog',
            '50n': 'mdi-weather-fog',
        };
        return iconMap[icon] || 'mdi-weather-cloudy';
    }

    /**
     * Calculate wind direction from degrees
     * @param degrees - Wind direction in degrees
     * @returns Cardinal direction (N, NE, E, SE, S, SW, W, NW)
     */
    getWindDirection(degrees: number): string {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }

    /**
     * Format date for display
     * @param dateString - ISO date string
     * @returns Formatted date string
     */
    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    }

    /**
     * Check if weather is suitable for farming activities
     * @param weather - Current weather data
     * @returns Boolean indicating if conditions are suitable
     */
    isSuitableForFarming(weather: WeatherCurrent): boolean {
        // Basic heuristic: not too hot, not raining heavily, moderate wind
        return (
            weather.temperature < 40 &&
            weather.temperature > 5 &&
            weather.wind_speed < 30 &&
            !weather.description.toLowerCase().includes('heavy rain')
        );
    }
}

// Export singleton instance
const weatherService = new WeatherService();
export default weatherService;
