import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Sanitize Supabase project URL to ensure clean base path without /rest/v1/ or trailing slashes
const rawSupabaseUrl = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof window !== 'undefined' && (window as any).__SUPABASE_URL__) ||
  (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) ||
  ''
).trim();
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

const supabaseAnonKey = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof window !== 'undefined' && (window as any).__SUPABASE_ANON_KEY__) ||
  (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY)) ||
  ''
).trim();

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
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.'
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
