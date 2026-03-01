<template>
  <div class="price-comparison">
    <v-data-table
      :headers="headers"
      :items="prices"
      :items-per-page="10"
      class="elevation-0"
      density="comfortable"
    >
      <!-- Commodity Column -->
      <template #item.commodity="{ item }">
        <div>
          <div class="font-weight-medium">{{ item.commodity }}</div>
          <div class="text-caption text-grey">{{ item.variety }}</div>
        </div>
      </template>

      <!-- Mandi Column -->
      <template #item.mandi="{ item }">
        <div>
          <div class="font-weight-medium">{{ item.mandi_name }}</div>
          <div class="text-caption text-grey">{{ item.mandi_location }}</div>
        </div>
      </template>

      <!-- Price Range Column -->
      <template #item.price_range="{ item }">
        <div class="text-body-2">
          {{ formatPrice(item.price_min) }} - {{ formatPrice(item.price_max) }}
        </div>
      </template>

      <!-- Modal Price Column -->
      <template #item.price_modal="{ item }">
        <v-chip
          :color="getPriceColor(item)"
          variant="flat"
          size="small"
        >
          {{ formatPrice(item.price_modal) }}
        </v-chip>
      </template>

      <!-- MSP Column -->
      <template #item.msp="{ item }">
        <div v-if="item.msp !== null">
          <div class="text-body-2">{{ formatPrice(item.msp) }}</div>
          <v-chip
            :color="getMSPStatusColor(item)"
            size="x-small"
            variant="flat"
            class="mt-1"
          >
            {{ getMSPStatus(item) }}
          </v-chip>
        </div>
        <div v-else class="text-grey">N/A</div>
      </template>

      <!-- Date Column -->
      <template #item.date="{ item }">
        <div class="text-body-2">{{ formatDate(item.date) }}</div>
      </template>

      <!-- Unit Column -->
      <template #item.unit="{ item }">
        <div class="text-body-2">{{ item.unit }}</div>
      </template>

      <!-- Actions Column -->
      <template #item.actions="{ item }">
        <v-btn
          icon="mdi-chart-line"
          size="small"
          variant="text"
          @click="viewTrends(item)"
        />
        <v-btn
          icon="mdi-map-marker"
          size="small"
          variant="text"
          @click="viewLocation(item)"
        />
      </template>
    </v-data-table>

    <!-- Summary Stats -->
    <v-card v-if="prices.length > 0" class="mt-4" variant="outlined">
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="3">
            <div class="text-caption text-grey">Average Price</div>
            <div class="text-h6">{{ formatPrice(averagePrice) }}</div>
          </v-col>
          <v-col cols="12" sm="3">
            <div class="text-caption text-grey">Highest Price</div>
            <div class="text-h6 text-success">{{ formatPrice(highestPrice) }}</div>
          </v-col>
          <v-col cols="12" sm="3">
            <div class="text-caption text-grey">Lowest Price</div>
            <div class="text-h6 text-error">{{ formatPrice(lowestPrice) }}</div>
          </v-col>
          <v-col cols="12" sm="3">
            <div class="text-caption text-grey">Price Variation</div>
            <div class="text-h6">{{ priceVariation.toFixed(1) }}%</div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import marketService from '@/services/market.service';
import type { MarketPrice } from '@/types/market.types';

// Props
interface Props {
  prices: MarketPrice[];
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  viewTrends: [price: MarketPrice];
  viewLocation: [price: MarketPrice];
}>();

// Table headers
const headers = [
  { title: 'Commodity', key: 'commodity', sortable: true },
  { title: 'Mandi', key: 'mandi', sortable: true },
  { title: 'Price Range', key: 'price_range', sortable: false },
  { title: 'Modal Price', key: 'price_modal', sortable: true },
  { title: 'MSP', key: 'msp', sortable: true },
  { title: 'Date', key: 'date', sortable: true },
  { title: 'Unit', key: 'unit', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const },
];

// Computed
const averagePrice = computed(() => {
  return marketService.calculateAveragePrice(props.prices);
});

const highestPrice = computed(() => {
  if (props.prices.length === 0) return 0;
  return Math.max(...props.prices.map(p => p.price_modal));
});

const lowestPrice = computed(() => {
  if (props.prices.length === 0) return 0;
  return Math.min(...props.prices.map(p => p.price_modal));
});

const priceVariation = computed(() => {
  if (props.prices.length === 0 || lowestPrice.value === 0) return 0;
  return ((highestPrice.value - lowestPrice.value) / lowestPrice.value) * 100;
});

// Methods
const formatPrice = (price: number): string => {
  return marketService.formatPrice(price);
};

const formatDate = (dateString: string): string => {
  return marketService.formatDate(dateString);
};

const getPriceColor = (price: MarketPrice): string => {
  const avg = averagePrice.value;
  if (price.price_modal > avg * 1.1) return 'success';
  if (price.price_modal < avg * 0.9) return 'error';
  return 'primary';
};

const getMSPStatus = (price: MarketPrice): string => {
  if (price.msp === null) return 'N/A';
  const diff = marketService.getMSPDifference(price);
  if (diff === null) return 'N/A';
  if (diff > 0) return `+${formatPrice(diff)}`;
  return formatPrice(diff);
};

const getMSPStatusColor = (price: MarketPrice): string => {
  return marketService.isAboveMSP(price) ? 'success' : 'error';
};

const viewTrends = (price: MarketPrice) => {
  emit('viewTrends', price);
};

const viewLocation = (price: MarketPrice) => {
  emit('viewLocation', price);
};
</script>

<style scoped>
.price-comparison {
  width: 100%;
}

.text-success {
  color: rgb(var(--v-theme-success));
}

.text-error {
  color: rgb(var(--v-theme-error));
}
</style>
