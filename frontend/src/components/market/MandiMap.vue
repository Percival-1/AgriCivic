<template>
  <div class="mandi-map">
    <!-- Map Container -->
    <div ref="mapContainer" class="map-container" />

    <!-- Mandi List -->
    <v-card class="mt-4" variant="outlined">
      <v-card-title>
        <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
        Nearby Mandis ({{ mandis.length }})
      </v-card-title>
      <v-card-text>
        <v-list density="compact">
          <v-list-item
            v-for="mandi in sortedMandis"
            :key="mandi.id"
            @click="selectMandi(mandi)"
          >
            <template #prepend>
              <v-avatar color="primary" size="small">
                <v-icon size="small">mdi-store</v-icon>
              </v-avatar>
            </template>

            <v-list-item-title>{{ mandi.name }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ mandi.location }} • {{ formatDistance(mandi.distance_km) }}
            </v-list-item-subtitle>

            <template #append>
              <v-chip size="small" variant="outlined">
                {{ mandi.commodities.length }} items
              </v-chip>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Selected Mandi Details Dialog -->
    <v-dialog v-model="showDetails" max-width="500">
      <v-card v-if="selectedMandi">
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-store</v-icon>
          {{ selectedMandi.name }}
        </v-card-title>
        <v-card-text>
          <v-list density="compact">
            <v-list-item>
              <v-list-item-title>Location</v-list-item-title>
              <v-list-item-subtitle>{{ selectedMandi.location }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Distance</v-list-item-title>
              <v-list-item-subtitle>{{ formatDistance(selectedMandi.distance_km) }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Coordinates</v-list-item-title>
              <v-list-item-subtitle>
                {{ selectedMandi.latitude.toFixed(4) }}, {{ selectedMandi.longitude.toFixed(4) }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedMandi.contact_info">
              <v-list-item-title>Contact</v-list-item-title>
              <v-list-item-subtitle>{{ selectedMandi.contact_info }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Commodities ({{ selectedMandi.commodities.length }})</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip
                  v-for="commodity in selectedMandi.commodities"
                  :key="commodity"
                  size="x-small"
                  class="mr-1 mt-1"
                >
                  {{ commodity }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            variant="text"
            @click="getDirections"
          >
            <v-icon start>mdi-directions</v-icon>
            Get Directions
          </v-btn>
          <v-btn
            variant="text"
            @click="showDetails = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import marketService from '@/services/market.service';
import type { Mandi } from '@/types/market.types';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Props
interface Props {
  mandis: Mandi[];
  centerLocation?: string;
}

const props = defineProps<Props>();

// State
const mapContainer = ref<HTMLElement | null>(null);
const map = ref<L.Map | null>(null);
const markers = ref<L.Marker[]>([]);
const selectedMandi = ref<Mandi | null>(null);
const showDetails = ref(false);

// Computed
const sortedMandis = computed(() => {
  return marketService.sortByDistance(props.mandis);
});

// Methods
const formatDistance = (distanceKm: number): string => {
  return marketService.formatDistance(distanceKm);
};

const initMap = () => {
  if (!mapContainer.value) return;

  // Default center (India)
  let center: [number, number] = [20.5937, 78.9629];
  let zoom = 5;

  // If we have mandis, center on the first one
  if (props.mandis.length > 0) {
    const firstMandi = props.mandis[0];
    if (firstMandi) {
      center = [firstMandi.latitude, firstMandi.longitude];
      zoom = 10;
    }
  }

  // Create map
  map.value = L.map(mapContainer.value).setView(center, zoom);

  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map.value as L.Map);

  // Add markers
  updateMarkers();
};

const updateMarkers = () => {
  if (!map.value) return;

  // Clear existing markers
  markers.value.forEach(marker => marker.remove());
  markers.value = [];

  // Add new markers
  props.mandis.forEach((mandi) => {
    const marker = L.marker([mandi.latitude, mandi.longitude])
      .addTo(map.value as L.Map)
      .bindPopup(`
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">${mandi.name}</h3>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">${mandi.location}</p>
          <p style="margin: 4px 0; font-size: 12px;"><strong>Distance:</strong> ${formatDistance(mandi.distance_km)}</p>
          <p style="margin: 4px 0; font-size: 12px;"><strong>Commodities:</strong> ${mandi.commodities.length}</p>
        </div>
      `);

    marker.on('click', () => {
      selectedMandi.value = mandi;
      showDetails.value = true;
    });

    markers.value.push(marker);
  });

  // Fit bounds to show all markers
  if (props.mandis.length > 0) {
    const bounds = L.latLngBounds(
      props.mandis.map(m => [m.latitude, m.longitude] as [number, number])
    );
    map.value.fitBounds(bounds, { padding: [50, 50] });
  }
};

const selectMandi = (mandi: Mandi) => {
  selectedMandi.value = mandi;
  showDetails.value = true;

  // Pan to marker
  if (map.value) {
    map.value.setView([mandi.latitude, mandi.longitude], 12);
  }
};

const getDirections = () => {
  if (!selectedMandi.value) return;

  // Open Google Maps with directions
  const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedMandi.value.latitude},${selectedMandi.value.longitude}`;
  window.open(url, '_blank');
};

// Lifecycle
onMounted(() => {
  initMap();
});

// Watch for mandis changes
watch(() => props.mandis, () => {
  if (map.value) {
    updateMarkers();
  }
}, { deep: true });
</script>

<style scoped>
.mandi-map {
  width: 100%;
}

.map-container {
  width: 100%;
  height: 400px;
  border-radius: 4px;
  overflow: hidden;
}
</style>
