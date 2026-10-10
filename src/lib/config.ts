/**
 * Taleem Guru Application Configuration
 * Provides safe redirect URL resolution for local development, Vercel preview/production,
 * and canonical custom .pk domains.
 */

// Canonical production domain strictly defined for Taleem Guru
export const CANONICAL_PRODUCTION_DOMAIN = 'https://www.taleemguru.pk';

// Allowed production domains (apex and www)
export const ALLOWED_PRODUCTION_DOMAINS = [
  'https://www.taleemguru.pk',
  'https://taleemguru.pk',
];

/**
 * Returns a standardized canonical URL on https://www.taleemguru.pk or the configured base domain.
 * Strips all query parameters, trailing slashes (except root), and hash fragments.
 */
export const getCanonicalUrl = (pathname = '/', baseDomain = CANONICAL_PRODUCTION_DOMAIN): string => {
  const base = (baseDomain || CANONICAL_PRODUCTION_DOMAIN).replace(/\/$/, '');
  if (!pathname || pathname === '/') return `${base}/`;
  
  // Strip query parameters and hash fragments
  const cleanPath = pathname.split('?')[0].split('#')[0].trim();
  const normalized = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  const withoutTrailingSlash = normalized.length > 1 && normalized.endsWith('/') 
    ? normalized.slice(0, -1) 
    : normalized;
    
  return `${base}${withoutTrailingSlash}`;
};

/**
 * Detects if the current client environment is running locally or in a development container.
 */
export const isLocalDevelopment = (): boolean => {
  if (typeof window === 'undefined' || !window.location) return false;
  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local') ||
    hostname.includes('.run.app')
  );
};

/**
 * Detects if the current client environment is running on a Vercel preview or production deployment domain.
 */
export const isVercelDeployment = (): boolean => {
  if (typeof window === 'undefined' || !window.location) return false;
  return window.location.hostname.toLowerCase().endsWith('.vercel.app');
};

/**
 * Validates if an origin is a trusted Taleem Guru domain.
 * Prevents malicious open redirects while allowing local dev, Vercel deployments, and official domains.
 */
export const isAllowedOrigin = (origin: string): boolean => {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();

    // 1. Localhost / container dev
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.local') ||
      hostname.includes('.run.app')
    ) {
      return true;
    }

    // 2. Vercel deployments (*.vercel.app, e.g. taleemgurupk.vercel.app, taleem-guru-official.vercel.app)
    if (hostname.endsWith('.vercel.app')) {
      return true;
    }

    // 3. Official Taleem Guru production domains
    if (hostname === 'taleemguru.pk' || hostname === 'www.taleemguru.pk') {
      return true;
    }

    // 4. Configured environment URL (VITE_SITE_URL or SITE_URL)
    const envUrl = (
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL) ||
      (typeof process !== 'undefined' && (process.env?.VITE_SITE_URL || process.env?.SITE_URL)) ||
      ''
    ).trim();
    if (envUrl) {
      try {
        const envParsed = new URL(envUrl);
        if (hostname === envParsed.hostname.toLowerCase()) {
          return true;
        }
      } catch {}
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Returns the base site URL for metadata, SEO, and asset links.
 */
export const getSiteUrl = (): string => {
  // Check if environment variable is set
  const envUrl = (
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL
      ? (import.meta.env.VITE_SITE_URL as string).trim()
      : (typeof process !== 'undefined' && (process.env?.VITE_SITE_URL || process.env?.SITE_URL)
        ? (process.env.VITE_SITE_URL || process.env.SITE_URL)!.trim()
        : '')
  ).replace(/\/$/, '');

  // Local development detection in browser
  if (isLocalDevelopment()) {
    return window.location.origin;
  }

  // If running in browser and origin is an allowed Taleem Guru domain, use current origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    if (isAllowedOrigin(window.location.origin)) {
      return window.location.origin;
    }
  }

  // Explicit environment variable fallback
  if (envUrl) {
    return envUrl;
  }

  // Canonical production fallback
  return CANONICAL_PRODUCTION_DOMAIN;
};

/**
 * Returns the exact destination URL for Supabase authentication redirects
 * (Google OAuth, Email verification, Password reset, and Auth callbacks).
 *
 * Safe Redirect Strategy:
 * 1. If running in browser and the current origin is a valid allowed Taleem Guru domain
 *    (localhost, *.vercel.app such as taleemgurupk.vercel.app, or taleemguru.pk),
 *    the redirect URL uses the current origin. This keeps the user inside the same
 *    origin and application environment, avoiding cross-domain state loss and
 *    preventing unexpected Vercel authentication prompts.
 * 2. If called outside the browser or with an unrecognized origin, falls back
 *    to the configured site URL or canonical production domain.
 * 3. Appends clean subpath (default: /auth/callback).
 */
export function getAuthRedirectUrl(subPath = '/auth/callback'): string {
  const cleanSubPath = subPath ? (subPath.startsWith('/') ? subPath : `/${subPath}`) : '';

  // In browser: use current origin if it is an allowed Taleem Guru origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    const currentOrigin = window.location.origin;
    if (isAllowedOrigin(currentOrigin)) {
      return `${currentOrigin}${cleanSubPath}`;
    }
  }

  // Fallback to configured site URL
  const base = getSiteUrl();
  return `${base}${cleanSubPath}`;
}

export const SITE_CONFIG = {
  name: 'Taleem Guru',
  title: 'TALEEM GURU - Learn. Practice. Test. Improve.',
  description: "Pakistan's smart online test & quiz platform for BISE Boards, MDCAT, ECAT, CSS, PMS, and Armed Forces.",
  supportEmail: 'support@taleemguru.pk',
  get siteUrl() {
    return getSiteUrl();
  },
  getAuthRedirectUrl,
};

export default {
  CANONICAL_PRODUCTION_DOMAIN,
  ALLOWED_PRODUCTION_DOMAINS,
  isLocalDevelopment,
  isVercelDeployment,
  isAllowedOrigin,
  getSiteUrl,
  getAuthRedirectUrl,
  SITE_CONFIG,
};
