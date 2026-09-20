/**
 * Taleem Guru Application Configuration
 * Provides configurable site URL for canonical SEO, sharing, and deployment on Vercel or custom .pk domains.
 */

// Canonical production domain strictly defined for Taleem Guru
export const CANONICAL_PRODUCTION_DOMAIN = 'https://www.taleemguru.pk';

// Allowed production domains (apex and www)
export const ALLOWED_PRODUCTION_DOMAINS = [
  'https://www.taleemguru.pk',
  'https://taleemguru.pk',
];

/**
 * Detects if the current client environment is running locally or in development container.
 */
export const isLocalDevelopment = (): boolean => {
  if (typeof window === 'undefined' || !window.location) return false;
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local') ||
    hostname.includes('.run.app')
  );
};

/**
 * Detects if the current client environment is running on a Vercel preview or deployment domain.
 */
export const isVercelDeployment = (): boolean => {
  if (typeof window === 'undefined' || !window.location) return false;
  return window.location.hostname.endsWith('.vercel.app');
};

/**
 * Returns the base site URL for metadata, SEO, and asset links.
 */
export const getSiteUrl = (): string => {
  // Check if environment variable is set
  const envUrl = (
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL
      ? (import.meta.env.VITE_SITE_URL as string).trim()
      : ''
  ).replace(/\/$/, '');

  // Local development detection in browser
  if (isLocalDevelopment()) {
    return window.location.origin;
  }

  // If in browser and on a Vercel deployment URL or apex domain, enforce canonical production domain
  if (typeof window !== 'undefined' && window.location) {
    if (isVercelDeployment() || window.location.hostname === 'taleemguru.pk') {
      return CANONICAL_PRODUCTION_DOMAIN;
    }
  }

  // If explicit environment variable is set and NOT a vercel.app preview URL
  if (envUrl && !envUrl.includes('.vercel.app')) {
    if (envUrl === 'https://taleemguru.pk' || envUrl === 'http://taleemguru.pk') {
      return CANONICAL_PRODUCTION_DOMAIN;
    }
    return envUrl;
  }

  // Canonical production fallback
  return CANONICAL_PRODUCTION_DOMAIN;
};

/**
 * Returns the exact destination URL for Supabase authentication redirects
 * (Google OAuth, Email verification, Password reset, and Auth callbacks).
 *
 * Guarantees:
 * 1. Production authentication ALWAYS returns to the canonical production domain: https://www.taleemguru.pk
 * 2. Vercel deployment/preview URLs (*.vercel.app) are NEVER used as production redirect destinations.
 * 3. Localhost development continues to work on the developer's local port (e.g., http://localhost:3000).
 * 4. Appends clean subpath and preserves required authentication parameters.
 */
export function getAuthRedirectUrl(subPath = '/auth/callback'): string {
  const cleanSubPath = subPath ? (subPath.startsWith('/') ? subPath : `/${subPath}`) : '';

  // Local development preserves localhost / container URL
  if (isLocalDevelopment()) {
    return `${window.location.origin}${cleanSubPath}`;
  }

  // All production and Vercel preview environments MUST redirect to canonical production domain
  return `${CANONICAL_PRODUCTION_DOMAIN}${cleanSubPath}`;
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
  getSiteUrl,
  getAuthRedirectUrl,
  SITE_CONFIG,
};
