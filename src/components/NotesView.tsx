import React, { useState } from 'react';
import {
  BookOpen,
  FileText,
  Download,
  Search,
  Filter,
  Layers,
  Sparkles,
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  Bookmark,
  Share2,
  FileCheck,
} from 'lucide-react';
import { StudyNote } from '../types';
import { documentBrandingService } from '../services/documentBrandingService';
import {
  NavigationContext,
  parseNavContext,
  matchesClassGrade,
  normalizeClassLevel,
  normalizeSubjectName,
} from '../utils/navigationContext';

interface NotesViewProps {
  notes: StudyNote[];
  onSelectNote: (note: StudyNote) => void;
  studentName: string;
  initialSubject?: string;
  initialClass?: string;
  subFilter?: string;
  comparisonContext?: NavigationContext | null;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  onSelectNote,
  studentName,
  initialSubject = 'All',
  initialClass = 'All',
  subFilter,
  comparisonContext,
}) => {
  const ctx = parseNavContext(subFilter || initialSubject);
  const [selectedSubject, setSelectedSubject] = useState<string>(
    comparisonContext?.subject || (ctx.subject !== 'All' ? ctx.subject : initialSubject?.startsWith('{') ? 'All' : initialSubject)
  );
  const [selectedClass, setSelectedClass] = useState<string>(
    comparisonContext?.classLevel
      ? normalizeClassLevel(comparisonContext.classLevel)
      : (ctx.classLevel !== 'All' ? normalizeClassLevel(ctx.classLevel) : (initialClass !== 'All' ? normalizeClassLevel(initialClass) : 'All'))
  );
  const [selectedBoard, setSelectedBoard] = useState<string>(
    comparisonContext?.board || (ctx.board !== 'All' ? ctx.board : 'All')
  );

  React.useEffect(() => {
    if (comparisonContext) {
      if (comparisonContext.subject && comparisonContext.subject !== 'All') setSelectedSubject(normalizeSubjectName(comparisonContext.subject));
      if (comparisonContext.classLevel && comparisonContext.classLevel !== 'All') setSelectedClass(normalizeClassLevel(comparisonContext.classLevel));
      if (comparisonContext.board && comparisonContext.board !== 'All') setSelectedBoard(comparisonContext.board);
    } else {
      const c = parseNavContext(subFilter || initialSubject);
      setSelectedSubject(c.subject || 'All');
      setSelectedClass(c.classLevel ? normalizeClassLevel(c.classLevel) : 'All');
      setSelectedBoard(c.board || 'All');
    }
  }, [comparisonContext, subFilter, initialSubject]);
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

  const subjects = [
    'All',
    'Physics',
    'Chemistry',
    'Biology',
    'Mathematics',
    'Computer Science',
    'English',
    'Urdu',
    'Pakistan Studies',
    'Islamiat',
  ];

  const classes = ['All', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'MDCAT', 'CSS'];
  const noteTypes = ['All', 'Chapter Summary', 'Formula Sheet', 'Short Questions', 'Solved Numerical'];

  const filteredNotes = notes.filter((n) => {
    if (!n) return false;
    const nSub = (n.subject || '').toLowerCase();
    const nBrd = (n.board || '').toLowerCase();
    const nTitle = (n.title || '').toLowerCase();
    const nChap = (n.chapter || '').toLowerCase();
    const selSub = (selectedSubject || 'All');
    const selCls = (selectedClass || 'All');
    const selBrd = (selectedBoard || 'All');

    const matchesSub = selSub === 'All' || nSub === selSub.toLowerCase();
    const matchesCls = selCls === 'All' || (n.classLevel && matchesClassGrade(n.classLevel, selCls));
    const matchesBoard = selBrd === 'All' || (!n.board || nBrd.includes(selBrd.toLowerCase()) || selBrd.toLowerCase().includes(nBrd));
    const matchesType = selectedType === 'All' || n.type === selectedType;
    const matchesSearch =
      !searchQuery ||
      nTitle.includes(searchQuery.toLowerCase()) ||
      nSub.includes(searchQuery.toLowerCase()) ||
      nChap.includes(searchQuery.toLowerCase());
    return matchesSub && matchesCls && matchesBoard && matchesType && matchesSearch;
  });

  const handleDownloadPDF = async (note: StudyNote) => {
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
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-purple-300 border border-white/10 mb-3">
            <BookOpen className="w-3.5 h-3.5" /> High-Yield Study Notes & Formula Sheets
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Academic Notes & Revision Repository
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
            Download comprehensive chapter summaries, formulas, solved short/long questions, and key revision points for Class 9, Class 10, Class 11, Class 12, MDCAT & ECAT.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by subject, chapter, or topic (e.g., Kinematics, Stoichiometry, Trigonometry)..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium"
          />
        </div>

        {/* Subject Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] font-bold uppercase shrink-0 mr-1">Subject:</span>
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedSubject.toLowerCase() === sub.toLowerCase()
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Class and Type Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-slate-400 text-[11px] font-bold uppercase mr-1">Class:</span>
            {classes.map((cls) => {
              const isSelected = cls === 'All'
                ? (!selectedClass || selectedClass === 'All')
                : (selectedClass !== 'All' && matchesClassGrade(cls, selectedClass));
              return (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cls}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-slate-400 text-[11px] font-bold uppercase mr-1">Format:</span>
            {noteTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedType === type
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-4 col-span-full">
          <FileText className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            No content available for this Class and Subject
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            No study notes found matching {selectedClass !== 'All' ? selectedClass : ''} {selectedSubject !== 'All' ? selectedSubject : ''}. You can reset filters to browse all academic study material.
          </p>
          <button
            onClick={() => {
              setSelectedSubject('All');
              setSelectedClass('All');
              setSelectedBoard('All');
              setSelectedType('All');
              setSearchQuery('');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                  {note.subject} • {note.type}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">{note.readTime}</span>
              </div>

              <h3 className="text-base font-black text-slate-900 dark:text-white mt-2.5 leading-snug">
                {note.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {note.classLevel} • {note.chapter}
              </p>

              <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 line-clamp-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 leading-relaxed">
                {note.contentSnippet}
              </p>

              {/* Key Bullet Points */}
              {note.keyPoints && note.keyPoints.length > 0 && (
                <div className="mt-3 space-y-1">
                  {note.keyPoints.slice(0, 2).map((pt, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{pt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Card Bar */}
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-purple-500" />
                <span>{note.type || 'Study Note'}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectNote(note)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Read
                </button>

                <button
                  onClick={() => handleDownloadPDF(note)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  title="Download Watermarked PDF"
                >
                  {downloadSuccessId === note.id ? (
                    <>
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Downloaded</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};
