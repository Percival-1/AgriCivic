import { Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { publicRoutes, protectedRoutes, adminRoutes } from './routes';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';
import Loader from './components/common/Loader';
import ErrorBoundary from './components/common/ErrorBoundary';
import { MainLayout } from './components/layout';
import { initializeSecurity } from './utils/security';

/**
 * Main App Component
 * 
 * Configures routing with:
 * - Global error boundary for uncaught errors
 * - Public routes (accessible without authentication)
 * - Protected routes (require authentication, wrapped in MainLayout)
 * - Admin routes (require authentication + admin role, wrapped in MainLayout)
 * - Lazy loading with Suspense for code splitting
 * - Loading fallback for route transitions
 * - Security initialization on mount
 */

function App() {
  // Initialize security features on app load
  useEffect(() => {
    initializeSecurity();
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<Loader fullScreen />}>
          <Routes>
            {/* Public Routes */}
            {publicRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<route.element />}
              />
            ))}

            {/* Protected Routes with MainLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {protectedRoutes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={<route.element />}
                />
              ))}
            </Route>

            {/* Admin Routes with MainLayout */}
            <Route
              element={
                <AdminRoute>
                  <MainLayout />
                </AdminRoute>
              }
            >
              {adminRoutes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={<route.element />}
                />
              ))}
            </Route>

            {/* 404 Not Found */}
            <Route
              path="*"
              element={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <h1 className="text-6xl font-bold text-gray-800">404</h1>
                    <p className="mt-4 text-xl text-gray-600">Page not found</p>
                    <a
                      href="/"
                      className="mt-6 inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Go to Dashboard
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

export default App;
