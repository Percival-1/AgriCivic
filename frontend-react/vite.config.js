import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import securityHeadersPlugin from './vite-plugin-security-headers'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    securityHeadersPlugin(),
  ],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Code splitting optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'ui-vendor': ['react-icons', 'react-spinners'],
          'form-vendor': ['react-hook-form'],
          'i18n-vendor': ['i18next', 'react-i18next'],
        },
      },
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@reduxjs/toolkit',
      'react-redux',
      'axios',
      'chart.js',
      'react-chartjs-2',
      'leaflet',
      'react-leaflet',
      'react-icons',
      'react-spinners',
      'react-hook-form',
      'i18next',
      'react-i18next',
    ],
  },
})
