import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: {
        // covers current Firefox, Chrome, Safari, Edge
        chrome: 100 << 16,
        firefox: 100 << 16,
        safari: 15 << 16,
      },
    },
  },
})
