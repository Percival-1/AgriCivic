# Speech Service Implementation

## Overview
Implemented frontend speech service to integrate with the backend speech-to-text (STT) and text-to-speech (TTS) APIs.

## Files Created

### 1. `frontend/src/services/speech.service.ts`
Complete speech service with the following features:

#### Speech-to-Text (STT) Features:
- **`transcribeAudio()`** - Transcribe audio files to text
  - Supports multiple audio formats (mp3, wav, m4a, flac, ogg, webm)
  - Optional language hint
  - Caching support
  - Returns transcription with confidence score and detected language

- **`getSupportedFormats()`** - Get list of supported audio formats
- **`getSupportedLanguages()`** - Get list of supported language codes
- **`validateAudioFile()`** - Client-side validation before upload
  - Checks file size (max 25MB)
  - Validates audio format

#### Text-to-Speech (TTS) Features:
- **`synthesizeSpeech()`** - Convert text to speech audio
  - Multiple language support
  - Voice selection
  - Adjustable speech speed (0.25x to 4.0x)
  - Multiple output formats (mp3, opus, aac, flac)
  - Returns audio blob for playback

- **`getSynthesisMetadata()`** - Get TTS metadata without downloading audio
- **`getSupportedVoices()`** - Get list of available voices
- **`getTTSSupportedFormats()`** - Get supported output formats

#### Utility Functions:
- **`createAudioURL()`** - Create object URL for audio playback
- **`revokeAudioURL()`** - Clean up object URLs
- **`downloadAudio()`** - Download synthesized audio file

### 2. `frontend/src/types/speech.types.ts`
TypeScript type definitions for:
- `TranscriptionResult` - STT response
- `TTSResult` - TTS metadata
- `SupportedFormatsResponse` - Format information
- `SupportedLanguagesResponse` - Language list
- `SupportedVoicesResponse` - Voice list
- `SpeechMetrics` - STT service metrics
- `TTSMetrics` - TTS service metrics

## API Endpoints Connected

### Speech-to-Text:
- `POST /api/v1/speech/transcribe` - Transcribe audio
- `GET /api/v1/speech/formats` - Get supported formats
- `GET /api/v1/speech/languages` - Get supported languages

### Text-to-Speech:
- `POST /api/v1/speech/synthesize` - Synthesize speech (returns audio)
- `POST /api/v1/speech/synthesize/metadata` - Get metadata only
- `GET /api/v1/speech/tts/voices` - Get supported voices
- `GET /api/v1/speech/tts/formats` - Get TTS formats

## Usage Examples

### Speech-to-Text Example:
```typescript
import { speechService } from '@/services/speech.service';

// Transcribe audio file
const handleAudioUpload = async (file: File) => {
  try {
    // Validate file first
    speechService.validateAudioFile(file);
    
    // Transcribe
    const result = await speechService.transcribeAudio(file, 'hi', true);
    
    console.log('Transcribed text:', result.transcribed_text);
    console.log('Confidence:', result.confidence);
    console.log('Detected language:', result.detected_language);
  } catch (error) {
    console.error('Transcription failed:', error);
  }
};
```

### Text-to-Speech Example:
```typescript
import { speechService } from '@/services/speech.service';

// Synthesize speech
const handleTextToSpeech = async (text: string) => {
  try {
    // Synthesize speech
    const audioBlob = await speechService.synthesizeSpeech(
      text,
      'hi',      // Hindi
      'alloy',   // Voice
      1.0,       // Normal speed
      'mp3',     // Format
      true       // Use cache
    );
    
    // Create URL for playback
    const audioUrl = speechService.createAudioURL(audioBlob);
    
    // Play audio
    const audio = new Audio(audioUrl);
    audio.play();
    
    // Clean up when done
    audio.onended = () => {
      speechService.revokeAudioURL(audioUrl);
    };
  } catch (error) {
    console.error('TTS failed:', error);
  }
};

// Or download the audio
const downloadSpeech = async (text: string) => {
  const audioBlob = await speechService.synthesizeSpeech(text, 'en');
  speechService.downloadAudio(audioBlob, 'speech.mp3');
};
```

### Get Supported Options:
```typescript
// Get supported formats
const formats = await speechService.getSupportedFormats();
console.log('Supported formats:', formats.formats);
console.log('Max file size:', formats.max_file_size_mb, 'MB');

// Get supported languages
const languages = await speechService.getSupportedLanguages();
console.log('Supported languages:', languages.languages);

// Get supported voices
const voices = await speechService.getSupportedVoices();
console.log('Available voices:', voices.voices);
```

## Component Integration

### Audio Upload Component Example:
```vue
<template>
  <div>
    <input
      ref="fileInput"
      type="file"
      accept="audio/*"
      @change="handleFileSelect"
      style="display: none"
    />
    
    <v-btn @click="selectFile" :loading="isTranscribing">
      <v-icon start>mdi-microphone</v-icon>
      Upload Audio
    </v-btn>

    <v-card v-if="transcription" class="mt-4">
      <v-card-title>Transcription Result</v-card-title>
      <v-card-text>
        <p><strong>Text:</strong> {{ transcription.transcribed_text }}</p>
        <p><strong>Language:</strong> {{ transcription.detected_language }}</p>
        <p><strong>Confidence:</strong> {{ (transcription.confidence * 100).toFixed(1) }}%</p>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { speechService } from '@/services/speech.service';
import type { TranscriptionResult } from '@/types/speech.types';

const fileInput = ref<HTMLInputElement | null>(null);
const isTranscribing = ref(false);
const transcription = ref<TranscriptionResult | null>(null);

const selectFile = () => {
  fileInput.value?.click();
};

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) return;

  try {
    isTranscribing.value = true;
    
    // Validate file
    speechService.validateAudioFile(file);
    
    // Transcribe
    transcription.value = await speechService.transcribeAudio(file);
  } catch (error: any) {
    console.error('Transcription failed:', error);
    alert(error.message);
  } finally {
    isTranscribing.value = false;
  }
};
</script>
```

### Text-to-Speech Component Example:
```vue
<template>
  <div>
    <v-textarea
      v-model="text"
      label="Enter text to convert to speech"
      rows="3"
    />
    
    <v-select
      v-model="selectedLanguage"
      :items="languages"
      label="Language"
    />
    
    <v-select
      v-model="selectedVoice"
      :items="voices"
      label="Voice"
    />
    
    <v-slider
      v-model="speed"
      :min="0.25"
      :max="4.0"
      :step="0.25"
      label="Speed"
      thumb-label
    />
    
    <v-btn @click="handleSynthesize" :loading="isSynthesizing">
      <v-icon start>mdi-play</v-icon>
      Generate Speech
    </v-btn>
    
    <v-btn @click="handleDownload" :disabled="!audioUrl">
      <v-icon start>mdi-download</v-icon>
      Download
    </v-btn>
    
    <audio
      v-if="audioUrl"
      :src="audioUrl"
      controls
      class="mt-4"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { speechService } from '@/services/speech.service';

const text = ref('');
const selectedLanguage = ref('en');
const selectedVoice = ref('alloy');
const speed = ref(1.0);
const isSynthesizing = ref(false);
const audioUrl = ref<string | null>(null);

const languages = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa'];
const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

const handleSynthesize = async () => {
  if (!text.value.trim()) return;

  try {
    isSynthesizing.value = true;
    
    // Clean up previous audio URL
    if (audioUrl.value) {
      speechService.revokeAudioURL(audioUrl.value);
    }
    
    // Synthesize speech
    const audioBlob = await speechService.synthesizeSpeech(
      text.value,
      selectedLanguage.value,
      selectedVoice.value,
      speed.value
    );
    
    // Create URL for playback
    audioUrl.value = speechService.createAudioURL(audioBlob);
  } catch (error) {
    console.error('TTS failed:', error);
    alert('Failed to generate speech');
  } finally {
    isSynthesizing.value = false;
  }
};

const handleDownload = async () => {
  if (!text.value.trim()) return;

  try {
    const audioBlob = await speechService.synthesizeSpeech(
      text.value,
      selectedLanguage.value,
      selectedVoice.value,
      speed.value
    );
    
    speechService.downloadAudio(audioBlob, 'speech.mp3');
  } catch (error) {
    console.error('Download failed:', error);
  }
};

// Clean up on unmount
onUnmounted(() => {
  if (audioUrl.value) {
    speechService.revokeAudioURL(audioUrl.value);
  }
});
</script>
```

## Features

### Client-Side Validation
- File size validation (max 25MB)
- Audio format validation
- Immediate feedback before upload

### Caching Support
- Both STT and TTS support caching
- Faster responses for repeated requests
- Configurable per request

### Multiple Language Support
- Supports 10+ regional languages
- Auto-detection for STT
- Language-specific voices for TTS

### Flexible Audio Formats
- **Input (STT):** mp3, wav, m4a, flac, ogg, webm
- **Output (TTS):** mp3, opus, aac, flac

### Memory Management
- Proper cleanup of object URLs
- Prevents memory leaks
- Automatic resource management

## Next Steps

To complete the speech integration:

1. **Create UI Components** (as shown in examples above):
   - AudioUpload component
   - TranscriptionResult component
   - TextToSpeech component
   - AudioPlayer component

2. **Add to Navigation**:
   - Add speech features to main navigation
   - Create dedicated speech page/view

3. **Integrate with Chat**:
   - Add voice input button to chat interface
   - Add TTS for reading chat responses
   - Voice commands support

4. **Testing**:
   - Test with various audio formats
   - Test different languages
   - Test error scenarios

## Status

✅ Speech service implemented
✅ Type definitions created
✅ No TypeScript errors
✅ Ready for component integration

The speech service is now fully functional and ready to be integrated into your Vue components!
