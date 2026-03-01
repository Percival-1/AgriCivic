<template>
  <div class="price-trend-chart">
    <canvas ref="chartCanvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartConfiguration,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import type { PriceTrend } from '@/types/market.types';
import marketService from '@/services/market.service';

// Register Chart.js components
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Props
interface Props {
  trends: PriceTrend[];
  commodity: string;
}

const props = defineProps<Props>();

// State
const chartCanvas = ref<HTMLCanvasElement | null>(null);
const chart = ref<Chart | null>(null);

// Computed
const trendDirection = computed(() => {
  return marketService.getPriceTrendDirection(props.trends);
});

const trendColor = computed(() => {
  return marketService.getTrendColor(trendDirection.value);
});

// Methods
const createChart = () => {
  if (!chartCanvas.value || props.trends.length === 0) return;

  // Destroy existing chart
  if (chart.value) {
    chart.value.destroy();
  }

  // Prepare data
  const labels = props.trends.map(t => t.date);
  const data = props.trends.map(t => t.price);

  // Calculate min and max for better scaling
  const minPrice = Math.min(...data);
  const maxPrice = Math.max(...data);
  const padding = (maxPrice - minPrice) * 0.1;

  // Chart configuration
  const config: ChartConfiguration = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `${props.commodity} Price`,
          data,
          borderColor: trendColor.value,
          backgroundColor: `${trendColor.value}33`, // 20% opacity
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: trendColor.value,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        title: {
          display: false,
        },
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (context) => {
              const value = context.parsed.y;
              if (value === null) return '';
              return `Price: ${marketService.formatPrice(value)}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day',
            displayFormats: {
              day: 'MMM dd',
            },
          },
          title: {
            display: true,
            text: 'Date',
          },
          grid: {
            display: false,
          },
        },
        y: {
          title: {
            display: true,
            text: 'Price (₹)',
          },
          min: minPrice - padding,
          max: maxPrice + padding,
          ticks: {
            callback: (value) => {
              return `₹${value}`;
            },
          },
        },
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
    },
  };

  // Create chart
  chart.value = new Chart(chartCanvas.value, config);
};

// Lifecycle
onMounted(() => {
  createChart();
});

// Watch for data changes
watch(
  () => [props.trends, props.commodity],
  () => {
    createChart();
  },
  { deep: true }
);
</script>

<style scoped>
.price-trend-chart {
  width: 100%;
  position: relative;
}
</style>
