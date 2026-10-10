import React, { useEffect } from 'react';
import { ViewMode } from '../types';
import { CANONICAL_PRODUCTION_DOMAIN, getCanonicalUrl } from '../lib/config';
import { viewToCanonicalPath } from '../lib/routeGuards';
import { useSiteSettings } from '../context/SiteSettingsContext';
import {
  buildDynamicTitle,
  buildDynamicDescription,
  determineRobotsDirective,
  generateSchemaGraph,
} from '../lib/seo';

export interface ActiveSeoItem {
  id: string;
  title: string;
  description?: string;
  status?: string;
  subject?: string;
  classLevel?: string;
  board?: string;
  durationMinutes?: number;
  totalQuestions?: number;
  year?: number;
  type?: string;
}

export interface SEOHeadProps {
  currentView: ViewMode;
  subFilter?: string;
  customTitle?: string;
  customDescription?: string;
  contentStatus?: string | null;
  isNotFound?: boolean;
  isEmptyContent?: boolean;
  canonicalPathOverride?: string;
  activeItem?: ActiveSeoItem | null;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  currentView,
  subFilter,
  customTitle,
  customDescription,
  contentStatus,
  isNotFound,
  isEmptyContent,
  canonicalPathOverride,
  activeItem,
}) => {
  const { getSetting } = useSiteSettings();

  useEffect(() => {
    // 1. Determine canonical path & URL (strictly rooted at canonical domain)
    const baseCanonical = getSetting('seo.canonicalUrl', CANONICAL_PRODUCTION_DOMAIN);
    const rawPath = canonicalPathOverride || viewToCanonicalPath(currentView, subFilter);
    const finalCanonical = getCanonicalUrl(rawPath, baseCanonical);

    // 2. Resolve content status (from prop or activeItem)
    const resolvedStatus = contentStatus || activeItem?.status || null;

    // 3. Resolve Title & Description
    const siteName = getSetting('branding.siteName', 'Taleem Guru');
    const resolvedTitle = customTitle || activeItem?.title;
    const finalTitle = buildDynamicTitle(currentView, subFilter, resolvedTitle, siteName);

    const defaultDesc = getSetting('seo.defaultMetaDescription');
    const resolvedDescription = customDescription || activeItem?.description || defaultDesc;
    const finalDescription = buildDynamicDescription(currentView, subFilter, resolvedDescription, siteName);

    // 4. Resolve robots indexing rules
    const defaultRobots = getSetting('seo.robots', 'index, follow');
    const robotsDirective = determineRobotsDirective({
      view: currentView,
      contentStatus: resolvedStatus,
      isNotFound: isNotFound || currentView === 'not-found',
      isEmptyContent,
      hasSearchQuery: currentView === 'search' && Boolean(subFilter),
      defaultDirective: defaultRobots,
    });

    // 5. Update document.title
    document.title = finalTitle;

    // Helper to set or update meta tag
    const setMetaTag = (attr: string, key: string, content: string) => {
      if (!content) return;
      let element = document.querySelector(`meta[${attr}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 6. Update Core Meta Tags
    setMetaTag('name', 'description', finalDescription);
    setMetaTag('name', 'robots', robotsDirective);

    const googleVerif = getSetting('seo.googleVerification');
    if (googleVerif) setMetaTag('name', 'google-site-verification', googleVerif);

    const bingVerif = getSetting('seo.bingVerification');
    if (bingVerif) setMetaTag('name', 'msvalidate.01', bingVerif);

    // 7. Update Open Graph Meta Tags
    const ogImg = getSetting('seo.ogImage') || getSetting('branding.logoLight') || `${CANONICAL_PRODUCTION_DOMAIN}/assets/taleemguru-logo-original.png`;
    setMetaTag('property', 'og:title', getSetting('seo.ogTitle') || finalTitle);
    setMetaTag('property', 'og:description', getSetting('seo.ogDescription') || finalDescription);
    setMetaTag('property', 'og:url', finalCanonical);
    setMetaTag('property', 'og:site_name', siteName);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:locale', 'en_PK');
    setMetaTag('property', 'og:image', ogImg);

    // 8. Update Twitter/X Card Meta Tags
    const twitterImg = getSetting('seo.twitterImage') || ogImg;
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', finalTitle);
    setMetaTag('name', 'twitter:description', finalDescription);
    setMetaTag('name', 'twitter:image', twitterImg);

    // 9. Update Canonical Link Element
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', finalCanonical);

    // 10. Structured Data (Schema.org JSON-LD)
    const structuredDataId = 'taleemguru-jsonld';
    let scriptTag = document.getElementById(structuredDataId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = structuredDataId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const schemaGraph = generateSchemaGraph({
      view: currentView,
      canonicalUrl: finalCanonical,
      title: finalTitle,
      description: finalDescription,
      subFilter,
      activeItem,
      siteName,
    });

    scriptTag.text = JSON.stringify(schemaGraph);

    // 11. Dynamic Favicon Update
    const faviconUrl = getSetting('branding.favicon');
    if (faviconUrl) {
      const faviconLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
      if (faviconLinks.length > 0) {
        faviconLinks.forEach(link => {
          link.setAttribute('href', faviconUrl);
        });
      } else {
        const link = document.createElement('link');
        link.setAttribute('rel', 'icon');
        link.setAttribute('href', faviconUrl);
        document.head.appendChild(link);
      }
    }
  }, [
    currentView,
    subFilter,
    customTitle,
    customDescription,
    contentStatus,
    isNotFound,
    isEmptyContent,
    canonicalPathOverride,
    activeItem,
  ]);

  return null;
};
