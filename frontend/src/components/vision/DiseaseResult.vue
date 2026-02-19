<template>
  <div class="disease-result-container">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="text-body-1 mt-4">Analyzing image...</p>
    </div>

    <!-- Error State -->
    <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <!-- Results Display -->
    <div v-else-if="analysis" class="results-content">
      <!-- Header with Actions -->
      <div class="results-header">
        <h2 class="text-h5 mb-2">Disease Analysis Results</h2>
        <div class="header-actions">
          <v-btn
            variant="outlined"
            color="primary"
            prepend-icon="mdi-content-save"
            @click="saveToHistory"
          >
            Save to History
          </v-btn>
          <v-btn
            variant="outlined"
            color="secondary"
            prepend-icon="mdi-share-variant"
            @click="shareResults"
          >
            Share
          </v-btn>
        </div>
      </div>

      <!-- Primary Disease Card -->
      <v-card v-if="analysis.primary_disease" class="primary-disease-card mb-4" elevation="2">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon :color="getSeverityColor(analysis.primary_disease.severity)" class="mr-2">
              mdi-alert-circle
            </v-icon>
            <span>{{ analysis.primary_disease.disease_name }}</span>
          </div>
          <v-chip
            :color="getConfidenceColor(analysis.primary_disease.confidence_level)"
            variant="flat"
            size="small"
          >
            {{ analysis.primary_disease.confidence_level.toUpperCase() }} CONFIDENCE
          </v-chip>
        </v-card-title>

        <v-card-text>
          <!-- Confidence Score Visualization -->
          <div class="confidence-section mb-4">
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2 font-weight-medium">Confidence Score</span>
              <span class="text-h6 font-weight-bold">
                {{ (analysis.primary_disease.confidence_score * 100).toFixed(1) }}%
              </span>
            </div>
            <v-progress-linear
              :model-value="analysis.primary_disease.confidence_score * 100"
              :color="getConfidenceColor(analysis.primary_disease.confidence_level)"
              height="12"
              rounded
            />
          </div>

          <!-- Disease Description -->
          <div v-if="analysis.primary_disease.description" class="description-section mb-4">
            <h4 class="text-subtitle-1 font-weight-bold mb-2">Description</h4>
            <p class="text-body-2">{{ analysis.primary_disease.description }}</p>
          </div>

          <!-- Affected Parts -->
          <div v-if="analysis.primary_disease.affected_parts?.length" class="affected-parts-section mb-4">
            <h4 class="text-subtitle-1 font-weight-bold mb-2">Affected Parts</h4>
            <div class="d-flex flex-wrap gap-2">
              <v-chip
                v-for="part in analysis.primary_disease.affected_parts"
                :key="part"
                size="small"
                variant="outlined"
              >
                {{ part }}
              </v-chip>
            </div>
          </div>

          <!-- Severity Indicator -->
          <div v-if="analysis.primary_disease.severity" class="severity-section">
            <h4 class="text-subtitle-1 font-weight-bold mb-2">Severity Level</h4>
            <v-chip
              :color="getSeverityColor(analysis.primary_disease.severity)"
              variant="flat"
              size="large"
            >
              {{ analysis.primary_disease.severity.toUpperCase() }}
            </v-chip>
          </div>
        </v-card-text>
      </v-card>

      <!-- Confidence Chart -->
      <v-card v-if="analysis.diseases.length > 1" class="confidence-chart-card mb-4" elevation="2">
        <v-card-title>Confidence Distribution</v-card-title>
        <v-card-text>
          <canvas ref="confidenceChart" />
        </v-card-text>
      </v-card>

      <!-- Treatment Recommendations -->
      <v-card v-if="analysis.treatment_recommendations?.length" class="treatment-card mb-4" elevation="2">
        <v-card-title class="d-flex align-center">
          <v-icon color="success" class="mr-2">mdi-medical-bag</v-icon>
          Treatment Recommendations
        </v-card-title>
        <v-card-text>
          <v-expansion-panels variant="accordion">
            <v-expansion-panel
              v-for="(treatment, index) in analysis.treatment_recommendations"
              :key="index"
            >
              <v-expansion-panel-title>
                <div class="d-flex align-center">
                  <v-icon class="mr-2">mdi-pill</v-icon>
                  <span class="font-weight-medium">{{ treatment.treatment_type }}</span>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="treatment-details">
                  <div v-if="treatment.active_ingredients?.length" class="mb-3">
                    <h5 class="text-subtitle-2 font-weight-bold mb-1">Active Ingredients</h5>
                    <ul class="treatment-list">
                      <li v-for="ingredient in treatment.active_ingredients" :key="ingredient">
                        {{ ingredient }}
                      </li>
                    </ul>
                  </div>

                  <div v-if="treatment.dosage" class="mb-3">
                    <h5 class="text-subtitle-2 font-weight-bold mb-1">Dosage</h5>
                    <p class="text-body-2">{{ treatment.dosage }}</p>
                  </div>

                  <div v-if="treatment.application_method" class="mb-3">
                    <h5 class="text-subtitle-2 font-weight-bold mb-1">Application Method</h5>
                    <p class="text-body-2">{{ treatment.application_method }}</p>
                  </div>

                  <div v-if="treatment.timing" class="mb-3">
                    <h5 class="text-subtitle-2 font-weight-bold mb-1">Timing</h5>
                    <p class="text-body-2">{{ treatment.timing }}</p>
                  </div>

                  <div v-if="treatment.precautions?.length" class="mb-3">
                    <h5 class="text-subtitle-2 font-weight-bold mb-1">Precautions</h5>
                    <ul class="treatment-list">
                      <li v-for="precaution in treatment.precautions" :key="precaution">
                        {{ precaution }}
                      </li>
                    </ul>
                  </div>

                  <div v-if="treatment.cost_estimate" class="cost-estimate">
                    <v-chip color="info" variant="outlined" size="small">
                      <v-icon start>mdi-currency-inr</v-icon>
                      {{ treatment.cost_estimate }}
                    </v-chip>
                  </div>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
      </v-card>

      <!-- Prevention Strategies -->
      <v-card v-if="analysis.prevention_strategies?.length" class="prevention-card mb-4" elevation="2">
        <v-card-title class="d-flex align-center">
          <v-icon color="warning" class="mr-2">mdi-shield-check</v-icon>
          Prevention Strategies
        </v-card-title>
        <v-card-text>
          <ul class="prevention-list">
            <li v-for="(strategy, index) in analysis.prevention_strategies" :key="index" class="mb-2">
              {{ strategy }}
            </li>
          </ul>
        </v-card-text>
      </v-card>

      <!-- Analysis Metadata -->
      <v-card class="metadata-card" elevation="1" variant="outlined">
        <v-card-text>
          <div class="metadata-grid">
            <div class="metadata-item">
              <span class="text-caption text-medium-emphasis">Analysis Time</span>
              <span class="text-body-2 font-weight-medium">
                {{ formatTimestamp(analysis.timestamp) }}
              </span>
            </div>
            <div class="metadata-item">
              <span class="text-caption text-medium-emphasis">Processing Time</span>
              <span class="text-body-2 font-weight-medium">
                {{ analysis.processing_time.toFixed(2) }}s
              </span>
            </div>
            <div v-if="analysis.crop_type" class="metadata-item">
              <span class="text-caption text-medium-emphasis">Crop Type</span>
              <span class="text-body-2 font-weight-medium">{{ analysis.crop_type }}</span>
            </div>
            <div class="metadata-item">
              <span class="text-caption text-medium-emphasis">Model Used</span>
              <span class="text-body-2 font-weight-medium">{{ analysis.model_used }}</span>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Success Snackbar -->
      <v-snackbar v-model="showSaveSuccess" color="success" timeout="3000">
        <v-icon start>mdi-check-circle</v-icon>
        Analysis saved to history successfully!
      </v-snackbar>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <v-icon size="64" color="grey-lighten-1">mdi-image-search</v-icon>
      <p class="text-body-1 text-medium-emphasis mt-4">
        No analysis results to display
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';
import type { DiseaseAnalysis } from '@/types/vision.types';

// Register Chart.js components
Chart.register(...registerables);

// Props
interface Props {
  analysis: DiseaseAnalysis | null;
  loading?: boolean;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
});

// Emits
const emit = defineEmits<{
  'save-to-history': [analysis: DiseaseAnalysis];
  'share': [analysis: DiseaseAnalysis];
}>();

// Refs
const confidenceChart = ref<HTMLCanvasElement | null>(null);
const chartInstance = ref<Chart | null>(null);
const showSaveSuccess = ref(false);

// Methods
const getConfidenceColor = (level: string): string => {
  switch (level.toLowerCase()) {
    case 'high':
      return 'success';
    case 'medium':
      return 'warning';
    case 'low':
      return 'error';
    default:
      return 'grey';
  }
};

const getSeverityColor = (severity?: string): string => {
  if (!severity) return 'grey';
  switch (severity.toLowerCase()) {
    case 'high':
    case 'severe':
      return 'error';
    case 'medium':
    case 'moderate':
      return 'warning';
    case 'low':
    case 'mild':
      return 'success';
    default:
      return 'grey';
  }
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const saveToHistory = () => {
  if (!props.analysis) return;

  // Save to local storage
  const historyKey = 'disease_detection_history';
  const existingHistory = localStorage.getItem(historyKey);
  const history = existingHistory ? JSON.parse(existingHistory) : [];

  // Add current analysis to history
  const historyEntry = {
    ...props.analysis,
    saved_at: new Date().toISOString(),
  };

  history.unshift(historyEntry);

  // Keep only last 50 entries
  const trimmedHistory = history.slice(0, 50);
  localStorage.setItem(historyKey, JSON.stringify(trimmedHistory));

  // Emit event
  emit('save-to-history', props.analysis);

  // Show success message
  showSaveSuccess.value = true;
};

const shareResults = () => {
  if (!props.analysis) return;
  emit('share', props.analysis);
};

const createConfidenceChart = async () => {
  if (!props.analysis || !confidenceChart.value) return;

  // Wait for next tick to ensure canvas is rendered
  await nextTick();

  // Destroy existing chart
  if (chartInstance.value) {
    chartInstance.value.destroy();
  }

  // Prepare data
  const diseases = props.analysis.diseases.slice(0, 5); // Show top 5
  const labels = diseases.map(d => d.disease_name);
  const data = diseases.map(d => d.confidence_score * 100);
  const colors = diseases.map(d => {
    const level = d.confidence_level.toLowerCase();
    if (level === 'high') return 'rgba(76, 175, 80, 0.8)';
    if (level === 'medium') return 'rgba(255, 152, 0, 0.8)';
    return 'rgba(244, 67, 54, 0.8)';
  });

  // Create chart
  chartInstance.value = new Chart(confidenceChart.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Confidence Score (%)',
          data,
          backgroundColor: colors,
          borderColor: colors.map(c => c.replace('0.8', '1')),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return `Confidence: ${context.parsed.y.toFixed(1)}%`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value) => `${value}%`,
          },
        },
      },
    },
  });
};

// Watch for analysis changes
watch(
  () => props.analysis,
  async (newAnalysis) => {
    if (newAnalysis && newAnalysis.diseases.length > 1) {
      await nextTick();
      createConfidenceChart();
    }
  },
  { immediate: true }
);

// Lifecycle hooks
onMounted(() => {
  if (props.analysis && props.analysis.diseases.length > 1) {
    createConfidenceChart();
  }
});

onBeforeUnmount(() => {
  if (chartInstance.value) {
    chartInstance.value.destroy();
  }
});
</script>

<style scoped>
.disease-result-container {
  width: 100%;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 16px;
}

.results-content {
  width: 100%;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.primary-disease-card {
  border-left: 4px solid rgb(var(--v-theme-primary));
}

.confidence-section {
  padding: 16px;
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
}

.description-section,
.affected-parts-section,
.severity-section {
  padding: 12px 0;
}

.treatment-details {
  padding: 8px 0;
}

.treatment-list,
.prevention-list {
  padding-left: 20px;
  margin: 8px 0;
}

.treatment-list li,
.prevention-list li {
  margin: 8px 0;
  color: rgba(0, 0, 0, 0.87);
}

.cost-estimate {
  margin-top: 12px;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.metadata-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 16px;
}

.gap-2 {
  gap: 8px;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .results-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .v-btn {
    flex: 1;
  }

  .metadata-grid {
    grid-template-columns: 1fr;
  }
}
</style>
