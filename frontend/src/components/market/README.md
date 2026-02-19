# Market Components

This directory contains all market-related components for displaying market prices, mandis, trends, and selling recommendations.

## Components

### MarketDashboard.vue
Main dashboard component that orchestrates all market features.

**Features:**
- Search for commodity prices by name and location
- Display current prices from multiple mandis
- Show price trends over time
- Display nearby mandis on a map
- Get selling recommendations

**Usage:**
```vue
<template>
  <MarketDashboard />
</template>

<script setup>
import { MarketDashboard } from '@/components/market';
</script>
```

### PriceComparison.vue
Data table component for comparing prices across multiple mandis.

**Props:**
- `prices: MarketPrice[]` - Array of market prices to display

**Features:**
- Sortable columns
- Price range display
- MSP comparison
- Color-coded pricing
- Summary statistics

**Usage:**
```vue
<template>
  <PriceComparison :prices="marketPrices" />
</template>

<script setup>
import { PriceComparison } from '@/components/market';
import { ref } from 'vue';

const marketPrices = ref([...]);
</script>
```

### MandiMap.vue
Interactive map component showing nearby mandis with markers.

**Props:**
- `mandis: Mandi[]` - Array of mandis to display
- `centerLocation?: string` - Optional center location

**Features:**
- Interactive Leaflet map
- Clickable markers with popups
- Mandi list sorted by distance
- Detailed mandi information dialog
- Get directions functionality

**Usage:**
```vue
<template>
  <MandiMap :mandis="nearbyMandis" center-location="Delhi" />
</template>

<script setup>
import { MandiMap } from '@/components/market';
import { ref } from 'vue';

const nearbyMandis = ref([...]);
</script>
```

### PriceTrendChart.vue
Line chart component for visualizing price trends over time.

**Props:**
- `trends: PriceTrend[]` - Array of price trend data points
- `commodity: string` - Commodity name for chart title

**Features:**
- Responsive Chart.js line chart
- Time-based x-axis
- Color-coded trend direction
- Interactive tooltips
- Auto-scaling y-axis

**Usage:**
```vue
<template>
  <PriceTrendChart :trends="priceTrends" commodity="Wheat" />
</template>

<script setup>
import { PriceTrendChart } from '@/components/market';
import { ref } from 'vue';

const priceTrends = ref([...]);
</script>
```

### SellingRecommendation.vue
Card component displaying AI-powered selling recommendations.

**Props:**
- `recommendation: SellingRecommendation` - Recommendation data

**Features:**
- Recommended mandi details
- Financial estimates (price, transport, profit)
- Best time to sell
- Market conditions
- Save and share functionality
- Get directions

**Usage:**
```vue
<template>
  <SellingRecommendation :recommendation="recommendation" />
</template>

<script setup>
import { SellingRecommendation } from '@/components/market';
import { ref } from 'vue';

const recommendation = ref({...});
</script>
```

## Dependencies

- **Leaflet**: For interactive maps (MandiMap)
- **Chart.js**: For price trend charts (PriceTrendChart)
- **chartjs-adapter-date-fns**: For time-based x-axis
- **Vuetify**: For UI components
- **Market Service**: For data fetching and formatting

## Data Flow

1. **MarketDashboard** orchestrates all components
2. Fetches data from **MarketService**
3. Passes data to child components via props
4. Child components emit events for user interactions
5. Dashboard handles events and updates state

## Testing

All components should be tested with:
- Unit tests for component logic
- Integration tests with MarketService
- Visual regression tests for UI
- Accessibility tests

## Notes

- All prices are formatted using MarketService.formatPrice()
- Distances are formatted using MarketService.formatDistance()
- Map requires internet connection for tile loading
- Charts are responsive and adapt to container size
- Components follow Vuetify design patterns
