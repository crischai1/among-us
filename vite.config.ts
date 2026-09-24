/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const WS_PORT = process.env.WS_PORT ? Number(process.env.WS_PORT) : 8790;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/ws': { target: `ws://localhost:${WS_PORT}`, ws: true },
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
});
