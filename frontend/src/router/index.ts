import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { authGuard, adminGuard } from './guards';

/**
 * Route definitions with lazy loading and meta fields
 * Routes are organized into: public, protected user, and admin routes
 */
const routes: RouteRecordRaw[] = [
    // Root redirect
    {
        path: '/',
        name: 'Home',
        redirect: '/dashboard',
    },

    // Public routes (no authentication required)
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/auth/LoginView.vue'),
        meta: {
            layout: 'auth',
            requiresAuth: false,
        },
    },
    {
        path: '/register',
        name: 'Register',
        component: () => import('@/views/auth/RegisterView.vue'),
        meta: {
            layout: 'auth',
            requiresAuth: false,
        },
    },

    // Protected user routes (authentication required)
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/views/user/DashboardView.vue'),
        meta: {
            requiresAuth: true,
        },
    },
    {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/views/user/ProfileView.vue'),
        meta: {
            requiresAuth: true,
        },
    },
    {
        path: '/chat',
        name: 'Chat',
        component: () => import('@/views/user/ChatView.vue'),
        meta: {
            requiresAuth: true,
        },
    },
    {
        path: '/disease-detection',
        name: 'DiseaseDetection',
        component: () => import('@/views/user/DiseaseDetectionView.vue'),
        meta: {
            requiresAuth: true,
        },
    },
    {
        path: '/weather',
        name: 'Weather',
        component: () => import('@/views/user/WeatherView.vue'),
        meta: {
            requiresAuth: true,
        },
    },
    {
        path: '/market',
        name: 'Market',
        component: () => import('@/views/user/MarketView.vue'),
        meta: {
            requiresAuth: true,
        },
    },
    {
        path: '/schemes',
        name: 'Schemes',
        component: () => import('@/views/user/SchemesView.vue'),
        meta: {
            requiresAuth: true,
        },
    },
    {
        path: '/notifications',
        name: 'Notifications',
        component: () => import('@/views/user/NotificationsView.vue'),
        meta: {
            requiresAuth: true,
        },
    },

    // Admin routes (authentication + admin role required)
    {
        path: '/admin',
        name: 'Admin',
        component: () => import('@/views/admin/AdminDashboardView.vue'),
        meta: {
            requiresAuth: true,
            requiresAdmin: true,
            layout: 'admin',
        },
        children: [
            {
                path: '',
                name: 'AdminDashboard',
                component: () => import('@/views/admin/DashboardView.vue'),
                meta: {
                    requiresAuth: true,
                    requiresAdmin: true,
                },
            },
            {
                path: 'users',
                name: 'AdminUsers',
                component: () => import('@/views/admin/UsersView.vue'),
                meta: {
                    requiresAuth: true,
                    requiresAdmin: true,
                },
            },
            {
                path: 'users/:id',
                name: 'AdminUserDetails',
                component: () => import('@/views/admin/UserDetailsView.vue'),
                meta: {
                    requiresAuth: true,
                    requiresAdmin: true,
                },
            },
            {
                path: 'monitoring',
                name: 'AdminMonitoring',
                component: () => import('@/views/admin/MonitoringView.vue'),
                meta: {
                    requiresAuth: true,
                    requiresAdmin: true,
                },
            },
            {
                path: 'cache',
                name: 'AdminCache',
                component: () => import('@/views/admin/CacheView.vue'),
                meta: {
                    requiresAuth: true,
                    requiresAdmin: true,
                },
            },
            {
                path: 'content',
                name: 'AdminContent',
                component: () => import('@/views/admin/ContentView.vue'),
                meta: {
                    requiresAuth: true,
                    requiresAdmin: true,
                },
            },
            {
                path: 'portal-sync',
                name: 'AdminPortalSync',
                component: () => import('@/views/admin/PortalSyncView.vue'),
                meta: {
                    requiresAuth: true,
                    requiresAdmin: true,
                },
            },
            {
                path: 'notifications',
                name: 'AdminNotifications',
                component: () => import('@/views/admin/NotificationsView.vue'),
                meta: {
                    requiresAuth: true,
                    requiresAdmin: true,
                },
            },
        ],
    },

    // Catch-all redirect for undefined routes
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        redirect: '/dashboard',
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

// Apply navigation guards
router.beforeEach(authGuard);
router.beforeEach(adminGuard);

export default router;
