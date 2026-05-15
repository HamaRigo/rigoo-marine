/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@context': path.resolve(__dirname, './src/context'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  // Vitest config. JSDOM gives us window/document so React + RTL render
  // correctly; globals=true means describe/it/expect don't need imports
  // (matches Jest ergonomics tests usually rely on). setupFiles wires
  // jest-dom matchers and resets axios/fetch mocks between tests.
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false, // MUI components ship with a lot of CSS; skip parsing in tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.{js,jsx}', 'src/test/**'],
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
