import React, { useEffect } from 'react';
import { ViewMode } from '../types';
import { CANONICAL_PRODUCTION_DOMAIN, getCanonicalUrl } from '../lib/config';
import { viewToCanonicalPath } from '../lib/routeGuards';
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
  useEffect(() => {
    // 1. Determine canonical path & URL (strictly rooted at https://taleemguru.pk and stripped of parameter junk)
    const rawPath = canonicalPathOverride || viewToCanonicalPath(currentView, subFilter);
    const finalCanonical = getCanonicalUrl(rawPath);

    // 2. Resolve content status (from prop or activeItem)
    const resolvedStatus = contentStatus || activeItem?.status || null;

    // 3. Resolve Title & Description
    const resolvedTitle = customTitle || activeItem?.title;
    const finalTitle = buildDynamicTitle(currentView, subFilter, resolvedTitle);

    const resolvedDescription = customDescription || activeItem?.description;
    const finalDescription = buildDynamicDescription(currentView, subFilter, resolvedDescription);

    // 4. Resolve robots indexing rules (Draft, Pending Review, Approved, Rejected, Archived are NOINDEX)
    const robotsDirective = determineRobotsDirective({
      view: currentView,
      contentStatus: resolvedStatus,
      isNotFound: isNotFound || currentView === 'not-found',
      isEmptyContent,
      hasSearchQuery: currentView === 'search' && Boolean(subFilter),
    });

    // 5. Update document.title
    document.title = finalTitle;

    // Helper to set or update meta tag
    const setMetaTag = (attr: string, key: string, content: string) => {
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

    // 7. Update Open Graph Meta Tags
    setMetaTag('property', 'og:title', finalTitle);
    setMetaTag('property', 'og:description', finalDescription);
    setMetaTag('property', 'og:url', finalCanonical);
    setMetaTag('property', 'og:site_name', 'Taleem Guru Pakistan');
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:locale', 'en_PK');
    setMetaTag('property', 'og:image', `${CANONICAL_PRODUCTION_DOMAIN}/og-image.png`);

    // 8. Update Twitter/X Card Meta Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', finalTitle);
    setMetaTag('name', 'twitter:description', finalDescription);
    setMetaTag('name', 'twitter:image', `${CANONICAL_PRODUCTION_DOMAIN}/og-image.png`);

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
    });

    scriptTag.text = JSON.stringify(schemaGraph);
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
