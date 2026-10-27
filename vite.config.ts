import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BASE_URL muda só no deploy (GitHub Pages serve o site em /Mercavel/)
export default defineConfig({
  base: process.env.BASE_URL ?? '/',
  plugins: [react()],
  server: {
    // pra abrir no celular pela rede local
    host: true,
  },
})
