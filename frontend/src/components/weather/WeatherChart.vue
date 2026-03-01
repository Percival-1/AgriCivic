<template>
  <v-card>
    <v-card-title>
      <v-icon class="mr-2">mdi-chart-line</v-icon>
      Temperature Trends
      <v-spacer />
      <v-btn-toggle
        v-model="chartType"
        mandatory
        density="compact"
        variant="outlined"
      >
        <v-btn value="temperature" size="small">
          <v-icon size="small">mdi-thermometer</v-icon>
          Temperature
        </v-btn>
        <v-btn value="rainfall" size="small">
          <v-icon size="small">mdi-weather-rainy</v-icon>
          Rainfall
        </v-btn>
        <v-btn value="wind" size="small">
          <v-icon size="small">mdi-weather-windy</v-icon>
          Wind
        </v-btn>
      </v-btn-toggle>
    </v-card-title>

    <v-card-text v-if="loading">
      <div class="d-flex justify-center align-center" style="min-height: 300px">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        />
      </div>
    </v-card-text>

    <v-card-text v-else-if="forecast.length > 0">
      <div ref="chartContainer" style="height: 300px">
        <canvas ref="chartCanvas"></canvas>
      </div>

      <!-- Chart Legend -->
      <div class="d-flex justify-center mt-4 flex-wrap">
        <div v-if="chartType === 'temperature'" class="d-flex align-center mx-3">
          <div class="legend-box" style="background-color: #FF6384"></div>
          <span class="text-caption">Max Temperature</span>
        </div>
        <div v-if="chartType === 'temperature'" class="d-flex align-center mx-3">
          <div class="legend-box" style="background-color: #36A2EB"></div>
          <span class="text-caption">Min Temperature</span>
        </div>
        <div v-if="chartType === 'rainfall'" class="d-flex align-center mx-3">
          <div class="legend-box" style="background-color: #4BC0C0"></div>
          <span class="text-caption">Rainfall Amount</span>
        </div>
        <div v-if="chartType === 'rainfall'" class="d-flex align-center mx-3">
          <div class="legend-box" style="background-color: #9966FF"></div>
          <span class="text-caption">Rain Probability</span>
        </div>
        <div v-if="chartType === 'wind'" class="d-flex align-center mx-3">
          <div class="legend-box" style="background-color: #FFCE56"></div>
          <span class="text-caption">Wind Speed</span>
        </div>
      </div>
    </v-card-text>

    <v-card-text v-else>
      <v-alert type="info" variant="tonal">
        No forecast data available for chart display.
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { ChartConfiguration } from 'chart.js';
import weatherService from '@/services/weather.service';
import type { WeatherForecast } from '@/types/weather.types';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Props {
  forecast: WeatherForecast[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const chartCanvas = ref<HTMLCanvasElement | null>(null);
const chartContainer = ref<HTMLDivElement | null>(null);
const chartType = ref<'temperature' | 'rainfall' | 'wind'>('temperature');
let chartInstance: Chart | null = null;

const createChart = () => {
  if (!chartCanvas.value || props.forecast.length === 0) return;

  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy();
  }

  const labels = props.forecast.map((day) => weatherService.formatDate(day.date));

  let config: ChartConfiguration;

  if (chartType.value === 'temperature') {
    config = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Max Temperature (°C)',
            data: props.forecast.map((day) => day.temperature_max),
            borderColor: '#FF6384',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Min Temperature (°C)',
            data: props.forecast.map((day) => day.temperature_min),
            borderColor: '#36A2EB',
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Temperature (°C)',
            },
          },
        },
      },
    };
  } else if (chartType.value === 'rainfall') {
    config = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Rainfall Amount (mm)',
            data: props.forecast.map((day) => day.rainfall_amount),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: '#4BC0C0',
            borderWidth: 1,
            yAxisID: 'y',
          },
          {
            label: 'Rain Probability (%)',
            data: props.forecast.map((day) => day.rainfall_probability),
            type: 'line',
            borderColor: '#9966FF',
            backgroundColor: 'rgba(153, 102, 255, 0.1)',
            fill: false,
            tension: 0.4,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Rainfall (mm)',
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Probability (%)',
            },
            grid: {
              drawOnChartArea: false,
            },
            max: 100,
          },
        },
      },
    };
  } else {
    // Wind chart
    config = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Wind Speed (km/h)',
            data: props.forecast.map((day) => day.wind_speed),
            borderColor: '#FFCE56',
            backgroundColor: 'rgba(255, 206, 86, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Wind Speed (km/h)',
            },
          },
        },
      },
    };
  }

  chartInstance = new Chart(chartCanvas.value, config);
};

// Watch for changes in forecast data or chart type
watch([() => props.forecast, chartType], async () => {
  await nextTick();
  createChart();
});

onMounted(async () => {
  await nextTick();
  createChart();
});

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy();
  }
});
</script>

<style scoped>
.legend-box {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  margin-right: 8px;
}
</style>
