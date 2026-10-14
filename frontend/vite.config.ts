import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'vite.svg', 'icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'AgroControl Móvil',
        short_name: 'AgroControl',
        description: 'Aplicación Móvil Offline-First para Vendedores en Ruta - AgroControl Pro',
        theme_color: '#059669',
        background_color: '#020617',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/movil',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\/movil/, /^\/$/],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Dependencias agrupadas en chunks estables (mejor caché entre versiones).
        // Las páginas se separan por ruta mediante React.lazy en App.tsx.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('lucide-react')) return 'icons';
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|@remix-run)[\\/]/.test(id)) {
            return 'react-vendor';
          }
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
