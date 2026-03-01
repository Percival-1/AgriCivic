# Vision Components

Components for crop disease detection and image analysis.

## ImageUpload

A comprehensive image upload component with drag-and-drop support, file validation, preview, and upload progress tracking.

### Features

- **Drag and Drop**: Drag image files directly onto the upload area
- **File Validation**: Client-side validation for file format (JPEG, PNG, WebP) and size (max 10MB)
- **Image Preview**: Shows preview of selected image with file information
- **Upload Progress**: Visual progress indicator during upload
- **Upload Guidelines**: Expandable panel with best practices for image capture
- **Error Handling**: Clear error messages for validation failures

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `File \| null` | `null` | v-model binding for selected file |
| `showGuidelines` | `boolean` | `true` | Show/hide upload guidelines panel |
| `autoUpload` | `boolean` | `false` | Automatically simulate upload after file selection |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `File \| null` | Emitted when file selection changes |
| `file-selected` | `File` | Emitted when a valid file is selected |
| `upload-progress` | `number` | Emitted during upload with progress percentage (0-100) |
| `upload-complete` | `File` | Emitted when upload completes |
| `upload-error` | `string` | Emitted when upload fails |
| `validation-error` | `string` | Emitted when file validation fails |

### Exposed Methods

| Method | Description |
|--------|-------------|
| `clearImage()` | Clears the selected image and resets the component |
| `triggerFileInput()` | Programmatically opens the file picker dialog |

### Usage Example

#### Basic Usage

```vue
<template>
  <ImageUpload
    v-model="selectedFile"
    @file-selected="handleFileSelected"
    @validation-error="handleValidationError"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ImageUpload } from '@/components/vision';

const selectedFile = ref<File | null>(null);

const handleFileSelected = (file: File) => {
  console.log('File selected:', file.name);
  // Process the file (e.g., send to API)
};

const handleValidationError = (error: string) => {
  console.error('Validation error:', error);
};
</script>
```

#### With Auto Upload

```vue
<template>
  <ImageUpload
    v-model="selectedFile"
    auto-upload
    @upload-progress="handleProgress"
    @upload-complete="handleComplete"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ImageUpload } from '@/components/vision';

const selectedFile = ref<File | null>(null);

const handleProgress = (progress: number) => {
  console.log(`Upload progress: ${progress}%`);
};

const handleComplete = (file: File) => {
  console.log('Upload complete:', file.name);
};
</script>
```

#### Without Guidelines

```vue
<template>
  <ImageUpload
    v-model="selectedFile"
    :show-guidelines="false"
  />
</template>
```

#### With Ref Access

```vue
<template>
  <div>
    <ImageUpload
      ref="uploadRef"
      v-model="selectedFile"
    />
    <v-btn @click="clearUpload">Clear</v-btn>
    <v-btn @click="openFilePicker">Browse</v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ImageUpload } from '@/components/vision';

const uploadRef = ref<InstanceType<typeof ImageUpload> | null>(null);
const selectedFile = ref<File | null>(null);

const clearUpload = () => {
  uploadRef.value?.clearImage();
};

const openFilePicker = () => {
  uploadRef.value?.triggerFileInput();
};
</script>
```

#### Integration with Vision Service

```vue
<template>
  <div>
    <ImageUpload
      v-model="selectedFile"
      @file-selected="analyzeImage"
    />
    
    <v-card v-if="analysis" class="mt-4">
      <v-card-title>Analysis Result</v-card-title>
      <v-card-text>
        <p><strong>Disease:</strong> {{ analysis.primary_disease?.disease_name }}</p>
        <p><strong>Confidence:</strong> {{ analysis.primary_disease?.confidence_score }}%</p>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ImageUpload } from '@/components/vision';
import visionService from '@/services/vision.service';
import type { DiseaseAnalysis } from '@/types/vision.types';

const selectedFile = ref<File | null>(null);
const analysis = ref<DiseaseAnalysis | null>(null);
const loading = ref(false);

const analyzeImage = async (file: File) => {
  try {
    loading.value = true;
    const response = await visionService.analyzeImage(file);
    if (response.success && response.analysis) {
      analysis.value = response.analysis;
    }
  } catch (error) {
    console.error('Analysis failed:', error);
  } finally {
    loading.value = false;
  }
};
</script>
```

### Styling

The component uses Vuetify's theming system and can be customized using CSS variables:

```css
/* Custom styling example */
.image-upload-container {
  /* Override drop zone border color */
  --drop-zone-border: rgb(var(--v-theme-primary));
  
  /* Override drop zone background */
  --drop-zone-bg: rgba(var(--v-theme-surface), 1);
}
```

### Accessibility

- Keyboard accessible (click to open file picker)
- Screen reader friendly with proper ARIA labels
- Clear visual feedback for drag and drop states
- Error messages are announced to screen readers

### Browser Support

- Modern browsers with File API support
- Drag and drop supported in Chrome, Firefox, Safari, Edge
- File input fallback for older browsers
