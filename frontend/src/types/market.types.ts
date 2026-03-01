/**
 * Market Service Type Definitions
 */

/**
 * Market Price Information
 */
export interface MarketPrice {
    commodity: string;
    variety: string;
    mandi_name: string;
    mandi_location: string;
    price_min: number;
    price_max: number;
    price_modal: number;
    msp: number | null;
    date: string;
    unit: string;
}

/**
 * Mandi (Market) Information
 */
export interface Mandi {
    id: string;
    name: string;
    location: string;
    latitude: number;
    longitude: number;
    distance_km: number;
    commodities: string[];
    contact_info?: string;
}

/**
 * Price Trend Data Point
 */
export interface PriceTrend {
    date: string;
    price: number;
}

/**
 * Selling Recommendation
 */
export interface SellingRecommendation {
    recommended_mandi: Mandi;
    expected_price: number;
    best_time_to_sell: string;
    market_conditions: string;
    transport_cost_estimate: number;
    net_profit_estimate: number;
}

/**
 * API Response Types
 */
export interface CurrentPricesResponse {
    data: MarketPrice[];
}

export interface ComparePricesResponse {
    data: MarketPrice[];
}

export interface NearestMandisResponse {
    data: Mandi[];
}

export interface PriceTrendsResponse {
    data: PriceTrend[];
}

export interface SellingRecommendationResponse {
    data: SellingRecommendation;
}

export interface MarketHealthResponse {
    status: string;
    timestamp: string;
}
