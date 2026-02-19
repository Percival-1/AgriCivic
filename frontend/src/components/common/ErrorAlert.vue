<template>
  <v-alert
    v-if="modelValue"
    :type="type"
    :variant="variant"
    :closable="closable"
    :prominent="prominent"
    class="error-alert"
    @click:close="handleClose"
  >
    <template #prepend>
      <v-icon :icon="icon" />
    </template>

    <v-alert-title v-if="title">{{ title }}</v-alert-title>
    
    <div class="error-message">{{ message }}</div>

    <template v-if="details" #text>
      <v-expansion-panels variant="accordion" class="mt-2">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <span class="text-caption">View Details</span>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <pre class="error-details">{{ details }}</pre>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>

    <template v-if="showRetry" #append>
      <v-btn
        :color="type"
        variant="outlined"
        size="small"
        @click="handleRetry"
      >
        <v-icon start>mdi-refresh</v-icon>
        Retry
      </v-btn>
    </template>
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Props
interface Props {
  modelValue: boolean;
  type?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  message: string;
  details?: string | object;
  closable?: boolean;
  prominent?: boolean;
  variant?: 'flat' | 'text' | 'elevated' | 'tonal' | 'outlined' | 'plain';
  showRetry?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'error',
  title: '',
  details: undefined,
  closable: true,
  prominent: false,
  variant: 'tonal',
  showRetry: false,
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'retry': [];
}>();

// Computed
const icon = computed(() => {
  const icons: Record<string, string> = {
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information',
    success: 'mdi-check-circle',
  };
  return icons[props.type] || 'mdi-alert-circle';
});

// Methods
const handleClose = () => {
  emit('update:modelValue', false);
};

const handleRetry = () => {
  emit('retry');
};
</script>

<style scoped>
.error-alert {
  margin-bottom: 16px;
}

.error-message {
  white-space: pre-wrap;
  word-break: break-word;
}

.error-details {
  font-size: 12px;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 200px;
}
</style>
