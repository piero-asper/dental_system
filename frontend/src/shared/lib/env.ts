type RuntimeConfig = Partial<Record<'VITE_API_URL' | 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY', string>>;

const runtime = (globalThis as typeof globalThis & { __DENTAL_RUNTIME_CONFIG__?: RuntimeConfig }).__DENTAL_RUNTIME_CONFIG__;

export const env = {
  apiUrl: runtime?.VITE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  supabaseUrl: runtime?.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: runtime?.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
};

