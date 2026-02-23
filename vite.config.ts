/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EntityPages',
      formats: ['es', 'umd'],
      fileName: (format) => `index.${format === 'es' ? 'esm' : format}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@sudobility/entity_client',
        '@sudobility/entity-components',
        '@sudobility/subscription-components',
        '@sudobility/types',
        '@tanstack/react-query',
        '@heroicons/react',
        '@sudobility/components',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          '@sudobility/entity_client': 'SudobilityEntityClient',
          '@sudobility/entity-components': 'SudobilityEntityComponents',
          '@sudobility/subscription-components': 'SudobilitySubscriptionComponents',
          '@sudobility/types': 'SudobilityTypes',
          '@tanstack/react-query': 'TanStackReactQuery',
          '@heroicons/react': 'HeroiconsReact',
          '@sudobility/components': 'SudobilityComponents',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
