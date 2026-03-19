import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    projects: [
      {
        // Renderer tests — jsdom environment for React components
        test: {
          name: 'renderer',
          globals: true,
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.js'],
          include: ['src/test/**/*.{test,spec}.{js,jsx,ts,tsx}'],
          css: true,
        },
      },
      {
        // Electron main process tests — Node environment
        test: {
          name: 'electron',
          globals: true,
          environment: 'node',
          include: ['electron/__tests__/**/*.{test,spec}.{js,mjs}'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/test/', '*.config.js'],
    },
  },
})
