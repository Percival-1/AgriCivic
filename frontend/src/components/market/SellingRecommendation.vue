<template>
  <v-card class="selling-recommendation">
    <v-card-title class="d-flex align-center bg-primary">
      <v-icon class="mr-2">mdi-lightbulb</v-icon>
      Selling Recommendation
    </v-card-title>

    <v-card-text class="pt-4">
      <v-row>
        <!-- Recommended Mandi -->
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title class="text-h6">
              <v-icon class="mr-2" color="success">mdi-check-circle</v-icon>
              Recommended Mandi
            </v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title class="font-weight-bold text-h6">
                    {{ recommendation.recommended_mandi.name }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ recommendation.recommended_mandi.location }}
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Distance</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ formatDistance(recommendation.recommended_mandi.distance_km) }}
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="recommendation.recommended_mandi.contact_info">
                  <v-list-item-title>Contact</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ recommendation.recommended_mandi.contact_info }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>

              <v-btn
                color="primary"
                block
                class="mt-2"
                @click="viewOnMap"
              >
                <v-icon start>mdi-map-marker</v-icon>
                View on Map
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Financial Details -->
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title class="text-h6">
              <v-icon class="mr-2" color="success">mdi-currency-inr</v-icon>
              Financial Estimate
            </v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>Expected Price</v-list-item-title>
                  <v-list-item-subtitle class="text-h6 text-success">
                    {{ formatPrice(recommendation.expected_price) }}
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Transport Cost</v-list-item-title>
                  <v-list-item-subtitle class="text-body-1">
                    {{ formatPrice(recommendation.transport_cost_estimate) }}
                  </v-list-item-subtitle>
                </v-list-item>
                <v-divider class="my-2" />
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Net Profit Estimate</v-list-item-title>
                  <v-list-item-subtitle class="text-h5 text-success font-weight-bold">
                    {{ formatPrice(recommendation.net_profit_estimate) }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>

              <!-- Profit Indicator -->
              <v-progress-linear
                :model-value="profitPercentage"
                :color="profitColor"
                height="8"
                rounded
                class="mt-2"
              />
              <div class="text-caption text-center mt-1">
                {{ profitPercentage.toFixed(1) }}% profit margin
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Best Time to Sell -->
      <v-row>
        <v-col cols="12" md="6">
          <v-alert
            type="info"
            variant="tonal"
            density="compact"
          >
            <template #prepend>
              <v-icon>mdi-clock-outline</v-icon>
            </template>
            <div class="text-body-2">
              <strong>Best Time to Sell:</strong> {{ recommendation.best_time_to_sell }}
            </div>
          </v-alert>
        </v-col>

        <v-col cols="12" md="6">
          <v-alert
            type="success"
            variant="tonal"
            density="compact"
          >
            <template #prepend>
              <v-icon>mdi-chart-line</v-icon>
            </template>
            <div class="text-body-2">
              <strong>Market Conditions:</strong> {{ recommendation.market_conditions }}
            </div>
          </v-alert>
        </v-col>
      </v-row>

      <!-- Commodities Available -->
      <v-row v-if="recommendation.recommended_mandi.commodities.length > 0">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-title class="text-subtitle-1">
              Available Commodities at this Mandi
            </v-card-title>
            <v-card-text>
              <v-chip
                v-for="commodity in recommendation.recommended_mandi.commodities"
                :key="commodity"
                size="small"
                class="mr-2 mb-2"
              >
                {{ commodity }}
              </v-chip>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Action Buttons -->
      <v-row>
        <v-col cols="12" class="d-flex justify-center gap-2">
          <v-btn
            color="primary"
            size="large"
            @click="getDirections"
          >
            <v-icon start>mdi-directions</v-icon>
            Get Directions
          </v-btn>
          <v-btn
            color="secondary"
            size="large"
            variant="outlined"
            @click="saveRecommendation"
          >
            <v-icon start>mdi-bookmark</v-icon>
            Save
          </v-btn>
          <v-btn
            color="info"
            size="large"
            variant="outlined"
            @click="shareRecommendation"
          >
            <v-icon start>mdi-share-variant</v-icon>
            Share
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import marketService from '@/services/market.service';
import type { SellingRecommendation } from '@/types/market.types';

// Props
interface Props {
  recommendation: SellingRecommendation;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  viewOnMap: [mandi: SellingRecommendation['recommended_mandi']];
  save: [recommendation: SellingRecommendation];
  share: [recommendation: SellingRecommendation];
}>();

// Computed
const profitPercentage = computed(() => {
  const revenue = props.recommendation.expected_price;
  if (revenue === 0) return 0;
  return (props.recommendation.net_profit_estimate / revenue) * 100;
});

const profitColor = computed(() => {
  const percentage = profitPercentage.value;
  if (percentage > 20) return 'success';
  if (percentage > 10) return 'info';
  if (percentage > 5) return 'warning';
  return 'error';
});

// Methods
const formatPrice = (price: number): string => {
  return marketService.formatPrice(price);
};

const formatDistance = (distanceKm: number): string => {
  return marketService.formatDistance(distanceKm);
};

const viewOnMap = () => {
  emit('viewOnMap', props.recommendation.recommended_mandi);
};

const getDirections = () => {
  const mandi = props.recommendation.recommended_mandi;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${mandi.latitude},${mandi.longitude}`;
  window.open(url, '_blank');
};

const saveRecommendation = () => {
  // Save to local storage
  const saved = localStorage.getItem('saved_recommendations');
  const recommendations = saved ? JSON.parse(saved) : [];
  recommendations.push({
    ...props.recommendation,
    saved_at: new Date().toISOString(),
  });
  localStorage.setItem('saved_recommendations', JSON.stringify(recommendations));
  
  emit('save', props.recommendation);
};

const shareRecommendation = () => {
  const text = `Selling Recommendation: ${props.recommendation.recommended_mandi.name} - Expected Price: ${formatPrice(props.recommendation.expected_price)} - Net Profit: ${formatPrice(props.recommendation.net_profit_estimate)}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Selling Recommendation',
      text,
    }).catch(err => console.error('Error sharing:', err));
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text);
    alert('Recommendation copied to clipboard!');
  }
  
  emit('share', props.recommendation);
};
</script>

<style scoped>
.selling-recommendation {
  width: 100%;
}

.text-success {
  color: rgb(var(--v-theme-success));
}

.gap-2 {
  gap: 8px;
}
</style>
