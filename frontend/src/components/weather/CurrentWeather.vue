<template>
  <v-card height="100%">
    <v-card-title>
      <v-icon class="mr-2">mdi-thermometer</v-icon>
      Current Weather
    </v-card-title>

    <v-card-text v-if="loading">
      <div class="d-flex justify-center align-center" style="min-height: 200px">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        />
      </div>
    </v-card-text>

    <v-card-text v-else-if="weather">
      <div class="text-center mb-4">
        <v-icon :icon="getWeatherIcon(weather.icon)" size="80" color="primary" />
        <div class="text-h2 font-weight-bold mt-2">
          {{ formatTemperature(weather.temperature) }}
        </div>
        <div class="text-h6 text-medium-emphasis">
          {{ weather.description }}
        </div>
        <div class="text-caption text-medium-emphasis mt-1">
          <v-icon size="small">mdi-map-marker</v-icon>
          {{ weather.location }}
        </div>
      </div>

      <v-divider class="my-4" />

      <v-row dense>
        <v-col cols="6">
          <div class="d-flex align-center mb-3">
            <v-icon class="mr-2" color="primary">mdi-thermometer-lines</v-icon>
            <div>
              <div class="text-caption text-medium-emphasis">Feels Like</div>
              <div class="text-body-1 font-weight-medium">
                {{ formatTemperature(weather.feels_like) }}
              </div>
            </div>
          </div>
        </v-col>

        <v-col cols="6">
          <div class="d-flex align-center mb-3">
            <v-icon class="mr-2" color="primary">mdi-water-percent</v-icon>
            <div>
              <div class="text-caption text-medium-emphasis">Humidity</div>
              <div class="text-body-1 font-weight-medium">
                {{ weather.humidity }}%
              </div>
            </div>
          </div>
        </v-col>

        <v-col cols="6">
          <div class="d-flex align-center mb-3">
            <v-icon class="mr-2" color="primary">mdi-weather-windy</v-icon>
            <div>
              <div class="text-caption text-medium-emphasis">Wind Speed</div>
              <div class="text-body-1 font-weight-medium">
                {{ weather.wind_speed }} km/h
              </div>
            </div>
          </div>
        </v-col>

        <v-col cols="6">
          <div class="d-flex align-center mb-3">
            <v-icon class="mr-2" color="primary">mdi-compass</v-icon>
            <div>
              <div class="text-caption text-medium-emphasis">Wind Direction</div>
              <div class="text-body-1 font-weight-medium">
                {{ weather.wind_direction }}
              </div>
            </div>
          </div>
        </v-col>
      </v-row>

      <v-divider class="my-4" />

      <div class="text-caption text-medium-emphasis text-center">
        Last updated: {{ formatTimestamp(weather.timestamp) }}
      </div>

      <!-- Farming Suitability Indicator -->
      <v-alert
        v-if="isSuitableForFarming(weather)"
        type="success"
        variant="tonal"
        class="mt-3"
        density="compact"
      >
        <v-icon size="small" class="mr-1">mdi-check-circle</v-icon>
        Good conditions for farming activities
      </v-alert>
      <v-alert
        v-else
        type="warning"
        variant="tonal"
        class="mt-3"
        density="compact"
      >
        <v-icon size="small" class="mr-1">mdi-alert</v-icon>
        Conditions may not be ideal for farming
      </v-alert>
    </v-card-text>

    <v-card-text v-else>
      <v-alert type="info" variant="tonal">
        No weather data available. Please select a location.
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import weatherService from '@/services/weather.service';
import type { WeatherCurrent } from '@/types/weather.types';

interface Props {
  weather: WeatherCurrent | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const formatTemperature = (temp: number): string => {
  return weatherService.formatTemperature(temp, 'C');
};

const getWeatherIcon = (icon: string): string => {
  return weatherService.getWeatherIcon(icon);
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
};

const isSuitableForFarming = (weather: WeatherCurrent): boolean => {
  return weatherService.isSuitableForFarming(weather);
};
</script>

<style scoped>
.v-card {
  height: 100%;
}
</style>
