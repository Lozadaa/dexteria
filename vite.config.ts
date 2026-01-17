import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Plugin to remove crossorigin attributes from HTML for Electron compatibility
function removeCrossorigin(): Plugin {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html) {
      return html.replace(/ crossorigin/g, '');
    },
  };
}

export default defineConfig({
  plugins: [react(), removeCrossorigin()],
  base: './',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    sourcemap: true,
    modulePreload: false,
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      'adnia-ui': resolve(__dirname, 'packages/adnia-ui/src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
