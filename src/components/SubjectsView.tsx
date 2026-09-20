import React, { useState } from 'react';
import {
  BookOpen,
  Atom,
  TestTube2,
  Dna,
  Binary,
  Languages,
  Landmark,
  Moon,
  Calculator,
  Search,
  ArrowRight,
  Play,
  FileText,
  CheckCircle2,
  Download,
  GraduationCap,
  Sparkles,
  Layers,
} from 'lucide-react';
import { MCQ, PastPaper, StudyNote, TestConfig } from '../types';
import { exportMCQsToWatermarkedPDF } from '../utils/watermark';

export interface SubjectItem {
  id: string;
  name: string;
  category: 'Science' | 'Arts & Languages' | 'Compulsory' | 'Technology';
  icon: string;
  accentColor: string;
  description: string;
  classes: string[];
  chaptersCount: number;
  mcqsCount: number;
  testsCount: number;
  keyChapters: string[];
}

export const SUBJECTS_LIST: SubjectItem[] = [
  {
    id: 'physics',
    name: 'Physics',
    category: 'Science',
    icon: '⚡',
    accentColor: 'from-blue-600 to-cyan-500',
    description: 'Mechanics, Electromagnetism, Modern Physics, Thermal Physics, Optics & Waves.',
    classes: ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'MDCAT', 'ECAT'],
    chaptersCount: 9,
    mcqsCount: 420,
    testsCount: 38,
    keyChapters: [
      'Physical Quantities & Measurements',
      'Kinematics & Dynamics',
      'Work, Energy & Power',
      'Electrostatics & Current Electricity',
      'Electromagnetism & Nuclear Physics',
    ],
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    category: 'Science',
    icon: '🧪',
    accentColor: 'from-emerald-600 to-teal-500',
    description: 'Organic, Inorganic, Physical Chemistry, Stoichiometry, Chemical Equilibrium & Electrochemistry.',
    classes: ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'MDCAT', 'ECAT'],
    chaptersCount: 8,
    mcqsCount: 390,
    testsCount: 35,
    keyChapters: [
      'Fundamentals of Chemistry & Atomic Structure',
      'Periodic Table & Periodicity',
      'Structure of Molecules & States of Matter',
      'Electrochemistry & Chemical Reactivity',
      'Organic Chemistry & Hydrocarbons',
    ],
  },
  {
    id: 'biology',
    name: 'Biology',
    category: 'Science',
    icon: '🧬',
    accentColor: 'from-teal-600 to-emerald-500',
    description: 'Cell Biology, Genetics, Physiology, Ecology, Human Body Systems & Biotechnology.',
    classes: ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'MDCAT'],
    chaptersCount: 9,
    mcqsCount: 480,
    testsCount: 42,
    keyChapters: [
      'Introduction to Biology & Cell Biology',
      'Enzymes & Bioenergetics',
      'Nutrition, Gas Exchange & Transport',
      'Homeostasis & Coordination',
      'Genetics, Inheritance & Biotechnology',
    ],
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    category: 'Science',
    icon: '📐',
    accentColor: 'from-amber-600 to-orange-500',
    description: 'Algebra, Matrices, Trigonometry, Calculus, Coordinate Geometry & Vectors.',
    classes: ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'ECAT'],
    chaptersCount: 13,
    mcqsCount: 520,
    testsCount: 50,
    keyChapters: [
      'Matrices & Determinants',
      'Real and Complex Numbers',
      'Logarithms & Algebraic Formulas',
      'Trigonometric Identities & Functions',
      'Differentiation & Integration',
    ],
  },
  {
    id: 'computer-science',
    name: 'Computer Science',
    category: 'Technology',
    icon: '💻',
    accentColor: 'from-indigo-600 to-blue-500',
    description: 'Programming (C/C++/Python), Algorithms, Computer Architecture, Databases & Networking.',
    classes: ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'ICS', 'ECAT'],
    chaptersCount: 7,
    mcqsCount: 340,
    testsCount: 28,
    keyChapters: [
      'Fundamentals of Computer & OS',
      'Data Representation & Boolean Logic',
      'Computer Networks & Cybersecurity',
      'Basics of Programming & Control Structures',
      'Database Management Systems (DBMS)',
    ],
  },
  {
    id: 'english',
    name: 'English',
    category: 'Compulsory',
    icon: '📖',
    accentColor: 'from-purple-600 to-pink-500',
    description: 'Grammar, Vocabulary, Reading Comprehension, Essays, Active/Passive & Direct/Indirect.',
    classes: ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'MDCAT', 'CSS'],
    chaptersCount: 12,
    mcqsCount: 310,
    testsCount: 30,
    keyChapters: [
      'Parts of Speech & Tenses',
      'Active & Passive Voice',
      'Direct & Indirect Speech',
      'Vocabulary, Synonyms & Antonyms',
      'Reading Comprehension & Summary Writing',
    ],
  },
  {
    id: 'urdu',
    name: 'Urdu',
    category: 'Compulsory',
    icon: '✍️',
    accentColor: 'from-rose-600 to-red-500',
    description: 'Urdu Grammar, Nazm, Ghazal, Asbaaq, Tashreeh, Mazameen & Qawaid.',
    classes: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
    chaptersCount: 14,
    mcqsCount: 260,
    testsCount: 24,
    keyChapters: [
      'Qawaid-o-Insha (Grammar & Syntax)',
      'Hissa-e-Nasar (Prose Lessons)',
      'Hissa-e-Nazm (Poetry & Poems)',
      'Hissa-e-Ghazal (Ghazaliyat & Tashreeh)',
      'Khatoot, Darkhwast & Mazameen',
    ],
  },
  {
    id: 'pakistan-studies',
    name: 'Pakistan Studies',
    category: 'Compulsory',
    icon: '🇵🇰',
    accentColor: 'from-emerald-700 to-green-600',
    description: 'Pakistan Movement, Constitution, Geography, Natural Resources, Foreign Policy & Economy.',
    classes: ['Class 9', 'Class 10', 'Class 12', 'CSS', 'PMS'],
    chaptersCount: 6,
    mcqsCount: 280,
    testsCount: 26,
    keyChapters: [
      'Ideological Basis of Pakistan',
      'Making of Pakistan (1857-1947)',
      'Land and Climate of Pakistan',
      'Constitutional Development of Pakistan',
      'Foreign Policy & International Relations',
    ],
  },
  {
    id: 'islamiat',
    name: 'Islamiat (Islamic Studies)',
    category: 'Compulsory',
    icon: '🕌',
    accentColor: 'from-teal-700 to-emerald-600',
    description: 'Quranic Surahs, Ahadees, Pillars of Islam, Seerat-un-Nabi (PBUH) & Ethics.',
    classes: ['Class 9', 'Class 10', 'Class 11', 'CSS'],
    chaptersCount: 8,
    mcqsCount: 290,
    testsCount: 28,
    keyChapters: [
      'Surah Al-Anfal & Quranic Translation',
      'Selected Ahadees-e-Nabawi (PBUH)',
      'Aqaaid & Arkaan-e-Islam',
      'Seerat-un-Nabi & Ghazwat',
      'Huqooq-ul-Ibaad & Islamic Morality',
    ],
  },
  {
    id: 'general-science',
    name: 'General Science',
    category: 'Science',
    icon: '🔬',
    accentColor: 'from-cyan-600 to-blue-600',
    description: 'Everyday Science, Human Health, Environment, Space Science & Modern Technologies.',
    classes: ['Class 9', 'Class 10', 'CSS', 'PMS'],
    chaptersCount: 10,
    mcqsCount: 220,
    testsCount: 20,
    keyChapters: [
      'Introduction and Role of Science',
      'Our Life and Chemistry',
      'Biochemistry and Biotechnology',
      'Human Health, Diseases and Prevention',
      'Environmental Pollution and Protection',
    ],
  },
];

interface SubjectsViewProps {
  onStartSubjectTest: (subjectName: string) => void;
  onNavigateMCQBank: (subjectName: string) => void;
  onNavigatePastPapers: (subjectName: string) => void;
  onNavigateNotes: (subjectName: string) => void;
  allMCQs: MCQ[];
  studentName: string;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  onStartSubjectTest,
  onNavigateMCQBank,
  onNavigatePastPapers,
  onNavigateNotes,
  allMCQs,
  studentName,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem>(SUBJECTS_LIST[0]);

  const filteredSubjects = SUBJECTS_LIST.filter((s) => {
    const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesClass = selectedClass === 'All' || s.classes.some((c) => c.includes(selectedClass));
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesClass && matchesSearch;
  });

  const subjectMCQs = allMCQs.filter(
    (m) => m.subject.toLowerCase() === selectedSubject.name.toLowerCase()
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-cyan-300 border border-white/10 mb-3">
            <BookOpen className="w-3.5 h-3.5" /> All Academic & Board Subjects
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Subjects Learning & Examination Center
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
            Master every subject for Class 9, Class 10, Class 11, Class 12, MDCAT, ECAT, CSS, and PMS with chapter-wise MCQs, online tests, solved past papers, and comprehensive notes.
          </p>
        </div>
      </div>

      {/* Filter and Class Tabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['All', 'Science', 'Compulsory', 'Technology', 'Arts & Languages'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-slate-400 text-[11px] uppercase font-bold">Class:</span>
            {['All', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map((cls) => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedClass === cls
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects (e.g., Mathematics, Physics, English, Urdu, Biology)..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 rounded-2xl text-xs border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium"
          />
        </div>
      </div>

      {/* Main Content Grid: Subjects Cards (Left) + Detailed Subject Workspace (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Subjects Cards List (5 cols) */}
        <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
          {filteredSubjects.map((subject) => {
            const isSelected = selectedSubject.id === subject.id;
            return (
              <div
                key={subject.id}
                onClick={() => setSelectedSubject(subject)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-50/90 dark:bg-slate-800/90 border-blue-500 shadow-md ring-1 ring-blue-400/40'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shadow-xs">
                    {subject.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {subject.name}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {subject.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {subject.chaptersCount} Chapters • {subject.mcqsCount} MCQs • {subject.testsCount} Tests
                    </p>
                  </div>
                </div>

                <ArrowRight
                  className={`w-4 h-4 transition-transform ${
                    isSelected
                      ? 'text-blue-600 dark:text-cyan-400 translate-x-1'
                      : 'text-slate-400'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Right: Selected Subject Detail Console (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6">
          {/* Header of Selected Subject */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{selectedSubject.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {selectedSubject.name}
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {selectedSubject.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {selectedSubject.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => onStartSubjectTest(selectedSubject.name)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start Subject Test</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {selectedSubject.chaptersCount}
              </div>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Chapters</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-lg font-black text-blue-600 dark:text-cyan-400">
                {selectedSubject.mcqsCount}+
              </div>
              <span className="text-[10px] text-slate-500 uppercase font-bold">MCQs Available</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {selectedSubject.testsCount}
              </div>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Online Tests</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-lg font-black text-purple-600 dark:text-purple-400">
                100%
              </div>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Solved Past Papers</span>
            </div>
          </div>

          {/* Grade & Exam Applicability */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Applicable Classes & Examination Portals
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedSubject.classes.map((cls) => (
                <span
                  key={cls}
                  className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700"
                >
                  🎓 {cls}
                </span>
              ))}
            </div>
          </div>

          {/* Key Chapters & Syllabus Modules */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
              Core Syllabus Modules & Chapter Breakdown
            </h4>
            <div className="space-y-2">
              {selectedSubject.keyChapters.map((ch, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-center gap-2.5 font-semibold text-slate-800 dark:text-slate-200">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span>{ch}</span>
                  </div>
                  <button
                    onClick={() => onStartSubjectTest(selectedSubject.name)}
                    className="text-[11px] font-bold text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    Test <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Portals */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => onNavigateMCQBank(selectedSubject.name)}
              className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-xs flex flex-col items-center justify-center gap-1 text-center transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Practice {selectedSubject.name} MCQs</span>
            </button>

            <button
              onClick={() => onNavigatePastPapers(selectedSubject.name)}
              className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold text-xs flex flex-col items-center justify-center gap-1 text-center transition-colors"
            >
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>5-Year Past Papers</span>
            </button>

            <button
              onClick={() => onNavigateNotes(selectedSubject.name)}
              className="p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-bold text-xs flex flex-col items-center justify-center gap-1 text-center transition-colors"
            >
              <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Download Notes & Formulas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
