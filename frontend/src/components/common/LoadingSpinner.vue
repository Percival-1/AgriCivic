<template>
  <div v-if="modelValue" class="loading-spinner-overlay" :class="{ 'overlay-fullscreen': fullscreen }">
    <div class="loading-spinner-container">
      <v-progress-circular
        :size="size"
        :width="width"
        :color="color"
        indeterminate
      />
      <p v-if="message" class="loading-message mt-4">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Props
interface Props {
  modelValue: boolean;
  message?: string;
  size?: number;
  width?: number;
  color?: string;
  fullscreen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  message: '',
  size: 64,
  width: 6,
  color: 'primary',
  fullscreen: false,
});

// Emits
defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<style scoped>
.loading-spinner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 100;
}

.loading-spinner-overlay.overlay-fullscreen {
  position: fixed;
  z-index: 9999;
}

.loading-spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-message {
  color: rgba(0, 0, 0, 0.6);
  font-size: 14px;
  text-align: center;
  max-width: 300px;
}
</style>
