<template>
  <div class="disease-detection-view">
    <v-container>
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-4">Crop Disease Detection</h1>
          <p class="text-body-1 text-medium-emphasis mb-6">
            Upload an image of your crop to identify diseases and get treatment recommendations
          </p>
        </v-col>
      </v-row>

      <v-row>
        <!-- Image Upload Section -->
        <v-col cols="12" md="6">
          <ImageUpload
            v-model="selectedFile"
            :show-guidelines="true"
            @file-selected="handleFileSelected"
            @validation-error="handleValidationError"
          />

          <v-btn
            v-if="selectedFile && !analyzing"
            color="primary"
            size="large"
            block
            class="mt-4"
            @click="analyzeImage"
          >
            <v-icon start>mdi-magnify</v-icon>
            Analyze Image
          </v-btn>
        </v-col>

        <!-- Results Section -->
        <v-col cols="12" md="6">
          <DiseaseResult
            :analysis="analysisResult"
            :loading="analyzing"
            :error="analysisError"
            @save-to-history="handleSaveToHistory"
            @share="handleShare"
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ImageUpload from '@/components/vision/ImageUpload.vue';
import DiseaseResult from '@/components/vision/DiseaseResult.vue';
import visionService from '@/services/vision.service';
import type { DiseaseAnalysis } from '@/types/vision.types';

// Refs
const selectedFile = ref<File | null>(null);
const analyzing = ref(false);
const analysisResult = ref<DiseaseAnalysis | null>(null);
const analysisError = ref<string | null>(null);

// Methods
const handleFileSelected = (file: File) => {
  // Clear previous results
  analysisResult.value = null;
  analysisError.value = null;
};

const handleValidationError = (error: string) => {
  analysisError.value = error;
};

const analyzeImage = async () => {
  if (!selectedFile.value) return;

  analyzing.value = true;
  analysisError.value = null;

  try {
    const response = await visionService.analyzeImage(selectedFile.value);
    if (response.success && response.analysis) {
      analysisResult.value = response.analysis;
    } else {
      analysisError.value = response.error || 'Analysis failed';
    }
  } catch (error) {
    analysisError.value = error instanceof Error ? error.message : 'Failed to analyze image';
  } finally {
    analyzing.value = false;
  }
};

const handleSaveToHistory = (analysis: DiseaseAnalysis) => {
  console.log('Analysis saved to history:', analysis);
};

const handleShare = (analysis: DiseaseAnalysis) => {
  console.log('Sharing analysis:', analysis);
  // Implement share functionality
};
</script>

<style scoped>
.disease-detection-view {
  min-height: 100vh;
  padding: 24px 0;
}
</style>
