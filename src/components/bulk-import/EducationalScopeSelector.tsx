import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  BookOpen,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  HelpCircle,
  FileText,
  FileCheck,
  Globe,
  Plus,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import {
  EducationalScope,
  EducationalProvince,
  EducationalMedium,
  EducationalExamType,
  EducationalDataType,
} from '../../types/bulkImport';
import {
  PAKISTAN_BOARDS,
  ACADEMIC_CLASSES,
  ACADEMIC_SUBJECTS,
  ACADEMIC_CHAPTERS,
} from '../../data/educationalHierarchy';

interface EducationalScopeSelectorProps {
  scope: EducationalScope;
  onChangeScope: (newScope: EducationalScope) => void;
  counts: {
    mcqs: number;
    tests: number;
    pastPapers: number;
    studyNotes: number;
  };
}

export const EducationalScopeSelector: React.FC<EducationalScopeSelectorProps> = ({
  scope,
  onChangeScope,
  counts,
}) => {
  const [customBoardInput, setCustomBoardInput] = useState('');
  const [showCustomBoard, setShowCustomBoard] = useState(false);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [showCustomSubject, setShowCustomSubject] = useState(false);
  const [customChapterInput, setCustomChapterInput] = useState('');
  const [showCustomChapter, setShowCustomChapter] = useState(false);
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [showCustomTopic, setShowCustomTopic] = useState(false);

  // Filter boards by selected province if not "All Pakistan"
  const availableBoards = useMemo(() => {
    if (scope.province === 'All Pakistan') {
      return PAKISTAN_BOARDS;
    }
    const provKey = scope.province.toLowerCase();
    return PAKISTAN_BOARDS.filter((b) => {
      const bProv = (b.province || '').toLowerCase();
      if (provKey.includes('punjab')) return bProv.includes('punjab');
      if (provKey.includes('sindh')) return bProv.includes('sindh');
      if (provKey.includes('khyber') || provKey.includes('kpk')) return bProv.includes('kpk');
      if (provKey.includes('balochistan')) return bProv.includes('balochistan');
      if (provKey.includes('ajk')) return bProv.includes('ajk');
      if (provKey.includes('federal')) return bProv.includes('federal');
      return true;
    });
  }, [scope.province]);

  // Find chapters for selected subject & class
  const availableChapters = useMemo(() => {
    return ACADEMIC_CHAPTERS.filter((ch) => {
      const subMatch = ch.subjectName.toLowerCase().includes(scope.subject.toLowerCase()) ||
        scope.subject.toLowerCase().includes(ch.subjectName.toLowerCase());
      
      const classNorm = scope.classLevel.toLowerCase();
      const chClass = (ch.classLevel || '').toLowerCase();
      const classMatch =
        (classNorm.includes('9') && chClass.includes('9')) ||
        (classNorm.includes('10') && chClass.includes('10')) ||
        (classNorm.includes('11') && chClass.includes('11')) ||
        (classNorm.includes('12') && chClass.includes('12')) ||
        (classNorm.includes('mdcat') && chClass.includes('mdcat')) ||
        (classNorm.includes('ecat') && chClass.includes('ecat')) ||
        chClass === 'all' ||
        !chClass;

      return subMatch && classMatch;
    });
  }, [scope.subject, scope.classLevel]);

  // Find topics for chosen chapter
  const availableTopics = useMemo(() => {
    if (!scope.chapter || scope.chapter === 'auto-detect') return [];
    const matched = availableChapters.find(
      (c) => c.name.toLowerCase() === scope.chapter.toLowerCase()
    );
    return matched ? matched.topics : [];
  }, [availableChapters, scope.chapter]);

  // Quick Preset Handlers
  const applyPreset = (presetName: string) => {
    if (presetName === 'matric-lahore-phy') {
      onChangeScope({
        ...scope,
        province: 'Punjab',
        board: 'BISE Lahore',
        classLevel: 'Class 10 (Matric Pt 2)',
        subject: 'Physics',
        chapter: 'Current Electricity',
        medium: 'English',
        academicYear: 2024,
        examType: 'Annual Exam',
      });
    } else if (presetName === 'fbise-chemistry-11') {
      onChangeScope({
        ...scope,
        province: 'Federal Capital',
        board: 'Federal Board (FBISE)',
        classLevel: 'Class 11 (FSc / ICS Pt 1)',
        subject: 'Chemistry',
        chapter: 'Basic Concepts of Chemistry',
        medium: 'English',
        academicYear: 2024,
        examType: 'Model Paper',
      });
    } else if (presetName === 'mdcat-biology') {
      onChangeScope({
        ...scope,
        province: 'All Pakistan',
        board: 'National MDCAT / PMDC',
        classLevel: 'MDCAT',
        subject: 'Biology',
        chapter: 'Cell Structure and Function',
        medium: 'English',
        academicYear: 2025,
        examType: 'Entry Test',
      });
    } else if (presetName === 'all-boards-general') {
      onChangeScope({
        ...scope,
        province: 'All Pakistan',
        board: 'All Pakistan Boards',
        classLevel: 'Class 9 (Matric Pt 1)',
        subject: 'Mathematics',
        chapter: 'auto-detect',
        topic: 'auto-detect',
        medium: 'Both / Bilingual',
        academicYear: 2024,
        examType: 'Board Exam',
      });
    }
  };

  const handleBoardChange = (val: string) => {
    if (val === '__custom__') {
      setShowCustomBoard(true);
    } else {
      setShowCustomBoard(false);
      // Auto-update province if single board selected
      const found = PAKISTAN_BOARDS.find((b) => b.name === val);
      let prov = scope.province;
      if (found) {
        if (found.province === 'Punjab') prov = 'Punjab';
        else if (found.province === 'Sindh') prov = 'Sindh';
        else if (found.province === 'KPK') prov = 'Khyber Pakhtunkhwa';
        else if (found.province === 'Balochistan') prov = 'Balochistan';
        else if (found.province === 'Federal') prov = 'Federal Capital';
        else if (found.province === 'AJK') prov = 'AJK';
      }
      onChangeScope({ ...scope, board: val, province: prov });
    }
  };

  const handleSubjectChange = (val: string) => {
    if (val === '__custom__') {
      setShowCustomSubject(true);
    } else {
      setShowCustomSubject(false);
      onChangeScope({
        ...scope,
        subject: val,
        chapter: 'auto-detect',
        topic: 'auto-detect',
      });
    }
  };

  const handleChapterChange = (val: string) => {
    if (val === '__custom__') {
      setShowCustomChapter(true);
    } else {
      setShowCustomChapter(false);
      onChangeScope({
        ...scope,
        chapter: val,
        topic: 'auto-detect',
      });
    }
  };

  const handleTopicChange = (val: string) => {
    if (val === '__custom__') {
      setShowCustomTopic(true);
    } else {
      setShowCustomTopic(false);
      onChangeScope({
        ...scope,
        topic: val,
      });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
      {/* Header with Step indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Step 1: Define Educational Hierarchy & Scope</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Target Educational Scope
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            All imported questions, tests, past papers, and study guides will be automatically classified and mapped to this educational taxonomy.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Quick Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('matric-lahore-phy')}
            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 rounded-lg transition-colors"
          >
            10th Lahore Physics
          </button>
          <button
            type="button"
            onClick={() => applyPreset('fbise-chemistry-11')}
            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 rounded-lg transition-colors"
          >
            FBISE 11th Chem
          </button>
          <button
            type="button"
            onClick={() => applyPreset('mdcat-biology')}
            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 rounded-lg transition-colors"
          >
            MDCAT Biology
          </button>
        </div>
      </div>

      {/* Target Data Type Cards */}
      <div className="space-y-3">
        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Target Collection / Data Type:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              id: 'mcqs' as EducationalDataType,
              label: 'MCQs Question Bank',
              icon: HelpCircle,
              count: counts.mcqs,
              color: 'text-emerald-700',
              accent: 'border-emerald-600 bg-emerald-50/80 ring-emerald-500/20',
            },
            {
              id: 'past-papers' as EducationalDataType,
              label: 'Exams & Past Papers',
              icon: FileText,
              count: counts.pastPapers,
              color: 'text-blue-700',
              accent: 'border-blue-600 bg-blue-50/80 ring-blue-500/20',
            },
            {
              id: 'tests' as EducationalDataType,
              label: 'Online Tests & Mocks',
              icon: FileCheck,
              count: counts.tests,
              color: 'text-indigo-700',
              accent: 'border-indigo-600 bg-indigo-50/80 ring-indigo-500/20',
            },
            {
              id: 'study-notes' as EducationalDataType,
              label: 'Study Notes & Guides',
              icon: BookOpen,
              count: counts.studyNotes,
              color: 'text-amber-700',
              accent: 'border-amber-600 bg-amber-50/80 ring-amber-500/20',
            },
            {
              id: 'bundle' as EducationalDataType,
              label: 'All-in-One Bundle',
              icon: Layers,
              count: counts.mcqs + counts.tests + counts.pastPapers + counts.studyNotes,
              color: 'text-purple-700',
              accent: 'border-purple-600 bg-purple-50/80 ring-purple-500/20',
            },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = scope.dataType === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onChangeScope({ ...scope, dataType: cat.id })}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? `${cat.accent} ring-2 shadow-xs`
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-4 h-4 ${cat.color}`} />
                  <span className="text-[11px] font-bold text-slate-500">{cat.count} exist</span>
                </div>
                <div className="font-extrabold text-xs text-slate-900 mt-2">{cat.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Scope Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        {/* 1. Province / Region */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Province / Region</span>
          </label>
          <select
            value={scope.province}
            onChange={(e) =>
              onChangeScope({
                ...scope,
                province: e.target.value as EducationalProvince,
                board: 'All Pakistan Boards',
              })
            }
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
          >
            <option value="All Pakistan">Pakistan (All Regions)</option>
            <option value="Punjab">Punjab</option>
            <option value="Sindh">Sindh</option>
            <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa (KPK)</option>
            <option value="Balochistan">Balochistan</option>
            <option value="Federal Capital">Federal Capital (Islamabad)</option>
            <option value="AJK">Azad Jammu & Kashmir (AJK)</option>
            <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
          </select>
        </div>

        {/* 2. Board Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Educational Board</span>
            </span>
            {showCustomBoard && (
              <button
                type="button"
                onClick={() => setShowCustomBoard(false)}
                className="text-[11px] text-emerald-700 font-bold hover:underline"
              >
                Back to list
              </button>
            )}
          </label>
          {showCustomBoard ? (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customBoardInput}
                onChange={(e) => setCustomBoardInput(e.target.value)}
                placeholder="Enter custom board name..."
                className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              />
              <button
                type="button"
                onClick={() => {
                  if (customBoardInput.trim()) {
                    onChangeScope({ ...scope, board: customBoardInput.trim() });
                    setShowCustomBoard(false);
                  }
                }}
                className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shrink-0"
              >
                Save
              </button>
            </div>
          ) : (
            <select
              value={scope.board}
              onChange={(e) => handleBoardChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            >
              <option value="All Pakistan Boards">All Boards / Universal</option>
              <option disabled>── Punjab Boards ──</option>
              {availableBoards
                .filter((b) => (b.province || '').toLowerCase().includes('punjab'))
                .map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name} ({b.city})
                  </option>
                ))}
              <option disabled>── Federal & Regional ──</option>
              <option value="Federal Board (FBISE)">Federal Board (FBISE)</option>
              <option value="National MDCAT / PMDC">National MDCAT / PMDC</option>
              <option value="UHS Lahore">UHS Lahore (Medical Entry)</option>
              <option value="ECAT UET Lahore">ECAT UET Lahore (Engg)</option>
              <option disabled>── Other Provinces ──</option>
              {availableBoards
                .filter((b) => !(b.province || '').toLowerCase().includes('punjab'))
                .map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name} ({b.province})
                  </option>
                ))}
              <option disabled>────────────</option>
              <option value="__custom__">+ Add Custom Board Name</option>
            </select>
          )}
        </div>

        {/* 3. Class / Grade */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Class / Grade</span>
          </label>
          <select
            value={scope.classLevel}
            onChange={(e) =>
              onChangeScope({
                ...scope,
                classLevel: e.target.value,
                chapter: 'auto-detect',
                topic: 'auto-detect',
              })
            }
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
          >
            <option value="Class 9 (Matric Pt 1)">Class 9 (Matric Pt 1)</option>
            <option value="Class 10 (Matric Pt 2)">Class 10 (Matric Pt 2)</option>
            <option value="Class 11 (FSc / ICS Pt 1)">Class 11 (FSc / ICS Pt 1)</option>
            <option value="Class 12 (FSc / ICS Pt 2)">Class 12 (FSc / ICS Pt 2)</option>
            <option value="MDCAT">MDCAT (Medical College Entry)</option>
            <option value="ECAT">ECAT (Engineering College Entry)</option>
            <option value="General & Competitive">General & Competitive</option>
          </select>
        </div>

        {/* 4. Subject Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Subject</span>
            </span>
            {showCustomSubject && (
              <button
                type="button"
                onClick={() => setShowCustomSubject(false)}
                className="text-[11px] text-emerald-700 font-bold hover:underline"
              >
                Back to list
              </button>
            )}
          </label>
          {showCustomSubject ? (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customSubjectInput}
                onChange={(e) => setCustomSubjectInput(e.target.value)}
                placeholder="Enter subject name..."
                className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              />
              <button
                type="button"
                onClick={() => {
                  if (customSubjectInput.trim()) {
                    onChangeScope({ ...scope, subject: customSubjectInput.trim() });
                    setShowCustomSubject(false);
                  }
                }}
                className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shrink-0"
              >
                Save
              </button>
            </div>
          ) : (
            <select
              value={scope.subject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            >
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Computer Science">Computer Science</option>
              <option value="English">English</option>
              <option value="Urdu">Urdu</option>
              <option value="Islamic Studies">Islamic Studies (Islamiyat)</option>
              <option value="Pakistan Studies">Pakistan Studies (Mutala-e-Pakistan)</option>
              <option value="General Science">General Science</option>
              <option value="__custom__">+ Add Custom Subject</option>
            </select>
          )}
        </div>

        {/* 5. Chapter Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Chapter</span>
            </span>
            {showCustomChapter && (
              <button
                type="button"
                onClick={() => setShowCustomChapter(false)}
                className="text-[11px] text-emerald-700 font-bold hover:underline"
              >
                Back to list
              </button>
            )}
          </label>
          {showCustomChapter ? (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customChapterInput}
                onChange={(e) => setCustomChapterInput(e.target.value)}
                placeholder="Type chapter name..."
                className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              />
              <button
                type="button"
                onClick={() => {
                  if (customChapterInput.trim()) {
                    onChangeScope({ ...scope, chapter: customChapterInput.trim() });
                    setShowCustomChapter(false);
                  }
                }}
                className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shrink-0"
              >
                Save
              </button>
            </div>
          ) : (
            <select
              value={scope.chapter}
              onChange={(e) => handleChapterChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            >
              <option value="auto-detect">Auto-detect from file or general</option>
              {availableChapters.map((ch) => (
                <option key={ch.id} value={ch.name}>
                  Ch {ch.chapterNumber}: {ch.name}
                </option>
              ))}
              <option value="__custom__">+ Enter Custom Chapter Name</option>
            </select>
          )}
        </div>

        {/* 6. Topic Selection (Optional) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Topic (Optional)</span>
            </span>
            {showCustomTopic && (
              <button
                type="button"
                onClick={() => setShowCustomTopic(false)}
                className="text-[11px] text-emerald-700 font-bold hover:underline"
              >
                Back to list
              </button>
            )}
          </label>
          {showCustomTopic ? (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customTopicInput}
                onChange={(e) => setCustomTopicInput(e.target.value)}
                placeholder="Type topic name..."
                className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              />
              <button
                type="button"
                onClick={() => {
                  if (customTopicInput.trim()) {
                    onChangeScope({ ...scope, topic: customTopicInput.trim() });
                    setShowCustomTopic(false);
                  }
                }}
                className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shrink-0"
              >
                Save
              </button>
            </div>
          ) : (
            <select
              value={scope.topic || 'auto-detect'}
              onChange={(e) => handleTopicChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            >
              <option value="auto-detect">Auto-detect from file (or Entire Chapter)</option>
              {availableTopics.map((top) => (
                <option key={top.id} value={top.title}>
                  {top.topicNumber} {top.title}
                </option>
              ))}
              <option value="__custom__">+ Enter Custom Topic Name</option>
            </select>
          )}
        </div>

        {/* 7. Medium */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-600" />
            <span>Medium / Language</span>
          </label>
          <select
            value={scope.medium}
            onChange={(e) =>
              onChangeScope({
                ...scope,
                medium: e.target.value as EducationalMedium,
              })
            }
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
          >
            <option value="English">English Medium</option>
            <option value="Urdu">Urdu Medium (اردو)</option>
            <option value="Both / Bilingual">Both / Bilingual</option>
          </select>
        </div>

        {/* 8. Academic Year & Exam Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-rose-600" />
            <span>Year & Exam Type</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={scope.academicYear}
              onChange={(e) =>
                onChangeScope({
                  ...scope,
                  academicYear: parseInt(e.target.value, 10),
                })
              }
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            >
              {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={scope.examType}
              onChange={(e) =>
                onChangeScope({
                  ...scope,
                  examType: e.target.value as EducationalExamType,
                })
              }
              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all truncate"
            >
              <option value="Annual Exam">Annual</option>
              <option value="Supplementary Exam">Supply</option>
              <option value="Model Paper">Model</option>
              <option value="Chapter-wise Practice">Chapter</option>
              <option value="Full Book Test">Full Book</option>
              <option value="Entry Test">Entry Test</option>
              <option value="Board Exam">Board</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scope Summary Pill */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-slate-500">Active Scope:</span>
          <span className="px-2 py-0.5 rounded-md font-bold bg-white border border-slate-200 text-slate-800">
            {scope.board}
          </span>
          <span className="text-slate-300">•</span>
          <span className="px-2 py-0.5 rounded-md font-bold bg-white border border-slate-200 text-indigo-800">
            {scope.classLevel}
          </span>
          <span className="text-slate-300">•</span>
          <span className="px-2 py-0.5 rounded-md font-bold bg-white border border-slate-200 text-emerald-800">
            {scope.subject}
          </span>
          <span className="text-slate-300">•</span>
          <span className="px-2 py-0.5 rounded-md font-semibold bg-white border border-slate-200 text-purple-800">
            {scope.chapter === 'auto-detect' ? 'Auto Chapter' : scope.chapter}
          </span>
          <span className="text-slate-300">•</span>
          <span className="px-2 py-0.5 rounded-md font-semibold bg-white border border-slate-200 text-slate-700">
            {scope.academicYear} ({scope.medium})
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            onChangeScope({
              board: 'BISE Lahore',
              province: 'Punjab',
              classLevel: 'Class 10 (Matric Pt 2)',
              subject: 'Physics',
              chapter: 'auto-detect',
              medium: 'English',
              academicYear: 2024,
              examType: 'Annual Exam',
              dataType: scope.dataType,
            })
          }
          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Default</span>
        </button>
      </div>
    </div>
  );
};
