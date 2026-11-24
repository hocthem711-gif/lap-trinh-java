import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rolldownOptions: {
      output: {
        // Tách thư viện bên thứ ba thành các chunk riêng để trình duyệt cache lâu dài
        // và tải song song, giảm kích thước file JS chính của ứng dụng.
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|scheduler|react-redux|@reduxjs|redux|redux-thunk|immer|reselect|use-sync-external-store)[\\/]/,
            },
            {
              name: 'vendor-map',
              test: /node_modules[\\/](leaflet|react-leaflet|@react-leaflet)[\\/]/,
            },
            {
              name: 'vendor-chart',
              test: /node_modules[\\/](chart\.js|react-chartjs-2|@kurkle)[\\/]/,
            },
            {
              name: 'vendor-libs',
              test: /node_modules[\\/](axios|lucide-react)[\\/]/,
            },
          ],
        },
      },
    },
  },
});
