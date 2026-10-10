import React, { useState, useEffect, useMemo } from 'react';
import {
  Stethoscope,
  Cpu,
  GraduationCap,
  Clock,
  Play,
  Download,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  Briefcase,
  Layers,
  ArrowRight,
  Shield,
  Award,
} from 'lucide-react';
import { ENTRY_TESTS_DATA } from '../data/mockData';
import { fetchAcademicEntryTestCategoriesApi } from '../lib/api';
import { MCQ, TestConfig } from '../types';
import { exportMCQsToWatermarkedPDF } from '../utils/watermark';

export interface EntryTestItem {
  id: string;
  name: string;
  type: string;
  organizer: string;
  totalMarks: number;
  subjects: string[];
  description: string;
  duration?: string;
}

interface EntryTestsViewProps {
  onStartEntryTest: (testId: string) => void;
  allMCQs: MCQ[];
  studentName: string;
  initialCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export const ENTRY_TEST_TABS = [
  { id: 'All', label: 'All Entry Tests', desc: 'Complete National Entry & Competitive Mock Exams' },
  { id: 'MDCAT', label: 'MDCAT', desc: 'Medical & Dental Admission Test (PM&DC & NUMS)' },
  { id: 'ECAT', label: 'ECAT', desc: 'Engineering College Admission Test (UET, NUST, GIKI)' },
  { id: 'CSS', label: 'CSS', desc: 'Central Superior Services MPT Screening (FPSC)' },
  { id: 'PMS', label: 'PMS', desc: 'Provincial Management Services (PPSC, SPSC, KPPSC)' },
  { id: 'Armed Forces', label: 'Armed Forces', desc: 'Pak Army, Navy & PAF Initial Tests' },
];

/**
 * Normalizes any category string or URL parameter to a known standard tab ID
 */
export function normalizeTabId(raw?: string): string {
  if (!raw) return 'All';
  const clean = raw.trim().toLowerCase().replace(/[-_]/g, ' ');
  if (clean === 'all' || clean === 'all entry tests') return 'All';
  if (clean === 'mdcat' || clean === 'nums' || clean.includes('medical')) return 'MDCAT';
  if (clean === 'ecat' || clean === 'nust' || clean === 'giki' || clean === 'fast' || clean.includes('engineering')) return 'ECAT';
  if (clean === 'css' || clean.includes('civil services & css') || clean === 'css mpt' || clean === 'central superior') return 'CSS';
  if (clean === 'pms' || clean.includes('provincial management') || clean === 'pms screening') return 'PMS';
  if (
    clean === 'armed forces' ||
    clean === 'armedforces' ||
    clean.includes('armed') ||
    clean.includes('defense') ||
    clean.includes('army') ||
    clean.includes('navy') ||
    clean.includes('air force') ||
    clean.includes('paf') ||
    clean.includes('issb') ||
    clean.includes('pma')
  ) {
    return 'Armed Forces';
  }
  return raw.trim();
}

/**
 * Safely evaluates if a given test matches the active category filter
 */
export function matchesEntryTestCategory(test: EntryTestItem | any, selectedTab: string): boolean {
  const normTab = normalizeTabId(selectedTab);
  if (normTab === 'All') return true;

  const id = (test.id || '').toLowerCase();
  const name = (test.name || test.title || '').toLowerCase();
  const type = (test.type || test.category || test.exam || test.testType || '').toLowerCase();
  const organizer = (test.organizer || test.agency || '').toLowerCase();
  const desc = (test.description || '').toLowerCase();
  const subjectsStr = Array.isArray(test.subjects) ? test.subjects.join(' ').toLowerCase() : '';

  if (normTab === 'MDCAT') {
    return (
      id === 'mdcat' ||
      id === 'nums' ||
      id.includes('mdcat') ||
      id.includes('nums') ||
      name.includes('mdcat') ||
      name.includes('nums') ||
      name.includes('medical') ||
      type.includes('medical') ||
      type.includes('mdcat') ||
      organizer.includes('pm&dc') ||
      organizer.includes('pmdc') ||
      organizer.includes('nums') ||
      organizer.includes('uhs') ||
      organizer.includes('duhs') ||
      organizer.includes('szabmu') ||
      organizer.includes('kmu')
    );
  }

  if (normTab === 'ECAT') {
    return (
      id === 'ecat' ||
      id === 'nust-net' ||
      id === 'fast-nu' ||
      id === 'giki' ||
      id === 'pieas' ||
      id.includes('ecat') ||
      id.includes('nust') ||
      name.includes('ecat') ||
      name.includes('engineering') ||
      name.includes('nust') ||
      name.includes('fast') ||
      name.includes('giki') ||
      name.includes('pieas') ||
      type.includes('engineering') ||
      type.includes('ecat') ||
      organizer.includes('uet') ||
      organizer.includes('nust') ||
      organizer.includes('gik') ||
      organizer.includes('fast') ||
      organizer.includes('pec') ||
      organizer.includes('pieas')
    );
  }

  if (normTab === 'CSS') {
    return (
      id.includes('css') ||
      name.includes('css') ||
      name.includes('central superior') ||
      type.includes('css') ||
      desc.includes('central superior') ||
      (type.includes('civil') && (name.includes('css') || id.includes('css') || (organizer.includes('fpsc') && !name.includes('pms'))))
    );
  }

  if (normTab === 'PMS') {
    return (
      id.includes('pms') ||
      name.includes('pms') ||
      name.includes('provincial management') ||
      type.includes('pms') ||
      desc.includes('provincial management') ||
      (type.includes('civil') && (name.includes('pms') || id.includes('pms') || organizer.includes('ppsc') || organizer.includes('spsc') || organizer.includes('kppsc') || organizer.includes('bpsc')))
    );
  }

  if (normTab === 'Armed Forces') {
    return (
      id.includes('army') ||
      id.includes('navy') ||
      id.includes('airforce') ||
      id.includes('air-force') ||
      id.includes('paf') ||
      id.includes('armed') ||
      id.includes('forces') ||
      id.includes('issb') ||
      id.includes('pma') ||
      name.includes('army') ||
      name.includes('navy') ||
      name.includes('air force') ||
      name.includes('paf') ||
      name.includes('armed forces') ||
      name.includes('pma') ||
      name.includes('cadet') ||
      type.includes('armed forces') ||
      type.includes('defense') ||
      type.includes('defense services') ||
      type.includes('army') ||
      type.includes('navy') ||
      type.includes('air force') ||
      organizer.includes('pma') ||
      organizer.includes('issb') ||
      organizer.includes('paf') ||
      organizer.includes('selection') ||
      organizer.includes('pak forces') ||
      organizer.includes('pak army') ||
      organizer.includes('pak navy')
    );
  }

  // Fallback for custom dynamic category tabs
  const tabLower = normTab.toLowerCase();
  return (
    id.includes(tabLower) ||
    name.includes(tabLower) ||
    type.includes(tabLower) ||
    organizer.includes(tabLower) ||
    subjectsStr.includes(tabLower) ||
    desc.includes(tabLower)
  );
}

export const EntryTestsView: React.FC<EntryTestsViewProps> = ({
  onStartEntryTest,
  allMCQs,
  studentName,
  initialCategory = 'All',
  onCategoryChange,
}) => {
  const [selectedTab, setSelectedTab] = useState<string>(() => normalizeTabId(initialCategory));
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  // Sync state if initialCategory changes from outside/URL navigation
  useEffect(() => {
    setSelectedTab(normalizeTabId(initialCategory));
  }, [initialCategory]);

  // Fetch dynamic categories from the database/API
  useEffect(() => {
    let isMounted = true;
    fetchAcademicEntryTestCategoriesApi()
      .then((res) => {
        if (isMounted && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setDbCategories(res.data);
        }
      })
      .catch((err) => {
        console.warn('Notice: Could not load dynamic entry test categories:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute dynamic tabs (standard tabs + custom categories from DB if any)
  const dynamicTabs = useMemo(() => {
    const existingNorms = new Set(ENTRY_TEST_TABS.map((t) => normalizeTabId(t.id).toLowerCase()));
    const custom = dbCategories
      .filter((c) => {
        const norm = normalizeTabId(c.name).toLowerCase();
        return !existingNorms.has(norm);
      })
      .map((c) => ({
        id: c.name,
        label: c.name,
        desc: c.description || `${c.type || 'Custom'} Entry Test (${c.organizer || 'National'})`,
      }));
    return [...ENTRY_TEST_TABS, ...custom];
  }, [dbCategories]);

  // Combine static master data with any custom DB categories
  const allTests = useMemo<EntryTestItem[]>(() => {
    const baseList: EntryTestItem[] = [...ENTRY_TESTS_DATA];
    const existingIds = new Set(baseList.map((t) => t.id.toLowerCase()));
    const existingNames = new Set(baseList.map((t) => t.name.toLowerCase()));

    // Merge any unique dynamic categories from database
    dbCategories.forEach((cat) => {
      const slugId = (cat.name || `cat-${cat.id}`).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const nameLower = (cat.name || '').toLowerCase();
      
      // If not already covered by standard items
      if (!existingIds.has(slugId) && !existingNames.has(nameLower)) {
        const subNames = Array.isArray(cat.subcategories)
          ? cat.subcategories.map((s: any) => s.name)
          : [];
        
        baseList.push({
          id: slugId,
          name: cat.name,
          type: cat.type || 'Entrance Exam',
          organizer: cat.organizer || 'National Testing Body',
          totalMarks: cat.totalMarks || 100,
          subjects: subNames.length > 0 ? subNames : ['General Syllabus', 'Analytical', 'Subject Core'],
          description: cat.description || `Comprehensive examination preparation for ${cat.name}.`,
          duration: cat.duration || '120 Minutes',
        });
      }
    });

    return baseList;
  }, [dbCategories]);

  // Filtered tests based on selected tab
  const filteredTests = useMemo(() => {
    return allTests.filter((test) => matchesEntryTestCategory(test, selectedTab));
  }, [allTests, selectedTab]);

  // Handle Tab Click
  const handleTabClick = (tabId: string) => {
    const normalized = normalizeTabId(tabId);
    setSelectedTab(normalized);
    if (onCategoryChange) {
      onCategoryChange(normalized);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-cyan-300 border border-white/10 mb-3">
            <GraduationCap className="w-3.5 h-3.5" /> Pakistan National Entry Test & Competitive Exams
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            MDCAT, ECAT, CSS, PMS & Armed Forces Portal
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
            Full-length timed mock tests with official negative marking schemes, scorecards, and past paper simulations for medical, engineering, civil services, and defense forces.
          </p>
        </div>
      </div>

      {/* Target Exam Filter Tabs (MDCAT, ECAT, CSS, PMS, Armed Forces, Custom) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
        {dynamicTabs.map((tab) => {
          const isTabActive = normalizeTabId(selectedTab) === normalizeTabId(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                isTabActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Entry Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTests.length > 0 ? (
          filteredTests.map((test) => {
            const isMedical = test.type === 'Medical' || test.type?.includes('Medical');
            const isEngineering = test.type?.includes('Engineering');
            const isArmedForces = test.type?.includes('Armed Forces') || test.type?.includes('Defense');
            const isCivilServices = test.type?.includes('CSS') || test.type?.includes('PMS') || test.type?.includes('Civil');
            const hasNegativeMarking = isMedical || test.id.includes('ecat') || test.id.includes('nums');

            return (
              <div
                key={test.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded ${
                          isMedical
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isEngineering
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : isArmedForces
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : isCivilServices
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}
                      >
                        {test.type}
                      </span>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2">{test.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Authority: {test.organizer}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black text-slate-900 dark:text-white">{test.totalMarks}</div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Total Marks</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                    {test.description}
                  </p>

                  {/* Subject Breakdown Badges */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {test.subjects.map((sub, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>

                  {/* Key Exam Indicators */}
                  <div className="mt-4 grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                    <div>
                      <span className="block text-slate-400">Duration</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{test.duration || '120 Mins'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Total Marks</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{test.totalMarks} Marks</span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Negative Mark</span>
                      <span
                        className={`font-bold ${
                          hasNegativeMarking ? 'text-red-500' : 'text-emerald-500'
                        }`}
                      >
                        {hasNegativeMarking ? 'Yes (-0.25)' : 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-2 flex items-center gap-3">
                  <button
                    onClick={() => onStartEntryTest(test.id)}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Launch Full Mock Exam</span>
                  </button>

                  <button
                    onClick={() => {
                      const sampleQuestions = allMCQs.slice(0, 15);
                      exportMCQsToWatermarkedPDF(
                        `${test.name} - Official Sample Mock`,
                        `Testing Authority: ${test.organizer}`,
                        sampleQuestions,
                        { studentName: `Candidate: ${studentName}` }
                      );
                    }}
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                    title="Download Printable PDF Mock Paper"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 px-6 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              No tests available in this category yet.
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Check back soon or explore our comprehensive MCQ question banks and mock exams in other categories.
            </p>
            <button
              onClick={() => handleTabClick('All')}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              View All Entry Tests
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
