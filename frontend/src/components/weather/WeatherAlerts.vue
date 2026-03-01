<template>
  <v-card>
    <v-card-title>
      <v-icon class="mr-2">mdi-alert</v-icon>
      Weather Alerts
      <v-chip
        v-if="alerts.length > 0"
        :color="getHighestSeverityColor()"
        size="small"
        class="ml-2"
      >
        {{ alerts.length }} Active
      </v-chip>
    </v-card-title>

    <v-card-text v-if="alerts.length === 0">
      <v-alert type="success" variant="tonal">
        <v-icon size="small" class="mr-1">mdi-check-circle</v-icon>
        No active weather alerts for this location
      </v-alert>
    </v-card-text>

    <v-card-text v-else>
      <v-expansion-panels variant="accordion">
        <v-expansion-panel
          v-for="alert in sortedAlerts"
          :key="alert.id"
        >
          <v-expansion-panel-title>
            <div class="d-flex align-center w-100">
              <v-icon
                :color="getSeverityColor(alert.severity)"
                class="mr-3"
              >
                {{ getSeverityIcon(alert.severity) }}
              </v-icon>
              <div class="flex-grow-1">
                <div class="text-subtitle-1 font-weight-bold">
                  {{ alert.event }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatAlertTime(alert.start_time, alert.end_time) }}
                </div>
              </div>
              <v-chip
                :color="getSeverityColor(alert.severity)"
                size="small"
                class="ml-2"
              >
                {{ alert.severity.toUpperCase() }}
              </v-chip>
            </div>
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <v-alert
              :type="getSeverityType(alert.severity)"
              variant="tonal"
              class="mb-3"
            >
              {{ alert.description }}
            </v-alert>

            <div class="mb-3">
              <div class="text-subtitle-2 font-weight-bold mb-2">
                <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                Duration
              </div>
              <div class="text-body-2">
                <strong>Start:</strong> {{ formatDateTime(alert.start_time) }}
              </div>
              <div class="text-body-2">
                <strong>End:</strong> {{ formatDateTime(alert.end_time) }}
              </div>
            </div>

            <div v-if="alert.affected_areas.length > 0">
              <div class="text-subtitle-2 font-weight-bold mb-2">
                <v-icon size="small" class="mr-1">mdi-map-marker-multiple</v-icon>
                Affected Areas
              </div>
              <v-chip
                v-for="area in alert.affected_areas"
                :key="area"
                size="small"
                class="mr-2 mb-2"
              >
                {{ area }}
              </v-chip>
            </div>

            <v-divider class="my-3" />

            <div class="text-caption text-medium-emphasis">
              Alert ID: {{ alert.id }}
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import weatherService from '@/services/weather.service';
import type { WeatherAlert } from '@/types/weather.types';

interface Props {
  alerts: WeatherAlert[];
}

const props = defineProps<Props>();

// Sort alerts by severity (extreme > high > medium > low)
const sortedAlerts = computed(() => {
  const severityOrder = { extreme: 0, high: 1, medium: 2, low: 3 };
  return [...props.alerts].sort((a, b) => {
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
});

const getSeverityColor = (severity: WeatherAlert['severity']): string => {
  return weatherService.getAlertSeverityColor(severity);
};

const getHighestSeverityColor = (): string => {
  if (props.alerts.length === 0) return 'grey';
  const highestSeverity = sortedAlerts.value[0].severity;
  return getSeverityColor(highestSeverity);
};

const getSeverityIcon = (severity: WeatherAlert['severity']): string => {
  const icons = {
    low: 'mdi-information',
    medium: 'mdi-alert',
    high: 'mdi-alert-circle',
    extreme: 'mdi-alert-octagon',
  };
  return icons[severity];
};

const getSeverityType = (severity: WeatherAlert['severity']): string => {
  const types = {
    low: 'info',
    medium: 'warning',
    high: 'error',
    extreme: 'error',
  };
  return types[severity];
};

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
};

const formatAlertTime = (startTime: string, endTime: string): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  if (start > now) {
    return `Starts ${formatRelativeTime(start)}`;
  } else if (end > now) {
    return `Active until ${formatRelativeTime(end)}`;
  } else {
    return 'Expired';
  }
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
  const diffDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays > 0) {
    return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else {
    return 'soon';
  }
};
</script>

<style scoped>
.v-expansion-panel-title {
  padding: 16px;
}
</style>
