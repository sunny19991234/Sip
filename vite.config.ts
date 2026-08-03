import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sip',
        short_name: 'Sip',
        description: 'Persoonlijke vochtinname-tracker',
        start_url: '.',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          {
            name: 'Log 250 ml',
            short_name: '250 ml',
            url: 'log?ml=250&src=shortcut',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'Log 500 ml',
            short_name: '500 ml',
            url: 'log?ml=500&src=shortcut',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}']
      }
    })
  ],
  base: mode === 'production' ? '/Sip/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
}));
