# Chat Component Usage Example

This document provides examples of how to use the chat functionality in your Vue components.

## Basic Chat View Example

```vue
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <span class="text-h5">Agricultural Assistant</span>
            <v-spacer />
            <v-btn
              v-if="!hasActiveSession"
              color="primary"
              @click="startChat"
              :loading="isLoading"
            >
              Start Chat
            </v-btn>
            <v-btn
              v-else
              color="error"
              variant="outlined"
              @click="endChat"
            >
              End Chat
            </v-btn>
          </v-card-title>

          <v-divider />

          <!-- Chat Interface Component -->
          <ChatInterface
            v-if="hasActiveSession"
            height="600px"
            :auto-scroll="true"
          />

          <v-card-text v-else class="text-center py-8">
            <v-icon size="64" color="grey">mdi-chat-outline</v-icon>
            <p class="text-h6 mt-4">Click "Start Chat" to begin</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useChatStore } from '@/stores/chat';
import { storeToRefs } from 'pinia';
import ChatInterface from '@/components/chat/ChatInterface.vue';

const chatStore = useChatStore();
const { hasActiveSession, isLoading, error } = storeToRefs(chatStore);

/**
 * Start a new chat session
 */
const startChat = async () => {
  try {
    await chatStore.initSession();
  } catch (err) {
    console.error('Failed to start chat:', err);
  }
};

/**
 * End the current chat session
 */
const endChat = async () => {
  try {
    await chatStore.endSession();
  } catch (err) {
    console.error('Failed to end chat:', err);
  }
};
</script>
```

## Using Chat Store Directly

### Initialize Session
```typescript
import { useChatStore } from '@/stores/chat';

const chatStore = useChatStore();

// Initialize a new chat session
await chatStore.initSession();
```

### Send Message
```typescript
// Send a message in the current session
await chatStore.sendMessage('What crops grow well in monsoon season?');

// Send message with language preference
await chatStore.sendMessage('मानसून में कौन सी फसलें अच्छी होती हैं?', 'hi');
```

### Upload Image
```typescript
// Upload image for disease detection
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

await chatStore.uploadImage(file);
```

### Load History
```typescript
// Load chat history (last 50 messages by default)
await chatStore.loadHistory();

// Load specific number of messages
await chatStore.loadHistory(20);
```

### Search Messages
```typescript
import { computed } from 'vue';

// Search messages by query
const searchQuery = ref('tomato');
const filteredMessages = computed(() => {
  return chatStore.searchMessages(searchQuery.value);
});
```

### Export Chat History
```typescript
// Export as JSON
chatStore.downloadChatHistory('json');

// Export as text
chatStore.downloadChatHistory('txt');

// Get JSON string without downloading
const jsonData = chatStore.exportChatHistory();
console.log(jsonData);
```

### Clear Messages
```typescript
// Clear all messages in current session
chatStore.clearMessages();
```

### End Session
```typescript
// End the current chat session
await chatStore.endSession();
```

## Accessing Chat State

### Using Composition API
```typescript
import { useChatStore } from '@/stores/chat';
import { storeToRefs } from 'pinia';

const chatStore = useChatStore();

// Reactive state
const { 
  currentSession,
  messages,
  isLoading,
  isTyping,
  error,
  hasActiveSession 
} = storeToRefs(chatStore);

// Getters
const messageCount = computed(() => chatStore.messageCount);
const lastMessage = computed(() => chatStore.lastMessage);
const sessionId = computed(() => chatStore.sessionId);
```

### Using Options API
```typescript
export default {
  computed: {
    ...mapState(useChatStore, [
      'currentSession',
      'messages',
      'isLoading',
      'isTyping',
      'error',
      'hasActiveSession'
    ]),
    ...mapGetters(useChatStore, [
      'messageCount',
      'lastMessage',
      'sessionId'
    ])
  },
  methods: {
    ...mapActions(useChatStore, [
      'initSession',
      'sendMessage',
      'loadHistory',
      'endSession',
      'uploadImage',
      'clearMessages'
    ])
  }
}
```

## Error Handling

### Display Errors in UI
```vue
<template>
  <v-alert
    v-if="error"
    type="error"
    variant="tonal"
    closable
    @click:close="clearError"
  >
    {{ error }}
  </v-alert>
</template>

<script setup lang="ts">
import { useChatStore } from '@/stores/chat';
import { storeToRefs } from 'pinia';

const chatStore = useChatStore();
const { error } = storeToRefs(chatStore);

const clearError = () => {
  chatStore.clearError();
};
</script>
```

### Try-Catch Pattern
```typescript
const sendMessage = async (message: string) => {
  try {
    await chatStore.sendMessage(message);
    // Success - message sent
  } catch (error) {
    // Error is already set in store.error
    // Optionally show notification
    console.error('Failed to send message:', error);
  }
};
```

## Advanced Usage

### Custom Message Handling
```typescript
import { watch } from 'vue';
import { useChatStore } from '@/stores/chat';

const chatStore = useChatStore();

// Watch for new messages
watch(
  () => chatStore.messages.length,
  (newLength, oldLength) => {
    if (newLength > oldLength) {
      const lastMessage = chatStore.lastMessage;
      console.log('New message received:', lastMessage);
      
      // Custom logic (e.g., play notification sound)
      if (lastMessage?.role === 'assistant') {
        playNotificationSound();
      }
    }
  }
);
```

### Session Persistence
```typescript
import { onMounted } from 'vue';
import { useChatStore } from '@/stores/chat';

const chatStore = useChatStore();

// Restore session on mount
onMounted(async () => {
  const savedSessionId = localStorage.getItem('lastChatSession');
  
  if (savedSessionId) {
    try {
      // Try to restore session by loading history
      await chatStore.loadHistory();
    } catch (error) {
      // Session expired, start new one
      await chatStore.initSession();
    }
  }
});

// Save session ID when created
watch(
  () => chatStore.sessionId,
  (newSessionId) => {
    if (newSessionId) {
      localStorage.setItem('lastChatSession', newSessionId);
    }
  }
);
```

### Image Upload with Preview
```vue
<template>
  <div>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleFileSelect"
    />
    
    <v-btn @click="selectImage" :loading="isUploading">
      <v-icon start>mdi-camera</v-icon>
      Upload Crop Image
    </v-btn>

    <v-img
      v-if="imagePreview"
      :src="imagePreview"
      max-width="300"
      class="mt-4"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useChatStore } from '@/stores/chat';

const chatStore = useChatStore();
const fileInput = ref<HTMLInputElement | null>(null);
const imagePreview = ref<string | null>(null);
const isUploading = ref(false);

const selectImage = () => {
  fileInput.value?.click();
};

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) return;

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);

  // Upload to backend
  try {
    isUploading.value = true;
    await chatStore.uploadImage(file);
  } catch (error) {
    console.error('Failed to upload image:', error);
  } finally {
    isUploading.value = false;
  }
};
</script>
```

## Best Practices

1. **Always check for active session** before sending messages
2. **Handle errors gracefully** with user-friendly messages
3. **Clear messages** when appropriate (e.g., on logout)
4. **End sessions** when user navigates away or logs out
5. **Use loading states** to provide feedback during async operations
6. **Implement retry logic** for failed operations
7. **Validate file types** before uploading images
8. **Limit message length** to prevent API errors
9. **Debounce search** to avoid excessive filtering
10. **Clean up on unmount** to prevent memory leaks

## Common Patterns

### Loading State
```vue
<v-btn
  :loading="isLoading"
  :disabled="!hasActiveSession || !messageInput.trim()"
  @click="sendMessage"
>
  Send
</v-btn>
```

### Conditional Rendering
```vue
<div v-if="hasActiveSession">
  <!-- Chat interface -->
</div>
<div v-else>
  <!-- Start chat prompt -->
</div>
```

### Error Display
```vue
<v-alert v-if="error" type="error">
  {{ error }}
</v-alert>
```

### Empty State
```vue
<div v-if="messages.length === 0" class="text-center">
  <v-icon size="64">mdi-chat-outline</v-icon>
  <p>No messages yet. Start the conversation!</p>
</div>
```
