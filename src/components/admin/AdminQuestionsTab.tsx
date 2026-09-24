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
  Archive,
  ChevronLeft,
  ChevronRight,
  SquareCheck,
  CheckSquare,
  Square,
  ArrowRight,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { MCQ, Difficulty } from '../../types';
import { BOARDS_LIST, SCHOOL_CLASSES } from '../../data/mockData';
import { SUBJECTS_LIST } from '../SubjectsView';
import { AdminConfirmDialog } from './AdminConfirmDialog';
import { useToast } from '../ui/Toast';
import { checkDuplicateMCQ, DuplicateMCQCheckResult } from '../../utils/duplicateDetector';
import { BulkMCQEntryModal } from './BulkMCQEntryModal';
import { bulkUpdateMCQStatusApi, bulkDeleteMCQsApi } from '../../lib/api';

interface AdminQuestionsTabProps {
  questions: MCQ[];
  onAddQuestion: (mcq: MCQ) => void;
  onUpdateQuestion: (mcq: MCQ) => void;
  onDeleteQuestion: (id: string) => void;
  onExportPDF?: (filteredQuestions?: MCQ[]) => void;
  onRefresh?: () => void;
  canEdit?: boolean;
  activeRoleFilter?: string;
}

export const AdminQuestionsTab: React.FC<AdminQuestionsTabProps> = ({
  questions,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onExportPDF,
  onRefresh,
  canEdit = true,
  activeRoleFilter,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [boardFilter, setBoardFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [chapterFilter, setChapterFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Selection & Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [isBulkEntryOpen, setIsBulkEntryOpen] = useState(false);

  // Preview Modal State
  const [previewMCQ, setPreviewMCQ] = useState<MCQ | null>(null);
  const [previewSelectedOption, setPreviewSelectedOption] = useState<number | null>(null);

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
  const [formStatus, setFormStatus] = useState<'Published' | 'Draft' | 'Archived'>('Published');
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
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

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
    setFormStatus((q.status as any) || 'Published');
    setFormLanguage(q.language || 'English');
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Preview Modal
  const handleOpenPreview = (q: MCQ) => {
    setPreviewMCQ(q);
    setPreviewSelectedOption(null);
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
      status: formStatus as any,
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

  // Quick Status Toggle
  const handleToggleStatus = (q: MCQ) => {
    const nextStatus = q.status === 'Draft' ? 'Published' : 'Draft';
    const updated: MCQ = {
      ...q,
      status: nextStatus,
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
      (statusFilter === 'Draft' && q.status === 'Draft') ||
      (statusFilter === 'Archived' && (q.status as any) === 'Archived');

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

  // Reset to Page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, boardFilter, classFilter, subjectFilter, chapterFilter, difficultyFilter, statusFilter, pageSize]);

  // Paginated Questions
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Selection handlers
  const handleToggleSelectAllOnPage = () => {
    const newSelected = new Set(selectedIds);
    const allPageIdsSelected = paginatedQuestions.every((q) => newSelected.has(q.id));

    if (allPageIdsSelected) {
      paginatedQuestions.forEach((q) => newSelected.delete(q.id));
    } else {
      paginatedQuestions.forEach((q) => newSelected.add(q.id));
    }
    setSelectedIds(newSelected);
  };

  const handleToggleSelectRow = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkStatusChange = async (newStatus: 'Published' | 'Draft' | 'Archived') => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await bulkUpdateMCQStatusApi(ids, newStatus);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Bulk Status Updated',
          message: `Successfully set ${res.count} MCQs to "${newStatus}".`,
        });
        setSelectedIds(new Set());
        if (onRefresh) onRefresh();
      } else {
        showToast({
          type: 'error',
          title: 'Bulk Update Failed',
          message: res.error || 'Failed to update MCQs.',
        });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await bulkDeleteMCQsApi(ids);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Bulk Delete Complete',
          message: `Deleted ${res.count} MCQs from the database.`,
        });
        setSelectedIds(new Set());
        setIsBulkDeleteOpen(false);
        if (onRefresh) onRefresh();
      } else {
        showToast({
          type: 'error',
          title: 'Bulk Delete Failed',
          message: res.error || 'Failed to delete MCQs.',
        });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const isAllPageSelected =
    paginatedQuestions.length > 0 && paginatedQuestions.every((q) => selectedIds.has(q.id));

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

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsBulkEntryOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              title="Enter multiple MCQs in one batch"
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Bulk Rapid Entry</span>
            </button>

            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Single Question</span>
            </button>
          </div>
        )}
      </div>

      {!canEdit && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">MCQ Editor Tools Disabled:</span>
              <span className="ml-1 text-amber-700 dark:text-amber-300">
                You are viewing the question catalog under the <strong>{activeRoleFilter || 'Moderator'}</strong> filter. MCQ creation, editing, and deletion controls are hidden.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold text-[10px] shrink-0 self-start sm:self-auto">
            Read-Only Mode
          </span>
        </div>
      )}

      {/* Bulk Action Floating Toolbar */}
      {selectedIds.size > 0 && canEdit && (
        <div className="bg-slate-900 dark:bg-slate-800 text-white p-3.5 px-5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-slideDown">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {selectedIds.size}
            </span>
            <span className="text-xs font-bold">
              {selectedIds.size === 1 ? '1 Question Selected' : `${selectedIds.size} Questions Selected`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              disabled={isBulkProcessing}
              onClick={() => handleBulkStatusChange('Published')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-50 transition-colors"
            >
              Publish Selected
            </button>
            <button
              disabled={isBulkProcessing}
              onClick={() => handleBulkStatusChange('Draft')}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer disabled:opacity-50 transition-colors"
            >
              Draft Selected
            </button>
            <button
              disabled={isBulkProcessing}
              onClick={() => handleBulkStatusChange('Archived')}
              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
            <button
              disabled={isBulkProcessing}
              onClick={() => setIsBulkDeleteOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
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
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Select All on Page & Pagination Size Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 px-1">
        <div className="flex items-center gap-3">
          {canEdit && paginatedQuestions.length > 0 && (
            <button
              onClick={handleToggleSelectAllOnPage}
              className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
            >
              {isAllPageSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Select Page ({paginatedQuestions.length})</span>
            </button>
          )}

          <span>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredQuestions.length)} of {filteredQuestions.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="text-xs py-1 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {paginatedQuestions.map((q, idx) => {
          const globalIdx = (currentPage - 1) * pageSize + idx;
          const isPublished = q.status !== 'Draft' && (q.status as any) !== 'Archived';
          const isArchived = (q.status as any) === 'Archived';
          const isSelected = selectedIds.has(q.id);

          return (
            <div
              key={q.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-2xs transition-all ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10'
                  : isArchived
                  ? 'border-slate-200 dark:border-slate-800 opacity-70 bg-slate-50/40 dark:bg-slate-800/20'
                  : isPublished
                  ? 'border-slate-200 dark:border-slate-800 hover:border-blue-400/50 dark:hover:border-blue-500/50'
                  : 'border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {canEdit && (
                  <button
                    onClick={() => handleToggleSelectRow(q.id)}
                    className="mt-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                )}

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
                    {canEdit ? (
                      <button
                        onClick={() => handleToggleStatus(q)}
                        className={`px-2 py-0.5 rounded-full font-bold cursor-pointer transition-colors ${
                          isArchived
                            ? 'bg-slate-600 text-white'
                            : isPublished
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                        title="Click to toggle publish/draft"
                      >
                        {isArchived ? 'Archived' : isPublished ? 'Published' : 'Draft'}
                      </button>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold ${
                          isArchived
                            ? 'bg-slate-200 text-slate-700'
                            : isPublished
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {isArchived ? 'Archived' : isPublished ? 'Published' : 'Draft'}
                      </span>
                    )}
                  </div>

                  {/* Question Text */}
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                    <span className="text-slate-400 dark:text-slate-600 mr-1.5">
                      #{globalIdx + 1}.
                    </span>
                    {q.question}
                  </h3>

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = oIdx === q.correctAnswer;
                      const optLabel = String.fromCharCode(65 + oIdx);
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

                {/* Edit, Preview & Delete Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenPreview(q)}
                    className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Live Test Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {canEdit && (
                    <>
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
                    </>
                  )}
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex items-center gap-1 text-xs">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 2 + i;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition-colors cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && <span className="text-slate-400 px-1">...</span>}
          </div>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

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
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
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
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4 Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Option A *</span>
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={formCorrectAnswer === 0}
                      onChange={() => setFormCorrectAnswer(0)}
                      className="text-blue-600"
                    />
                  </label>
                  <input
                    type="text"
                    value={formOptA}
                    onChange={(e) => setFormOptA(e.target.value)}
                    placeholder="Value / Statement for Option A"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Option B *</span>
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={formCorrectAnswer === 1}
                      onChange={() => setFormCorrectAnswer(1)}
                      className="text-blue-600"
                    />
                  </label>
                  <input
                    type="text"
                    value={formOptB}
                    onChange={(e) => setFormOptB(e.target.value)}
                    placeholder="Value / Statement for Option B"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Option C *</span>
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={formCorrectAnswer === 2}
                      onChange={() => setFormCorrectAnswer(2)}
                      className="text-blue-600"
                    />
                  </label>
                  <input
                    type="text"
                    value={formOptC}
                    onChange={(e) => setFormOptC(e.target.value)}
                    placeholder="Value / Statement for Option C"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Option D *</span>
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={formCorrectAnswer === 3}
                      onChange={() => setFormCorrectAnswer(3)}
                      className="text-blue-600"
                    />
                  </label>
                  <input
                    type="text"
                    value={formOptD}
                    onChange={(e) => setFormOptD(e.target.value)}
                    placeholder="Value / Statement for Option D"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Explanation / Solution *
                </label>
                <textarea
                  rows={2}
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Explain why the correct option is right with formulas, textbook context, or reasoning..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Academic Hierarchy Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Class / Level
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
              </div>

              {/* Chapter, Topic, Difficulty & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chapter
                  </label>
                  <input
                    type="text"
                    value={formChapter}
                    onChange={(e) => setFormChapter(e.target.value)}
                    placeholder="e.g. Chapter 14 - Optics"
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Language
                  </label>
                  <select
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="English">English</option>
                    <option value="Urdu">Urdu</option>
                  </select>
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

      {/* Bulk Rapid Entry Modal */}
      <BulkMCQEntryModal
        isOpen={isBulkEntryOpen}
        onClose={() => setIsBulkEntryOpen(false)}
        onSuccess={(count) => {
          if (onRefresh) onRefresh();
        }}
        existingMCQs={questions}
      />

      {/* Live Student MCQ Preview Modal */}
      {previewMCQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl p-6 relative my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Eye className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Student Test-Mode Preview
                  </h3>
                  <p className="text-xs text-slate-500">Live test renderer simulation</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewMCQ(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Question Badge Header */}
              <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {previewMCQ.subject}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {previewMCQ.classLevel}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  {previewMCQ.chapter}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                  {previewMCQ.difficulty}
                </span>
              </div>

              {/* Question */}
              <p className="text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                {previewMCQ.question}
              </p>

              {/* Interactive Options */}
              <div className="space-y-2">
                {previewMCQ.options.map((opt, i) => {
                  const isSelected = previewSelectedOption === i;
                  const isCorrect = i === previewMCQ.correctAnswer;
                  const optLabel = String.fromCharCode(65 + i);

                  let optionClass =
                    'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/40';

                  if (previewSelectedOption !== null) {
                    if (isSelected && isCorrect) {
                      optionClass =
                        'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold';
                    } else if (isSelected && !isCorrect) {
                      optionClass =
                        'border-red-500 bg-red-50/80 dark:bg-red-950/40 text-red-900 dark:text-red-200';
                    } else if (isCorrect) {
                      optionClass =
                        'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300';
                    }
                  }

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPreviewSelectedOption(i)}
                      className={`w-full text-left p-3.5 rounded-2xl border text-xs flex items-center gap-3 transition-all cursor-pointer ${optionClass}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                          isSelected && isCorrect
                            ? 'bg-emerald-600 text-white'
                            : isSelected && !isCorrect
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {optLabel}
                      </span>
                      <span className="flex-1 font-medium">{opt}</span>
                      {previewSelectedOption !== null && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      {previewSelectedOption !== null && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {previewSelectedOption !== null && (
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 space-y-1.5 animate-fadeIn text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
                    <Sparkles className="w-4 h-4 text-blue-600" /> Explanation:
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {previewMCQ.explanation}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                onClick={() => setPreviewSelectedOption(null)}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Reset Answer
              </button>
              <button
                onClick={() => setPreviewMCQ(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={isBulkDeleteOpen}
        title={`Delete ${selectedIds.size} Questions?`}
        message={`Are you sure you want to delete ${selectedIds.size} selected questions? This cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size} Questions`}
        isDestructive={true}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsBulkDeleteOpen(false)}
      />

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
