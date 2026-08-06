import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  base: mode === 'github-pages' ? '/ShipCommand/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
  },
}));
