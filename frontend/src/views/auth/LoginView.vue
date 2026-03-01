<template>
  <v-container class="fill-height login-container">
    <v-row align="center" justify="center" class="ma-0">
      <!-- Fixed column width for consistent sizing across all screens -->
      <v-col cols="12" sm="10" md="8" lg="6" xl="5">
        <v-card elevation="12" rounded="xl" class="login-card">
          <!-- Header Section -->
          <v-card-title class="text-center pa-8 pb-4">
            <v-avatar size="64" color="primary" class="mb-4 mx-auto" aria-hidden="true">
              <v-icon size="34">mdi-account-circle</v-icon>
            </v-avatar>

            <div class="text-h4 font-weight-bold text-primary mb-1">
              Welcome Back
            </div>
            <div class="text-subtitle-2 text-medium-emphasis">
              Sign in to continue to your account
            </div>
          </v-card-title>

          <v-card-text class="px-8 pb-8 pt-4">
            <v-form @submit.prevent="handleSubmit" ref="formRef" novalidate>
              <!-- Phone Number Field -->
              <div class="mb-5">
                <v-text-field
                  v-model="phoneNumber"
                  label="Phone Number"
                  placeholder="+1234567890"
                  prepend-inner-icon="mdi-phone"
                  variant="outlined"
                  :error-messages="errors.phone_number ? [errors.phone_number] : []"
                  :disabled="isLoading"
                  @blur="validateField('phone_number')"
                  data-test="phone-input"
                  hide-details="auto"
                  class="large-input"
                  autofocus
                  autocomplete="tel"
                  inputmode="tel"
                  aria-label="Phone Number"
                />
              </div>

              <!-- Password Field -->
              <div class="mb-3">
                <v-text-field
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  label="Password"
                  prepend-inner-icon="mdi-lock"
                  :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  variant="outlined"
                  :error-messages="errors.password ? [errors.password] : []"
                  :disabled="isLoading"
                  @click:append-inner="toggleShowPassword"
                  @blur="validateField('password')"
                  @input="onPasswordInput"
                  data-test="password-input"
                  hide-details="auto"
                  class="large-input"
                  autocomplete="current-password"
                  aria-label="Password"
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
                      <v-icon size="x-small" class="mr-1 mt-1" aria-hidden="true">mdi-information-outline</v-icon>
                      <span>{{ feedback }}</span>
                    </div>
                  </div>
                </div>
              </v-expand-transition>

              <!-- Remember Me Checkbox -->
              <div class="mb-5">
                <v-checkbox
                  v-model="rememberMe"
                  label="Remember me for 30 days"
                  color="primary"
                  :disabled="isLoading"
                  hide-details
                  density="compact"
                />
              </div>

              <!-- Error Alert -->
              <v-expand-transition>
                <v-alert
                  v-if="loginError"
                  type="error"
                  variant="tonal"
                  closable
                  class="mb-5"
                  density="compact"
                  @click:close="loginError = null"
                >
                  <div class="d-flex align-center">
                    <v-icon class="mr-2" aria-hidden="true">mdi-alert-circle</v-icon>
                    <span>{{ loginError }}</span>
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
                data-test="login-button"
                class="mb-4 text-none font-weight-bold"
                aria-label="Sign In"
              >
                <v-icon left class="mr-2" aria-hidden="true">mdi-login</v-icon>
                Sign In
              </v-btn>

              <!-- Divider -->
              <v-divider class="my-6" />

              <!-- Register Link -->
              <div class="text-center">
                <span class="text-body-2 text-medium-emphasis">Don't have an account?</span>
                <v-btn
                  variant="text"
                  color="primary"
                  size="small"
                  :to="{ name: 'Register' }"
                  :disabled="isLoading"
                  class="text-none font-weight-bold ml-1"
                >
                  Create Account
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { loginSchema } from '@/utils/validation';
import { validatePasswordStrength } from '@/utils/validation';
import type { ValidationError } from 'yup';

// Router and store
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// Form fields
const phoneNumber = ref('');
const password = ref('');
const rememberMe = ref(false);
const showPassword = ref(false);

// Form state
const isLoading = ref(false);
const loginError = ref<string | null>(null);
const errors = ref<Record<string, string>>({});

// Password strength
const passwordStrength = ref<ReturnType<typeof validatePasswordStrength> | null>(null);

// Computed properties
const isFormValid = computed(() => {
  return phoneNumber.value.trim() !== '' &&
         password.value.trim() !== '' &&
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
const validateField = async (field: 'phone_number' | 'password') => {
  try {
    const value = field === 'phone_number' ? phoneNumber.value : password.value;
    await loginSchema.validateAt(field, { [field]: value });
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
};

const toggleShowPassword = () => {
  showPassword.value = !showPassword.value;
};

const handleSubmit = async () => {
  // Clear previous errors
  loginError.value = null;
  errors.value = {};

  // Validate form
  try {
    await loginSchema.validate(
      {
        phone_number: phoneNumber.value,
        password: password.value,
      },
      { abortEarly: false }
    );
  } catch (error) {
    if (error instanceof Error && 'inner' in error) {
      const validationError = error as ValidationError;
      validationError.inner.forEach((err) => {
        if (err.path) {
          errors.value[err.path] = err.message;
        }
      });
    }
    return;
  }

  // Submit login
  isLoading.value = true;

  try {
    await authStore.login({
      phone_number: phoneNumber.value,
      password: password.value,
    });

    // Handle remember me (store preference in localStorage)
    if (rememberMe.value) {
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberMe');
    }

    // Redirect to intended destination or dashboard
    const redirect = (route.query.redirect as string) || '/dashboard';
    await router.push(redirect);
  } catch (error: any) {
    // Display error message
    loginError.value = error?.response?.data?.detail || error?.message || 'Login failed. Please check your credentials.';
  } finally {
    isLoading.value = false;
  }
};

// Watch for phone number changes to clear errors
watch(phoneNumber, () => {
  if (errors.value.phone_number) {
    delete errors.value.phone_number;
  }
});

// Initialize remember me from localStorage
const storedRememberMe = localStorage.getItem('rememberMe');
if (storedRememberMe === 'true') {
  rememberMe.value = true;
}
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
.login-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* ===== Card ===== */
/* Maintain good width on full screen */
.login-card {
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
.login-card .v-card-text {
  padding-left: 24px !important;
  padding-right: 24px !important;
}

/* ===== Make ALL inputs full width ===== */
.v-text-field,
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
.feedback-list {
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,0.2) transparent;
}

/* ===== Responsive ===== */
@media (max-width: 600px) {
  .login-card {
    max-width: 100%;
    border-radius: 16px;
  }

  .login-container {
    padding: 16px 8px;
  }

  .large-input :deep(.v-field) {
    min-height: 52px !important;
  }
}
</style>
