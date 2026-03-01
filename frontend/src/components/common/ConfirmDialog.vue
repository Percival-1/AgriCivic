<template>
  <v-dialog
    v-model="dialogModel"
    :max-width="maxWidth"
    :persistent="persistent"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon
          v-if="icon"
          :color="iconColor"
          class="mr-2"
        >
          {{ icon }}
        </v-icon>
        {{ title }}
      </v-card-title>

      <v-card-text>
        <div class="text-body-1">{{ message }}</div>
        
        <v-alert
          v-if="warningMessage"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-4"
        >
          {{ warningMessage }}
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        
        <v-btn
          :color="cancelColor"
          variant="text"
          @click="handleCancel"
          :disabled="loading"
        >
          {{ cancelText }}
        </v-btn>

        <v-btn
          :color="confirmColor"
          :variant="confirmVariant"
          @click="handleConfirm"
          :loading="loading"
        >
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Props
interface Props {
  modelValue: boolean;
  title?: string;
  message: string;
  warningMessage?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  cancelColor?: string;
  confirmVariant?: 'flat' | 'text' | 'elevated' | 'tonal' | 'outlined' | 'plain';
  icon?: string;
  iconColor?: string;
  maxWidth?: string | number;
  persistent?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Confirm Action',
  warningMessage: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmColor: 'primary',
  cancelColor: 'grey',
  confirmVariant: 'flat',
  icon: '',
  iconColor: 'primary',
  maxWidth: 500,
  persistent: false,
  loading: false,
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'confirm': [];
  'cancel': [];
}>();

// Computed
const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// Methods
const handleConfirm = () => {
  emit('confirm');
};

const handleCancel = () => {
  emit('cancel');
  emit('update:modelValue', false);
};
</script>

<style scoped>
.v-card-title {
  font-weight: 600;
}

.v-card-text {
  padding-top: 16px;
  padding-bottom: 16px;
}
</style>
