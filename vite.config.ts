import devtools from 'solid-devtools/vite';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [
    devtools({
      /* additional options */
      autoname: true, // e.g. enable autoname
    }),
    solidPlugin()
  ],
  server: {
    port: 3000,
    host: true, // Expose to network
  },
  build: {
    target: 'esnext',
    sourcemap: true, // Enable source maps for production
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
