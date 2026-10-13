import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Sanitize Supabase project URL to ensure clean base path without /rest/v1/ or trailing slashes
const rawSupabaseUrl = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof window !== 'undefined' && (window as any).__SUPABASE_URL__) ||
  (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) ||
  ''
).trim();
function sanitizeEnvValue(val: string): string {
  if (!val || typeof val !== 'string') return '';
  let s = val.trim().replace(/^\uFEFF/, '').trim();
  while (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  if (s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') {
    return '';
  }
  return s;
}

function sanitizeSupabaseUrl(raw: string): string {
  const sanitized = sanitizeEnvValue(raw);
  if (!sanitized) return '';
  const cleanPath = sanitized.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  try {
    const parsed = new URL(cleanPath);
    const isHttps = parsed.protocol === 'https:';
    const isLocalHttp = parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
    if (!isHttps && !isLocalHttp) {
      return '';
    }
    if (parsed.hostname.toLowerCase().includes('placeholder') || cleanPath.toLowerCase().includes('placeholder')) {
      return '';
    }
    return `${parsed.protocol}//${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function sanitizeSupabaseKey(raw: string): string {
  const sanitized = sanitizeEnvValue(raw);
  if (sanitized.toLowerCase().includes('placeholder')) return '';
  return sanitized;
}

const rawSupabaseAnonKey = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof window !== 'undefined' && (window as any).__SUPABASE_ANON_KEY__) ||
  (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY)) ||
  ''
).trim();

const supabaseUrl = sanitizeSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = sanitizeSupabaseKey(rawSupabaseAnonKey);

/**
 * Validates whether Supabase environment variables are present and well-formed.
 * Does not accept empty strings or placeholder domains.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder')
);

/**
 * Creates the official Supabase browser client with:
 * - autoRefreshToken: true (refreshes tokens before expiration)
 * - persistSession: true (persists session in browser storage)
 * - detectSessionInUrl: true (parses OAuth/magic link fragments from URL)
 *
 * If environment variables are missing, creates a guarded proxy that throws
 * an explicit, visible configuration error on any operation rather than silently
 * manufacturing fake authentication.
 */
function initializeSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    const configError = new Error(
      'CONFIG_MISSING: Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.'
    );

    return new Proxy({} as SupabaseClient, {
      get(_target, prop) {
        if (prop === 'auth') {
          return {
            onAuthStateChange: (_callback: any) => ({
              data: {
                subscription: {
                  unsubscribe: () => {},
                },
              },
            }),
            getSession: async () => ({ data: { session: null }, error: null }),
            refreshSession: async () => ({ data: { session: null }, error: null }),
            getUser: async () => ({ data: { user: null }, error: null }),
            signInWithPassword: async () => { throw configError; },
            signUp: async () => { throw configError; },
            signInWithOAuth: async () => { throw configError; },
            signOut: async () => ({ error: null }),
            resetPasswordForEmail: async () => { throw configError; },
            updateUser: async () => { throw configError; },
          };
        }
        if (prop === 'from') {
          return () => { throw configError; };
        }
        return () => { throw configError; };
      },
    });
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
}

export const supabase: SupabaseClient = initializeSupabaseClient();
export const supabaseClient = supabase;
export default supabase;
