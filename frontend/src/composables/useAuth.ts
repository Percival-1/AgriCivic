import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import type { LoginCredentials, RegisterData } from '@/services/auth.service';

/**
 * Composable for authentication operations
 * Provides convenient access to auth store and common auth operations
 */
export function useAuth() {
    const authStore = useAuthStore();
    const router = useRouter();

    /**
     * Login user and redirect to dashboard
     * @param credentials - User login credentials
     */
    const login = async (credentials: LoginCredentials) => {
        await authStore.login(credentials);
        router.push('/dashboard');
    };

    /**
     * Register user and redirect to dashboard
     * @param data - User registration data
     */
    const register = async (data: RegisterData) => {
        await authStore.register(data);
        router.push('/dashboard');
    };

    /**
     * Logout user and redirect to login page
     */
    const logout = async () => {
        await authStore.logout();
        router.push('/login');
    };

    /**
     * Check if user is authenticated, redirect to login if not
     * @returns True if authenticated, false otherwise
     */
    const checkAuth = (): boolean => {
        if (!authStore.isAuthenticated) {
            router.push('/login');
            return false;
        }
        return true;
    };

    /**
     * Check if user is admin, redirect to dashboard if not
     * @returns True if admin, false otherwise
     */
    const checkAdmin = (): boolean => {
        if (!authStore.isAdmin) {
            router.push('/dashboard');
            return false;
        }
        return true;
    };

    return {
        // State
        user: computed(() => authStore.user),
        isAuthenticated: computed(() => authStore.isAuthenticated),
        isAdmin: computed(() => authStore.isAdmin),
        isLoading: computed(() => authStore.isLoading),
        error: computed(() => authStore.error),
        userName: computed(() => authStore.userName),
        userLanguage: computed(() => authStore.userLanguage),

        // Actions
        login,
        register,
        logout,
        checkAuth,
        checkAdmin,
        fetchCurrentUser: authStore.fetchCurrentUser,
        updateProfile: authStore.updateProfile,
        initializeAuth: authStore.initializeAuth,
    };
}
