<template>
  <v-card>
    <v-card-title>
      <v-icon class="mr-2">mdi-calendar-week</v-icon>
      7-Day Forecast
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

    <v-card-text v-else-if="forecast.length > 0">
      <v-row dense>
        <v-col
          v-for="day in forecast"
          :key="day.date"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card variant="outlined" class="forecast-card">
            <v-card-text>
              <div class="text-center">
                <div class="text-subtitle-2 font-weight-bold mb-2">
                  {{ formatDate(day.date) }}
                </div>

                <v-icon
                  :icon="getWeatherIcon(day.icon)"
                  size="48"
                  color="primary"
                  class="mb-2"
                />

                <div class="text-caption text-medium-emphasis mb-2">
                  {{ day.description }}
                </div>

                <div class="d-flex justify-center align-center mb-3">
                  <div class="text-h6 font-weight-bold">
                    {{ formatTemperature(day.temperature_max) }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis mx-1">/</div>
                  <div class="text-body-2 text-medium-emphasis">
                    {{ formatTemperature(day.temperature_min) }}
                  </div>
                </div>

                <v-divider class="my-2" />

                <!-- Additional Details -->
                <div class="text-left">
                  <div class="d-flex align-center justify-space-between mb-1">
                    <span class="text-caption">
                      <v-icon size="small" class="mr-1">mdi-water-percent</v-icon>
                      Humidity
                    </span>
                    <span class="text-caption font-weight-medium">
                      {{ day.humidity }}%
                    </span>
                  </div>

                  <div class="d-flex align-center justify-space-between mb-1">
                    <span class="text-caption">
                      <v-icon size="small" class="mr-1">mdi-weather-rainy</v-icon>
                      Rain Chance
                    </span>
                    <span class="text-caption font-weight-medium">
                      {{ day.rainfall_probability }}%
                    </span>
                  </div>

                  <div v-if="day.rainfall_amount > 0" class="d-flex align-center justify-space-between mb-1">
                    <span class="text-caption">
                      <v-icon size="small" class="mr-1">mdi-water</v-icon>
                      Rainfall
                    </span>
                    <span class="text-caption font-weight-medium">
                      {{ day.rainfall_amount }} mm
                    </span>
                  </div>

                  <div class="d-flex align-center justify-space-between">
                    <span class="text-caption">
                      <v-icon size="small" class="mr-1">mdi-weather-windy</v-icon>
                      Wind
                    </span>
                    <span class="text-caption font-weight-medium">
                      {{ day.wind_speed }} km/h
                    </span>
                  </div>
                </div>

                <!-- Rain Probability Indicator -->
                <v-progress-linear
                  v-if="day.rainfall_probability > 0"
                  :model-value="day.rainfall_probability"
                  :color="getRainColor(day.rainfall_probability)"
                  height="4"
                  class="mt-2"
                />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>

    <v-card-text v-else>
      <v-alert type="info" variant="tonal">
        No forecast data available. Please select a location.
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import weatherService from '@/services/weather.service';
import type { WeatherForecast } from '@/types/weather.types';

interface Props {
  forecast: WeatherForecast[];
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

const formatDate = (dateString: string): string => {
  return weatherService.formatDate(dateString);
};

const getRainColor = (probability: number): string => {
  if (probability >= 70) return 'error';
  if (probability >= 40) return 'warning';
  return 'info';
};
</script>

<style scoped>
.forecast-card {
  height: 100%;
  transition: transform 0.2s, box-shadow 0.2s;
}

.forecast-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
