import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  base: './',
  root: '.',
  publicDir: 'public',
  resolve: {
    alias: [
      { find: /^@domain$/, replacement: fileURLToPath(new URL('./src/domain/index.ts', import.meta.url)) },
      { find: /^@domain\/(.*)/, replacement: fileURLToPath(new URL('./src/domain/$1', import.meta.url)) },
      { find: /^@application$/, replacement: fileURLToPath(new URL('./src/application/index.ts', import.meta.url)) },
      { find: /^@application\/(.*)/, replacement: fileURLToPath(new URL('./src/application/$1', import.meta.url)) },
      { find: /^@adapters$/, replacement: fileURLToPath(new URL('./src/adapters/index.ts', import.meta.url)) },
      { find: /^@adapters\/(.*)/, replacement: fileURLToPath(new URL('./src/adapters/$1', import.meta.url)) },
      { find: /^@composition$/, replacement: fileURLToPath(new URL('./src/composition/index.ts', import.meta.url)) },
      { find: /^@composition\/(.*)/, replacement: fileURLToPath(new URL('./src/composition/$1', import.meta.url)) },
    ],
  },
  optimizeDeps: {
    // Rapier ships a wasm bundle; let Vite pre-bundle it.
    include: ['@dimforge/rapier3d-compat'],
    exclude: [],
  },
  server: {
    port: 5173,
    strictPort: false,
    open: false,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three') || id.includes('node_modules\\three')) return 'three';
          if (id.includes('@dimforge/rapier3d-compat')) return 'rapier';
        },
      },
    },
  },
});
