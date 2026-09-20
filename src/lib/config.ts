/**
 * Taleem Guru Application Configuration
 * Provides configurable site URL for canonical SEO, sharing, and deployment on Vercel or custom .pk domains.
 */

export const getSiteUrl = (): string => {
  // Check if environment variable is set
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SITE_URL) {
    return (import.meta.env.VITE_SITE_URL as string).replace(/\/$/, '');
  }

  // If in browser, use current origin
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }

  // Fallback domain
  return 'https://taleemguru.pk';
};

export const SITE_CONFIG = {
  name: 'Taleem Guru',
  title: 'TALEEM GURU - Learn. Practice. Test. Improve.',
  description: "Pakistan's smart online test & quiz platform for BISE Boards, MDCAT, ECAT, CSS, PMS, and Armed Forces.",
  supportEmail: 'support@taleemguru.pk',
  get siteUrl() {
    return getSiteUrl();
  },
};
