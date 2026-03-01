<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-weather-partly-cloudy</v-icon>
            Weather Dashboard
            <v-spacer />
            <v-text-field
              v-model="location"
              label="Location"
              prepend-inner-icon="mdi-map-marker"
              density="compact"
              hide-details
              class="mr-2"
              style="max-width: 300px"
              @keyup.enter="loadWeatherData"
            />
            <v-btn
              v-if="isGeolocationSupported"
              color="secondary"
              :loading="gettingLocation"
              class="mr-2"
              @click="useCurrentLocation"
            >
              <v-icon left>mdi-crosshairs-gps</v-icon>
              Use My Location
            </v-btn>
            <v-btn
              color="primary"
              :loading="loading"
              @click="loadWeatherData"
            >
              <v-icon left>mdi-refresh</v-icon>
              Refresh
            </v-btn>
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <!-- Error Alert -->
    <v-row v-if="error">
      <v-col cols="12">
        <v-alert
          type="error"
          dismissible
          @click:close="error = null"
        >
          {{ error }}
        </v-alert>
      </v-col>
    </v-row>

    <!-- Weather Alerts -->
    <v-row v-if="alerts.length > 0">
      <v-col cols="12">
        <WeatherAlerts :alerts="alerts" />
      </v-col>
    </v-row>

    <!-- Current Weather and Agricultural Insights -->
    <v-row>
      <v-col cols="12" md="6">
        <CurrentWeather
          :weather="currentWeather"
          :loading="loading"
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-card v-if="agriculturalInsights" height="100%">
          <v-card-title>
            <v-icon class="mr-2">mdi-sprout</v-icon>
            Agricultural Insights
          </v-card-title>
          <v-card-text>
            <v-alert
              type="info"
              variant="tonal"
              class="mb-4"
            >
              {{ agriculturalInsights.recommendation }}
            </v-alert>

            <div class="mb-4">
              <h4 class="text-subtitle-1 mb-2">
                <v-icon size="small" class="mr-1">mdi-check-circle</v-icon>
                Suitable Activities
              </h4>
              <v-chip
                v-for="activity in agriculturalInsights.suitable_activities"
                :key="activity"
                class="mr-2 mb-2"
                color="success"
                size="small"
              >
                {{ activity }}
              </v-chip>
            </div>

            <div class="mb-4">
              <h4 class="text-subtitle-1 mb-2">
                <v-icon size="small" class="mr-1">mdi-alert-circle</v-icon>
                Activities to Avoid
              </h4>
              <v-chip
                v-for="activity in agriculturalInsights.activities_to_avoid"
                :key="activity"
                class="mr-2 mb-2"
                color="error"
                size="small"
              >
                {{ activity }}
              </v-chip>
            </div>

            <v-divider class="my-3" />

            <div class="mb-2">
              <v-icon size="small" class="mr-2">mdi-water</v-icon>
              <strong>Irrigation:</strong> {{ agriculturalInsights.irrigation_advice }}
            </div>

            <div>
              <v-icon size="small" class="mr-2">mdi-bug</v-icon>
              <strong>Pest Risk:</strong>
              <v-chip
                :color="getPestRiskColor(agriculturalInsights.pest_risk_level)"
                size="small"
                class="ml-2"
              >
                {{ agriculturalInsights.pest_risk_level }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- 7-Day Forecast -->
    <v-row>
      <v-col cols="12">
        <WeatherForecast
          :forecast="forecast"
          :loading="loading"
        />
      </v-col>
    </v-row>

    <!-- Temperature Trend Chart -->
    <v-row>
      <v-col cols="12">
        <WeatherChart
          :forecast="forecast"
          :loading="loading"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useGeolocation } from '@/composables/useGeolocation';
import weatherService from '@/services/weather.service';
import CurrentWeather from './CurrentWeather.vue';
import WeatherForecast from './WeatherForecast.vue';
import WeatherAlerts from './WeatherAlerts.vue';
import WeatherChart from './WeatherChart.vue';
import type {
  WeatherCurrent,
  WeatherForecast as WeatherForecastType,
  WeatherAlert,
  AgriculturalInsight,
} from '@/types/weather.types';

const authStore = useAuthStore();
const { getCurrentPosition, formatCoordinates, isSupported: isGeolocationSupported } = useGeolocation();

const location = ref('');
const currentWeather = ref<WeatherCurrent | null>(null);
const forecast = ref<WeatherForecastType[]>([]);
const alerts = ref<WeatherAlert[]>([]);
const agriculturalInsights = ref<AgriculturalInsight | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const gettingLocation = ref(false);

const loadWeatherData = async () => {
  if (!location.value.trim()) {
    error.value = 'Please enter a location';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    console.log('Loading weather data for location:', location.value);
    
    // Load all weather data in parallel
    const [currentData, forecastData, alertsData, insightsData] = await Promise.all([
      weatherService.getCurrentWeather(location.value),
      weatherService.getForecast(location.value, 7),
      weatherService.getAlerts(location.value),
      weatherService.getAgriculturalInsights(location.value),
    ]);

    console.log('Weather data loaded:', {
      current: currentData,
      forecast: forecastData,
      alerts: alertsData,
      insights: insightsData,
    });

    currentWeather.value = currentData;
    forecast.value = forecastData;
    alerts.value = alertsData;
    agriculturalInsights.value = insightsData;
  } catch (err: any) {
    console.error('Weather data error:', err);
    
    // Provide more specific error messages
    if (err.code === 'NETWORK_ERROR') {
      error.value = 'Network error. Please check your connection and ensure the backend server is running.';
    } else if (err.code === 'HTTP_404') {
      error.value = 'Weather service not found. Please check the API endpoint.';
    } else if (err.code === 'HTTP_401') {
      error.value = 'Authentication required. Please log in.';
    } else {
      error.value = err.message || 'Failed to load weather data. Please try again.';
    }
  } finally {
    loading.value = false;
  }
};

const useCurrentLocation = async () => {
  gettingLocation.value = true;
  error.value = null;

  try {
    const coords = await getCurrentPosition();
    location.value = formatCoordinates(coords);
    await loadWeatherData();
  } catch (err: any) {
    error.value = err.message || 'Failed to get your location. Please enter it manually.';
  } finally {
    gettingLocation.value = false;
  }
};

const getPestRiskColor = (riskLevel: string): string => {
  const level = riskLevel.toLowerCase();
  if (level.includes('high') || level.includes('severe')) return 'error';
  if (level.includes('medium') || level.includes('moderate')) return 'warning';
  return 'success';
};

const initializeLocation = () => {
  // Priority order:
  // 1. User profile location (if available)
  // 2. Default location (New Delhi)
  
  if (authStore.user?.location_lat && authStore.user?.location_lng) {
    // Use saved coordinates
    location.value = `${authStore.user.location_lat},${authStore.user.location_lng}`;
    loadWeatherData();
  } else if (authStore.user?.location_address) {
    // Use saved address
    location.value = authStore.user.location_address;
    loadWeatherData();
  } else {
    // Set default location
    location.value = 'New Delhi';
    loadWeatherData();
  }
};

onMounted(() => {
  initializeLocation();
});
</script>

<style scoped>
.v-card {
  height: 100%;
}
</style>
