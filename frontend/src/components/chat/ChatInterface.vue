<template>
  <v-card class="chat-interface" elevation="2">
    <!-- Chat Header with Search and Actions -->
    <v-card-title class="d-flex align-center pa-3 bg-surface-variant">
      <v-icon class="mr-2">mdi-chat</v-icon>
      <span class="text-h6">Chat</span>
      <v-spacer />
      
      <!-- Search Toggle Button -->
      <v-btn
        icon
        size="small"
        variant="text"
        @click="showSearch = !showSearch"
        :color="showSearch ? 'primary' : undefined"
      >
        <v-icon>mdi-magnify</v-icon>
        <v-tooltip activator="parent" location="bottom">Search Messages</v-tooltip>
      </v-btn>

      <!-- Export Menu -->
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn
            icon
            size="small"
            variant="text"
            v-bind="props"
            :disabled="messages.length === 0"
          >
            <v-icon>mdi-download</v-icon>
            <v-tooltip activator="parent" location="bottom">Export Chat</v-tooltip>
          </v-btn>
        </template>
        <v-list>
          <v-list-item @click="handleExport('json')">
            <v-list-item-title>
              <v-icon class="mr-2" size="small">mdi-code-json</v-icon>
              Export as JSON
            </v-list-item-title>
          </v-list-item>
          <v-list-item @click="handleExport('txt')">
            <v-list-item-title>
              <v-icon class="mr-2" size="small">mdi-text</v-icon>
              Export as Text
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <!-- Clear Chat Button -->
      <v-btn
        icon
        size="small"
        variant="text"
        @click="showClearDialog = true"
        :disabled="messages.length === 0"
      >
        <v-icon>mdi-delete-outline</v-icon>
        <v-tooltip activator="parent" location="bottom">Clear Chat</v-tooltip>
      </v-btn>
    </v-card-title>

    <!-- Search Bar -->
    <v-expand-transition>
      <div v-if="showSearch" class="pa-3 bg-surface">
        <v-text-field
          v-model="searchQuery"
          placeholder="Search messages..."
          prepend-inner-icon="mdi-magnify"
          clearable
          variant="outlined"
          density="compact"
          hide-details
          @click:clear="searchQuery = ''"
        >
          <template v-slot:append-inner>
            <v-chip
              v-if="searchQuery && filteredMessages.length > 0"
              size="small"
              color="primary"
              variant="flat"
            >
              {{ filteredMessages.length }} result{{ filteredMessages.length !== 1 ? 's' : '' }}
            </v-chip>
          </template>
        </v-text-field>
      </div>
    </v-expand-transition>

    <v-divider />

    <!-- Chat Messages Area -->
    <v-card-text
      ref="messageListRef"
      class="message-list pa-4"
      :style="{ height: height }"
    >
      <div v-if="displayMessages.length === 0 && !searchQuery" class="text-center text-grey">
        <v-icon size="64" color="grey-lighten-1">mdi-chat-outline</v-icon>
        <p class="mt-2">Start a conversation</p>
      </div>

      <div v-else-if="displayMessages.length === 0 && searchQuery" class="text-center text-grey">
        <v-icon size="64" color="grey-lighten-1">mdi-magnify-close</v-icon>
        <p class="mt-2">No messages found matching "{{ searchQuery }}"</p>
      </div>

      <div v-else>
        <div
          v-for="message in displayMessages"
          :key="message.id"
          class="message-wrapper mb-4"
          :class="message.role === 'user' ? 'user-message' : 'assistant-message'"
        >
          <div class="d-flex" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
            <!-- Avatar -->
            <v-avatar
              v-if="message.role === 'assistant'"
              size="32"
              color="primary"
              class="mr-2"
            >
              <v-icon color="white">mdi-robot</v-icon>
            </v-avatar>

            <!-- Message Bubble -->
            <div
              class="message-bubble pa-3 rounded-lg"
              :class="{
                'user-bubble': message.role === 'user',
                'assistant-bubble': message.role === 'assistant'
              }"
            >
              <!-- Message Content with Markdown Rendering -->
              <div
                v-if="message.role === 'assistant'"
                class="message-content markdown-content"
                v-html="renderMarkdown(message.content)"
              />
              <div v-else class="message-content">
                {{ message.content }}
              </div>

              <!-- Source Citations -->
              <div v-if="message.sources && message.sources.length > 0" class="sources mt-3">
                <v-divider class="mb-2" />
                <div class="text-caption text-grey-darken-1 mb-1">
                  <v-icon size="small" class="mr-1">mdi-book-open-variant</v-icon>
                  Sources:
                </div>
                <div
                  v-for="(source, index) in message.sources"
                  :key="index"
                  class="source-item mb-1"
                >
                  <v-chip
                    size="small"
                    variant="outlined"
                    :href="source.url"
                    :target="source.url ? '_blank' : undefined"
                    :disabled="!source.url"
                    class="source-chip"
                  >
                    <v-icon start size="small">mdi-link-variant</v-icon>
                    {{ source.title }}
                    <v-tooltip activator="parent" location="top">
                      Relevance: {{ (source.relevance_score * 100).toFixed(0) }}%
                    </v-tooltip>
                  </v-chip>
                </div>
              </div>

              <!-- Timestamp -->
              <div class="text-caption text-grey mt-2">
                {{ formatTimestamp(message.timestamp) }}
              </div>
            </div>

            <!-- User Avatar -->
            <v-avatar
              v-if="message.role === 'user'"
              size="32"
              color="secondary"
              class="ml-2"
            >
              <v-icon color="white">mdi-account</v-icon>
            </v-avatar>
          </div>
        </div>

        <!-- Typing Indicator -->
        <div v-if="isTyping && !searchQuery" class="typing-indicator d-flex align-center mb-4">
          <v-avatar size="32" color="primary" class="mr-2">
            <v-icon color="white">mdi-robot</v-icon>
          </v-avatar>
          <div class="typing-bubble pa-3 rounded-lg">
            <div class="typing-dots">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        </div>
      </div>
    </v-card-text>

    <!-- Chat Input Area -->
    <v-divider />
    <v-card-actions class="pa-4">
      <v-textarea
        v-model="messageInput"
        :disabled="isLoading || !hasActiveSession"
        :placeholder="hasActiveSession ? 'Type your message...' : 'Initialize a session first'"
        rows="2"
        auto-grow
        variant="outlined"
        density="compact"
        hide-details
        class="flex-grow-1"
        @keydown.enter.exact.prevent="handleSendMessage"
      />
      <v-btn
        :disabled="!messageInput.trim() || isLoading || !hasActiveSession"
        :loading="isLoading"
        color="primary"
        icon="mdi-send"
        class="ml-2"
        @click="handleSendMessage"
      />
    </v-card-actions>

    <!-- Error Display -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      class="ma-4"
      @click:close="clearError"
    >
      {{ error }}
    </v-alert>

    <!-- Clear Chat Confirmation Dialog -->
    <v-dialog v-model="showClearDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Clear Chat History?</v-card-title>
        <v-card-text>
          This will clear all messages from the current chat session. This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showClearDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="handleClearChat">Clear</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useChatStore } from '@/stores/chat';
import { storeToRefs } from 'pinia';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Props
 */
interface Props {
  height?: string;
  autoScroll?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  height: '500px',
  autoScroll: true,
});

/**
 * Chat Store
 */
const chatStore = useChatStore();
const { messages, isLoading, isTyping, error, hasActiveSession } = storeToRefs(chatStore);

/**
 * Local State
 */
const messageInput = ref('');
const messageListRef = ref<HTMLElement | null>(null);
const searchQuery = ref('');
const showSearch = ref(false);
const showClearDialog = ref(false);

/**
 * Computed: Filtered messages based on search query
 */
const filteredMessages = computed(() => {
  if (!searchQuery.value.trim()) {
    return messages.value;
  }
  return chatStore.searchMessages(searchQuery.value);
});

/**
 * Computed: Messages to display (filtered or all)
 */
const displayMessages = computed(() => {
  return filteredMessages.value;
});

/**
 * Configure marked for markdown rendering
 */
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Render markdown content with sanitization
 * @param content - The markdown content to render
 * @returns Sanitized HTML string
 */
const renderMarkdown = (content: string): string => {
  try {
    const rawHtml = marked.parse(content) as string;
    // Sanitize HTML to prevent XSS attacks
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'table', 'thead',
        'tbody', 'tr', 'th', 'td',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
  } catch (error) {
    console.error('Error rendering markdown:', error);
    return content;
  }
};

/**
 * Format timestamp for display
 * @param timestamp - ISO timestamp string
 * @returns Formatted time string
 */
const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return '';
  }
};

/**
 * Scroll to bottom of message list
 */
const scrollToBottom = async () => {
  if (!props.autoScroll || !messageListRef.value) return;

  await nextTick();
  messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
};

/**
 * Handle sending a message
 */
const handleSendMessage = async () => {
  const message = messageInput.value.trim();
  if (!message || isLoading.value || !hasActiveSession.value) return;

  try {
    // Clear input immediately for better UX
    messageInput.value = '';

    // Send message through store
    await chatStore.sendMessage(message);

    // Scroll to bottom after message is sent
    await scrollToBottom();
  } catch (error) {
    console.error('Error sending message:', error);
    // Error is handled by the store and displayed in the UI
  }
};

/**
 * Handle exporting chat history
 * @param format - Export format ('json' or 'txt')
 */
const handleExport = (format: 'json' | 'txt') => {
  try {
    chatStore.downloadChatHistory(format);
  } catch (error) {
    console.error('Error exporting chat history:', error);
  }
};

/**
 * Handle clearing chat history
 */
const handleClearChat = () => {
  chatStore.clearMessages();
  showClearDialog.value = false;
  searchQuery.value = '';
};

/**
 * Clear error message
 */
const clearError = () => {
  chatStore.clearError();
};

/**
 * Watch for new messages and scroll to bottom (only when not searching)
 */
watch(
  () => messages.value.length,
  async () => {
    if (!searchQuery.value) {
      await scrollToBottom();
    }
  }
);

/**
 * Watch for typing indicator and scroll to bottom (only when not searching)
 */
watch(
  () => isTyping.value,
  async (newValue) => {
    if (newValue && !searchQuery.value) {
      await scrollToBottom();
    }
  }
);

/**
 * Watch for search query changes and scroll to top when searching
 */
watch(searchQuery, async () => {
  if (searchQuery.value && messageListRef.value) {
    await nextTick();
    messageListRef.value.scrollTop = 0;
  }
});

/**
 * Scroll to bottom on mount
 */
onMounted(() => {
  scrollToBottom();
});
</script>

<style scoped lang="scss">
.chat-interface {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.message-list {
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;

    &:hover {
      background: #555;
    }
  }
}

.message-wrapper {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-bubble {
  max-width: 70%;
  word-wrap: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.user-bubble {
  background-color: rgb(var(--v-theme-primary));
  color: white;
}

.assistant-bubble {
  background-color: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface-variant));
}

.message-content {
  line-height: 1.5;
}

/* Markdown Content Styling */
.markdown-content {
  :deep(p) {
    margin-bottom: 0.5em;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
  }

  :deep(ul), :deep(ol) {
    margin-left: 1.5em;
    margin-bottom: 0.5em;
  }

  :deep(li) {
    margin-bottom: 0.25em;
  }

  :deep(code) {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }

  :deep(pre) {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 1em;
    border-radius: 4px;
    overflow-x: auto;
    margin-bottom: 0.5em;

    code {
      background-color: transparent;
      padding: 0;
    }
  }

  :deep(blockquote) {
    border-left: 4px solid rgba(0, 0, 0, 0.2);
    padding-left: 1em;
    margin-left: 0;
    margin-bottom: 0.5em;
    font-style: italic;
  }

  :deep(a) {
    color: rgb(var(--v-theme-primary));
    text-decoration: underline;

    &:hover {
      text-decoration: none;
    }
  }

  :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 0.5em;
  }

  :deep(th), :deep(td) {
    border: 1px solid rgba(0, 0, 0, 0.1);
    padding: 0.5em;
    text-align: left;
  }

  :deep(th) {
    background-color: rgba(0, 0, 0, 0.05);
    font-weight: 600;
  }
}

.sources {
  .source-chip {
    margin-right: 0.5em;
    margin-bottom: 0.5em;
  }
}

/* Typing Indicator */
.typing-indicator {
  animation: fadeIn 0.3s ease-in;
}

.typing-bubble {
  background-color: rgb(var(--v-theme-surface-variant));
  padding: 0.75rem 1rem !important;
}

.typing-dots {
  display: flex;
  align-items: center;
  gap: 4px;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: rgb(var(--v-theme-primary));
    animation: typing 1.4s infinite;

    &:nth-child(2) {
      animation-delay: 0.2s;
    }

    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes typing {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
