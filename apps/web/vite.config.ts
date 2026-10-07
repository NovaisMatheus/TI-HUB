import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'hub-downloads',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const path = req.url?.split('?')[0];
          const files = ['configurador-https-ti-hub.zip', 'ugb-ti-hub-1doc.zip'];
          const filename = files.find((file) => path === `/downloads/${file}`);
          if (filename) {
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Cache-Control', 'no-store');
          }
          next();
        });
      },
    },
  ],
  server: {
    watch: { ignored: ['**/public/downloads/**'] },
    host: '0.0.0.0',
    allowedHosts: ['ti-hub.192-168-10-9.sslip.io'],
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true } },
  },
});
