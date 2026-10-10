import React, { useState, useMemo } from 'react';
import {
  Landmark,
  School,
  BookOpen,
  Layers,
  ChevronRight,
  FileText,
  Play,
  Download,
  Search,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  BookMarked,
  FileQuestion,
  HelpCircle,
  Eye,
  Check,
  Bookmark,
  Share2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  fetchAcademicBoardsApi,
  fetchAcademicClassesApi,
  fetchAcademicSubjectsApi,
  fetchAcademicChaptersApi,
} from '../lib/api';
import {
  PAKISTAN_BOARDS,
  ACADEMIC_CLASSES,
  ACADEMIC_SUBJECTS,
  ACADEMIC_CHAPTERS,
} from '../data/educationalHierarchy';
import {
  BoardInfo,
  AcademicClassInfo,
  AcademicSubjectInfo,
  ChapterInfo,
  TopicInfo,
  StudyNote,
  PastPaper,
  MCQ,
} from '../types';
import { documentBrandingService } from '../services/documentBrandingService';

interface EducationalHierarchyViewProps {
  notes: StudyNote[];
  pastPapers: PastPaper[];
  mcqs: MCQ[];
  activeBoard: string;
  onSelectBoard: (boardName: string) => void;
  onStartTest: (testQuery: string) => void;
  onSolvePastPaper: (paper: PastPaper) => void;
  studentName: string;
}

export const EducationalHierarchyView: React.FC<EducationalHierarchyViewProps> = ({
  notes,
  pastPapers,
  mcqs,
  activeBoard,
  onSelectBoard,
  onStartTest,
  onSolvePastPaper,
  studentName,
}) => {
  // Step selections
  const [selectedProvince, setSelectedProvince] = useState<string>('All');

  // DB State
  const [dbBoards, setDbBoards] = useState<any[]>([]);
  const [dbClasses, setDbClasses] = useState<any[]>([]);
  const [dbSubjects, setDbSubjects] = useState<any[]>([]);
  const [dbChapters, setDbChapters] = useState<any[]>([]);

  React.useEffect(() => {
    Promise.all([
      fetchAcademicBoardsApi(),
      fetchAcademicClassesApi(),
      fetchAcademicSubjectsApi(),
      fetchAcademicChaptersApi(),
    ]).then(([bRes, cRes, sRes, chRes]) => {
      if (bRes.success && Array.isArray(bRes.data)) setDbBoards(bRes.data);
      if (cRes.success && Array.isArray(cRes.data)) setDbClasses(cRes.data);
      if (sRes.success && Array.isArray(sRes.data)) setDbSubjects(sRes.data);
      if (chRes.success && Array.isArray(chRes.data)) setDbChapters(chRes.data);
    }).catch((err) => {
      console.warn('Could not load academic DB data in EducationalHierarchyView:', err);
    });
  }, []);

  const [selectedBoardId, setSelectedBoardId] = useState<string>(() => {
    const found = PAKISTAN_BOARDS.find((b) => b.name.toLowerCase() === activeBoard.toLowerCase());
    return found ? found.id : 'bise-lahore';
  });

  const [selectedClassId, setSelectedClassId] = useState<string>('class-10');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('physics');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('chap-phy-10-3');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  // Content Preview Modal
  const [previewNote, setPreviewNote] = useState<StudyNote | null>(null);
  const [previewPaper, setPreviewPaper] = useState<PastPaper | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

  // Resolved Current Objects
  const currentBoard = useMemo(() => {
    if (dbBoards.length > 0) {
      const match = dbBoards.find((b) => String(b.id) === selectedBoardId || b.name.toLowerCase().includes(activeBoard.toLowerCase()));
      if (match) {
        return {
          id: String(match.id),
          name: match.name,
          code: match.code || 'BISE',
          province: match.province || 'Punjab',
          city: match.city || match.name,
          established: match.establishmentYear ? String(match.establishmentYear) : '1975',
          description: match.description || `${match.name} Education Board`,
          totalPastPapers: 120,
          totalTests: 45,
          website: 'https://fbise.edu.pk',
          supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
        };
      }
    }
    return PAKISTAN_BOARDS.find((b) => b.id === selectedBoardId) || PAKISTAN_BOARDS[0];
  }, [dbBoards, selectedBoardId, activeBoard]);

  const currentClass = useMemo(() => {
    if (dbClasses.length > 0) {
      const match = dbClasses.find((c) => String(c.id) === selectedClassId || c.name.toLowerCase().includes(selectedClassId.replace('class-', '').toLowerCase()));
      if (match) {
        const shortCode = match.name.includes('9') ? 'SSC-I' : match.name.includes('10') ? 'SSC-II' : match.name.includes('11') ? 'HSSC-I' : match.name.includes('12') ? 'HSSC-II' : 'GEN';
        return {
          id: String(match.id),
          name: match.name,
          shortCode,
          level: 'High School',
          group: 'Science / Arts',
          description: `Official Curriculum Portal for ${match.name}`,
        };
      }
    }
    return ACADEMIC_CLASSES.find((c) => c.id === selectedClassId) || ACADEMIC_CLASSES[1];
  }, [dbClasses, selectedClassId]);

  const currentSubject = useMemo(() => {
    if (dbSubjects.length > 0) {
      const match = dbSubjects.find((s) => String(s.id) === selectedSubjectId || s.name.toLowerCase().includes(selectedSubjectId.toLowerCase()));
      if (match) {
        return {
          id: String(match.id),
          name: match.name,
          category: 'Science',
          icon: '📚',
          accentColor: 'from-blue-600 to-cyan-500',
          description: `Official curriculum for ${match.name}`,
          applicableClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
        };
      }
    }
    return ACADEMIC_SUBJECTS.find((s) => s.id === selectedSubjectId) || ACADEMIC_SUBJECTS[0];
  }, [dbSubjects, selectedSubjectId]);

  // Filtered chapters for current class & subject
  const availableChapters = useMemo(() => {
    if (dbChapters.length > 0) {
      const dbFiltered = dbChapters.filter(
        (ch) => String(ch.subjectId) === String(currentSubject.id) || (currentSubject.id && String(ch.subjectId) === selectedSubjectId)
      );
      if (dbFiltered.length > 0) {
        return dbFiltered.map((ch, idx) => ({
          id: String(ch.id),
          subjectId: String(ch.subjectId),
          subjectName: currentSubject.name,
          classLevel: currentClass.name,
          chapterNumber: idx + 1,
          name: ch.name,
          description: `Syllabus Chapter ${idx + 1} for ${currentSubject.name}`,
          topics: [
            { id: `top-${ch.id}-1`, chapterId: String(ch.id), topicNumber: `${idx + 1}.1`, title: 'Core Concepts & Principles', keyPoints: ['Fundamental Concepts', 'Standard Definitions', 'Board Important Short Questions'] },
            { id: `top-${ch.id}-2`, chapterId: String(ch.id), topicNumber: `${idx + 1}.2`, title: 'Formulas & Problem Solving', keyPoints: ['Key Formula Applications', 'Solved Numerical Problems'] },
          ],
        }));
      }
    }

    const list = ACADEMIC_CHAPTERS.filter(
      (chap) =>
        chap.subjectId === currentSubject.id &&
        (chap.classLevel.toLowerCase().includes(currentClass.name.toLowerCase()) ||
          currentClass.name.toLowerCase().includes(chap.classLevel.toLowerCase()))
    );

    if (list.length > 0) return list;

    // Fallback if no specific chapters mapped yet: generate virtual chapters
    return [
      {
        id: `gen-${currentSubject.id}-ch1`,
        subjectId: currentSubject.id,
        subjectName: currentSubject.name,
        classLevel: currentClass.name,
        chapterNumber: 1,
        name: `Fundamentals of ${currentSubject.name}`,
        description: `Core conceptual foundation and syllabus requirements for ${currentClass.name}.`,
        topics: [
          { id: `top-${currentSubject.id}-1`, chapterId: `gen-${currentSubject.id}-ch1`, topicNumber: '1.1', title: 'Introduction & Core Principles', keyPoints: ['Fundamental Concepts', 'Standard Definitions', 'Board Important Short Questions'] },
          { id: `top-${currentSubject.id}-2`, chapterId: `gen-${currentSubject.id}-ch1`, topicNumber: '1.2', title: 'Formulas & Problem Solving', keyPoints: ['Key Formula Applications', 'Solved Numerical Problems'] },
        ],
      },
      {
        id: `gen-${currentSubject.id}-ch2`,
        subjectId: currentSubject.id,
        subjectName: currentSubject.name,
        classLevel: currentClass.name,
        chapterNumber: 2,
        name: `Advanced Applications & Theory`,
        description: `In-depth board questions, numericals, and objective exercises.`,
        topics: [
          { id: `top-${currentSubject.id}-3`, chapterId: `gen-${currentSubject.id}-ch2`, topicNumber: '2.1', title: 'Theorems & Extended Proofs', keyPoints: ['Board Long Questions', 'Experimental Proofs'] },
        ],
      },
    ];
  }, [currentSubject, currentClass]);

  const currentChapter = useMemo(() => {
    return availableChapters.find((c) => c.id === selectedChapterId) || availableChapters[0] || null;
  }, [availableChapters, selectedChapterId]);

  // Associated Content for the Selected Chapter & Topic
  const matchedNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchSubject = n.subject.toLowerCase() === currentSubject.name.toLowerCase();
      const matchClass =
        n.classLevel.toLowerCase().includes(currentClass.name.toLowerCase()) ||
        currentClass.name.toLowerCase().includes(n.classLevel.toLowerCase()) ||
        n.classLevel.toLowerCase().includes(currentClass.shortCode.toLowerCase());
      return matchSubject && matchClass && (n.status !== 'Draft');
    });
  }, [notes, currentSubject, currentClass]);

  const matchedPastPapers = useMemo(() => {
    return pastPapers.filter((p) => {
      const matchSub = p.subject.toLowerCase() === currentSubject.name.toLowerCase();
      const matchBoard =
        p.board.toLowerCase().includes(currentBoard.name.toLowerCase()) ||
        p.board.toLowerCase().includes(currentBoard.code.toLowerCase()) ||
        p.board === 'All' ||
        p.board.toLowerCase().includes(currentBoard.province.toLowerCase());
      return matchSub;
    });
  }, [pastPapers, currentSubject, currentBoard]);

  const matchedMCQs = useMemo(() => {
    return mcqs.filter((m) => {
      const matchSub = m.subject.toLowerCase() === currentSubject.name.toLowerCase();
      return matchSub;
    });
  }, [mcqs, currentSubject]);

  // Provinces list
  const provinces = ['All', 'Punjab', 'Federal', 'Sindh', 'KPK', 'Balochistan', 'AJK'];

  const filteredBoards = useMemo(() => {
    if (selectedProvince === 'All') return PAKISTAN_BOARDS;
    return PAKISTAN_BOARDS.filter((b) => b.province === selectedProvince);
  }, [selectedProvince]);

  const handleDownloadNotePDF = async (note: StudyNote) => {
    try {
      await documentBrandingService.downloadStudyNote(note, { studentName });
      setDownloadSuccessId(note.id);
      setTimeout(() => setDownloadSuccessId(null), 3000);
    } catch (err) {
      console.error('Failed to download note:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none" />
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-cyan-300 border border-white/10 mb-3 backdrop-blur-md">
            <Layers className="w-3.5 h-3.5" /> Structured Educational Hierarchy
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Board → Class → Subject → Chapter → Topic → Content
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Navigate through Pakistan&apos;s complete academic syllabus tree. Select your education board, class grade, subject, and chapter to access targeted study notes, solved past papers, objective question banks, and timed practice tests.
          </p>
        </div>

        {/* Current Active Selection Pill */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs relative z-10">
          <span className="text-slate-400 font-medium">Active Path:</span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-600/80 font-bold text-white flex items-center gap-1 shadow-xs">
            <Landmark className="w-3 h-3" /> {currentBoard.name}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="px-2.5 py-1 rounded-lg bg-indigo-600/80 font-bold text-white flex items-center gap-1 shadow-xs">
            <School className="w-3 h-3" /> {currentClass.name}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="px-2.5 py-1 rounded-lg bg-cyan-600/80 font-bold text-white flex items-center gap-1 shadow-xs">
            <BookOpen className="w-3 h-3" /> {currentSubject.name}
          </span>
          {currentChapter && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="px-2.5 py-1 rounded-lg bg-emerald-600/80 font-bold text-white shadow-xs">
                Ch {currentChapter.chapterNumber}: {currentChapter.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Step 1: Board Selection */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                1
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Select Education Board
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose from Punjab (Individual BISEs), Federal, Sindh, KPK, Balochistan & AJK boards.
            </p>
          </div>

          {/* Province Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {provinces.map((prov) => (
              <button
                key={prov}
                onClick={() => setSelectedProvince(prov)}
                className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  selectedProvince === prov
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>
        </div>

        {/* Boards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {filteredBoards.map((b) => {
            const isSelected = selectedBoardId === b.id;
            return (
              <button
                key={b.id}
                onClick={() => {
                  setSelectedBoardId(b.id);
                  onSelectBoard(b.name);
                }}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-500 text-blue-900 dark:text-cyan-300 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-blue-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      {b.code}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      {b.province}
                    </span>
                  </div>
                  <div className="font-bold text-xs mt-2 line-clamp-1">{b.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{b.city}</div>
                </div>

                {isSelected && (
                  <div className="mt-2 text-[10px] font-bold text-blue-600 dark:text-cyan-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Selected Board
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Class Selection */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
            2
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Select Class / Academic Level
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Syllabus tailored for Class 9, Class 10 (Matric) and Class 11, Class 12 (Intermediate / FSc / ICS).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ACADEMIC_CLASSES.map((cls) => {
            const isSelected = selectedClassId === cls.id;
            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    {cls.badge}
                  </span>
                  <span className="text-[10px] opacity-80">{cls.level}</span>
                </div>
                <div className="font-extrabold text-base mt-2">{cls.name}</div>
                <div
                  className={`text-[11px] mt-1 line-clamp-2 ${
                    isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {cls.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: Subject Selection */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-black flex items-center justify-center">
            3
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Select Subject for {currentClass.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              National Curriculum and Provincial Textbook Board aligned subjects.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {ACADEMIC_SUBJECTS.map((sub) => {
            const isSelected = selectedSubjectId === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => {
                  setSelectedSubjectId(sub.id);
                  // Reset chapter selection when subject changes
                  setSelectedChapterId('');
                }}
                className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-950 dark:text-cyan-200 shadow-xs ring-2 ring-cyan-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-cyan-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <span className="text-2xl block">{sub.icon}</span>
                  <div className="font-extrabold text-sm mt-2">{sub.name}</div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block mt-0.5">
                    {sub.category}
                  </span>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>{sub.chaptersCount || 8} Chapters</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 4 & 5: Chapter & Topic Selection + Educational Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chapters & Subtopics (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                  4
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Chapters & Topics ({availableChapters.length})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                {currentClass.name} • {currentSubject.name}
              </span>
            </div>

            {/* Chapters Accordion / List */}
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {availableChapters.map((chap) => {
                const isSelected = currentChapter?.id === chap.id;
                return (
                  <div
                    key={chap.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedChapterId(chap.id);
                        setSelectedTopicId(null);
                      }}
                      className="w-full p-3.5 text-left flex items-start justify-between gap-2 cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            Ch {chap.chapterNumber}
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {chap.name}
                          </span>
                        </div>
                        {chap.description && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                            {chap.description}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 shrink-0">
                        {chap.topics.length} Topics
                      </span>
                    </button>

                    {/* Subtopics dropdown if selected */}
                    {isSelected && (
                      <div className="px-3.5 pb-3.5 pt-1 space-y-1.5 border-t border-emerald-100 dark:border-emerald-900/40">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                          Sub-Topics:
                        </div>
                        {chap.topics.map((top) => {
                          const isTopicSelected = selectedTopicId === top.id;
                          return (
                            <button
                              key={top.id}
                              onClick={() => setSelectedTopicId(top.id)}
                              className={`w-full p-2 rounded-xl text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                                isTopicSelected
                                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100/50 dark:hover:bg-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] opacity-80">
                                  {top.topicNumber}
                                </span>
                                <span>{top.title}</span>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Educational Content for Selected Node (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Hierarchy Summary Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                    {currentBoard.name}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                    {currentClass.name}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                  {currentSubject.name} — {currentChapter ? `Chapter ${currentChapter.chapterNumber}: ${currentChapter.name}` : 'Curriculum Resources'}
                </h3>
                {currentChapter?.description && (
                  <p className="text-xs text-slate-500 mt-1">{currentChapter.description}</p>
                )}
              </div>

              {/* Action: Start Chapter Test */}
              <button
                onClick={() =>
                  onStartTest(
                    `${currentBoard.name} ${currentClass.name} ${currentSubject.name} ${
                      currentChapter ? currentChapter.name : ''
                    }`
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Chapter Mock Test</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {matchedNotes.length}
                </div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Study Notes</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {matchedPastPapers.length}
                </div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Past Papers</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <div className="text-lg font-black text-indigo-600 dark:text-cyan-400">
                  {matchedMCQs.length}+
                </div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Solved MCQs</span>
              </div>
            </div>

            {/* Section 1: Study Notes Available */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <BookMarked className="w-3.5 h-3.5 text-amber-500" />
                Study Notes & Formula Sheets ({matchedNotes.length})
              </h4>

              {matchedNotes.length === 0 ? (
                <div className="p-5 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                  Detailed notes for this unit are being updated by our subject specialists.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {matchedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-amber-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            {note.type || 'Notes'}
                          </span>
                          <span className="text-[11px] text-slate-400">{note.readTime || '8 mins'}</span>
                        </div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mt-1">
                          {note.title}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {note.contentSnippet || note.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setPreviewNote(note)}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => handleDownloadNotePDF(note)}
                          className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Past Papers Available */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                Verified Board Past Papers ({matchedPastPapers.length})
              </h4>

              {matchedPastPapers.length === 0 ? (
                <div className="p-5 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                  Model examination papers for {currentBoard.name} {currentSubject.name} are loaded in the Online Examination Engine.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {matchedPastPapers.map((paper) => (
                    <div
                      key={paper.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                            {paper.year}
                          </span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                            {paper.board}
                          </span>
                          <span className="text-[11px] text-slate-500">{paper.paperGroup || 'Annual'}</span>
                        </div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mt-1">
                          {paper.title}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setPreviewPaper(paper)}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => onSolvePastPaper(paper)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Solve Online</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Note Preview Modal */}
      {previewNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  {previewNote.type || 'Study Notes'}
                </span>
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white mt-1">
                  {previewNote.title}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {previewNote.subject} • {previewNote.classLevel} • {previewNote.chapter}
                </div>
              </div>
              <button
                onClick={() => setPreviewNote(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Note Content */}
            <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-3 whitespace-pre-line bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              {previewNote.fullContent || previewNote.content || previewNote.contentSnippet}
            </div>

            {/* Key Points */}
            {previewNote.keyPoints && previewNote.keyPoints.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-2">
                  Key Board Learning Points:
                </h4>
                <ul className="space-y-1.5 text-xs text-amber-950 dark:text-amber-200">
                  {previewNote.keyPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>{previewNote.readTime || 'Revision Note'}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewNote(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownloadNotePDF(previewNote)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Watermarked PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Past Paper Preview Modal */}
      {previewPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                    {previewPaper.year}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {previewPaper.board}
                  </span>
                </div>
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white mt-1">
                  {previewPaper.title}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {previewPaper.subject} • {previewPaper.classLevel} • {previewPaper.paperGroup || 'Annual'}
                </div>
              </div>
              <button
                onClick={() => setPreviewPaper(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Official Examination Details:
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {previewPaper.description ||
                  `Official ${previewPaper.year} ${previewPaper.board} question paper with complete answers, marking scheme, and detailed step-by-step solutions.`}
              </p>
              <div className="pt-2 flex flex-wrap gap-3 text-[11px] text-slate-500 font-semibold">
                <span>Total Questions: {previewPaper.questionsCount || 12}</span>
                <span>•</span>
                <span>Type: {previewPaper.type}</span>
                <span>•</span>
                <span>Status: Verified Board Solved</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setPreviewPaper(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await documentBrandingService.downloadPastPaper(previewPaper, { studentName });
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => {
                    onSolvePastPaper(previewPaper);
                    setPreviewPaper(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Solve Online</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
