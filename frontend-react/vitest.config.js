import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.js',
        testTimeout: 10000,
        hookTimeout: 10000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.test.{js,jsx}',
                '**/*.spec.{js,jsx}',
                'src/main.jsx',
                'vite.config.js',
                'vitest.config.js',
                'tailwind.config.js',
                'postcss.config.js',
            ],
        },
    },
    resolve: {
        alias: {
            '@': '/src',
        },
    },
})
