import BaseService from './BaseService';
import { ENDPOINTS } from '../endpoints';

/**
 * LLM Service - Manages LLM service monitoring and metrics
 */
class LLMService extends BaseService {
    /**
     * Get LLM metrics including request counts, token usage, and response times
     * @returns {Promise<Object>} LLM metrics data
     */
    async getLLMMetrics() {
        try {
            const response = await this.get(ENDPOINTS.LLM.METRICS);
            return response;
        } catch (error) {
            console.error('Error fetching LLM metrics:', error);
            throw error;
        }
    }

    /**
     * Get provider usage statistics
     * @returns {Promise<Object>} Provider usage data
     */
    async getProviderUsage() {
        try {
            const response = await this.get(ENDPOINTS.LLM.PROVIDERS);
            return response;
        } catch (error) {
            console.error('Error fetching provider usage:', error);
            throw error;
        }
    }

    /**
     * Get LLM health status including circuit breaker states
     * @returns {Promise<Object>} LLM health data
     */
    async getLLMHealth() {
        try {
            const response = await this.get(ENDPOINTS.LLM.HEALTH);
            return response;
        } catch (error) {
            console.error('Error fetching LLM health:', error);
            throw error;
        }
    }

    /**
     * Get available LLM providers
     * @returns {Promise<Array>} List of available providers
     */
    async getProviders() {
        try {
            const response = await this.get(ENDPOINTS.LLM.PROVIDERS);
            return response;
        } catch (error) {
            console.error('Error fetching providers:', error);
            throw error;
        }
    }

    /**
     * Reset LLM metrics
     * @returns {Promise<Object>} Reset confirmation
     */
    async resetMetrics() {
        try {
            const response = await this.post(ENDPOINTS.LLM.RESET_METRICS);
            return response;
        } catch (error) {
            console.error('Error resetting LLM metrics:', error);
            throw error;
        }
    }

    /**
     * Get circuit breaker status for LLM providers
     * @returns {Promise<Object>} Circuit breaker status
     */
    async getCircuitBreakerStatus() {
        try {
            // Circuit breaker status is included in metrics
            const response = await this.get(ENDPOINTS.LLM.METRICS);
            const circuitBreakers = response.circuit_breaker_state || {};

            // Transform circuit breaker data into array format
            const breakers = Object.entries(circuitBreakers).map(([provider, data]) => ({
                provider,
                state: data.state,
                failure_count: data.failure_count,
                success_count: data.success_count,
                last_failure_time: data.last_failure_time,
            }));

            return { breakers };
        } catch (error) {
            console.error('Error fetching circuit breaker status:', error);
            throw error;
        }
    }

    /**
     * Reset circuit breaker for a specific provider
     * @param {string} provider - Provider name
     * @returns {Promise<Object>} Reset confirmation
     */
    async resetCircuitBreaker(provider) {
        try {
            const response = await this.post(`/api/v1/llm/circuit-breakers/${provider}/reset`);
            return response;
        } catch (error) {
            console.error('Error resetting circuit breaker:', error);
            throw error;
        }
    }
}

export default new LLMService();
