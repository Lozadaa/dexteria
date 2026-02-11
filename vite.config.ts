import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Generate build version: version + DDHHMM timestamp
const pkg = require('./package.json');
const now = new Date();
const buildTimestamp = `${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
const buildVersion = `${pkg.version}-${buildTimestamp}`;

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
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    sourcemap: true,
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate large vendor libraries
          'lucide-react': ['lucide-react'],
          'react-vendor': ['react', 'react-dom'],
          'dnd-kit': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
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
