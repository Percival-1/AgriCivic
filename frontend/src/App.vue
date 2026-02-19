<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';

// Lazy load layouts
const DefaultLayout = defineAsyncComponent(() => import('@/layouts/DefaultLayout.vue'));
const AuthLayout = defineAsyncComponent(() => import('@/layouts/AuthLayout.vue'));
const AdminLayout = defineAsyncComponent(() => import('@/layouts/AdminLayout.vue'));

// Composables
const route = useRoute();

// Computed layout based on route meta
const layout = computed(() => {
  const layoutName = route.meta.layout as string | undefined;
  
  switch (layoutName) {
    case 'auth':
      return AuthLayout;
    case 'admin':
      return AdminLayout;
    default:
      return DefaultLayout;
  }
});
</script>

<style>
/* Global app styles */
html,
body {
  overflow-x: hidden;
  overflow-y: auto;
}

body {
  font-family: 'Roboto', sans-serif;
}
</style>
