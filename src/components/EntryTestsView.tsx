import React, { useState } from 'react';
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
} from 'lucide-react';
import { ENTRY_TESTS_DATA } from '../data/mockData';
import { MCQ, TestConfig } from '../types';
import { exportMCQsToWatermarkedPDF } from '../utils/watermark';

interface EntryTestsViewProps {
  onStartEntryTest: (testId: string) => void;
  allMCQs: MCQ[];
  studentName: string;
  initialCategory?: string;
}

export const ENTRY_TEST_TABS = [
  { id: 'All', label: 'All Entry Tests' },
  { id: 'MDCAT', label: 'MDCAT', desc: 'Medical & Dental Admission Test (PM&DC & NUMS)' },
  { id: 'ECAT', label: 'ECAT', desc: 'Engineering College Admission Test (UET, NUST, GIKI)' },
  { id: 'CSS', label: 'CSS', desc: 'Central Superior Services MPT Screening (FPSC)' },
  { id: 'PMS', label: 'PMS', desc: 'Provincial Management Services (PPSC, SPSC, KPPSC)' },
  { id: 'Armed Forces', label: 'Armed Forces', desc: 'Pak Army, Navy & PAF Initial Tests' },
];

export const EntryTestsView: React.FC<EntryTestsViewProps> = ({
  onStartEntryTest,
  allMCQs,
  studentName,
  initialCategory = 'All',
}) => {
  const [selectedTab, setSelectedTab] = useState<string>(initialCategory);

  const filteredTests = ENTRY_TESTS_DATA.filter((t) => {
    if (selectedTab === 'All') return true;
    if (selectedTab === 'MDCAT') return t.id === 'mdcat' || t.id === 'nums' || t.type === 'Medical';
    if (selectedTab === 'ECAT') return t.id === 'ecat' || t.id === 'nust-net' || t.id === 'fast-nu' || t.type.includes('Engineering');
    if (selectedTab === 'CSS') return t.id === 'css-mpt' || t.name.includes('CSS');
    if (selectedTab === 'PMS') return t.id === 'pms' || t.name.includes('PMS');
    if (selectedTab === 'Armed Forces') return t.type.includes('Armed Forces') || t.id.includes('army') || t.id.includes('paf') || t.id.includes('navy');
    return true;
  });

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

      {/* Target Exam Filter Tabs (MDCAT, ECAT, CSS, PMS, Armed Forces) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
        {ENTRY_TEST_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              selectedTab === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Entry Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTests.map((test) => (
          <div
            key={test.id}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded ${
                      test.type === 'Medical'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : test.type.includes('Engineering')
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
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
                      test.type === 'Medical' || test.id.includes('ecat') ? 'text-red-500' : 'text-emerald-500'
                    }`}
                  >
                    {test.type === 'Medical' || test.id.includes('ecat') ? 'Yes (-0.25)' : 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-2 flex items-center gap-3">
              <button
                onClick={() => onStartEntryTest(test.id)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
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
                className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                title="Download Printable PDF Mock Paper"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
