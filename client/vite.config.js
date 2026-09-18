import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      VITE_API_URL: process.env.VITE_API_URL,
      REACT_APP_API_URL: process.env.REACT_APP_API_URL,
      NODE_ENV: process.env.NODE_ENV,
    },
  },
})
