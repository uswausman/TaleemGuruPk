import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Eye,
  FileQuestion,
  Sparkles,
  Download,
  AlertCircle,
  AlertTriangle,
  Check,
  X,
  Layers,
  BookOpen,
  Tag,
  Hash,
  RefreshCw,
} from 'lucide-react';
import { MCQ, Difficulty } from '../../types';
import { BOARDS_LIST, SCHOOL_CLASSES } from '../../data/mockData';
import { SUBJECTS_LIST } from '../SubjectsView';
import { AdminConfirmDialog } from './AdminConfirmDialog';
import { useToast } from '../ui/Toast';
import { checkDuplicateMCQ, DuplicateMCQCheckResult } from '../../utils/duplicateDetector';

interface AdminQuestionsTabProps {
  questions: MCQ[];
  onAddQuestion: (mcq: MCQ) => void;
  onUpdateQuestion: (mcq: MCQ) => void;
  onDeleteQuestion: (id: string) => void;
}

export const AdminQuestionsTab: React.FC<AdminQuestionsTabProps> = ({
  questions,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [boardFilter, setBoardFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [chapterFilter, setChapterFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<MCQ | null>(null);

  // Form Fields State
  const [formQuestion, setFormQuestion] = useState('');
  const [formOptA, setFormOptA] = useState('');
  const [formOptB, setFormOptB] = useState('');
  const [formOptC, setFormOptC] = useState('');
  const [formOptD, setFormOptD] = useState('');
  const [formCorrectAnswer, setFormCorrectAnswer] = useState<number>(0);
  const [formExplanation, setFormExplanation] = useState('');
  const [formBoard, setFormBoard] = useState('BISE Lahore');
  const [formClass, setFormClass] = useState('Class 10 (Matric Pt 2)');
  const [formSubject, setFormSubject] = useState('Physics');
  const [formChapter, setFormChapter] = useState('');
  const [formTopic, setFormTopic] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<Difficulty>('Medium');
  const [formTags, setFormTags] = useState('');
  const [formStatus, setFormStatus] = useState<'Published' | 'Draft'>('Published');
  const [formLanguage, setFormLanguage] = useState<'English' | 'Urdu'>('English');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateMCQCheckResult | null>(null);
  const lastAlertedDuplicateIdRef = useRef<string | null>(null);
  const { showToast } = useToast();

  // Trigger immediate UI notification whenever question content or academic scope changes
  useEffect(() => {
    if (!isModalOpen) {
      setDuplicateWarning(null);
      lastAlertedDuplicateIdRef.current = null;
      return;
    }

    if (!formQuestion.trim() || formQuestion.trim().length < 5) {
      setDuplicateWarning(null);
      lastAlertedDuplicateIdRef.current = null;
      return;
    }

    const check = checkDuplicateMCQ(
      formQuestion,
      formSubject,
      formClass,
      formBoard,
      editingQuestion?.id,
      questions
    );

    if (check.isDuplicate && check.existingMCQ) {
      setDuplicateWarning(check);
      // Trigger immediate UI notification toast if not already toasted for this specific duplicate
      if (lastAlertedDuplicateIdRef.current !== check.existingMCQ.id) {
        lastAlertedDuplicateIdRef.current = check.existingMCQ.id;
        showToast({
          type: 'warning',
          title: 'Duplicate Question Detected',
          message: check.reason,
          duration: 4500,
        });
      }
    } else {
      setDuplicateWarning(null);
      lastAlertedDuplicateIdRef.current = null;
    }
  }, [formQuestion, formSubject, formClass, formBoard, isModalOpen, editingQuestion, questions, showToast]);

  // Confirmation dialog state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetTitle, setDeleteTargetTitle] = useState<string>('');

  // Extract unique chapters from questions
  const availableChapters = Array.from(
    new Set(questions.map((q) => q.chapter).filter(Boolean) as string[])
  );

  // Reset form
  const resetForm = () => {
    setEditingQuestion(null);
    setDuplicateWarning(null);
    lastAlertedDuplicateIdRef.current = null;
    setFormQuestion('');
    setFormOptA('');
    setFormOptB('');
    setFormOptC('');
    setFormOptD('');
    setFormCorrectAnswer(0);
    setFormExplanation('');
    setFormBoard('BISE Lahore');
    setFormClass('Class 10 (Matric Pt 2)');
    setFormSubject('Physics');
    setFormChapter('');
    setFormTopic('');
    setFormDifficulty('Medium');
    setFormTags('');
    setFormStatus('Published');
    setFormLanguage('English');
    setFormErrors({});
  };

  // Open Edit modal
  const handleOpenEdit = (q: MCQ) => {
    setEditingQuestion(q);
    setDuplicateWarning(null);
    lastAlertedDuplicateIdRef.current = null;
    setFormQuestion(q.question);
    setFormOptA(q.options[0] || '');
    setFormOptB(q.options[1] || '');
    setFormOptC(q.options[2] || '');
    setFormOptD(q.options[3] || '');
    setFormCorrectAnswer(q.correctAnswer);
    setFormExplanation(q.explanation || '');
    setFormBoard(q.board || 'BISE Lahore');
    setFormClass(q.classLevel || 'Class 10 (Matric Pt 2)');
    setFormSubject(q.subject || 'Physics');
    setFormChapter(q.chapter || '');
    setFormTopic(q.topic || '');
    setFormDifficulty(q.difficulty || 'Medium');
    setFormTags((q.tags || []).join(', '));
    setFormStatus(q.status || 'Published');
    setFormLanguage(q.language || 'English');
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Form Validation & Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!formQuestion.trim()) errors.question = 'Question text is required';
    if (!formOptA.trim()) errors.optA = 'Option A is required';
    if (!formOptB.trim()) errors.optB = 'Option B is required';
    if (!formOptC.trim()) errors.optC = 'Option C is required';
    if (!formOptD.trim()) errors.optD = 'Option D is required';
    if (!formExplanation.trim()) errors.explanation = 'Explanation is required for student learning';

    // Immediate authoritative duplicate validation
    const duplicateCheck = checkDuplicateMCQ(
      formQuestion,
      formSubject,
      formClass,
      formBoard,
      editingQuestion?.id,
      questions
    );

    if (duplicateCheck.isDuplicate) {
      setDuplicateWarning(duplicateCheck);
      errors.question = `Duplicate Question: ${duplicateCheck.reason} Please modify the question statement.`;
      showToast({
        type: 'error',
        title: 'Submission Blocked: Duplicate MCQ',
        message: `Cannot save duplicate question. ${duplicateCheck.reason}`,
        duration: 5000,
      });
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (!tagsArray.includes(formSubject.toLowerCase())) {
      tagsArray.push(formSubject.toLowerCase());
    }

    const mcqPayload: MCQ = {
      id: editingQuestion ? editingQuestion.id : `mcq-${Date.now()}`,
      question: formQuestion.trim(),
      options: [formOptA.trim(), formOptB.trim(), formOptC.trim(), formOptD.trim()],
      correctAnswer: formCorrectAnswer,
      explanation: formExplanation.trim(),
      board: formBoard,
      classLevel: formClass,
      subject: formSubject,
      chapter: formChapter.trim() || 'General Chapter',
      topic: formTopic.trim() || 'Core Concept',
      difficulty: formDifficulty,
      tags: tagsArray,
      status: formStatus,
      language: formLanguage,
      createdAt: editingQuestion?.createdAt || new Date().toISOString(),
    };

    if (editingQuestion) {
      onUpdateQuestion(mcqPayload);
    } else {
      onAddQuestion(mcqPayload);
    }

    setIsModalOpen(false);
    resetForm();
  };

  // Quick Status Toggle (Publish / Unpublish)
  const handleToggleStatus = (q: MCQ) => {
    const updated: MCQ = {
      ...q,
      status: q.status === 'Draft' ? 'Published' : 'Draft',
    };
    onUpdateQuestion(updated);
  };

  // Filtered Questions
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      !searchQuery ||
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (q.topic && q.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (q.chapter && q.chapter.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesBoard = boardFilter === 'All' || q.board === boardFilter;
    const matchesClass = classFilter === 'All' || q.classLevel === classFilter;
    const matchesSubject = subjectFilter === 'All' || q.subject === subjectFilter;
    const matchesChapter = chapterFilter === 'All' || q.chapter === chapterFilter;
    const matchesDifficulty = difficultyFilter === 'All' || q.difficulty === difficultyFilter;
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Published' && (q.status === 'Published' || !q.status)) ||
      (statusFilter === 'Draft' && q.status === 'Draft');

    return (
      matchesSearch &&
      matchesBoard &&
      matchesClass &&
      matchesSubject &&
      matchesChapter &&
      matchesDifficulty &&
      matchesStatus
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Action Row */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-blue-600" />
            Central MCQ Question Bank
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Total {questions.length} questions in catalog • {filteredQuestions.length} matching current filter
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Question</span>
        </button>
      </div>

      {/* Search and Multi-Criteria Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions by keyword, topic, tag, or formula..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filters grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {/* Subject Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Subject
            </label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full text-xs py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Subjects</option>
              {SUBJECTS_LIST.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Class
            </label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full text-xs py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Classes</option>
              {SCHOOL_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="MDCAT Medical">MDCAT Medical</option>
              <option value="ECAT Engineering">ECAT Engineering</option>
              <option value="CSS Competitive">CSS Competitive</option>
            </select>
          </div>

          {/* Board Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Board
            </label>
            <select
              value={boardFilter}
              onChange={(e) => setBoardFilter(e.target.value)}
              className="w-full text-xs py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Boards</option>
              {BOARDS_LIST.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Chapter
            </label>
            <select
              value={chapterFilter}
              onChange={(e) => setChapterFilter(e.target.value)}
              className="w-full text-xs py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Chapters</option>
              {availableChapters.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Difficulty
            </label>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="w-full text-xs py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {filteredQuestions.map((q, idx) => {
          const isPublished = q.status !== 'Draft';
          return (
            <div
              key={q.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-2xs transition-all ${
                isPublished
                  ? 'border-slate-200 dark:border-slate-800 hover:border-blue-400/50 dark:hover:border-blue-500/50'
                  : 'border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Badges line */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      {q.subject}
                    </span>
                    {q.classLevel && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {q.classLevel}
                      </span>
                    )}
                    {q.board && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {q.board}
                      </span>
                    )}
                    {q.chapter && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/40">
                        Ch: {q.chapter}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold ${
                        q.difficulty === 'Easy'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : q.difficulty === 'Hard'
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(q)}
                      className={`px-2 py-0.5 rounded-full font-bold cursor-pointer transition-colors ${
                        isPublished
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                      title="Click to toggle publish/draft"
                    >
                      {isPublished ? 'Published' : 'Draft'}
                    </button>
                  </div>

                  {/* Question Text */}
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                    <span className="text-slate-400 dark:text-slate-600 mr-1.5">
                      #{idx + 1}.
                    </span>
                    {q.question}
                  </h3>

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = oIdx === q.correctAnswer;
                      const optLabel = String.fromCharCode(65 + oIdx); // A, B, C, D
                      return (
                        <div
                          key={oIdx}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                            isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {optLabel}
                          </span>
                          <span className="truncate">{opt}</span>
                          {isCorrect && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-auto shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation & Topic footer */}
                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Explanation:
                    </div>
                    <p className="italic text-slate-600 dark:text-slate-300">
                      {q.explanation}
                    </p>
                    {q.tags && q.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {q.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit & Delete Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(q)}
                    className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                    title="Edit Question"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTargetId(q.id);
                      setDeleteTargetTitle(q.question);
                    }}
                    className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredQuestions.length === 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <FileQuestion className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No questions matched your search criteria
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Try adjusting your search terms or clearing the subject/board filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setBoardFilter('All');
                setClassFilter('All');
                setSubjectFilter('All');
                setChapterFilter('All');
                setDifficultyFilter('All');
                setStatusFilter('All');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl p-6 relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {editingQuestion ? (
                  <>
                    <Edit className="w-5 h-5 text-blue-600" /> Edit MCQ Question
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-blue-600" /> Add New MCQ Question
                  </>
                )}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              {/* Question Text */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Question Statement *
                </label>
                <textarea
                  rows={3}
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="Enter the complete question statement (supports scientific notation, formulas, English/Urdu)..."
                  className={`w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${
                    formErrors.question
                      ? 'border-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {formErrors.question && (
                  <p className="text-red-500 text-[11px] mt-1">{formErrors.question}</p>
                )}

                {/* Immediate Duplicate Question UI Notification Banner */}
                {duplicateWarning?.isDuplicate && duplicateWarning.existingMCQ && (
                  <div
                    id="mcq-duplicate-warning-banner"
                    className="mt-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 animate-in fade-in"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xs text-amber-700 dark:text-amber-400">
                            Duplicate Question Detected
                          </p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                            {duplicateWarning.matchType === 'exact' ? 'Exact Duplicate' : 'Identical Content'}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                          {duplicateWarning.reason}
                        </p>
                        <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-amber-500/20 text-[11px] space-y-1.5 shadow-xs">
                          <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                            Existing ID: {duplicateWarning.existingMCQ.id}
                          </div>
                          <div className="text-slate-800 dark:text-slate-100 font-medium">
                            "{duplicateWarning.existingMCQ.question}"
                          </div>
                          <div className="flex flex-wrap gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                            <span>Subject: <strong className="text-slate-800 dark:text-slate-200">{duplicateWarning.existingMCQ.subject}</strong></span>
                            <span>•</span>
                            <span>Class: <strong className="text-slate-800 dark:text-slate-200">{duplicateWarning.existingMCQ.classLevel}</strong></span>
                            <span>•</span>
                            <span>Board: <strong className="text-slate-800 dark:text-slate-200">{duplicateWarning.existingMCQ.board}</strong></span>
                            {duplicateWarning.existingMCQ.chapter && (
                              <>
                                <span>•</span>
                                <span>Chapter: <strong className="text-slate-800 dark:text-slate-200">{duplicateWarning.existingMCQ.chapter}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          Submission blocked to prevent database duplicates. Modify question statement or scope.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Four Answer Options & Mark Correct Option *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option A */}
                  <div
                    className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      formCorrectAnswer === 0
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-400'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="correctOption"
                      id="optA"
                      checked={formCorrectAnswer === 0}
                      onChange={() => setFormCorrectAnswer(0)}
                      className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="optA" className="font-bold text-slate-700 dark:text-slate-300">
                      A:
                    </label>
                    <input
                      type="text"
                      value={formOptA}
                      onChange={(e) => setFormOptA(e.target.value)}
                      placeholder="Option A text..."
                      className="w-full bg-transparent border-none text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  {/* Option B */}
                  <div
                    className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      formCorrectAnswer === 1
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-400'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="correctOption"
                      id="optB"
                      checked={formCorrectAnswer === 1}
                      onChange={() => setFormCorrectAnswer(1)}
                      className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="optB" className="font-bold text-slate-700 dark:text-slate-300">
                      B:
                    </label>
                    <input
                      type="text"
                      value={formOptB}
                      onChange={(e) => setFormOptB(e.target.value)}
                      placeholder="Option B text..."
                      className="w-full bg-transparent border-none text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  {/* Option C */}
                  <div
                    className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      formCorrectAnswer === 2
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-400'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="correctOption"
                      id="optC"
                      checked={formCorrectAnswer === 2}
                      onChange={() => setFormCorrectAnswer(2)}
                      className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="optC" className="font-bold text-slate-700 dark:text-slate-300">
                      C:
                    </label>
                    <input
                      type="text"
                      value={formOptC}
                      onChange={(e) => setFormOptC(e.target.value)}
                      placeholder="Option C text..."
                      className="w-full bg-transparent border-none text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  {/* Option D */}
                  <div
                    className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      formCorrectAnswer === 3
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-400'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="correctOption"
                      id="optD"
                      checked={formCorrectAnswer === 3}
                      onChange={() => setFormCorrectAnswer(3)}
                      className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="optD" className="font-bold text-slate-700 dark:text-slate-300">
                      D:
                    </label>
                    <input
                      type="text"
                      value={formOptD}
                      onChange={(e) => setFormOptD(e.target.value)}
                      placeholder="Option D text..."
                      className="w-full bg-transparent border-none text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Textbook Explanation & Solution Step *
                </label>
                <textarea
                  rows={2}
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Explain why the correct answer is true, referencing relevant textbook chapters..."
                  className={`w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${
                    formErrors.explanation
                      ? 'border-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
              </div>

              {/* Academic Metadata Grid (Subject, Class, Board, Chapter, Topic, Difficulty, Tags, Status) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Subject */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {SUBJECTS_LIST.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Class Level
                  </label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {SCHOOL_CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="MDCAT Medical">MDCAT Medical</option>
                    <option value="ECAT Engineering">ECAT Engineering</option>
                    <option value="CSS Competitive">CSS Competitive</option>
                  </select>
                </div>

                {/* Board */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Board
                  </label>
                  <select
                    value={formBoard}
                    onChange={(e) => setFormBoard(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {BOARDS_LIST.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as Difficulty)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                {/* Chapter */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chapter Name
                  </label>
                  <input
                    type="text"
                    value={formChapter}
                    onChange={(e) => setFormChapter(e.target.value)}
                    placeholder="e.g. Geometrical Optics"
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Topic */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="e.g. Refraction of Light"
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Publish Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="optics, physics, matric"
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(duplicateWarning?.isDuplicate)}
                  title={
                    duplicateWarning?.isDuplicate
                      ? 'Submission blocked: duplicate question content detected'
                      : undefined
                  }
                  className={`px-5 py-2 rounded-xl font-bold shadow-xs transition-colors flex items-center gap-2 ${
                    duplicateWarning?.isDuplicate
                      ? 'bg-slate-400 dark:bg-slate-700 text-slate-200 dark:text-slate-400 cursor-not-allowed opacity-80'
                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  }`}
                >
                  {duplicateWarning?.isDuplicate ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Duplicate Blocked</span>
                    </>
                  ) : editingQuestion ? (
                    'Update Question'
                  ) : (
                    'Save & Publish Question'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Delete Question from Database?"
        message={`Are you sure you want to delete this question: "${deleteTargetTitle.slice(0, 80)}..."? This action will remove it from the central question bank.`}
        confirmLabel="Delete Question"
        isDestructive={true}
        onConfirm={() => {
          if (deleteTargetId) {
            onDeleteQuestion(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
