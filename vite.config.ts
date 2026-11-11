import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The base path is configurable so the site works both at
//   https://<user>.github.io/<repo>/   (VITE_BASE_PATH=/<repo>/)
//   https://<user>.github.io/           (VITE_BASE_PATH=/)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  let base = env.VITE_BASE_PATH || '/';
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;

  return {
    base,
    plugins: [react()],
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            motion: ['framer-motion'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
  };
});
