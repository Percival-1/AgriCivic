/**
 * Market Service for market prices, mandi information, and selling recommendations
 */

import apiService from './api';
import type {
    MarketPrice,
    Mandi,
    PriceTrend,
    SellingRecommendation,
} from '@/types/market.types';

// Backend API response types
interface CropPriceResponse {
    crop_name: string;
    price_per_quintal: number;
    mandi_name: string;
    date: string;
    location: {
        latitude: number;
        longitude: number;
        address?: string;
        district?: string;
        state?: string;
    };
    quality_grade?: string;
    source?: string;
    previous_price?: number;
    price_change_percentage?: number;
}

interface PriceTrendResponse {
    crop_name: string;
    current_price: number;
    trend: string;
    historical_prices: Array<{ date: string; price: number }>;
    price_change_7d: number;
    price_change_30d: number;
    forecast_7d?: number;
    confidence: number;
}

interface MarketIntelligenceResponse {
    crop_name: string;
    user_location: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    nearest_mandis: Array<{
        name: string;
        location: {
            latitude: number;
            longitude: number;
            address?: string;
            district?: string;
            state?: string;
        };
        distance_km: number;
        crops: string[];
        contact?: string;
    }>;
    price_comparison: {
        crop_name: string;
        prices: CropPriceResponse[];
        highest_price: CropPriceResponse;
        lowest_price: CropPriceResponse;
        average_price: number;
        price_variance: number;
        recommendation: string;
    };
    price_trend: PriceTrendResponse;
    recommendation: string;
    optimal_mandi?: {
        name: string;
        location: {
            latitude: number;
            longitude: number;
            address?: string;
            district?: string;
            state?: string;
        };
        distance_km: number;
        expected_price: number;
    };
    reasoning: string;
    transport_considerations: {
        estimated_cost?: number;
        travel_time?: string;
        road_conditions?: string;
    };
    demand_signals: string[];
}

class MarketService {
    /**
     * Get current market prices for a commodity
     * @param commodity - Commodity name (e.g., "wheat", "rice")
     * @param latitude - User's latitude
     * @param longitude - User's longitude
     * @param radiusKm - Optional search radius in kilometers (default: 100)
     * @returns Array of market prices
     */
    async getCurrentPrices(
        commodity: string,
        latitude: number,
        longitude: number,
        radiusKm: number = 100
    ): Promise<MarketPrice[]> {
        const response = await apiService.get<CropPriceResponse[]>(
            `/market/prices/${encodeURIComponent(commodity)}`,
            {
                params: {
                    latitude,
                    longitude,
                    radius_km: radiusKm,
                },
            }
        );

        // Transform backend response to frontend MarketPrice format
        return this.transformPriceResponse(response);
    }

    /**
     * Transform backend price response to frontend format
     */
    private transformPriceResponse(prices: CropPriceResponse[]): MarketPrice[] {
        return prices.map(p => ({
            commodity: p.crop_name,
            variety: p.quality_grade || 'Standard',
            mandi_name: p.mandi_name,
            mandi_location: p.location.district || p.location.state || 'Unknown',
            price_min: p.price_per_quintal * 0.95, // Estimate min as 95% of price
            price_max: p.price_per_quintal * 1.05, // Estimate max as 105% of price
            price_modal: p.price_per_quintal,
            msp: null, // MSP not provided by backend
            date: p.date,
            unit: 'quintal',
        }));
    }

    /**
     * Compare prices across multiple mandis
     * @param commodity - Commodity name
     * @param latitude - User's latitude
     * @param longitude - User's longitude
     * @param radiusKm - Optional search radius in kilometers (default: 100)
     * @returns Array of market prices for comparison
     */
    async comparePrices(
        commodity: string,
        latitude: number,
        longitude: number,
        radiusKm: number = 100
    ): Promise<MarketPrice[]> {
        const response = await apiService.get<{
            prices: CropPriceResponse[];
        }>(`/market/compare/${encodeURIComponent(commodity)}`, {
            params: {
                latitude,
                longitude,
                radius_km: radiusKm,
            },
        });

        return this.transformPriceResponse(response.prices);
    }

    /**
     * Get nearest mandis to a location
     * @param latitude - User's latitude
     * @param longitude - User's longitude
     * @param commodity - Commodity to get intelligence for
     * @param radiusKm - Optional search radius in kilometers (default: 100)
     * @returns Array of nearby mandis sorted by distance
     */
    async getNearestMandis(
        latitude: number,
        longitude: number,
        commodity: string,
        radiusKm: number = 100
    ): Promise<Mandi[]> {
        // Use market intelligence endpoint to get nearest mandis
        const response = await apiService.get<MarketIntelligenceResponse>(
            `/market/intelligence/${encodeURIComponent(commodity)}`,
            {
                params: {
                    latitude,
                    longitude,
                    radius_km: radiusKm,
                },
            }
        );

        return response.nearest_mandis.map((m, index) => ({
            id: `mandi-${index}`,
            name: m.name,
            location: m.location.district || m.location.state || 'Unknown',
            latitude: m.location.latitude,
            longitude: m.location.longitude,
            distance_km: m.distance_km,
            commodities: m.crops || [],
            contact_info: m.contact,
        }));
    }

    /**
     * Get price trends for a commodity at a specific location
     * @param commodity - Commodity name
     * @param latitude - User's latitude
     * @param longitude - User's longitude
     * @param days - Optional number of days of historical data (default: 30)
     * @returns Array of price trend data points
     */
    async getPriceTrends(
        commodity: string,
        latitude: number,
        longitude: number,
        days: number = 30
    ): Promise<PriceTrend[]> {
        const response = await apiService.get<PriceTrendResponse>(
            `/market/trend/${encodeURIComponent(commodity)}`,
            {
                params: {
                    latitude,
                    longitude,
                    days,
                },
            }
        );

        return response.historical_prices.map(hp => ({
            date: hp.date,
            price: hp.price,
        }));
    }

    /**
     * Get selling recommendation for a commodity
     * @param commodity - Commodity name
     * @param latitude - User's latitude
     * @param longitude - User's longitude
     * @param quantity - Quantity to sell (in quintals)
     * @param radiusKm - Optional search radius in kilometers (default: 100)
     * @returns Selling recommendation with best mandi and expected profit
     */
    async getSellingRecommendation(
        commodity: string,
        latitude: number,
        longitude: number,
        quantity: number = 100,
        radiusKm: number = 100
    ): Promise<SellingRecommendation> {
        const response = await apiService.get<MarketIntelligenceResponse>(
            `/market/intelligence/${encodeURIComponent(commodity)}`,
            {
                params: {
                    latitude,
                    longitude,
                    radius_km: radiusKm,
                },
            }
        );

        // Transform to SellingRecommendation format
        const optimalMandi = response.optimal_mandi || response.nearest_mandis[0];
        const expectedPrice = optimalMandi?.expected_price || response.price_comparison.highest_price.price_per_quintal;
        const transportCost = response.transport_considerations.estimated_cost || optimalMandi.distance_km * 10; // Estimate ₹10/km

        return {
            recommended_mandi: {
                id: 'optimal-mandi',
                name: optimalMandi.name,
                location: optimalMandi.location.district || optimalMandi.location.state || 'Unknown',
                latitude: optimalMandi.location.latitude,
                longitude: optimalMandi.location.longitude,
                distance_km: optimalMandi.distance_km,
                commodities: [],
                contact_info: undefined,
            },
            expected_price: expectedPrice,
            best_time_to_sell: this.determineBestTime(response.price_trend.trend),
            market_conditions: response.reasoning,
            transport_cost_estimate: transportCost,
            net_profit_estimate: (expectedPrice * quantity) - transportCost,
        };
    }

    /**
     * Determine best time to sell based on trend
     */
    private determineBestTime(trend: string): string {
        if (trend === 'increasing') {
            return 'Wait 1-2 weeks for better prices';
        } else if (trend === 'decreasing') {
            return 'Sell immediately before prices drop further';
        } else {
            return 'Current time is optimal';
        }
    }

    /**
     * Check market service health
     * @returns Health status
     */
    async healthCheck(): Promise<{ status: string; service: string }> {
        return apiService.get<{ status: string; service: string }>('/market/health');
    }

    /**
     * Format price with currency
     * @param price - Price value
     * @param currency - Currency symbol (default: '₹')
     * @returns Formatted price string
     */
    formatPrice(price: number, currency: string = '₹'): string {
        return `${currency}${price.toFixed(2)}`;
    }

    /**
     * Calculate price difference percentage
     * @param currentPrice - Current price
     * @param previousPrice - Previous price
     * @returns Percentage difference (positive for increase, negative for decrease)
     */
    calculatePriceChange(currentPrice: number, previousPrice: number): number {
        if (previousPrice === 0) return 0;
        return ((currentPrice - previousPrice) / previousPrice) * 100;
    }

    /**
     * Get price trend direction
     * @param trends - Array of price trends
     * @returns 'up', 'down', or 'stable'
     */
    getPriceTrendDirection(trends: PriceTrend[]): 'up' | 'down' | 'stable' {
        if (trends.length < 2) return 'stable';

        const firstPrice = trends[0].price;
        const lastPrice = trends[trends.length - 1].price;
        const change = this.calculatePriceChange(lastPrice, firstPrice);

        if (change > 5) return 'up';
        if (change < -5) return 'down';
        return 'stable';
    }

    /**
     * Get color for price trend
     * @param direction - Trend direction
     * @returns Color code for UI display
     */
    getTrendColor(direction: 'up' | 'down' | 'stable'): string {
        const colors = {
            up: '#4CAF50', // Green
            down: '#F44336', // Red
            stable: '#FF9800', // Orange
        };
        return colors[direction];
    }

    /**
     * Calculate average price from price array
     * @param prices - Array of market prices
     * @returns Average modal price
     */
    calculateAveragePrice(prices: MarketPrice[]): number {
        if (prices.length === 0) return 0;
        const sum = prices.reduce((acc, price) => acc + price.price_modal, 0);
        return sum / prices.length;
    }

    /**
     * Find best price from array
     * @param prices - Array of market prices
     * @returns Market price with highest modal price
     */
    findBestPrice(prices: MarketPrice[]): MarketPrice | null {
        if (prices.length === 0) return null;
        return prices.reduce((best, current) =>
            current.price_modal > best.price_modal ? current : best
        );
    }

    /**
     * Format distance for display
     * @param distanceKm - Distance in kilometers
     * @returns Formatted distance string
     */
    formatDistance(distanceKm: number): string {
        if (distanceKm < 1) {
            return `${(distanceKm * 1000).toFixed(0)} m`;
        }
        return `${distanceKm.toFixed(1)} km`;
    }

    /**
     * Check if price is above MSP
     * @param price - Market price object
     * @returns Boolean indicating if price is above MSP
     */
    isAboveMSP(price: MarketPrice): boolean {
        if (price.msp === null) return false;
        return price.price_modal > price.msp;
    }

    /**
     * Calculate MSP difference
     * @param price - Market price object
     * @returns Difference from MSP (positive if above, negative if below)
     */
    getMSPDifference(price: MarketPrice): number | null {
        if (price.msp === null) return null;
        return price.price_modal - price.msp;
    }

    /**
     * Format date for display
     * @param dateString - ISO date string
     * @returns Formatted date string
     */
    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }

    /**
     * Sort mandis by distance
     * @param mandis - Array of mandis
     * @returns Sorted array (nearest first)
     */
    sortByDistance(mandis: Mandi[]): Mandi[] {
        return [...mandis].sort((a, b) => a.distance_km - b.distance_km);
    }

    /**
     * Filter mandis by commodity
     * @param mandis - Array of mandis
     * @param commodity - Commodity to filter by
     * @returns Filtered array of mandis that trade the commodity
     */
    filterByCommodity(mandis: Mandi[], commodity: string): Mandi[] {
        return mandis.filter((mandi) =>
            mandi.commodities.some(
                (c) => c.toLowerCase() === commodity.toLowerCase()
            )
        );
    }

    /**
     * Calculate estimated profit
     * @param sellingPrice - Expected selling price per unit
     * @param quantity - Quantity to sell
     * @param transportCost - Transport cost estimate
     * @returns Estimated net profit
     */
    calculateProfit(sellingPrice: number, quantity: number, transportCost: number): number {
        const revenue = sellingPrice * quantity;
        return revenue - transportCost;
    }
}

// Export singleton instance
const marketService = new MarketService();
export default marketService;
