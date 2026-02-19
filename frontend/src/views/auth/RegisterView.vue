<template>
  <v-container class="fill-height register-container" fluid>
    <v-row align="center" justify="center" class="ma-0">
      <!-- Fixed column width for consistent sizing across all screens -->
      <v-col cols="12" sm="10" md="8" lg="6" xl="5">
        <v-card elevation="12" rounded="xl" class="register-card">
          <!-- Header Section -->
          <v-card-title class="text-center pa-8 pb-4">
            <div class="text-h4 font-weight-bold text-primary mb-2">
              Create Account
            </div>
            <div class="text-subtitle-1 text-medium-emphasis">
              Join us to access agricultural intelligence services
            </div>
          </v-card-title>

          <v-card-text class="px-12 pb-8 pt-4">
            <v-form @submit.prevent="handleSubmit">
              <!-- Phone Number Field -->
              <div class="mb-5">
                <v-text-field
                  v-model="phoneNumber"
                  label="Phone Number"
                  placeholder="+1234567890"
                  prepend-inner-icon="mdi-phone"
                  variant="outlined"
                  :error-messages="errors.phone_number"
                  :disabled="isLoading"
                  @blur="validateField('phone_number')"
                  data-test="phone-input"
                  hide-details="auto"
                  class="large-input"
                />
              </div>

              <!-- Full Name Field -->
              <div class="mb-5">
                <v-text-field
                  v-model="fullName"
                  label="Full Name (Optional)"
                  placeholder="Enter your full name"
                  prepend-inner-icon="mdi-account"
                  variant="outlined"
                  :error-messages="errors.name"
                  :disabled="isLoading"
                  @blur="validateField('name')"
                  data-test="name-input"
                  hide-details="auto"
                  class="large-input"
                />
              </div>

              <!-- Language Preference Field -->
              <div class="mb-5">
                <v-select
                  v-model="languagePreference"
                  label="Preferred Language (Optional)"
                  :items="languageOptions"
                  item-title="name"
                  item-value="code"
                  prepend-inner-icon="mdi-translate"
                  variant="outlined"
                  :disabled="isLoading"
                  data-test="language-select"
                  hide-details="auto"
                  class="large-input"
                />
              </div>

              <!-- Location Section -->
              <v-expansion-panels class="mb-5">
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <v-icon class="mr-2">mdi-map-marker</v-icon>
                    Location (Optional)
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <div class="pa-2">
                      <!-- Use Current Location Button -->
                      <v-btn
                        v-if="isGeolocationSupported"
                        color="primary"
                        variant="outlined"
                        block
                        :loading="gettingLocation"
                        :disabled="isLoading"
                        @click="useCurrentLocation"
                        class="mb-4"
                      >
                        <v-icon class="mr-2">mdi-crosshairs-gps</v-icon>
                        Use My Current Location
                      </v-btn>

                      <!-- Location Address -->
                      <v-text-field
                        v-model="locationAddress"
                        label="Address"
                        placeholder="Enter your address"
                        prepend-inner-icon="mdi-home-map-marker"
                        variant="outlined"
                        :disabled="isLoading"
                        hide-details="auto"
                        class="large-input mb-4"
                      />

                      <!-- District and State -->
                      <v-row>
                        <v-col cols="12" sm="6">
                          <v-text-field
                            v-model="district"
                            label="District"
                            placeholder="Enter district"
                            variant="outlined"
                            :disabled="isLoading"
                            hide-details="auto"
                            class="large-input"
                          />
                        </v-col>
                        <v-col cols="12" sm="6">
                          <v-text-field
                            v-model="state"
                            label="State"
                            placeholder="Enter state"
                            variant="outlined"
                            :disabled="isLoading"
                            hide-details="auto"
                            class="large-input"
                          />
                        </v-col>
                      </v-row>

                      <!-- Coordinates (Read-only, auto-filled) -->
                      <v-row v-if="locationLat && locationLng" class="mt-2">
                        <v-col cols="12">
                          <v-alert type="info" variant="tonal" density="compact">
                            <v-icon size="small" class="mr-2">mdi-map-marker-check</v-icon>
                            Location detected: {{ locationLat.toFixed(6) }}, {{ locationLng.toFixed(6) }}
                          </v-alert>
                        </v-col>
                      </v-row>
                    </div>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>

              <!-- Password Field -->
              <div class="mb-3">
                <v-text-field
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  label="Password"
                  prepend-inner-icon="mdi-lock"
                  :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  variant="outlined"
                  :error-messages="errors.password"
                  :disabled="isLoading"
                  @click:append-inner="showPassword = !showPassword"
                  @blur="validateField('password')"
                  @input="onPasswordInput"
                  data-test="password-input"
                  hide-details="auto"
                  class="large-input"
                />
              </div>

              <!-- Password Strength Indicator -->
              <v-expand-transition>
                <div v-if="password && passwordStrength" class="password-strength-section mb-4 mt-3">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <span class="text-caption text-medium-emphasis">Password Strength:</span>
                    <v-chip
                      :color="strengthColor"
                      size="x-small"
                      variant="flat"
                      class="font-weight-bold"
                    >
                      {{ passwordStrength.strength.toUpperCase() }}
                    </v-chip>
                  </div>
                  <v-progress-linear
                    :model-value="(passwordStrength.score / 5) * 100"
                    :color="strengthColor"
                    height="8"
                    rounded
                    class="mb-2"
                  />
                  <div v-if="passwordStrength.feedback.length > 0" class="feedback-list">
                    <div
                      v-for="(feedback, index) in passwordStrength.feedback"
                      :key="index"
                      class="text-caption text-medium-emphasis d-flex align-start mb-1"
                    >
                      <v-icon size="x-small" class="mr-1 mt-1">mdi-information-outline</v-icon>
                      <span>{{ feedback }}</span>
                    </div>
                  </div>
                </div>
              </v-expand-transition>

              <!-- Confirm Password Field -->
              <div class="mb-5">
                <v-text-field
                  v-model="confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  label="Confirm Password"
                  prepend-inner-icon="mdi-lock-check"
                  :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  variant="outlined"
                  :error-messages="errors.confirm_password"
                  :disabled="isLoading"
                  @click:append-inner="showConfirmPassword = !showConfirmPassword"
                  @blur="validateField('confirm_password')"
                  data-test="confirm-password-input"
                  hide-details="auto"
                  class="large-input"
                />
              </div>

              <!-- Terms and Conditions Checkbox -->
              <div class="mb-5">
                <v-checkbox
                  v-model="termsAccepted"
                  :error-messages="errors.terms_accepted"
                  color="primary"
                  :disabled="isLoading"
                  hide-details="auto"
                  density="compact"
                  data-test="terms-checkbox"
                >
                  <template #label>
                    <span class="text-body-2">
                      I agree to the
                      <a href="#" class="text-primary text-decoration-none" @click.prevent="showTermsDialog = true">
                        Terms and Conditions
                      </a>
                    </span>
                  </template>
                </v-checkbox>
              </div>

              <!-- Error Alert -->
              <v-expand-transition>
                <v-alert
                  v-if="registerError"
                  type="error"
                  variant="tonal"
                  closable
                  class="mb-5"
                  density="compact"
                  @click:close="registerError = null"
                >
                  <div class="d-flex align-center">
                    <v-icon class="mr-2">mdi-alert-circle</v-icon>
                    <span>{{ registerError }}</span>
                  </div>
                </v-alert>
              </v-expand-transition>

              <!-- Success Alert -->
              <v-expand-transition>
                <v-alert
                  v-if="registrationSuccess"
                  type="success"
                  variant="tonal"
                  class="mb-5"
                  density="compact"
                >
                  <div class="d-flex align-center">
                    <v-icon class="mr-2">mdi-check-circle</v-icon>
                    <span>Registration successful! Redirecting to login...</span>
                  </div>
                </v-alert>
              </v-expand-transition>

              <!-- Submit Button -->
              <v-btn
                type="submit"
                color="primary"
                size="x-large"
                block
                rounded="lg"
                elevation="2"
                :loading="isLoading"
                :disabled="isLoading || !isFormValid"
                data-test="register-button"
                class="mb-4 text-none font-weight-bold submit-button"
              >
                <v-icon class="mr-2">mdi-account-plus</v-icon>
                <span>Create Account</span>
              </v-btn>

              <!-- Divider -->
              <v-divider class="my-6" />

              <!-- Login Link -->
              <div class="text-center">
                <span class="text-body-2 text-medium-emphasis">Already have an account?</span>
                <v-btn
                  variant="text"
                  color="primary"
                  size="small"
                  :to="{ name: 'Login' }"
                  :disabled="isLoading"
                  class="text-none font-weight-bold ml-1"
                >
                  Sign In
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Terms and Conditions Dialog -->
    <v-dialog v-model="showTermsDialog" max-width="600">
      <v-card>
        <v-card-title class="text-h5 pa-6 pb-4">
          Terms and Conditions
        </v-card-title>
        <v-card-text class="pa-6 pt-2">
          <div class="terms-content">
            <p class="mb-4">
              Welcome to the AI-Driven Agri-Civic Intelligence Platform. By creating an account, you agree to the following terms:
            </p>
            <ol class="pl-4">
              <li class="mb-2">You will provide accurate and truthful information during registration.</li>
              <li class="mb-2">You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li class="mb-2">You will use the platform for lawful agricultural and civic purposes only.</li>
              <li class="mb-2">The platform provides information and recommendations for guidance purposes only.</li>
              <li class="mb-2">We reserve the right to suspend or terminate accounts that violate these terms.</li>
              <li class="mb-2">Your personal data will be handled according to our Privacy Policy.</li>
            </ol>
            <p class="mt-4 text-caption text-medium-emphasis">
              Last updated: {{ new Date().toLocaleDateString() }}
            </p>
          </div>
        </v-card-text>
        <v-card-actions class="pa-6 pt-2">
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            @click="showTermsDialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useGeolocation } from '@/composables/useGeolocation';
import { registerSchema } from '@/utils/validation';
import { validatePasswordStrength, extractValidationErrors } from '@/utils/validation';
import { SUPPORTED_LANGUAGES } from '@/utils/constants';
import type { ValidationError } from 'yup';

// Router and store
const router = useRouter();
const authStore = useAuthStore();

// Geolocation
const { getCurrentPosition, isSupported: isGeolocationSupported } = useGeolocation();

// Form fields
const phoneNumber = ref('');
const fullName = ref('');
const languagePreference = ref('en');
const password = ref('');
const confirmPassword = ref('');
const termsAccepted = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);

// Location fields
const locationLat = ref<number | null>(null);
const locationLng = ref<number | null>(null);
const locationAddress = ref('');
const district = ref('');
const state = ref('');
const gettingLocation = ref(false);

// Form state
const isLoading = ref(false);
const registerError = ref<string | null>(null);
const registrationSuccess = ref(false);
const errors = ref<Record<string, string>>({});
const showTermsDialog = ref(false);

// Password strength
const passwordStrength = ref<ReturnType<typeof validatePasswordStrength> | null>(null);

// Language options
const languageOptions = SUPPORTED_LANGUAGES;

// Computed properties
const isFormValid = computed(() => {
  return phoneNumber.value.trim() !== '' && 
         password.value.trim() !== '' && 
         confirmPassword.value.trim() !== '' &&
         termsAccepted.value === true &&
         Object.keys(errors.value).length === 0;
});

const strengthColor = computed(() => {
  if (!passwordStrength.value) return 'grey';
  
  switch (passwordStrength.value.strength) {
    case 'weak':
      return 'error';
    case 'medium':
      return 'warning';
    case 'strong':
      return 'success';
    default:
      return 'grey';
  }
});

// Methods
const useCurrentLocation = async () => {
  gettingLocation.value = true;
  registerError.value = null;

  try {
    const coords = await getCurrentPosition();
    locationLat.value = coords.latitude;
    locationLng.value = coords.longitude;
    
    // Optionally, you could reverse geocode here to get address
    // For now, just show coordinates
  } catch (err: any) {
    registerError.value = err.message || 'Failed to get your location. Please enter it manually.';
  } finally {
    gettingLocation.value = false;
  }
};

const validateField = async (field: 'phone_number' | 'password' | 'confirm_password' | 'name' | 'terms_accepted') => {
  try {
    const fieldValue = {
      phone_number: phoneNumber.value,
      password: password.value,
      confirm_password: confirmPassword.value,
      name: fullName.value,
      terms_accepted: termsAccepted.value,
    }[field];

    await registerSchema.validateAt(field, { [field]: fieldValue, password: password.value });
    
    // Clear error for this field if validation passes
    delete errors.value[field];
  } catch (error) {
    if (error instanceof Error && 'message' in error) {
      errors.value[field] = (error as ValidationError).message;
    }
  }
};

const onPasswordInput = () => {
  // Update password strength indicator in real-time
  if (password.value) {
    passwordStrength.value = validatePasswordStrength(password.value);
  } else {
    passwordStrength.value = null;
  }
  
  // Clear password error when user starts typing
  if (errors.value.password) {
    delete errors.value.password;
  }

  // Re-validate confirm password if it has a value
  if (confirmPassword.value) {
    validateField('confirm_password');
  }
};

const handleSubmit = async () => {
  // Clear previous errors
  registerError.value = null;
  registrationSuccess.value = false;
  errors.value = {};

  // Validate form
  try {
    await registerSchema.validate(
      {
        phone_number: phoneNumber.value,
        password: password.value,
        confirm_password: confirmPassword.value,
        name: fullName.value || undefined,
        preferred_language: languagePreference.value || undefined,
        terms_accepted: termsAccepted.value,
      },
      { abortEarly: false }
    );
  } catch (error) {
    if (error instanceof Error && 'inner' in error) {
      const validationError = error as ValidationError;
      errors.value = extractValidationErrors(validationError);
    }
    return;
  }

  // Submit registration
  isLoading.value = true;

  try {
    await authStore.register({
      phone_number: phoneNumber.value,
      password: password.value,
      name: fullName.value || undefined,
      preferred_language: languagePreference.value || undefined,
      location_lat: locationLat.value,
      location_lng: locationLng.value,
      location_address: locationAddress.value || undefined,
      district: district.value || undefined,
      state: state.value || undefined,
    });

    // Show success message
    registrationSuccess.value = true;

    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push({ name: 'Login', query: { registered: 'true' } });
    }, 2000);
  } catch (error: any) {
    // Display error message
    registerError.value = error.response?.data?.detail || error.message || 'Registration failed. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

// Watch for field changes to clear errors
watch(phoneNumber, () => {
  if (errors.value.phone_number) {
    delete errors.value.phone_number;
  }
});

watch(fullName, () => {
  if (errors.value.name) {
    delete errors.value.name;
  }
});

watch(confirmPassword, () => {
  if (errors.value.confirm_password) {
    delete errors.value.confirm_password;
  }
});

watch(termsAccepted, () => {
  if (errors.value.terms_accepted) {
    delete errors.value.terms_accepted;
  }
});
</script>

<style scoped>
/* ===== Background ===== */
.fill-height {
  min-height: 100vh;
  background: linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== Container ===== */
/* Limit container width on ultra-wide screens and center it */
.register-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* ===== Card ===== */
/* Maintain good width on full screen */
.register-card {
  width: 100%;
  max-width: 650px;   /* Good width for full screen */
  margin: auto;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(18px);
  border-radius: 20px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.05);
}

/* Ensure card content padding isn't too tight */
.register-card .v-card-text {
  padding-left: 24px !important;
  padding-right: 24px !important;
}

/* ===== Make ALL inputs full width ===== */
.v-text-field,
.v-select,
.v-checkbox,
.v-btn {
  width: 100% !important;
}

/* ===== Input styling ===== */
.large-input {
  width: 100%;
}

.large-input :deep(.v-field) {
  width: 100% !important;
  min-height: 56px !important;
  border-radius: 12px !important;
  background: #fafafa;
  transition: all 0.15s ease;
}

.large-input :deep(.v-field__input) {
  padding: 16px !important;
  font-size: 16px !important;
}

/* Focus style */
.large-input :deep(.v-field--focused),
.large-input :deep(.v-field:focus-within) {
  background: white;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.18);
}

/* ===== Password Strength Box ===== */
.password-strength-section {
  padding: 14px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

/* ===== Feedback Scrollbar ===== */
.feedback-list {
  max-height: 110px;
  overflow-y: auto;
}

.feedback-list::-webkit-scrollbar {
  width: 5px;
}

.feedback-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

/* ===== Terms Content Scrollbar ===== */
.terms-content {
  max-height: 400px;
  overflow-y: auto;
}

.terms-content::-webkit-scrollbar {
  width: 5px;
}

.terms-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

/* Smooth transitions for expanders */
.v-expand-transition-enter-active,
.v-expand-transition-leave-active {
  transition: all 0.3s ease;
}

/* ===== Submit Button ===== */
.v-btn {
  height: 52px;
  font-size: 16px;
  letter-spacing: 0.25px;
  border-radius: 12px;
  font-weight: 600;
}

.submit-button {
  width: 100% !important;
  min-width: 100% !important;
  padding: 0 24px !important;
}

.submit-button :deep(.v-btn__content) {
  width: 100%;
  justify-content: center;
  white-space: nowrap;
}

/* ===== Divider ===== */
.v-divider {
  opacity: 0.5;
}

/* ===== Checkbox ===== */
.v-selection-control {
  margin-top: 4px;
}

/* ===== Error Alert ===== */
.v-alert {
  border-radius: 10px;
}

/* Custom scrollbar for feedback list on other engines */
.feedback-list,
.terms-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,0.2) transparent;
}

/* ===== Responsive ===== */
@media (max-width: 600px) {
  .register-card {
    max-width: 100%;
    border-radius: 16px;
  }

  .register-container {
    padding: 16px 8px;
  }

  .large-input :deep(.v-field) {
    min-height: 52px !important;
  }
}
</style>
