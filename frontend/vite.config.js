import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const backendOrigin = (env.VITE_API_BASE_URL || 'http://localhost:5050')
    .trim().replace(/\/+$/, '').replace(/\/api$/i, '')

  return {
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: backendOrigin,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/') || id.includes('/react-jsx-dev-runtime') || id.includes('/react-jsx-runtime')) {
            return 'react-vendor';
          }
          if (id.includes('/react-router') || id.includes('/@remix-run/')) {
            return 'router';
          }
          if (id.includes('/chart.js/') || id.includes('/react-chartjs-2/')) {
            return 'charts';
          }
          if (id.includes('/bootstrap/') || id.includes('/react-bootstrap/') || id.includes('/@popperjs/')) {
            return 'ui-bootstrap';
          }
          if (id.includes('/lucide-react/') || id.includes('/animate.css/')) {
            return 'ui-icons';
          }
          if (id.includes('/@microsoft/') || id.includes('/signalr/')) {
            return 'signalr';
          }
          if (id.includes('/axios/')) {
            return 'http';
          }
          if (id.includes('/react-hot-toast/')) {
            return 'toast';
          }
          return 'vendor';
        },
      },
    },
  },
  }
})
