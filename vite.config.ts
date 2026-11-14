import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  if (process.env.VITE_SUPABASE_URL?.includes('YOUR_PROJECT_ID')) {
    delete process.env.VITE_SUPABASE_URL;
  }
  if (process.env.VITE_SUPABASE_ANON_KEY?.includes('YOUR_SUPABASE')) {
    delete process.env.VITE_SUPABASE_ANON_KEY;
  }
  const env = loadEnv(mode, process.cwd(), '');
  const rawUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').trim();
  const rawKey = (
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();
  const supabaseUrl = rawUrl && !rawUrl.includes('YOUR_PROJECT_ID') ? rawUrl : '';
  const supabaseAnonKey = rawKey && !rawKey.includes('YOUR_SUPABASE') ? rawKey : '';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      ...(supabaseUrl ? { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl) } : {}),
      ...(supabaseAnonKey
        ? { 'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey) }
        : {}),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
