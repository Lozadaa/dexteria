import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';
import path from 'path';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: ['node_modules', 'dist', 'release'],
      setupFiles: ['src/__tests__/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov', 'html'],
        exclude: [
          'node_modules',
          'dist',
          'release',
          '**/*.test.{ts,tsx}',
          '**/types/**',
          '**/schemas/**',
        ],
        include: ['src/**/*.{ts,tsx}'],
      },
      testTimeout: 10000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@main': path.resolve(__dirname, './src/main'),
        '@renderer': path.resolve(__dirname, './src/renderer'),
      },
    },
  })
);
