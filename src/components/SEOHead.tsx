import React, { useEffect } from 'react';
import { ViewMode } from '../types';
import { getSiteUrl } from '../lib/config';

interface SEOHeadProps {
  currentView: ViewMode;
  subFilter?: string;
  customTitle?: string;
  customDescription?: string;
}

interface PageMeta {
  title: string;
  description: string;
  canonicalPath: string;
  keywords: string[];
  schemaType: 'EducationalOrganization' | 'Quiz' | 'Course' | 'ItemPage';
}

const VIEW_METADATA: Record<string, PageMeta> = {
  home: {
    title: 'TALEEM GURU - Learn. Practice. Test. Improve. | Pakistan Online Tests & MCQs',
    description:
      'Pakistan’s leading online test & quiz platform for 9th, 10th, 11th, 12th Matric & Intermediate BISE Board exams, MDCAT, ECAT, CSS, Armed Forces, and comprehensive solved past papers.',
    canonicalPath: '/',
    keywords: [
      'Pakistan education',
      'Board exams',
      'MCQs online test',
      'Matric preparation',
      '9th class',
      '10th class',
      '11th class',
      '12th class',
      'Punjab Board',
      'Federal Board',
      'Past papers',
      'Educational notes',
      'MDCAT mock test',
      'ECAT entry test',
    ],
    schemaType: 'EducationalOrganization',
  },
  curriculum: {
    title: 'Curriculum & Hierarchy - Boards, Classes, Subjects & Topics | Taleem Guru',
    description:
      'Explore syllabus hierarchy from Pakistan Education Boards down to Classes (9th, 10th, 11th, 12th), Subjects, Chapters, and Learning Objectives.',
    canonicalPath: '/curriculum',
    keywords: ['Curriculum hierarchy', 'BISE syllabus', 'Class 9 syllabus', 'Class 10 Physics', 'Punjab textbook board'],
    schemaType: 'Course',
  },
  tests: {
    title: 'Online Chapter Tests & Quizzes for Class 9, 10, 11, 12 | Taleem Guru',
    description:
      'Take timed online tests and quizzes for Matric and Inter BISE Punjab, Federal, Sindh, and KPK boards with instant scoring, negative marking, and detailed answer keys.',
    canonicalPath: '/tests',
    keywords: ['Online quizzes', 'Chapter tests', 'Board exams preparation', 'Mock tests Pakistan', 'Self assessment'],
    schemaType: 'Quiz',
  },
  mcqs: {
    title: 'Solved MCQ Bank with Explanations - Matric & Intermediate | Taleem Guru',
    description:
      'Search over 10,000+ board-verified multiple choice questions with step-by-step solutions for Physics, Chemistry, Biology, Mathematics, and Computer Science.',
    canonicalPath: '/mcqs',
    keywords: ['MCQ Bank', 'Solved MCQs', 'Past paper MCQs', 'Matric MCQs', 'FSc MCQs', 'MDCAT MCQs'],
    schemaType: 'Course',
  },
  boards: {
    title: 'All Pakistan Education Boards Directory - BISE & FBISE | Taleem Guru',
    description:
      'Find past papers, date sheets, roll number slips, and chapter tests for all BISE Punjab, Federal Board Islamabad, Sindh, KPK, Balochistan, and AJK boards.',
    canonicalPath: '/boards',
    keywords: ['Punjab Board', 'BISE Lahore', 'Federal Board', 'FBISE Islamabad', 'BISE Rawalpindi', 'Sindh Board'],
    schemaType: 'EducationalOrganization',
  },
  classes: {
    title: 'Class 9, 10, 11, 12 Academic Portals & Syllabus | Taleem Guru',
    description:
      'Grade-specific preparation hubs for Class 9 (SSC-I), Class 10 (SSC-II), Class 11 (HSSC-I), and Class 12 (HSSC-II) with chapter-wise MCQs, notes, and past papers.',
    canonicalPath: '/classes',
    keywords: ['9th class', '10th class', '11th class', '12th class', 'SSC Part 1', 'HSSC Part 2', 'FSc Pre Medical'],
    schemaType: 'Course',
  },
  subjects: {
    title: 'Academic Subjects Catalog - Science, Arts & Compulsory | Taleem Guru',
    description:
      'Browse Physics, Chemistry, Biology, Mathematics, Computer Science, English, Urdu, Pakistan Studies, and Islamiat preparation materials.',
    canonicalPath: '/subjects',
    keywords: ['Physics MCQs', 'Chemistry notes', 'Biology past papers', 'Mathematics formulas', 'Computer Science syllabus'],
    schemaType: 'Course',
  },
  notes: {
    title: 'High-Yield Educational Notes & Formula Sheets | Taleem Guru',
    description:
      'Download authentic PDF chapter notes, short questions, long questions, definitions, and formula sheets for Pakistani school and college examinations.',
    canonicalPath: '/notes',
    keywords: ['Educational notes', 'Physics formula sheet', 'Short questions solved', 'Class 10 notes', 'FSc notes PDF'],
    schemaType: 'Course',
  },
  'past-papers': {
    title: '10-Year Solved Past Papers Archive for All Boards | Taleem Guru',
    description:
      'Download and practice 10-year past examination papers for BISE Lahore, FBISE Islamabad, Karachi Board, and more with verified answer keys.',
    canonicalPath: '/past-papers',
    keywords: ['Past papers', 'BISE Lahore past papers', 'FBISE past papers', 'Solved matric papers', '10 year past papers'],
    schemaType: 'Course',
  },
  'entry-tests': {
    title: 'MDCAT, ECAT, NUMS, NUST & GIKI Entry Test Preparation | Taleem Guru',
    description:
      'Crack medical and engineering entrance exams in Pakistan with full-length syllabus mock tests, past papers, and national percentile ranking.',
    canonicalPath: '/entry-tests',
    keywords: ['MDCAT preparation', 'ECAT test practice', 'NUMS mock exam', 'UHS past papers', 'NUST NET preparation'],
    schemaType: 'Quiz',
  },
  'competitive-exams': {
    title: 'CSS & PMS Competitive Exams Preparation Portal | Taleem Guru',
    description:
      'FPSC CSS Screening MPT and PPSC PMS general knowledge, Pakistan affairs, current affairs, Islamic studies, and everyday science MCQ tests.',
    canonicalPath: '/competitive-exams',
    keywords: ['CSS preparation', 'FPSC MPT screening test', 'PMS past papers', 'General Knowledge MCQs', 'Pakistan affairs'],
    schemaType: 'Course',
  },
  'armed-forces': {
    title: 'Pakistan Armed Forces Initial Test Preparation (Army, Navy, PAF) | Taleem Guru',
    description:
      'Prepare for PMA Long Course, PAF GDP, and Pak Navy cadet tests with verbal, non-verbal intelligence, and academic test simulator.',
    canonicalPath: '/armed-forces',
    keywords: ['PMA Long Course', 'Army initial test', 'Verbal intelligence test', 'Non verbal test', 'PAF GDP test'],
    schemaType: 'Quiz',
  },
  leaderboard: {
    title: 'National Student Merit Leaderboard & Rankings | Taleem Guru',
    description:
      'View weekly, monthly, and all-time student rankings across Pakistan based on quiz accuracy, test scores, and learning streaks.',
    canonicalPath: '/leaderboard',
    keywords: ['Student leaderboard', 'National rankings', 'Merit list Pakistan', 'Quiz competition', 'Taleem Guru top scorers'],
    schemaType: 'ItemPage',
  },
  dashboard: {
    title: 'Student Learning Dashboard & Progress Analytics | Taleem Guru',
    description:
      'Track your test history, subject-wise strengths & weaknesses, accuracy trends, and bookmarks on Taleem Guru.',
    canonicalPath: '/dashboard',
    keywords: ['Student dashboard', 'Learning analytics', 'Test performance', 'Quiz history'],
    schemaType: 'ItemPage',
  },
  'privacy-policy': {
    title: 'Privacy Policy - Student Data & Academic Protection | Taleem Guru Pakistan',
    description:
      'Review the Privacy Policy for Taleem Guru Pakistan. Learn how we safeguard student account credentials, test results, performance analytics, and merit certificates.',
    canonicalPath: '/privacy-policy',
    keywords: ['Privacy policy', 'Taleem Guru privacy', 'Student data protection', 'Academic privacy Pakistan', 'Educational data security'],
    schemaType: 'ItemPage',
  },
  'terms-of-service': {
    title: 'Terms of Service - Academic Integrity & Testing Agreement | Taleem Guru Pakistan',
    description:
      'Terms of Service for Taleem Guru Pakistan. Understanding candidate rights, permissible test engine usage, merit certificate verification, and examination conduct.',
    canonicalPath: '/terms-of-service',
    keywords: ['Terms of service', 'Taleem Guru terms', 'Academic integrity', 'Test rules Pakistan', 'Certificate verification rules'],
    schemaType: 'ItemPage',
  },
};

export const SEOHead: React.FC<SEOHeadProps> = ({
  currentView,
  subFilter,
  customTitle,
  customDescription,
}) => {
  useEffect(() => {
    const meta = VIEW_METADATA[currentView] || VIEW_METADATA.home;
    const finalTitle = customTitle || (subFilter ? `${subFilter} - ${meta.title}` : meta.title);
    const finalDescription = customDescription || meta.description;
    const baseUrl = getSiteUrl();
    const finalCanonical = `${baseUrl}${meta.canonicalPath}`;

    // 1. Update document title
    document.title = finalTitle;

    // 2. Helper to set or update meta tag
    const setMetaTag = (attr: string, key: string, content: string) => {
      let element = document.querySelector(`meta[${attr}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Update Standard Meta Tags
    setMetaTag('name', 'description', finalDescription);
    setMetaTag('name', 'keywords', meta.keywords.join(', '));
    setMetaTag('name', 'robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');

    // 4. Update Open Graph Meta Tags
    setMetaTag('property', 'og:title', finalTitle);
    setMetaTag('property', 'og:description', finalDescription);
    setMetaTag('property', 'og:url', finalCanonical);
    setMetaTag('property', 'og:site_name', 'Taleem Guru Pakistan');
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:locale', 'en_PK');

    // 5. Update Twitter Card Meta Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', finalTitle);
    setMetaTag('name', 'twitter:description', finalDescription);

    // 6. Update Canonical Link Tag
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', finalCanonical);

    // 7. Inject JSON-LD Structured Data
    const structuredDataId = 'taleemguru-jsonld';
    let scriptTag = document.getElementById(structuredDataId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = structuredDataId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const jsonLdData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'EducationalOrganization',
          '@id': `${baseUrl}/#organization`,
          name: 'Taleem Guru',
          url: baseUrl,
          description: 'Pakistan’s Smart Online Test & Quiz Platform for BISE Boards, MDCAT, ECAT, CSS, and Matric/Inter Exam Preparation.',
          educationalCredentialAwarded: 'Certificate of Merit & Assessment Performance Report',
          areaServed: 'Pakistan',
          sameAs: [
            'https://facebook.com/taleemguru',
            'https://twitter.com/taleemguru',
            'https://youtube.com/taleemguru'
          ]
        },
        {
          '@type': 'WebSite',
          '@id': `${baseUrl}/#website`,
          url: baseUrl,
          name: 'Taleem Guru - Pakistan Online Tests & MCQs',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${baseUrl}/?search={search_term_string}`,
            'query-input': 'required name=search_term_string'
          }
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${finalCanonical}#breadcrumb`,
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: `${baseUrl}/`
            },
            ...(currentView !== 'home'
              ? [
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: currentView.toUpperCase(),
                    item: finalCanonical
                  }
                ]
              : [])
          ]
        }
      ]
    };

    scriptTag.text = JSON.stringify(jsonLdData);
  }, [currentView, subFilter, customTitle, customDescription]);

  return null;
};
