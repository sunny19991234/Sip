import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/Sip/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
}));
