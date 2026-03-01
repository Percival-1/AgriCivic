/**
 * Type definitions for Weather Service
 */

/**
 * Current weather conditions
 */
export interface WeatherCurrent {
    temperature: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    wind_direction: string;
    description: string;
    icon: string;
    location: string;
    timestamp: string;
}

/**
 * Weather forecast for a specific day
 */
export interface WeatherForecast {
    date: string;
    temperature_max: number;
    temperature_min: number;
    humidity: number;
    rainfall_probability: number;
    rainfall_amount: number;
    wind_speed: number;
    description: string;
    icon: string;
}

/**
 * Weather alert/warning
 */
export interface WeatherAlert {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'extreme';
    event: string;
    description: string;
    start_time: string;
    end_time: string;
    affected_areas: string[];
}

/**
 * Agricultural insights based on weather
 */
export interface AgriculturalInsight {
    recommendation: string;
    suitable_activities: string[];
    activities_to_avoid: string[];
    irrigation_advice: string;
    pest_risk_level: string;
}

/**
 * Response from current weather endpoint
 */
export interface CurrentWeatherResponse {
    success: boolean;
    data: WeatherCurrent;
}

/**
 * Response from forecast endpoint
 */
export interface ForecastResponse {
    success: boolean;
    data: WeatherForecast[];
}

/**
 * Response from alerts endpoint
 */
export interface AlertsResponse {
    success: boolean;
    data: WeatherAlert[];
}

/**
 * Response from agricultural insights endpoint
 */
export interface AgriculturalInsightsResponse {
    success: boolean;
    data: AgriculturalInsight;
}

/**
 * Response from weather health check
 */
export interface WeatherHealthResponse {
    status: string;
    service: string;
    timestamp: string;
}
