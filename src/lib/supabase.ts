import { createClient, SupabaseClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    __SUPABASE_ENV__?: {
      url?: string;
      anonKey?: string;
    };
  }
}

const runtimeEnv = typeof window !== 'undefined' ? window.__SUPABASE_ENV__ : undefined;
const rawUrl = (
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  runtimeEnv?.url
)?.trim();
const rawKey = (
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  runtimeEnv?.anonKey
)?.trim();

function normalizeSupabaseUrl(value?: string): string | undefined {
  if (!value || value.includes('YOUR_PROJECT_ID')) {
    return undefined;
  }
  const cleaned = value.replace(/\/+$/, '');
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return undefined;
    }
    // Always use the clean project origin so no trailing path triggers "requested path is invalid"
    return parsed.origin;
  } catch {
    return undefined;
  }
}

const supabaseUrl = normalizeSupabaseUrl(rawUrl);
const supabaseKey =
  rawKey && !rawKey.includes('YOUR_SUPABASE') ? rawKey : undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;
