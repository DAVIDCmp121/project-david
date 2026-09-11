import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ໝາຍເຫດ: ຕອນພັດທະນາ (npm run dev), Vite ຈະຮັນຢູ່ຄົນລະ port ກັບ Express server
// proxy ນີ້ຈະສົ່ງ request /api/* ຕໍ່ໄປໃຫ້ Express (port 3000) ໂດຍອັດຕະໂນມັດ
// ຕອນ build ຈິງ (npm run build) ໄຟລ໌ທີ່ໄດ້ຈະຖືກ Express ເປັນຄົນ serve ເອງ ບໍ່ຕ້ອງໃຊ້ proxy ອີກ
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
