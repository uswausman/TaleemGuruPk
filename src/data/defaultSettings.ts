export interface SiteSettingItem {
  key: string;
  category: string;
  value: string;
  isPublic: boolean;
  updatedBy?: string | null;
  updatedAt?: Date | string;
}

export const DEFAULT_SITE_SETTINGS: Record<string, { value: string; category: string; isPublic: boolean }> = {
  // Branding
  'branding.siteName': { value: 'Taleem Guru', category: 'branding', isPublic: true },
  'branding.shortSiteName': { value: 'Taleem Guru', category: 'branding', isPublic: true },
  'branding.tagline': { value: 'Learn. Practice. Test. Improve.', category: 'branding', isPublic: true },
  'branding.description': { value: "Pakistan's Premier Educational Platform for Board Exams, Entry Tests & Competitive Prep", category: 'branding', isPublic: true },
  'branding.logoLight': { value: '/assets/taleemguru-logo-original.png', category: 'branding', isPublic: true },
  'branding.logoDark': { value: '/assets/taleemguru-logo-original.png', category: 'branding', isPublic: true },
  'branding.favicon': { value: '/assets/taleemguru-logo-original.png', category: 'branding', isPublic: true },
  'branding.logoAlt': { value: 'Taleem Guru Official Logo', category: 'branding', isPublic: true },
  'branding.siteNamePrimaryColor': { value: '#FFFFFF', category: 'branding', isPublic: true },
  'branding.siteNameSecondaryColor': { value: '#3B82F6', category: 'branding', isPublic: true }, // Tailwind Blue-500
  'site_name': { value: 'Taleem Guru', category: 'branding', isPublic: true },
  'site_name_primary_color': { value: '#FFFFFF', category: 'branding', isPublic: true },
  'site_name_secondary_color': { value: '#3B82F6', category: 'branding', isPublic: true },

  // General
  'general.websiteName': { value: 'Taleem Guru', category: 'general', isPublic: true },
  'general.websiteDescription': { value: "Pakistan's Premier Educational Platform for BISE Boards, MDCAT, ECAT & Competitive Examinations", category: 'general', isPublic: true },
  'general.tagline': { value: 'Learn. Practice. Test. Improve.', category: 'general', isPublic: true },
  'general.contactEmail': { value: 'info@taleemguru.pk', category: 'general', isPublic: true },
  'general.supportEmail': { value: 'support@taleemguru.pk', category: 'general', isPublic: true },
  'general.contactPhone': { value: '+92 300 1234567', category: 'general', isPublic: true },
  'general.whatsappNumber': { value: '+92 300 1234567', category: 'general', isPublic: true },
  'general.address': { value: 'Lahore, Punjab, Pakistan', category: 'general', isPublic: true },
  'general.timezone': { value: 'Asia/Karachi', category: 'general', isPublic: true },
  'general.defaultLanguage': { value: 'en', category: 'general', isPublic: true },
  'general.defaultCountry': { value: 'Pakistan', category: 'general', isPublic: true },
  'general.currency': { value: 'PKR', category: 'general', isPublic: true },
  'general.maintenanceMode': { value: 'false', category: 'general', isPublic: true },
  'general.maintenanceMessage': { value: 'System maintenance in progress. TaleemGuru will be back online shortly.', category: 'general', isPublic: true },
  'general.comingSoonMode': { value: 'false', category: 'general', isPublic: true },

  // SEO
  'seo.defaultMetaTitle': { value: 'TaleemGuru – Board Exam & Entry Test Preparation', category: 'seo', isPublic: true },
  'seo.defaultMetaDescription': { value: 'Practice thousands of MCQs, mock tests, past papers, and study notes for BISE boards, MDCAT, ECAT, CSS, and Armed Forces exams.', category: 'seo', isPublic: true },
  'seo.defaultKeywords': { value: 'TaleemGuru, MCQs, Past Papers, Model Papers, BISE Punjab, FBISE, MDCAT, ECAT, Board Exams, Entry Tests', category: 'seo', isPublic: true },
  'seo.canonicalUrl': { value: 'https://www.taleemguru.pk/', category: 'seo', isPublic: true },
  'seo.ogTitle': { value: 'TaleemGuru – Pakistan\'s #1 Exam Prep Portal', category: 'seo', isPublic: true },
  'seo.ogDescription': { value: 'Prepare for Board Exams, Entry Tests, and Competitive Exams with authentic MCQs, past papers, and instant analytics.', category: 'seo', isPublic: true },
  'seo.ogImage': { value: '/assets/taleemguru-logo-original.png', category: 'seo', isPublic: true },
  'seo.twitterImage': { value: '/assets/taleemguru-logo-original.png', category: 'seo', isPublic: true },
  'seo.robots': { value: 'index, follow', category: 'seo', isPublic: true },
  'seo.googleVerification': { value: '', category: 'seo', isPublic: true },
  'seo.bingVerification': { value: '', category: 'seo', isPublic: true },

  // Social Media
  'social.facebook': { value: 'https://facebook.com/taleemgurupk', category: 'social', isPublic: true },
  'social.instagram': { value: 'https://instagram.com/taleemgurupk', category: 'social', isPublic: true },
  'social.youtube': { value: 'https://youtube.com/@taleemgurupk', category: 'social', isPublic: true },
  'social.tiktok': { value: 'https://tiktok.com/@taleemgurupk', category: 'social', isPublic: true },
  'social.twitter': { value: 'https://x.com/taleemgurupk', category: 'social', isPublic: true },
  'social.linkedin': { value: 'https://linkedin.com/company/taleemguru', category: 'social', isPublic: true },
  'social.telegram': { value: 'https://t.me/taleemgurupk', category: 'social', isPublic: true },
  'social.whatsapp': { value: 'https://wa.me/923001234567', category: 'social', isPublic: true },

  // Header
  'header.showLogo': { value: 'true', category: 'header', isPublic: true },
  'header.showNav': { value: 'true', category: 'header', isPublic: true },
  'header.ctaText': { value: 'Start Practice', category: 'header', isPublic: true },
  'header.ctaUrl': { value: '/tests', category: 'header', isPublic: true },
  'header.showLoginBtn': { value: 'true', category: 'header', isPublic: true },
  'header.showRegisterBtn': { value: 'true', category: 'header', isPublic: true },
  'header.mobileMenuEnabled': { value: 'true', category: 'header', isPublic: true },

  // Homepage
  'homepage.heroTitle': { value: 'Master Your Exams with Pakistan\'s #1 Practice Platform', category: 'homepage', isPublic: true },
  'homepage.heroSubtitle': { value: 'Thousands of board-aligned MCQs, MDCAT/ECAT mock tests, past papers, and instant performance analytics.', category: 'homepage', isPublic: true },
  'homepage.primaryCtaText': { value: 'Explore Practice Tests', category: 'homepage', isPublic: true },
  'homepage.primaryCtaLink': { value: '/tests', category: 'homepage', isPublic: true },
  'homepage.secondaryCtaText': { value: 'View Past Papers', category: 'homepage', isPublic: true },
  'homepage.secondaryCtaLink': { value: '/past-papers', category: 'homepage', isPublic: true },
  'homepage.showAnnouncement': { value: 'true', category: 'homepage', isPublic: true },
  'homepage.announcementText': { value: '🔥 New BISE 2026 Board Practice Exam Papers & MDCAT Mock Tests Are Live!', category: 'homepage', isPublic: true },
  'homepage.announcementLink': { value: '/tests', category: 'homepage', isPublic: true },

  // Footer
  'footer.description': { value: 'TaleemGuru is Pakistan\'s leading digital learning platform empowering students across BISE boards, MDCAT, ECAT, CSS, and Competitive Examinations.', category: 'footer', isPublic: true },
  'footer.copyrightText': { value: '© 2026 TaleemGuru. All Rights Reserved.', category: 'footer', isPublic: true },
  'footer.privacyPolicyUrl': { value: '/privacy-policy', category: 'footer', isPublic: true },
  'footer.termsUrl': { value: '/terms-of-service', category: 'footer', isPublic: true },
  'footer.disclaimerUrl': { value: '/terms-of-service#disclaimer', category: 'footer', isPublic: true },

  // Theme
  'theme.primaryColor': { value: '#2563eb', category: 'theme', isPublic: true },
  'theme.secondaryColor': { value: '#4f46e5', category: 'theme', isPublic: true },
  'theme.accentColor': { value: '#06b6d4', category: 'theme', isPublic: true },
  'theme.defaultTheme': { value: 'light', category: 'theme', isPublic: true },
  'theme.borderRadius': { value: '1rem', category: 'theme', isPublic: true },

  // Contact
  'contact.supportMessage': { value: 'Our support team is available 24/7 to assist candidates with technical or test preparation queries.', category: 'contact', isPublic: true },
  'contact.enableContactForm': { value: 'true', category: 'contact', isPublic: true },

  // Legal
  'legal.cookieConsentText': { value: 'We use cookies to personalize candidate experience and analyze platform traffic.', category: 'legal', isPublic: true },
  'legal.disclaimerText': { value: 'TaleemGuru provides practice materials for educational preparation purposes.', category: 'legal', isPublic: true },

  // Analytics & Verification
  'analytics.gaMeasurementId': { value: '', category: 'analytics', isPublic: true },
  'analytics.googleSearchConsole': { value: '', category: 'analytics', isPublic: true },
  'analytics.facebookPixelId': { value: '', category: 'analytics', isPublic: true },
};
