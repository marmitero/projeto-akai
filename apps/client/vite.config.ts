import { defineConfig } from 'vite';
export default defineConfig({ envDir: '../..', build: { rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } } } });
