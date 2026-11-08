import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const projectDir = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({ base: './', plugins: [react()], resolve: { alias: { '@': path.resolve(projectDir, './src') } } });
