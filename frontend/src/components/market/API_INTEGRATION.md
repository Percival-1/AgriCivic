# Market Components - API Integration

## Overview

The market components are now **fully connected** to the backend FastAPI endpoints. This document explains the integration details.

## Backend API Endpoints

The backend provides the following market endpoints (defined in `app/api/market.py`):

### 1. Get Current Prices
- **Endpoint**: `GET /market/prices/{crop_name}`
- **Query Parameters**:
  - `latitude` (required): User's latitude
  - `longitude` (required): User's longitude
  - `radius_km` (optional, default: 100): Search radius in kilometers
- **Returns**: Array of crop prices with location, mandi name, and price details

### 2. Compare Prices
- **Endpoint**: `GET /market/compare/{crop_name}`
- **Query Parameters**:
  - `latitude` (required): User's latitude
  - `longitude` (required): User's longitude
  - `radius_km` (optional, default: 100): Search radius in kilometers
- **Returns**: Price comparison with highest, lowest, average prices and recommendation

### 3. Analyze Price Trend
- **Endpoint**: `GET /market/trend/{crop_name}`
- **Query Parameters**:
  - `latitude` (required): User's latitude
  - `longitude` (required): User's longitude
  - `days` (optional, default: 30): Number of days to analyze
- **Returns**: Price trend analysis with historical data and forecast

### 4. Get Market Intelligence
- **Endpoint**: `GET /market/intelligence/{crop_name}`
- **Query Parameters**:
  - `latitude` (required): User's latitude
  - `longitude` (required): User's longitude
  - `radius_km` (optional, default: 100): Search radius in kilometers
- **Returns**: Comprehensive market intelligence including:
  - Nearest mandis
  - Price comparison
  - Price trends
  - Selling recommendation
  - Optimal mandi
  - Transport considerations
  - Demand signals

### 5. Health Check
- **Endpoint**: `GET /market/health`
- **Returns**: Service health status

## Frontend Service Integration

The `MarketService` class (`frontend/src/services/market.service.ts`) has been updated to properly integrate with these backend endpoints:

### Method Mappings

| Frontend Method | Backend Endpoint | Purpose |
|----------------|------------------|---------|
| `getCurrentPrices()` | `GET /market/prices/{crop_name}` | Fetch current prices for a commodity |
| `comparePrices()` | `GET /market/compare/{crop_name}` | Compare prices across mandis |
| `getNearestMandis()` | `GET /market/intelligence/{crop_name}` | Get nearby mandis (from intelligence endpoint) |
| `getPriceTrends()` | `GET /market/trend/{crop_name}` | Get historical price trends |
| `getSellingRecommendation()` | `GET /market/intelligence/{crop_name}` | Get AI-powered selling recommendation |
| `healthCheck()` | `GET /market/health` | Check service health |

### Data Transformation

The service includes transformation logic to convert backend response formats to frontend data models:

1. **Price Transformation**: Backend `CropPriceResponse` → Frontend `MarketPrice`
   - Maps `price_per_quintal` to `price_modal`
   - Estimates `price_min` and `price_max` (±5% of modal price)
   - Extracts location details from nested structure

2. **Mandi Transformation**: Backend mandi data → Frontend `Mandi`
   - Generates unique IDs
   - Flattens location structure
   - Maps `crops` array to `commodities`

3. **Trend Transformation**: Backend `PriceTrendResponse` → Frontend `PriceTrend[]`
   - Extracts historical price points
   - Converts date strings to proper format

4. **Recommendation Transformation**: Backend `MarketIntelligenceResponse` → Frontend `SellingRecommendation`
   - Identifies optimal mandi
   - Calculates transport costs (estimated at ₹10/km)
   - Computes net profit estimate
   - Determines best time to sell based on trend

## Component Usage

### MarketDashboard

The dashboard component uses latitude/longitude coordinates instead of location strings:

```typescript
// Default coordinates (Delhi)
const latitude = ref<number>(28.6139);
const longitude = ref<number>(77.2090);

// Load market data
const prices = await marketService.getCurrentPrices(
  commodity.value,
  latitude.value,
  longitude.value,
  100 // radius in km
);
```

**Note**: In production, you should implement geocoding to convert user-entered location strings to coordinates using a service like Google Maps Geocoding API or OpenStreetMap Nominatim.

### Location Handling

Currently, the components use default coordinates (Delhi). To implement proper location handling:

1. **Option 1: Browser Geolocation API**
   ```typescript
   navigator.geolocation.getCurrentPosition((position) => {
     latitude.value = position.coords.latitude;
     longitude.value = position.coords.longitude;
   });
   ```

2. **Option 2: Geocoding Service**
   - Add a geocoding service to convert location names to coordinates
   - Use Google Maps Geocoding API or OpenStreetMap Nominatim
   - Update coordinates when user enters location

3. **Option 3: User Profile**
   - Store user's location coordinates in their profile
   - Load from auth store on component mount

## API Configuration

The API base URL is configured via environment variable:

```env
VITE_API_BASE_URL=http://localhost:8000
```

This is set in the Axios instance (`frontend/src/services/api.ts`) and used by all service methods.

## Error Handling

The service includes comprehensive error handling:

1. **Network Errors**: Caught by Axios interceptors
2. **API Errors**: Transformed to user-friendly messages
3. **Validation Errors**: Displayed in components
4. **Fallback Values**: Used when optional data is missing

## Testing

To test the API integration:

1. **Start Backend**:
   ```bash
   cd app
   uvicorn main:app --reload
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Endpoints**:
   - Navigate to Market Dashboard
   - Enter a commodity (e.g., "wheat", "rice")
   - Click "Search" to load data
   - Verify prices, trends, and mandis are displayed
   - Click "Get Selling Recommendation" to test intelligence endpoint

## Known Limitations

1. **MSP Data**: The backend doesn't provide MSP (Minimum Support Price) data, so it's set to `null` in the frontend
2. **Location Input**: Currently uses default coordinates; needs geocoding implementation
3. **Price Range**: Min/max prices are estimated (±5%) since backend only provides modal price
4. **Mandi Details**: Some mandi fields (contact_info) may be missing from backend response

## Future Enhancements

1. Implement geocoding service for location input
2. Add caching for frequently accessed market data
3. Implement real-time price updates via WebSocket
4. Add offline support with service workers
5. Integrate MSP data from government sources
6. Add price alerts and notifications
