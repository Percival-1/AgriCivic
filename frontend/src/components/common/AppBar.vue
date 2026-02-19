<template>
  <v-app-bar color="primary" elevation="2" app>
    <v-app-bar-nav-icon
      @click="toggleDrawer"
      aria-label="Toggle navigation menu"
    />

    <v-toolbar-title class="text-h6 font-weight-bold">
      Agri-Civic Intelligence
    </v-toolbar-title>

    <v-spacer />

    <!-- Language Selector -->
    <v-menu offset-y>
      <template #activator="{ props }">
        <v-btn
          icon
          v-bind="props"
          aria-label="Select language"
        >
          <v-icon>mdi-translate</v-icon>
        </v-btn>
      </template>
      <v-list>
        <v-list-item
          v-for="lang in languages"
          :key="lang.code"
          @click="changeLanguage(lang.code)"
        >
          <v-list-item-title>{{ lang.name }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

    <!-- Notification Bell -->
    <notification-bell />

    <!-- User Menu -->
    <v-menu offset-y>
      <template #activator="{ props }">
        <v-btn
          icon
          v-bind="props"
          aria-label="User menu"
        >
          <v-avatar size="32" color="secondary">
            <span class="text-white text-body-2">
              {{ userInitials }}
            </span>
          </v-avatar>
        </v-btn>
      </template>
      <v-list>
        <v-list-item>
          <v-list-item-title class="font-weight-bold">
            {{ userName }}
          </v-list-item-title>
          <v-list-item-subtitle>{{ userRole }}</v-list-item-subtitle>
        </v-list-item>
        <v-divider />
        <v-list-item @click="goToProfile">
          <template #prepend>
            <v-icon>mdi-account</v-icon>
          </template>
          <v-list-item-title>Profile</v-list-item-title>
        </v-list-item>
        <v-list-item @click="handleLogout">
          <template #prepend>
            <v-icon>mdi-logout</v-icon>
          </template>
          <v-list-item-title>Logout</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-app-bar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import NotificationBell from './NotificationBell.vue';

// Props
interface Props {
  onToggleDrawer?: () => void;
}

const props = defineProps<Props>();

// Composables
const router = useRouter();
const authStore = useAuthStore();

// Computed
const userName = computed(() => authStore.userName || 'User');
const userRole = computed(() => authStore.user?.role || 'user');
const userInitials = computed(() => {
  const name = authStore.userName || 'U';
  const parts = name.split(' ').filter(p => p.length > 0);
  if (parts.length >= 2) {
    const first = parts[0]?.charAt(0) || '';
    const second = parts[1]?.charAt(0) || '';
    if (first && second) {
      return (first + second).toUpperCase();
    }
  }
  return name.substring(0, Math.min(2, name.length)).toUpperCase();
});

// Language options
const languages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'bn', name: 'বাংলা' },
];

// Methods
const toggleDrawer = () => {
  if (props.onToggleDrawer) {
    props.onToggleDrawer();
  }
};

const changeLanguage = (langCode: string) => {
  // TODO: Implement language change via i18n
  console.log('Change language to:', langCode);
};

const goToProfile = () => {
  router.push('/profile');
};

const handleLogout = async () => {
  try {
    await authStore.logout();
    router.push('/login');
  } catch (error) {
    console.error('Logout error:', error);
  }
};
</script>

<style scoped>
.v-toolbar-title {
  cursor: pointer;
}
</style>
