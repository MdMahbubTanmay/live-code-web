// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'monaco-editor/esm/vs/editor/editor.api.js': 'monaco-editor',
      'monaco-editor/esm/vs/editor/editor.api': 'monaco-editor'
    }
  },
  optimizeDeps: {
    include: ['monaco-editor', 'y-monaco', 'yjs', 'y-webrtc']
  }
});