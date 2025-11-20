import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files > 10KB
      deleteOriginFile: false,
    }),
    // Brotli compression (better compression than gzip)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false,
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'es2020',
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,

    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendors
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query', '@tanstack/react-query-devtools'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'ui-vendor': ['lucide-react', 'sonner', 'clsx', 'tailwind-merge'],

          // 🚀 PERFORMANCE: Heavy libraries - separate chunks
          'excel-vendor': ['exceljs', 'xlsx', 'papaparse'],
          'charts-vendor': ['recharts'],
          'ai-vendor': ['openai', '@anthropic-ai/sdk', '@google/generative-ai'],
          'headless-vendor': ['@headlessui/react', 'focus-trap-react'],
          'virtual-vendor': ['react-window', 'react-virtualized-auto-sizer'],
          'dnd-vendor': ['react-dnd', 'react-dnd-html5-backend'],
          'tree-vendor': ['react-arborist'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
    ],
  },

  server: {
    proxy: {
      // Python backend endpoints (validation)
      '/api/validate': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/api/test-pinecone': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/api/embeddings': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/api/build_codeframe': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Node backend endpoints (everything else)
      '/api': {
        target: 'http://localhost:3020',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
});
