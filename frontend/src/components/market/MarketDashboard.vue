<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Market Intelligence</h1>
      </v-col>
    </v-row>

    <!-- Search and Filter Section -->
    <v-row>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="commodity"
          label="Commodity"
          placeholder="e.g., wheat, rice, cotton"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="comfortable"
          clearable
          @keyup.enter="loadMarketData"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="location"
          label="Location"
          placeholder="Enter your location"
          prepend-inner-icon="mdi-map-marker"
          variant="outlined"
          density="comfortable"
          clearable
        />
      </v-col>
      <v-col cols="12" md="2">
        <v-btn
          color="primary"
          size="large"
          block
          :loading="loading"
          @click="loadMarketData"
        >
          Search
        </v-btn>
      </v-col>
    </v-row>

    <!-- Error Alert -->
    <v-row v-if="error">
      <v-col cols="12">
        <ErrorAlert :model-value="true" :message="error" @retry="loadMarketData" @close="error = null" />
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading">
      <v-col cols="12">
        <LoadingSpinner :model-value="true" message="Loading market data..." />
      </v-col>
    </v-row>

    <!-- Market Data Display -->
    <template v-else-if="!error && commodity">
      <!-- Current Prices Section -->
      <v-row v-if="currentPrices.length > 0">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2">mdi-currency-inr</v-icon>
              Current Prices for {{ commodity }}
            </v-card-title>
            <v-card-text>
              <PriceComparison :prices="currentPrices" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Price Trends Chart -->
      <v-row v-if="priceTrends.length > 0">
        <v-col cols="12" md="8">
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2">mdi-chart-line</v-icon>
              Price Trends
            </v-card-title>
            <v-card-text>
              <PriceTrendChart :trends="priceTrends" :commodity="commodity" />
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Quick Stats -->
        <v-col cols="12" md="4">
          <v-card>
            <v-card-title>Market Summary</v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>Average Price</v-list-item-title>
                  <v-list-item-subtitle class="text-h6">
                    {{ formatPrice(averagePrice) }}
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Best Price</v-list-item-title>
                  <v-list-item-subtitle class="text-h6 text-success">
                    {{ bestPrice ? formatPrice(bestPrice.price_modal) : 'N/A' }}
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="bestPrice">
                  <v-list-item-title>Best Mandi</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ bestPrice.mandi_name }}
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Trend</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip
                      :color="trendColor"
                      size="small"
                      variant="flat"
                    >
                      <v-icon start>{{ trendIcon }}</v-icon>
                      {{ trendDirection }}
                    </v-chip>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Nearby Mandis Map -->
      <v-row v-if="nearbyMandis.length > 0">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2">mdi-map</v-icon>
              Nearby Mandis
            </v-card-title>
            <v-card-text>
              <MandiMap :mandis="nearbyMandis" :center-location="location" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Selling Recommendation -->
      <v-row v-if="recommendation">
        <v-col cols="12">
          <SellingRecommendation :recommendation="recommendation" />
        </v-col>
      </v-row>

      <!-- Get Recommendation Button -->
      <v-row v-if="currentPrices.length > 0 && !recommendation">
        <v-col cols="12" class="text-center">
          <v-btn
            color="primary"
            size="large"
            :loading="loadingRecommendation"
            @click="getRecommendation"
          >
            <v-icon start>mdi-lightbulb</v-icon>
            Get Selling Recommendation
          </v-btn>
        </v-col>
      </v-row>
    </template>

    <!-- Empty State -->
    <v-row v-else-if="!loading && !error">
      <v-col cols="12">
        <v-card class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1">mdi-chart-box-outline</v-icon>
          <h2 class="text-h5 mt-4 mb-2">Market Intelligence Dashboard</h2>
          <p class="text-body-1 text-grey">
            Enter a commodity and location to view current prices, trends, and nearby mandis
          </p>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import marketService from '@/services/market.service';
import type { MarketPrice, Mandi, PriceTrend, SellingRecommendation as SellingRecommendationType } from '@/types/market.types';
import PriceComparison from './PriceComparison.vue';
import PriceTrendChart from './PriceTrendChart.vue';
import MandiMap from './MandiMap.vue';
import SellingRecommendation from './SellingRecommendation.vue';
import ErrorAlert from '@/components/common/ErrorAlert.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

// State
const commodity = ref('');
const location = ref('');
const latitude = ref<number>(28.6139); // Default: Delhi
const longitude = ref<number>(77.2090);
const loading = ref(false);
const loadingRecommendation = ref(false);
const error = ref<string | null>(null);

const currentPrices = ref<MarketPrice[]>([]);
const priceTrends = ref<PriceTrend[]>([]);
const nearbyMandis = ref<Mandi[]>([]);
const recommendation = ref<SellingRecommendationType | null>(null);

// Computed
const averagePrice = computed(() => {
  return marketService.calculateAveragePrice(currentPrices.value);
});

const bestPrice = computed(() => {
  return marketService.findBestPrice(currentPrices.value);
});

const trendDirection = computed(() => {
  return marketService.getPriceTrendDirection(priceTrends.value);
});

const trendColor = computed(() => {
  const direction = trendDirection.value;
  return direction === 'up' ? 'success' : direction === 'down' ? 'error' : 'warning';
});

const trendIcon = computed(() => {
  const direction = trendDirection.value;
  return direction === 'up' ? 'mdi-trending-up' : direction === 'down' ? 'mdi-trending-down' : 'mdi-minus';
});

// Methods
const formatPrice = (price: number): string => {
  return marketService.formatPrice(price);
};

const loadMarketData = async () => {
  if (!commodity.value) {
    error.value = 'Please enter a commodity';
    return;
  }

  loading.value = true;
  error.value = null;
  recommendation.value = null;

  try {
    // If location is provided, try to geocode it (simplified - using default coords for now)
    // In production, you'd use a geocoding service
    const lat = latitude.value;
    const lng = longitude.value;

    // Load current prices
    const prices = await marketService.getCurrentPrices(
      commodity.value,
      lat,
      lng,
      100
    );
    currentPrices.value = prices;

    // Load price trends if we have prices
    if (prices.length > 0 && prices[0]) {
      const trends = await marketService.getPriceTrends(
        commodity.value,
        lat,
        lng,
        30
      );
      priceTrends.value = trends;
    }

    // Load nearby mandis
    const mandis = await marketService.getNearestMandis(
      lat,
      lng,
      commodity.value,
      100
    );
    nearbyMandis.value = mandis;
  } catch (err: any) {
    error.value = err.message || 'Failed to load market data';
    console.error('Error loading market data:', err);
  } finally {
    loading.value = false;
  }
};

const getRecommendation = async () => {
  if (!commodity.value) {
    error.value = 'Please enter a commodity';
    return;
  }

  loadingRecommendation.value = true;
  error.value = null;

  try {
    const rec = await marketService.getSellingRecommendation(
      commodity.value,
      latitude.value,
      longitude.value,
      100, // Default quantity in quintals
      100 // Radius in km
    );
    recommendation.value = rec;
  } catch (err: any) {
    error.value = err.message || 'Failed to get recommendation';
    console.error('Error getting recommendation:', err);
  } finally {
    loadingRecommendation.value = false;
  }
};
</script>

<style scoped>
.text-success {
  color: rgb(var(--v-theme-success));
}
</style>
