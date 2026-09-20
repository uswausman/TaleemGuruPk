import React, { useState } from 'react';
import {
  Landmark,
  School,
  BookOpen,
  Layers,
  Plus,
  Search,
  Trash2,
  Edit,
  Check,
  X,
  FileQuestion,
  Clock,
  Sparkles,
  MapPin,
  Calendar,
} from 'lucide-react';
import { BoardInfo, MCQ, TestConfig } from '../../types';
import { BOARDS_LIST, SCHOOL_CLASSES } from '../../data/mockData';
import { SUBJECTS_LIST } from '../SubjectsView';
import { AdminConfirmDialog } from './AdminConfirmDialog';

interface AdminAcademicTabsProps {
  type: 'boards' | 'classes' | 'subjects' | 'chapters';
  allMCQs: MCQ[];
  allTests: TestConfig[];
}

export const AdminAcademicTabs: React.FC<AdminAcademicTabsProps> = ({
  type,
  allMCQs,
  allTests,
}) => {
  // Boards State
  const [boards, setBoards] = useState<BoardInfo[]>(BOARDS_LIST);
  const [boardSearch, setBoardSearch] = useState('');
  const [boardProvinceFilter, setBoardProvinceFilter] = useState('All');

  // Subjects State
  const [subjects, setSubjects] = useState(SUBJECTS_LIST);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectCategoryFilter, setSubjectCategoryFilter] = useState('All');

  // Chapters State
  const [chaptersSubjectFilter, setChaptersSubjectFilter] = useState('Physics');
  const [chaptersClassFilter, setChaptersClassFilter] = useState('Class 10 (Matric Pt 2)');
  const [newChapterName, setNewChapterName] = useState('');
  const [chaptersList, setChaptersList] = useState<{ [subject: string]: string[] }>({
    Physics: [
      'Simple Harmonic Motion and Waves',
      'Sound',
      'Geometrical Optics',
      'Electrostatics',
      'Current Electricity',
      'Electromagnetism',
      'Basic Electronics',
      'Information and Communication Technology',
      'Atomic and Nuclear Physics',
    ],
    Chemistry: [
      'Chemical Equilibrium',
      'Acids, Bases and Salts',
      'Organic Chemistry',
      'Hydrocarbons',
      'Biochemistry',
      'Environmental Chemistry I: Atmosphere',
      'Environmental Chemistry II: Water',
      'Chemical Industries',
    ],
    Biology: [
      'Gaseous Exchange',
      'Homeostasis',
      'Coordination and Control',
      'Support and Movement',
      'Reproduction',
      'Inheritance',
      'Man and His Environment',
      'Biotechnology',
      'Pharmacology',
    ],
    Mathematics: [
      'Quadratic Equations',
      'Theory of Quadratic Equations',
      'Variations',
      'Partial Fractions',
      'Sets and Functions',
      'Basic Statistics',
      'Introduction to Trigonometry',
      'Projection of a Side of a Triangle',
      'Chords of a Circle',
      'Tangent to a Circle',
    ],
    'Computer Science': [
      'Problem Solving',
      'Data Types, Assignment and Input/Output',
      'Control Structures',
      'Data Structures and Arrays',
      'Subprograms and File Handling',
      'Graphics in BASIC',
      'Microsoft Word / Office',
    ],
    English: [
      'Hazrat Muhammad (PBUH) an Embodiment of Justice',
      'Chinese New Year',
      'Try Again',
      'First Aid',
      'The Rain',
      'Television vs. Newspapers',
      'Little by Little One Walks Far',
      'Peace',
      'Selecting the Right Career',
      'A World Without Books',
      'Great Expectations',
      'Faithfulness',
    ],
  });

  // Delete dialog
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState<string | null>(null);

  // 1. BOARDS TAB
  if (type === 'boards') {
    const filteredBoards = boards.filter((b) => {
      const matchSearch =
        !boardSearch ||
        b.name.toLowerCase().includes(boardSearch.toLowerCase()) ||
        b.city.toLowerCase().includes(boardSearch.toLowerCase()) ||
        b.code.toLowerCase().includes(boardSearch.toLowerCase());
      const matchProv =
        boardProvinceFilter === 'All' || b.province === boardProvinceFilter;
      return matchSearch && matchProv;
    });

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Landmark className="w-5 h-5 text-blue-600" />
              Pakistan Education Boards Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive directory of all 30+ BISE and FBISE examination boards
            </p>
          </div>
          <div className="text-xs font-bold text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900">
            {boards.length} Boards Registered
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search boards by name, code (e.g. LHR, RWP), city..."
              value={boardSearch}
              onChange={(e) => setBoardSearch(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={boardProvinceFilter}
              onChange={(e) => setBoardProvinceFilter(e.target.value)}
              className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
            >
              <option value="All">All Provinces</option>
              <option value="Punjab">Punjab</option>
              <option value="Federal">Federal</option>
              <option value="Sindh">Sindh</option>
              <option value="KPK">KPK</option>
              <option value="Balochistan">Balochistan</option>
              <option value="AJK">AJK</option>
            </select>
          </div>
        </div>

        {/* Boards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBoards.map((b) => (
            <div
              key={b.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:border-blue-400/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    {b.province}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-400">
                    {b.code}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {b.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {b.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {b.city}
                  </span>
                  <span>•</span>
                  <span>Est. {b.established}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. CLASSES TAB
  if (type === 'classes') {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <School className="w-5 h-5 text-emerald-600" />
              Academic Classes & Grade Levels
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Grade 9 (SSC-I), Grade 10 (SSC-II), Grade 11 (HSSC-I), Grade 12 (HSSC-II), MDCAT & ECAT
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SCHOOL_CLASSES.map((cls, idx) => {
            const classMCQsCount = allMCQs.filter((m) =>
              (m.classLevel || '').includes(cls.split(' ')[0])
            ).length;
            const classTestsCount = allTests.filter((t) =>
              (t.classLevel || '').includes(cls.split(' ')[0])
            ).length;

            return (
              <div
                key={cls}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:border-emerald-400/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Grade {idx + 1}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    Curriculum Active
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {cls}
                </h3>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                    <div className="text-[10px] text-slate-400">MCQs Count</div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {classMCQsCount > 0 ? classMCQsCount : 15}+
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                    <div className="text-[10px] text-slate-400">Live Quizzes</div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {classTestsCount > 0 ? classTestsCount : 4}+
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. SUBJECTS TAB
  if (type === 'subjects') {
    const filteredSubjects = subjects.filter((s) => {
      const matchSearch =
        !subjectSearch ||
        s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
        s.category.toLowerCase().includes(subjectSearch.toLowerCase());
      const matchCat =
        subjectCategoryFilter === 'All' || s.category === subjectCategoryFilter;
      return matchSearch && matchCat;
    });

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              Academic Subjects Catalog
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Science, Arts, Medical, Engineering, and General Competitive Subjects
            </p>
          </div>
          <div className="text-xs font-bold text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900">
            {subjects.length} Subjects Active
          </div>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search subjects by name or category..."
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={subjectCategoryFilter}
              onChange={(e) => setSubjectCategoryFilter(e.target.value)}
              className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
            >
              <option value="All">All Categories</option>
              <option value="Science">Science</option>
              <option value="Arts">Arts</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((sub) => {
            const subMCQs = allMCQs.filter((m) => m.subject === sub.name).length;
            const subTests = allTests.filter((t) => t.subject === sub.name).length;

            return (
              <div
                key={sub.name}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:border-purple-400/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{sub.icon}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                      {sub.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white mt-2">
                    {sub.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {sub.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                    <div className="text-[10px] text-slate-400">Total MCQs</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {subMCQs > 0 ? subMCQs : ((sub as any).totalQuestions ?? sub.mcqsCount ?? 0)}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                    <div className="text-[10px] text-slate-400">Total Tests</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {subTests > 0 ? subTests : 8}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 4. CHAPTERS TAB
  const activeChapters = chaptersList[chaptersSubjectFilter] || [
    'Unit 1: Fundamentals',
    'Unit 2: Core Principles',
    'Unit 3: Applied Concepts',
    'Unit 4: Advanced Problems',
    'Unit 5: Revision and Model Questions',
  ];

  const handleAddChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterName.trim()) return;
    setChaptersList((prev) => ({
      ...prev,
      [chaptersSubjectFilter]: [
        ...(prev[chaptersSubjectFilter] || []),
        newChapterName.trim(),
      ],
    }));
    setNewChapterName('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Curriculum Chapters & Topics Breakdown
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize textbook syllabus by chapters, units, and learning objectives
          </p>
        </div>
      </div>

      {/* Subject and Class Selector Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Select Subject
          </label>
          <select
            value={chaptersSubjectFilter}
            onChange={(e) => setChaptersSubjectFilter(e.target.value)}
            className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
          >
            {SUBJECTS_LIST.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Select Class
          </label>
          <select
            value={chaptersClassFilter}
            onChange={(e) => setChaptersClassFilter(e.target.value)}
            className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
          >
            {SCHOOL_CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="MDCAT Medical">MDCAT Medical</option>
          </select>
        </div>
      </div>

      {/* Add New Chapter Form */}
      <form
        onSubmit={handleAddChapter}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex gap-2"
      >
        <input
          type="text"
          placeholder={`Add new chapter name to ${chaptersSubjectFilter}...`}
          value={newChapterName}
          onChange={(e) => setNewChapterName(e.target.value)}
          className="flex-1 p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Chapter
        </button>
      </form>

      {/* Chapters list */}
      <div className="space-y-2.5">
        {activeChapters.map((ch, idx) => {
          const matchingMCQs = allMCQs.filter(
            (m) =>
              m.subject === chaptersSubjectFilter &&
              (m.chapter === ch || (m.chapter && m.chapter.toLowerCase().includes(ch.toLowerCase().slice(0, 10))))
          ).length;

          return (
            <div
              key={ch}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {ch}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {matchingMCQs} Questions
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
