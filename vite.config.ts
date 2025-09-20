import { visualizer } from 'rollup-plugin-visualizer';
import devtools from 'solid-devtools/vite';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [
    devtools({
      /* additional options */
      autoname: true, // e.g. enable autoname
    }),
    solidPlugin(),
    // Bundle analyzer (only in production)
    process.env.ANALYZE === 'true' && visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  server: {
    port: 3000,
    host: true, // Expose to network
  },
  build: {
    target: 'esnext',
    sourcemap: true, // Enable source maps for production
    minify: 'terser',
    terserOptions: {
      format: {
        comments: false, // Remove all comments including license comments
      },
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor dependencies
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'solidjs': ['solid-js', '@solidjs/router'],
        },
      },
    },
    // Enable advanced optimizations
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB as base64
    chunkSizeWarningLimit: 1000, // Warn for chunks larger than 1MB
  },
  css: {
    devSourcemap: false,
    // CSS optimization will be handled by Vite's built-in PostCSS
  },
  // Enable source maps in development
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
  // GitHub Pages configuration
  base: process.env.HOSTING === 'github'
    ? '/foxic/'
    : '/',
});
