import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BASE_URL muda só no deploy (GitHub Pages serve o site em /Mercavel/)
export default defineConfig({
  base: process.env.BASE_URL ?? '/',
  plugins: [react()],
  build: {
    // a base de preços muda todo dia e o código não: em arquivos separados, o navegador só baixa de novo o que mudou
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/data/') && !id.includes('ean-produtos')) return 'dados'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
  server: {
    // pra abrir no celular pela rede local
    host: true,
  },
})
