import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const projectDir = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'esnext', sourcemap: false, reportCompressedSize: false },
  server: { host: '127.0.0.1', port: 8080, strictPort: true },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(projectDir, './src'),
      '@project/components': path.resolve(projectDir, '../../packages/components'),
    },
  },
});
