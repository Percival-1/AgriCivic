<template>
  <v-navigation-drawer
    v-model="drawerModel"
    app
    :temporary="isMobile"
    :permanent="!isMobile"
    width="260"
  >
    <v-list nav>
      <!-- User Section -->
      <v-list-item
        v-if="isAuthenticated"
        class="mb-2"
        :prepend-avatar="userAvatar"
      >
        <v-list-item-title class="font-weight-bold">
          {{ userName }}
        </v-list-item-title>
        <v-list-item-subtitle>{{ userRole }}</v-list-item-subtitle>
      </v-list-item>

      <v-divider class="mb-2" />

      <!-- Navigation Items -->
      <v-list-item
        v-for="item in visibleMenuItems"
        :key="item.path"
        :to="item.path"
        :prepend-icon="item.icon"
        :title="item.title"
        :active="isActive(item.path)"
        color="primary"
        rounded="xl"
        class="mb-1"
      />
    </v-list>

    <!-- Footer Section -->
    <template #append>
      <v-divider />
      <v-list nav density="compact">
        <v-list-item
          prepend-icon="mdi-cog"
          title="Settings"
          to="/settings"
        />
        <v-list-item
          prepend-icon="mdi-help-circle"
          title="Help"
          @click="openHelp"
        />
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDisplay } from 'vuetify';

// Props
interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

// Composables
const route = useRoute();
const authStore = useAuthStore();
const { mobile } = useDisplay();

// Computed
const drawerModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isMobile = computed(() => mobile.value);
const isAuthenticated = computed(() => authStore.isAuthenticated);
const userName = computed(() => authStore.userName || 'User');
const userRole = computed(() => {
  const role = authStore.user?.role || 'user';
  return role.charAt(0).toUpperCase() + role.slice(1);
});
const userAvatar = computed(() => undefined); // Will use initials from AppBar

// Menu items configuration
interface MenuItem {
  title: string;
  icon: string;
  path: string;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    icon: 'mdi-view-dashboard',
    path: '/dashboard',
  },
  {
    title: 'Chat Assistant',
    icon: 'mdi-chat',
    path: '/chat',
  },
  {
    title: 'Disease Detection',
    icon: 'mdi-image-search',
    path: '/disease-detection',
  },
  {
    title: 'Weather',
    icon: 'mdi-weather-partly-cloudy',
    path: '/weather',
  },
  {
    title: 'Market Prices',
    icon: 'mdi-chart-line',
    path: '/market',
  },
  {
    title: 'Government Schemes',
    icon: 'mdi-file-document-multiple',
    path: '/schemes',
  },
  {
    title: 'Admin Panel',
    icon: 'mdi-shield-account',
    path: '/admin',
    roles: ['admin'],
  },
];

// Filter menu items based on user role
const visibleMenuItems = computed(() => {
  return menuItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(authStore.user?.role || 'user');
  });
});

// Methods
const isActive = (path: string): boolean => {
  return route.path === path || route.path.startsWith(path + '/');
};

const openHelp = () => {
  // TODO: Open help dialog or navigate to help page
  console.log('Open help');
};
</script>

<style scoped>
.v-list-item {
  margin-left: 8px;
  margin-right: 8px;
}
</style>
