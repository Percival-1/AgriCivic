<template>
  <v-menu offset-y max-width="400">
    <template #activator="{ props }">
      <v-btn
        icon
        v-bind="props"
        aria-label="Notifications"
      >
        <v-badge
          :content="unreadCount"
          :model-value="hasUnread"
          color="error"
          overlap
        >
          <v-icon>mdi-bell</v-icon>
        </v-badge>
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Notifications</span>
        <v-btn
          v-if="hasUnread"
          size="small"
          variant="text"
          @click="markAllAsRead"
        >
          Mark all read
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-list v-if="notifications.length > 0" max-height="400" class="overflow-y-auto">
        <v-list-item
          v-for="notification in notifications.slice(0, 5)"
          :key="notification.id"
          :class="{ 'bg-grey-lighten-4': !notification.read }"
          @click="handleNotificationClick(notification)"
        >
          <template #prepend>
            <v-icon :color="getNotificationColor(notification.type)">
              {{ getNotificationIcon(notification.type) }}
            </v-icon>
          </template>

          <v-list-item-title>{{ notification.title }}</v-list-item-title>
          <v-list-item-subtitle class="text-wrap">
            {{ notification.message }}
          </v-list-item-subtitle>

          <template #append>
            <v-chip
              v-if="notification.priority === 'high'"
              size="x-small"
              color="error"
            >
              High
            </v-chip>
          </template>
        </v-list-item>
      </v-list>

      <v-card-text v-else class="text-center text-grey">
        No notifications
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-btn
          block
          variant="text"
          @click="goToNotifications"
        >
          View All Notifications
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

// Mock notification store - will be replaced with actual store
interface Notification {
  id: string;
  type: 'weather' | 'market' | 'scheme' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  created_at: string;
}

// Temporary mock data
const notifications = computed<Notification[]>(() => []);
const unreadCount = computed(() => 0);
const hasUnread = computed(() => unreadCount.value > 0);

const router = useRouter();

// Methods
const getNotificationIcon = (type: string): string => {
  const icons: Record<string, string> = {
    weather: 'mdi-weather-partly-cloudy',
    market: 'mdi-chart-line',
    scheme: 'mdi-file-document',
    system: 'mdi-information',
  };
  return icons[type] || 'mdi-bell';
};

const getNotificationColor = (type: string): string => {
  const colors: Record<string, string> = {
    weather: 'blue',
    market: 'green',
    scheme: 'orange',
    system: 'grey',
  };
  return colors[type] || 'grey';
};

const handleNotificationClick = (notification: Notification) => {
  // TODO: Mark as read and navigate to relevant page
  console.log('Notification clicked:', notification);
};

const markAllAsRead = () => {
  // TODO: Implement mark all as read
  console.log('Mark all as read');
};

const goToNotifications = () => {
  router.push('/notifications');
};

onMounted(() => {
  // TODO: Fetch notifications
});
</script>

<style scoped>
.text-wrap {
  white-space: normal;
}
</style>
