<template>
  <v-container fluid class="chat-view pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon class="mr-2" color="primary">mdi-chat</v-icon>
              <span>AI Assistant Chat</span>
            </div>
            <div class="d-flex gap-2">
              <v-btn
                v-if="!hasActiveSession"
                color="primary"
                variant="elevated"
                prepend-icon="mdi-chat-plus"
                :loading="isLoading"
                @click="initializeSession"
              >
                Start New Chat
              </v-btn>
              <v-btn
                v-else
                color="error"
                variant="outlined"
                prepend-icon="mdi-chat-remove"
                :loading="isLoading"
                @click="confirmEndSession"
              >
                End Chat
              </v-btn>
            </div>
          </v-card-title>

          <v-divider />

          <!-- Chat Interface Component -->
          <ChatInterface height="calc(100vh - 250px)" />
        </v-card>
      </v-col>
    </v-row>

    <!-- Confirm End Session Dialog -->
    <v-dialog v-model="showEndDialog" max-width="400">
      <v-card>
        <v-card-title>End Chat Session?</v-card-title>
        <v-card-text>
          Are you sure you want to end this chat session? Your conversation history will be lost.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showEndDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="elevated" @click="endSession">End Session</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useChatStore } from '@/stores/chat';
import { storeToRefs } from 'pinia';
import { ChatInterface } from '@/components/chat';

/**
 * Chat Store
 */
const chatStore = useChatStore();
const { isLoading, hasActiveSession } = storeToRefs(chatStore);

/**
 * Local State
 */
const showEndDialog = ref(false);

/**
 * Initialize a new chat session
 */
const initializeSession = async () => {
  try {
    await chatStore.initSession();
  } catch (error) {
    console.error('Failed to initialize session:', error);
  }
};

/**
 * Show confirmation dialog before ending session
 */
const confirmEndSession = () => {
  showEndDialog.value = true;
};

/**
 * End the current chat session
 */
const endSession = async () => {
  try {
    await chatStore.endSession();
    showEndDialog.value = false;
  } catch (error) {
    console.error('Failed to end session:', error);
  }
};
</script>

<style scoped lang="scss">
.chat-view {
  height: 100%;
}
</style>
