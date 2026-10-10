import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { fetchPublicSettingsApi } from '../lib/api';
import { setBrandName } from '../utils/watermark';

export interface SiteSettingsContextType {
  settings: Record<string, string>;
  isLoading: boolean;
  siteName: string;
  shortSiteName: string;
  tagline: string;
  logoUrl: string;
  logoAlt: string;
  faviconUrl: string;
  siteNamePrimaryColor: string;
  siteNameSecondaryColor: string;
  siteNameParts: { primary: string; secondary: string };
  getSetting: (key: string, defaultValue?: string) => string;
  refreshSettings: () => Promise<void>;
  updateLocalSettings: (newSettings: Record<string, string>) => void;
}

const DEFAULT_SETTINGS_MAP: Record<string, string> = {
  'branding.siteName': 'Taleem Guru',
  'branding.shortSiteName': 'Taleem Guru',
  'branding.tagline': 'Learn. Practice. Test. Improve.',
  'branding.description': "Pakistan's Premier Educational Platform for Board Exams, Entry Tests & Competitive Prep",
  'branding.logoLight': '/assets/taleemguru-logo-original.png',
  'branding.logoDark': '/assets/taleemguru-logo-original.png',
  'branding.favicon': '/assets/taleemguru-logo-original.png',
  'branding.logoAlt': 'Taleem Guru Official Logo',
  'branding.siteNamePrimaryColor': '#FFFFFF',
  'branding.siteNameSecondaryColor': '#3B82F6',
  'site_name': 'Taleem Guru',
  'site_name_primary_color': '#FFFFFF',
  'site_name_secondary_color': '#3B82F6',
  'general.websiteName': 'Taleem Guru',
  'general.contactEmail': 'info@taleemguru.pk',
  'general.supportEmail': 'support@taleemguru.pk',
  'general.contactPhone': '+92 300 1234567',
  'general.whatsappNumber': '+92 300 1234567',
  'general.maintenanceMode': 'false',
  'seo.defaultMetaTitle': 'Taleem Guru – Board Exam & Entry Test Preparation',
  'seo.defaultMetaDescription': 'Practice thousands of MCQs, mock tests, past papers, and study notes for BISE boards, MDCAT, ECAT, CSS, and Armed Forces exams.',
  'seo.canonicalUrl': 'https://www.taleemguru.pk/',
  'footer.description': 'Taleem Guru is an educational test preparation platform designed for Pakistani students preparing for Matric, Intermediate, MDCAT, ECAT, and competitive exams.',
  'footer.copyrightText': '© 2026 Taleem Guru. All Rights Reserved.',
  'theme.primaryColor': '#2563eb',
  'theme.secondaryColor': '#4f46e5',
  'theme.accentColor': '#06b6d4',
};

// Helper to resolve the authoritative site name across general, branding, and site_name keys
function resolveAuthoritativeSiteName(map: Record<string, string>): string {
  return map['site_name'] || map['general.websiteName'] || map['branding.siteName'] || 'Taleem Guru';
}

/**
 * Intelligent and robust brand parser that splits the site name into primary and secondary parts.
 * Supports:
 * - "Taleem Guru" -> { primary: "Taleem", secondary: "Guru" }
 * - "TaleemGuru" -> { primary: "Taleem", secondary: "Guru" }
 * - "TALEEM GURU" -> { primary: "TALEEM", secondary: "GURU" }
 * - Single word -> { primary: "Word", secondary: "" }
 */
export function parseBrandNameParts(name: string): { primary: string; secondary: string } {
  if (!name || !name.trim()) {
    return { primary: 'Taleem', secondary: 'Guru' };
  }
  const trimmed = name.trim();

  // If there's a space, split by the first space
  if (trimmed.includes(' ')) {
    const spaceIdx = trimmed.indexOf(' ');
    return {
      primary: trimmed.substring(0, spaceIdx),
      secondary: trimmed.substring(spaceIdx + 1).trim(),
    };
  }

  // If camelCase or PascalCase like "TaleemGuru"
  const camelMatch = trimmed.match(/^([A-Z][a-z0-9]+)([A-Z].*)$/);
  if (camelMatch) {
    return {
      primary: camelMatch[1],
      secondary: camelMatch[2],
    };
  }

  // If case-insensitive "taleem" prefix
  if (/^taleem/i.test(trimmed) && trimmed.length > 6) {
    return {
      primary: trimmed.substring(0, 6),
      secondary: trimmed.substring(6),
    };
  }

  // Single word fallback
  return {
    primary: trimmed,
    secondary: '',
  };
}

const initialSiteName = resolveAuthoritativeSiteName(DEFAULT_SETTINGS_MAP);

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: DEFAULT_SETTINGS_MAP,
  isLoading: true,
  siteName: initialSiteName,
  shortSiteName: initialSiteName,
  tagline: DEFAULT_SETTINGS_MAP['branding.tagline'] || 'Learn. Practice. Test. Improve.',
  logoUrl: DEFAULT_SETTINGS_MAP['branding.logoLight'] || '/assets/taleemguru-logo-original.png',
  logoAlt: DEFAULT_SETTINGS_MAP['branding.logoAlt'] || 'Taleem Guru Official Logo',
  faviconUrl: DEFAULT_SETTINGS_MAP['branding.favicon'] || '/assets/taleemguru-logo-original.png',
  siteNamePrimaryColor: '#FFFFFF',
  siteNameSecondaryColor: '#3B82F6',
  siteNameParts: parseBrandNameParts(initialSiteName),
  getSetting: (key: string, defaultValue?: string) => defaultValue || DEFAULT_SETTINGS_MAP[key] || '',
  refreshSettings: async () => {},
  updateLocalSettings: () => {},
});

export const SiteSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS_MAP);
  const [isLoading, setIsLoading] = useState(true);

  // Authoritative dynamic values
  const siteName = resolveAuthoritativeSiteName(settings);
  const shortSiteName = settings['branding.shortSiteName'] || siteName;
  const tagline = settings['branding.tagline'] || settings['general.tagline'] || 'Learn. Practice. Test. Improve.';
  const logoUrl = settings['branding.logoLight'] || '/assets/taleemguru-logo-original.png';
  const logoAlt = settings['branding.logoAlt'] || `${siteName} Official Logo`;
  const faviconUrl = settings['branding.favicon'] || '/assets/taleemguru-logo-original.png';
  const siteNamePrimaryColor =
    settings['branding.siteNamePrimaryColor'] ||
    settings['site_name_primary_color'] ||
    '#FFFFFF';
  const siteNameSecondaryColor =
    settings['branding.siteNameSecondaryColor'] ||
    settings['site_name_secondary_color'] ||
    '#3B82F6';
  const siteNameParts = parseBrandNameParts(siteName);

  const applyDomSettings = useCallback((map: Record<string, string>) => {
    if (typeof document === 'undefined') return;

    const currentSiteName = resolveAuthoritativeSiteName(map);

    // Keep watermark library synchronized
    setBrandName(currentSiteName);

    // 1. Dynamic Favicon Update
    const fav = map['branding.favicon'] || DEFAULT_SETTINGS_MAP['branding.favicon'];
    if (fav) {
      const iconLinks = document.querySelectorAll<HTMLLinkElement>("link[rel~='icon'], link[rel='shortcut icon']");
      if (iconLinks.length > 0) {
        iconLinks.forEach((link) => {
          link.href = fav;
        });
      } else {
        const iconLink = document.createElement('link');
        iconLink.rel = 'icon';
        iconLink.href = fav;
        document.getElementsByTagName('head')[0]?.appendChild(iconLink);
      }
    }

    // 2. Dynamic Title updating: Ensure current title reflects the latest site name
    if (document.title) {
      // If current document title has old default titles or hardcoded variations, dynamically update
      if (/Taleem\s*Guru|TaleemGuru|TALEEM GURU/i.test(document.title)) {
        document.title = document.title
          .replace(/TALEEM GURU/g, currentSiteName.toUpperCase())
          .replace(/Taleem\s*Guru/g, currentSiteName)
          .replace(/TaleemGuru/g, currentSiteName);
      }
    } else {
      document.title = `${currentSiteName} - Learn. Practice. Test. Improve.`;
    }

    // 3. Dynamic OpenGraph site_name
    let ogSiteName = document.querySelector('meta[property="og:site_name"]');
    if (ogSiteName) {
      ogSiteName.setAttribute('content', currentSiteName);
    }

    // 4. Dynamic Theme CSS Variables
    const primaryColor = map['theme.primaryColor'];
    if (primaryColor && primaryColor.startsWith('#')) {
      document.documentElement.style.setProperty('--color-primary', primaryColor);
    }
    const secondaryColor = map['theme.secondaryColor'];
    if (secondaryColor && secondaryColor.startsWith('#')) {
      document.documentElement.style.setProperty('--color-secondary', secondaryColor);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const publicMap = await fetchPublicSettingsApi();
      if (publicMap && Object.keys(publicMap).length > 0) {
        // Enforce authoritative single source of truth across branding and general
        const authName = resolveAuthoritativeSiteName(publicMap);
        const primaryCol =
          publicMap['site_name_primary_color'] ||
          publicMap['branding.siteNamePrimaryColor'] ||
          DEFAULT_SETTINGS_MAP['branding.siteNamePrimaryColor'];
        const secondaryCol =
          publicMap['site_name_secondary_color'] ||
          publicMap['branding.siteNameSecondaryColor'] ||
          DEFAULT_SETTINGS_MAP['branding.siteNameSecondaryColor'];

        const harmonized: Record<string, string> = {
          ...publicMap,
          'general.websiteName': authName,
          'branding.siteName': authName,
          'site_name': authName,
          'branding.siteNamePrimaryColor': primaryCol,
          'site_name_primary_color': primaryCol,
          'branding.siteNameSecondaryColor': secondaryCol,
          'site_name_secondary_color': secondaryCol,
        };
        const merged = { ...DEFAULT_SETTINGS_MAP, ...harmonized };
        setSettings(merged);
        applyDomSettings(merged);
      }
    } catch (e) {
      console.warn('Notice loading site settings:', e);
    } finally {
      setIsLoading(false);
    }
  }, [applyDomSettings]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const getSetting = useCallback(
    (key: string, defaultValue?: string): string => {
      // Unified site name resolving
      if (key === 'siteName' || key === 'branding.siteName' || key === 'general.websiteName' || key === 'site_name') {
        return resolveAuthoritativeSiteName(settings);
      }
      if (key === 'siteNamePrimaryColor' || key === 'branding.siteNamePrimaryColor' || key === 'site_name_primary_color') {
        return (
          settings['branding.siteNamePrimaryColor'] ||
          settings['site_name_primary_color'] ||
          defaultValue ||
          '#FFFFFF'
        );
      }
      if (key === 'siteNameSecondaryColor' || key === 'branding.siteNameSecondaryColor' || key === 'site_name_secondary_color') {
        return (
          settings['branding.siteNameSecondaryColor'] ||
          settings['site_name_secondary_color'] ||
          defaultValue ||
          '#3B82F6'
        );
      }
      if (key === 'shortSiteName' || key === 'branding.shortSiteName') {
        return settings['branding.shortSiteName'] || resolveAuthoritativeSiteName(settings);
      }
      if (key === 'tagline' || key === 'branding.tagline' || key === 'general.tagline') {
        return settings['branding.tagline'] || settings['general.tagline'] || defaultValue || 'Learn. Practice. Test. Improve.';
      }
      if (key === 'logoLight' || key === 'branding.logoLight') {
        return settings['branding.logoLight'] || defaultValue || '/assets/taleemguru-logo-original.png';
      }
      if (key === 'logoAlt' || key === 'branding.logoAlt') {
        return settings['branding.logoAlt'] || defaultValue || `${resolveAuthoritativeSiteName(settings)} Official Logo`;
      }
      if (key === 'favicon' || key === 'branding.favicon') {
        return settings['branding.favicon'] || defaultValue || '/assets/taleemguru-logo-original.png';
      }

      if (settings[key] !== undefined && settings[key] !== null && settings[key] !== '') {
        return settings[key];
      }
      if (defaultValue !== undefined) return defaultValue;
      return DEFAULT_SETTINGS_MAP[key] || '';
    },
    [settings]
  );

  const updateLocalSettings = useCallback((newSettings: Record<string, string>) => {
    setSettings((prev) => {
      const authName = resolveAuthoritativeSiteName(newSettings) || resolveAuthoritativeSiteName(prev);
      const primaryCol =
        newSettings['site_name_primary_color'] ||
        newSettings['branding.siteNamePrimaryColor'] ||
        prev['branding.siteNamePrimaryColor'] ||
        '#FFFFFF';
      const secondaryCol =
        newSettings['site_name_secondary_color'] ||
        newSettings['branding.siteNameSecondaryColor'] ||
        prev['branding.siteNameSecondaryColor'] ||
        '#3B82F6';

      const harmonized: Record<string, string> = {
        ...newSettings,
        'general.websiteName': authName,
        'branding.siteName': authName,
        'site_name': authName,
        'branding.siteNamePrimaryColor': primaryCol,
        'site_name_primary_color': primaryCol,
        'branding.siteNameSecondaryColor': secondaryCol,
        'site_name_secondary_color': secondaryCol,
      };
      const merged = { ...prev, ...harmonized };
      applyDomSettings(merged);
      return merged;
    });
  }, [applyDomSettings]);

  return (
    <SiteSettingsContext.Provider
      value={{
        settings,
        isLoading,
        siteName,
        shortSiteName,
        tagline,
        logoUrl,
        logoAlt,
        faviconUrl,
        siteNamePrimaryColor,
        siteNameSecondaryColor,
        siteNameParts,
        getSetting,
        refreshSettings,
        updateLocalSettings,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = () => useContext(SiteSettingsContext);

export interface BrandLogoTextProps {
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  forceUppercase?: boolean;
}

export const BrandLogoText: React.FC<BrandLogoTextProps> = ({
  className = "font-black tracking-tight",
  primaryClassName = "",
  secondaryClassName = "",
  forceUppercase = true,
}) => {
  const { siteName, siteNamePrimaryColor, siteNameSecondaryColor } = useSiteSettings();
  const { primary, secondary } = parseBrandNameParts(siteName);

  const displayPrimary = forceUppercase ? primary.toUpperCase() : primary;
  const displaySecondary = forceUppercase ? secondary.toUpperCase() : secondary;

  return (
    <span className={`${forceUppercase ? 'uppercase' : ''} ${className}`}>
      <span style={{ color: siteNamePrimaryColor || '#FFFFFF' }} className={primaryClassName}>
        {displayPrimary}
      </span>
      {displaySecondary ? (
        <span style={{ color: siteNameSecondaryColor || '#3B82F6' }} className={secondaryClassName}>
          {' '}{displaySecondary}
        </span>
      ) : null}
    </span>
  );
};
