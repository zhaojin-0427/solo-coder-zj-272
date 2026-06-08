import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 9101,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:9102',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:9102',
        changeOrigin: true,
      },
    },
  },
});
