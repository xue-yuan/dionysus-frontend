import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    solid() as any,
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
