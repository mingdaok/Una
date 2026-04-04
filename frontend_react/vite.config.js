import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 🔥 核心修复：改为相对路径，适配 HBuilderX 本地 file:// 协议
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/chat': 'http://127.0.0.1:8000',
      '/history': 'http://127.0.0.1:8000',
      '/api': 'http://127.0.0.1:8000',
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true
      }
    }
  }
})
