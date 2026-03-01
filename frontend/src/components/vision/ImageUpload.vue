<template>
  <div class="image-upload-container">
    <!-- Drag and Drop Area -->
    <div
      class="drop-zone"
      :class="{
        'drop-zone-active': isDragging,
        'drop-zone-error': validationError,
        'drop-zone-success': previewUrl && !validationError,
      }"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
      @click="triggerFileInput"
    >
      <!-- File Input (Hidden) -->
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style="display: none"
        @change="handleFileSelect"
      />

      <!-- Preview Image -->
      <div v-if="previewUrl && !uploading" class="preview-container">
        <v-img
          :src="previewUrl"
          :alt="selectedFile?.name || 'Preview'"
          class="preview-image"
          cover
        />
        <div class="preview-overlay">
          <v-btn
            icon="mdi-close"
            size="small"
            color="error"
            class="remove-btn"
            @click.stop="clearImage"
          />
          <div class="file-info">
            <p class="file-name">{{ selectedFile?.name }}</p>
            <p class="file-size">{{ formatFileSize(selectedFile?.size || 0) }}</p>
          </div>
        </div>
      </div>

      <!-- Upload Progress -->
      <div v-else-if="uploading" class="upload-progress-container">
        <v-progress-circular
          :model-value="uploadProgress"
          :size="80"
          :width="8"
          color="primary"
        >
          {{ uploadProgress }}%
        </v-progress-circular>
        <p class="upload-message mt-4">{{ uploadMessage }}</p>
      </div>

      <!-- Upload Prompt -->
      <div v-else class="upload-prompt">
        <v-icon size="64" color="primary" class="mb-4">
          mdi-cloud-upload
        </v-icon>
        <h3 class="text-h6 mb-2">
          {{ isDragging ? 'Drop image here' : 'Upload Crop Image' }}
        </h3>
        <p class="text-body-2 text-medium-emphasis mb-2">
          Drag and drop an image or click to browse
        </p>
        <p class="text-caption text-medium-emphasis">
          Supported formats: JPEG, PNG, WebP (Max 10MB)
        </p>
      </div>
    </div>

    <!-- Validation Error -->
    <v-alert
      v-if="validationError"
      type="error"
      variant="tonal"
      class="mt-4"
      closable
      @click:close="validationError = null"
    >
      {{ validationError }}
    </v-alert>

    <!-- Upload Guidelines -->
    <v-expansion-panels v-if="showGuidelines" class="mt-4">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <v-icon class="mr-2">mdi-information</v-icon>
          Image Upload Guidelines
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <ul class="guidelines-list">
            <li>Take clear, well-lit photos of affected plant parts</li>
            <li>Focus on the diseased area for better detection</li>
            <li>Avoid blurry or low-resolution images</li>
            <li>Include multiple angles if possible</li>
            <li>Ensure good lighting conditions</li>
          </ul>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import visionService from '@/services/vision.service';

// Props
interface Props {
  modelValue?: File | null;
  showGuidelines?: boolean;
  autoUpload?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  showGuidelines: true,
  autoUpload: false,
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [file: File | null];
  'file-selected': [file: File];
  'upload-progress': [progress: number];
  'upload-complete': [file: File];
  'upload-error': [error: string];
  'validation-error': [error: string];
}>();

// Refs
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(props.modelValue);
const previewUrl = ref<string | null>(null);
const isDragging = ref(false);
const validationError = ref<string | null>(null);
const uploading = ref(false);
const uploadProgress = ref(0);
const uploadMessage = ref('Uploading...');

// Methods
const triggerFileInput = () => {
  if (!uploading.value) {
    fileInput.value?.click();
  }
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;
};

const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    processFile(files[0]);
  }
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    processFile(files[0]);
  }
};

const processFile = (file: File) => {
  // Clear previous errors
  validationError.value = null;

  // Validate file client-side
  const validation = visionService.validateImageClientSide(file);
  if (!validation.valid) {
    validationError.value = validation.error || 'Invalid file';
    emit('validation-error', validationError.value);
    return;
  }

  // Set selected file
  selectedFile.value = file;
  emit('update:modelValue', file);
  emit('file-selected', file);

  // Create preview URL
  if (previewUrl.value) {
    visionService.revokeImagePreviewUrl(previewUrl.value);
  }
  previewUrl.value = visionService.createImagePreviewUrl(file);

  // Auto upload if enabled
  if (props.autoUpload) {
    simulateUpload();
  }
};

const clearImage = () => {
  if (previewUrl.value) {
    visionService.revokeImagePreviewUrl(previewUrl.value);
  }
  selectedFile.value = null;
  previewUrl.value = null;
  validationError.value = null;
  uploadProgress.value = 0;
  uploading.value = false;
  emit('update:modelValue', null);

  // Reset file input
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const simulateUpload = () => {
  if (!selectedFile.value) return;

  uploading.value = true;
  uploadProgress.value = 0;
  uploadMessage.value = 'Uploading image...';

  // Simulate upload progress
  const interval = setInterval(() => {
    uploadProgress.value += 10;
    emit('upload-progress', uploadProgress.value);

    if (uploadProgress.value >= 100) {
      clearInterval(interval);
      uploadMessage.value = 'Upload complete!';
      uploading.value = false;
      emit('upload-complete', selectedFile.value!);
    }
  }, 200);
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Expose methods for parent component
defineExpose({
  clearImage,
  triggerFileInput,
});
</script>

<style scoped>
.image-upload-container {
  width: 100%;
}

.drop-zone {
  border: 2px dashed rgb(var(--v-theme-primary));
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: rgba(var(--v-theme-surface), 1);
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.drop-zone:hover {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.drop-zone-active {
  border-color: rgb(var(--v-theme-success));
  background-color: rgba(var(--v-theme-success), 0.1);
  transform: scale(1.02);
}

.drop-zone-error {
  border-color: rgb(var(--v-theme-error));
  background-color: rgba(var(--v-theme-error), 0.05);
}

.drop-zone-success {
  border-color: rgb(var(--v-theme-success));
}

.upload-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.preview-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  object-fit: contain;
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, transparent 30%, transparent 70%, rgba(0, 0, 0, 0.6) 100%);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.preview-container:hover .preview-overlay {
  opacity: 1;
}

.remove-btn {
  align-self: flex-end;
}

.file-info {
  color: white;
  text-align: left;
}

.file-name {
  font-weight: 500;
  margin: 0;
  word-break: break-word;
}

.file-size {
  font-size: 12px;
  opacity: 0.8;
  margin: 4px 0 0 0;
}

.upload-progress-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-message {
  color: rgba(0, 0, 0, 0.6);
  font-size: 14px;
  margin: 0;
}

.guidelines-list {
  padding-left: 20px;
  margin: 8px 0;
}

.guidelines-list li {
  margin: 8px 0;
  color: rgba(0, 0, 0, 0.7);
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .drop-zone {
    padding: 24px 16px;
    min-height: 250px;
  }

  .preview-image {
    max-height: 300px;
  }
}
</style>
