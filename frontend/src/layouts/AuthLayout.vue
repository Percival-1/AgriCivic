<template>
  <v-app>
    <!-- Main Content Area with Centered Card -->
    <v-main class="auth-layout">
      <v-container fluid class="fill-height">
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="6" lg="4">
            <!-- Branding Section -->
            <div class="text-center mb-6">
             <v-img
                src="@/assets/vue.svg"
                alt="Agri-Civic Intelligence Platform"
                max-width="60"
                cla ss="mx-auto mb-3"
              />
              <h1 class="text-h5 font-weight-bold mb-2 text-white">
                Agri-Civic Intelligence
              </h1>
              <p class="text-body-2 text-white text-opacity-90">
                Empowering farmers with AI-driven insights
              </p>
            </div>

            <!-- Language Selector -->
            <div class="text-center mb-4">
              <v-menu offset-y>
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-translate"
                    class="text-none"
                    color="white"
                  >
                    {{ currentLanguage.name }}
                    <v-icon end>mdi-chevron-down</v-icon>
                  </v-btn>
                </template>
                <v-list>
                  <v-list-item
                    v-for="lang in languages"
                    :key="lang.code"
                    :value="lang.code"
                    @click="changeLanguage(lang.code)"
                  >
                    <v-list-item-title>{{ lang.name }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>

            <!-- Auth Card -->
            <v-card elevation="8" class="auth-card">
              <v-card-text class="pa-6">
                <!-- Router View for Auth Pages -->
                <router-view v-slot="{ Component }">
                  <transition name="slide-fade" mode="out-in">
                    <component :is="Component" />
                  </transition>
                </router-view>
              </v-card-text>
            </v-card>

            <!-- Footer Links -->
            <div class="text-center mt-6">
              <v-btn
                variant="text"
                size="small"
                class="text-none text-white text-opacity-90"
                @click="openHelp"
              >
                Help
              </v-btn>
              <span class="mx-2 text-white text-opacity-70">•</span>
              <v-btn
                variant="text"
                size="small"
                class="text-none text-white text-opacity-90"
                @click="openPrivacy"
              >
                Privacy
              </v-btn>
              <span class="mx-2 text-white text-opacity-70">•</span>
              <v-btn
                variant="text"
                size="small"
                class="text-none text-white text-opacity-90"
                @click="openTerms"
              >
                Terms
              </v-btn>
            </div>

            <!-- Copyright -->
            <div class="text-center mt-4">
              <p class="text-caption text-white text-opacity-80">
                © {{ currentYear }} Agri-Civic Intelligence Platform
              </p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// Language configuration
interface Language {
  code: string;
  name: string;
}

const languages = ref<Language[]>([
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
  { code: 'te', name: 'తెలుగు (Telugu)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml', name: 'മലയാളം (Malayalam)' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)' },
]);

const selectedLanguage = ref<string>('en');

// Computed
const currentLanguage = computed((): Language => {
  const found = languages.value.find(lang => lang.code === selectedLanguage.value);
  return found || languages.value[0]!;
});

const currentYear = computed(() => new Date().getFullYear());

// Methods
const changeLanguage = (langCode: string) => {
  selectedLanguage.value = langCode;
  // TODO: Integrate with vue-i18n when implemented
  // Store preference in localStorage
  localStorage.setItem('language_preference', langCode);
  console.log('Language changed to:', langCode);
};

const openHelp = () => {
  // TODO: Navigate to help page or open help modal
  console.log('Open help');
};

const openPrivacy = () => {
  // TODO: Navigate to privacy policy page
  console.log('Open privacy policy');
};

const openTerms = () => {
  // TODO: Navigate to terms page
  console.log('Open terms of service');
};

// Initialize language from localStorage
const storedLanguage = localStorage.getItem('language_preference');
if (storedLanguage && languages.value.some(lang => lang.code === storedLanguage)) {
  selectedLanguage.value = storedLanguage;
}
</script>

<style scoped>
/* Auth Layout Background */
.auth-layout {
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  min-height: 100vh;
}

/* Auth Card Styling */
.auth-card {
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

/* Slide Fade Transition */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .auth-card {
    border-radius: 12px;
  }
  
  .auth-layout .v-card-text {
    padding: 1rem !important;
  }
}
</style>
