<template>
  <v-app>
    <!-- App Bar -->
    <app-bar :on-toggle-drawer="toggleDrawer" />

    <!-- Navigation Drawer -->
    <navigation-drawer v-model="drawer" />

    <!-- Main Content Area -->
    <v-main>
      <v-container fluid class="pa-4">
        <!-- Router View for Page Content -->
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </v-container>
    </v-main>

    <!-- Footer -->
    <v-footer app class="bg-grey-lighten-3" elevation="2">
      <v-container>
        <v-row align="center" justify="space-between">
          <v-col cols="12" md="6" class="text-center text-md-left">
            <span class="text-body-2 text-grey-darken-2">
              © {{ currentYear }} Agri-Civic Intelligence Platform. All rights reserved.
            </span>
          </v-col>
          <v-col cols="12" md="6" class="text-center text-md-right">
            <v-btn
              variant="text"
              size="small"
              @click="openPrivacyPolicy"
            >
              Privacy Policy
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              @click="openTerms"
            >
              Terms of Service
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              @click="openContact"
            >
              Contact Us
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-footer>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDisplay } from 'vuetify';
import AppBar from '@/components/common/AppBar.vue';
import NavigationDrawer from '@/components/common/NavigationDrawer.vue';

// Composables
const { mobile } = useDisplay();

// State
const drawer = ref(!mobile.value);

// Computed
const currentYear = computed(() => new Date().getFullYear());

// Methods
const toggleDrawer = () => {
  drawer.value = !drawer.value;
};

const openPrivacyPolicy = () => {
  // TODO: Navigate to privacy policy page or open modal
  console.log('Open privacy policy');
};

const openTerms = () => {
  // TODO: Navigate to terms page or open modal
  console.log('Open terms of service');
};

const openContact = () => {
  // TODO: Navigate to contact page or open modal
  console.log('Open contact');
};

// Lifecycle
onMounted(() => {
  // Initialize drawer state based on screen size
  drawer.value = !mobile.value;
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
  min-height: calc(100vh - 64px - 48px); /* viewport - app bar - footer */
}

/* Footer styling */
.v-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
