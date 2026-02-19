<template>
  <v-app>
    <!-- Admin App Bar -->
    <v-app-bar
      app
      elevation="1"
      color="primary"
      dark
      height="64"
    >
      <v-app-bar-nav-icon @click="toggleSidebar" />
      
      <v-toolbar-title class="text-h6 font-weight-bold">
        Admin Dashboard
      </v-toolbar-title>

      <!-- Breadcrumbs -->
      <v-breadcrumbs
        v-if="!mobile"
        :items="breadcrumbItems"
        class="ml-4"
        divider="/"
      >
        <template #item="{ item }">
          <v-breadcrumbs-item
            :to="item.to"
            :disabled="item.disabled"
            class="text-white text-opacity-90"
          >
            {{ item.title }}
          </v-breadcrumbs-item>
        </template>
      </v-breadcrumbs>

      <v-spacer />

      <!-- Quick Stats Display -->
      <div v-if="!mobile" class="d-flex align-center mr-4">
        <v-chip
          size="small"
          variant="outlined"
          color="white"
          class="mr-2"
          prepend-icon="mdi-account-multiple"
        >
          {{ stats.totalUsers }} Users
        </v-chip>
        <v-chip
          size="small"
          variant="outlined"
          color="white"
          class="mr-2"
          prepend-icon="mdi-alert-circle"
        >
          {{ stats.activeAlerts }} Alerts
        </v-chip>
        <v-chip
          size="small"
          variant="outlined"
          :color="stats.systemHealth === 'healthy' ? 'success' : 'error'"
        >
          <v-icon start>
            {{ stats.systemHealth === 'healthy' ? 'mdi-check-circle' : 'mdi-alert' }}
          </v-icon>
          {{ stats.systemHealth === 'healthy' ? 'Healthy' : 'Issues' }}
        </v-chip>
      </div>

      <!-- Notification Bell -->
      <notification-bell />

      <!-- User Menu -->
      <v-menu offset-y>
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon
            class="ml-2"
          >
            <v-avatar size="36" color="white">
              <v-icon color="primary">mdi-account</v-icon>
            </v-avatar>
          </v-btn>
        </template>
        <v-list>
          <v-list-item>
            <v-list-item-title class="font-weight-bold">
              {{ userName }}
            </v-list-item-title>
            <v-list-item-subtitle>Administrator</v-list-item-subtitle>
          </v-list-item>
          <v-divider />
          <v-list-item @click="goToUserDashboard">
            <template #prepend>
              <v-icon>mdi-view-dashboard</v-icon>
            </template>
            <v-list-item-title>User Dashboard</v-list-item-title>
          </v-list-item>
          <v-list-item @click="logout">
            <template #prepend>
              <v-icon>mdi-logout</v-icon>
            </template>
            <v-list-item-title>Logout</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Admin Sidebar Navigation -->
    <v-navigation-drawer
      v-model="sidebar"
      app
      :permanent="!mobile"
      :temporary="mobile"
      width="260"
    >
      <!-- Sidebar Header -->
      <v-list-item class="px-4 py-3 bg-primary">
        <v-list-item-title class="text-h6 font-weight-bold text-white">
          Admin Panel
        </v-list-item-title>
        <v-list-item-subtitle class="text-white text-opacity-80">
          System Management
        </v-list-item-subtitle>
      </v-list-item>

      <v-divider />

      <!-- Navigation Menu Items -->
      <v-list nav density="compact">
        <v-list-item
          v-for="item in menuItems"
          :key="item.title"
          :to="item.to"
          :prepend-icon="item.icon"
          :active="isActiveRoute(item.to)"
          color="primary"
        >
          <v-list-item-title>{{ item.title }}</v-list-item-title>
          <template v-if="item.badge" #append>
            <v-badge
              :content="item.badge"
              color="error"
              inline
            />
          </template>
        </v-list-item>
      </v-list>

      <v-divider class="my-2" />

      <!-- System Section -->
      <v-list nav density="compact">
        <v-list-subheader>SYSTEM</v-list-subheader>
        <v-list-item
          v-for="item in systemItems"
          :key="item.title"
          :to="item.to"
          :prepend-icon="item.icon"
          :active="isActiveRoute(item.to)"
          color="primary"
        >
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>

      <!-- Sidebar Footer -->
      <template #append>
        <div class="pa-4">
          <v-btn
            block
            variant="outlined"
            color="primary"
            prepend-icon="mdi-refresh"
            size="small"
            @click="refreshStats"
          >
            Refresh Stats
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Main Content Area -->
    <v-main>
      <v-container fluid class="pa-4">
        <!-- Mobile Breadcrumbs -->
        <v-breadcrumbs
          v-if="mobile"
          :items="breadcrumbItems"
          class="px-0 mb-4"
          divider="/"
        />

        <!-- Mobile Quick Stats -->
        <v-row v-if="mobile" class="mb-4">
          <v-col cols="4">
            <v-card>
              <v-card-text class="text-center pa-2">
                <div class="text-caption text-grey">Users</div>
                <div class="text-h6">{{ stats.totalUsers }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="4">
            <v-card>
              <v-card-text class="text-center pa-2">
                <div class="text-caption text-grey">Alerts</div>
                <div class="text-h6">{{ stats.activeAlerts }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="4">
            <v-card :color="stats.systemHealth === 'healthy' ? 'success' : 'error'">
              <v-card-text class="text-center pa-2">
                <div class="text-caption text-white">Health</div>
                <v-icon color="white" size="24">
                  {{ stats.systemHealth === 'healthy' ? 'mdi-check-circle' : 'mdi-alert' }}
                </v-icon>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Router View for Admin Pages -->
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/auth';
import NotificationBell from '@/components/common/NotificationBell.vue';

// Composables
const route = useRoute();
const router = useRouter();
const { mobile } = useDisplay();
const authStore = useAuthStore();

// Types
interface MenuItem {
  title: string;
  icon: string;
  to: string;
  badge?: string | number;
}

// State
const sidebar = ref(!mobile.value);
const stats = ref({
  totalUsers: 0,
  activeAlerts: 0,
  systemHealth: 'healthy' as 'healthy' | 'issues',
});

// Menu Items
const menuItems = ref<MenuItem[]>([
  {
    title: 'Dashboard',
    icon: 'mdi-view-dashboard',
    to: '/admin',
  },
  {
    title: 'User Management',
    icon: 'mdi-account-multiple',
    to: '/admin/users',
  },
  {
    title: 'System Monitoring',
    icon: 'mdi-monitor-dashboard',
    to: '/admin/monitoring',
  },
  {
    title: 'Cache Management',
    icon: 'mdi-database',
    to: '/admin/cache',
  },
  {
    title: 'Content Management',
    icon: 'mdi-file-document-multiple',
    to: '/admin/content',
  },
  {
    title: 'Portal Sync',
    icon: 'mdi-sync',
    to: '/admin/portal-sync',
  },
  {
    title: 'Notifications',
    icon: 'mdi-bell',
    to: '/admin/notifications',
  },
]);

const systemItems = ref<MenuItem[]>([
  {
    title: 'Settings',
    icon: 'mdi-cog',
    to: '/admin/settings',
  },
  {
    title: 'Logs',
    icon: 'mdi-text-box-multiple',
    to: '/admin/logs',
  },
]);

// Computed
const userName = computed(() => authStore.user?.name || 'Admin');

const breadcrumbItems = computed(() => {
  const items = [
    {
      title: 'Admin',
      to: '/admin',
      disabled: false,
    },
  ];

  // Parse current route to build breadcrumbs
  const pathSegments = route.path.split('/').filter(Boolean);
  
  if (pathSegments.length > 1) {
    // Remove 'admin' from segments as it's already in the base
    const adminSegments = pathSegments.slice(1);
    
    adminSegments.forEach((segment, index) => {
      const title = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      const path = '/admin/' + adminSegments.slice(0, index + 1).join('/');
      
      items.push({
        title,
        to: path,
        disabled: index === adminSegments.length - 1, // Disable last item (current page)
      });
    });
  }

  return items;
});

// Methods
const toggleSidebar = () => {
  sidebar.value = !sidebar.value;
};

const isActiveRoute = (path: string) => {
  if (path === '/admin') {
    return route.path === '/admin' || route.path === '/admin/';
  }
  return route.path.startsWith(path);
};

const goToUserDashboard = () => {
  router.push('/dashboard');
};

const logout = async () => {
  await authStore.logout();
  router.push('/login');
};

const refreshStats = async () => {
  // TODO: Fetch real stats from API
  // For now, using mock data
  stats.value = {
    totalUsers: Math.floor(Math.random() * 1000) + 500,
    activeAlerts: Math.floor(Math.random() * 10),
    systemHealth: Math.random() > 0.2 ? 'healthy' : 'issues',
  };
};

const fetchStats = async () => {
  // TODO: Implement API call to fetch real stats
  // This should call the monitoring service to get:
  // - Total user count
  // - Active alerts count
  // - System health status
  
  // Mock data for now
  stats.value = {
    totalUsers: 847,
    activeAlerts: 3,
    systemHealth: 'healthy',
  };
};

// Lifecycle
onMounted(() => {
  // Initialize sidebar state based on screen size
  sidebar.value = !mobile.value;
  
  // Fetch initial stats
  fetchStats();
});

// Watch for mobile changes
watch(mobile, (newValue) => {
  sidebar.value = !newValue;
});
</script>

<style scoped>
/* Fade transition for route changes */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Main content styling */
.v-main {
  background-color: #f5f5f5;
}

/* Sidebar styling */
.v-navigation-drawer {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

/* Active route highlighting */
.v-list-item--active {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

/* Breadcrumbs styling */
.v-breadcrumbs {
  padding: 0;
}

.v-breadcrumbs-item {
  font-size: 0.875rem;
}

/* Quick stats chips */
.v-chip {
  font-weight: 500;
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .v-toolbar-title {
    font-size: 1rem !important;
  }
}
</style>
