import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Sparkles,
  Play,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  FileQuestion,
  Award,
  RefreshCw,
} from 'lucide-react';
import { TestConfig, MCQ, TestType } from '../../types';
import { BOARDS_LIST, SCHOOL_CLASSES } from '../../data/mockData';
import { SUBJECTS_LIST } from '../SubjectsView';
import { AdminConfirmDialog } from './AdminConfirmDialog';
import { useToast } from '../ui/Toast';
import { checkDuplicateTest, DuplicateTestCheckResult } from '../../utils/duplicateDetector';

interface AdminQuizzesTabProps {
  quizzes: TestConfig[];
  allQuestions: MCQ[];
  onCreateQuiz: (quiz: TestConfig) => void;
  onUpdateQuiz: (quiz: TestConfig) => void;
  onDeleteQuiz: (id: string) => void;
  onPreviewQuiz?: (quiz: TestConfig) => void;
}

export const AdminQuizzesTab: React.FC<AdminQuizzesTabProps> = ({
  quizzes,
  allQuestions,
  onCreateQuiz,
  onUpdateQuiz,
  onDeleteQuiz,
  onPreviewQuiz,
}) => {
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<TestConfig | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSubject, setFormSubject] = useState('Physics');
  const [formClassLevel, setFormClassLevel] = useState('Class 10 (Matric Pt 2)');
  const [formBoard, setFormBoard] = useState('BISE Lahore');
  const [formTestType, setFormTestType] = useState<TestType>('Chapter Test');
  const [formCategory, setFormCategory] = useState('Classroom');
  const [formDurationMinutes, setFormDurationMinutes] = useState<number>(15);
  const [formPassPercentage, setFormPassPercentage] = useState<number>(50);
  const [formNegativeMarking, setFormNegativeMarking] = useState<boolean>(false);
  const [formNegativeValue, setFormNegativeValue] = useState<number>(0.25);
  const [formStatus, setFormStatus] = useState<'Published' | 'Draft'>('Published');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateTestCheckResult | null>(null);
  const lastAlertedDuplicateIdRef = useRef<string | null>(null);
  const { showToast } = useToast();

  // Trigger immediate UI notification whenever quiz title or academic scope changes
  useEffect(() => {
    if (!isModalOpen) {
      setDuplicateWarning(null);
      lastAlertedDuplicateIdRef.current = null;
      return;
    }

    if (!formTitle.trim() || formTitle.trim().length < 3) {
      setDuplicateWarning(null);
      lastAlertedDuplicateIdRef.current = null;
      return;
    }

    const check = checkDuplicateTest(
      formTitle,
      formSubject,
      formClassLevel,
      formBoard,
      editingQuiz?.id,
      quizzes
    );

    if (check.isDuplicate && check.existingTest) {
      setDuplicateWarning(check);
      // Trigger immediate UI notification toast if not already toasted for this specific duplicate
      if (lastAlertedDuplicateIdRef.current !== check.existingTest.id) {
        lastAlertedDuplicateIdRef.current = check.existingTest.id;
        showToast({
          type: 'warning',
          title: 'Duplicate Quiz Title Detected',
          message: check.reason,
          duration: 4500,
        });
      }
    } else {
      setDuplicateWarning(null);
      lastAlertedDuplicateIdRef.current = null;
    }
  }, [formTitle, formSubject, formClassLevel, formBoard, isModalOpen, editingQuiz, quizzes, showToast]);

  // Confirmation dialog
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetTitle, setDeleteTargetTitle] = useState<string>('');

  const resetForm = () => {
    setEditingQuiz(null);
    setDuplicateWarning(null);
    lastAlertedDuplicateIdRef.current = null;
    setFormTitle('');
    setFormDescription('');
    setFormSubject('Physics');
    setFormClassLevel('Class 10 (Matric Pt 2)');
    setFormBoard('BISE Lahore');
    setFormTestType('Chapter Test');
    setFormCategory('Classroom');
    setFormDurationMinutes(15);
    setFormPassPercentage(50);
    setFormNegativeMarking(false);
    setFormNegativeValue(0.25);
    setFormStatus('Published');
    setSelectedQuestionIds([]);
    setQuestionSearch('');
    setFormErrors({});
  };

  const handleOpenEdit = (quiz: TestConfig) => {
    setEditingQuiz(quiz);
    setDuplicateWarning(null);
    lastAlertedDuplicateIdRef.current = null;
    setFormTitle(quiz.title);
    setFormDescription(quiz.description || '');
    setFormSubject(quiz.subject || 'Physics');
    setFormClassLevel(quiz.classLevel || 'Class 10 (Matric Pt 2)');
    setFormBoard(quiz.board || 'BISE Lahore');
    setFormTestType(quiz.testType || 'Chapter Test');
    setFormCategory(quiz.category || 'Classroom');
    setFormDurationMinutes(quiz.durationMinutes || 15);
    setFormPassPercentage(quiz.passPercentage || 50);
    setFormNegativeMarking(Boolean(quiz.negativeMarking));
    setFormNegativeValue(quiz.negativeMarkValue || 0.25);
    setFormStatus(quiz.status || 'Published');
    setSelectedQuestionIds((quiz.questions || []).map((q) => q.id));
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Toggle single question selection
  const handleToggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]
    );
  };

  // Auto-select questions matching subject
  const handleAutoSelectSubjectQuestions = (count: number = 10) => {
    const matching = allQuestions.filter(
      (q) => q.subject.toLowerCase() === formSubject.toLowerCase()
    );
    const pool = matching.length > 0 ? matching : allQuestions;
    const picked = pool.slice(0, count).map((q) => q.id);
    setSelectedQuestionIds(picked);
  };

  // Submit Handler with Validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!formTitle.trim()) errors.title = 'Quiz title is required';
    if (formDurationMinutes < 1) errors.duration = 'Duration must be at least 1 minute';
    if (formPassPercentage < 10 || formPassPercentage > 100) {
      errors.passPercentage = 'Passing percentage must be between 10% and 100%';
    }
    if (selectedQuestionIds.length === 0) {
      errors.questions = 'Please select at least 1 question for the quiz';
    }

    // Authoritative Duplicate Title Validation
    const duplicateCheck = checkDuplicateTest(
      formTitle,
      formSubject,
      formClassLevel,
      formBoard,
      editingQuiz?.id,
      quizzes
    );

    if (duplicateCheck.isDuplicate) {
      setDuplicateWarning(duplicateCheck);
      errors.title = `Duplicate Quiz: ${duplicateCheck.reason} Please provide a distinct quiz title.`;
      showToast({
        type: 'error',
        title: 'Submission Blocked: Duplicate Quiz Title',
        message: `Cannot create test. ${duplicateCheck.reason}`,
        duration: 5000,
      });
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const attachedQuestions = allQuestions.filter((q) =>
      selectedQuestionIds.includes(q.id)
    );

    const quizPayload: TestConfig = {
      id: editingQuiz ? editingQuiz.id : `test-${Date.now()}`,
      title: formTitle.trim(),
      description:
        formDescription.trim() ||
        `${formSubject} assessment for ${formClassLevel} (${formBoard})`,
      testType: formTestType,
      category: formCategory,
      subject: formSubject,
      classLevel: formClassLevel,
      board: formBoard,
      durationMinutes: formDurationMinutes,
      totalQuestions: attachedQuestions.length,
      totalMarks: attachedQuestions.length,
      negativeMarking: formNegativeMarking,
      negativeMarkValue: formNegativeMarking ? formNegativeValue : undefined,
      passPercentage: formPassPercentage,
      questions: attachedQuestions,
      status: formStatus,
      createdAt: editingQuiz?.createdAt || new Date().toISOString(),
    };

    if (editingQuiz) {
      onUpdateQuiz(quizPayload);
      showToast({
        type: 'success',
        title: 'Quiz Updated',
        message: `"${quizPayload.title}" has been updated successfully.`,
      });
    } else {
      onCreateQuiz(quizPayload);
      showToast({
        type: 'success',
        title: 'Quiz Created',
        message: `"${quizPayload.title}" has been created and added to assessments.`,
      });
    }

    setIsModalOpen(false);
    resetForm();
  };

  // Toggle publish status
  const handleToggleStatus = (quiz: TestConfig) => {
    const updated: TestConfig = {
      ...quiz,
      status: quiz.status === 'Draft' ? 'Published' : 'Draft',
    };
    onUpdateQuiz(updated);
  };

  // Filter quizzes
  const filteredQuizzes = quizzes.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.classLevel && t.classLevel.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSub = subjectFilter === 'All' || t.subject === subjectFilter;
    const matchesClass = classFilter === 'All' || t.classLevel === classFilter;
    const matchesType = typeFilter === 'All' || t.testType === typeFilter;
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Published' && (t.status === 'Published' || !t.status)) ||
      (statusFilter === 'Draft' && t.status === 'Draft');

    return matchesSearch && matchesSub && matchesClass && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Quiz & Assessment Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create, configure time limits, passing percentage, negative marking, and attach questions
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Quiz</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search quizzes by title, subject, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Subject
            </label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Subjects</option>
              {SUBJECTS_LIST.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Class
            </label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Classes</option>
              {SCHOOL_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="MDCAT Medical">MDCAT Medical</option>
              <option value="ECAT Engineering">ECAT Engineering</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Test Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Test Types</option>
              <option value="Chapter Test">Chapter Test</option>
              <option value="Subject Test">Subject Test</option>
              <option value="Full Book Test">Full Book Test</option>
              <option value="Board Test">Board Test</option>
              <option value="Entry Test">Entry Test</option>
              <option value="Mock Test">Mock Test</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Statuses</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quizzes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredQuizzes.map((quiz) => {
          const isPublished = quiz.status !== 'Draft';
          return (
            <div
              key={quiz.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-all ${
                isPublished
                  ? 'border-slate-200 dark:border-slate-800 hover:border-indigo-400/50'
                  : 'border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/50">
                    {quiz.testType || 'Quiz'}
                  </span>

                  <button
                    onClick={() => handleToggleStatus(quiz)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                      isPublished
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                    title="Click to toggle status"
                  >
                    {isPublished ? 'Published' : 'Draft'}
                  </button>
                </div>

                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                  {quiz.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {quiz.description}
                </p>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-100 dark:border-slate-800 text-center">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg">
                    <div className="text-[10px] text-slate-400 font-medium">Questions</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {quiz.questions?.length || quiz.totalQuestions || 0}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg">
                    <div className="text-[10px] text-slate-400 font-medium">Time Limit</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {quiz.durationMinutes}m
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg">
                    <div className="text-[10px] text-slate-400 font-medium">Pass %</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {quiz.passPercentage || 50}%
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {quiz.subject}
                  </span>
                  {quiz.classLevel && <span>• {quiz.classLevel}</span>}
                  {quiz.negativeMarking && (
                    <span className="text-red-500 font-bold">• Neg. Marking</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                {onPreviewQuiz && (
                  <button
                    onClick={() => onPreviewQuiz(quiz)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-blue-600" />
                    <span>Launch Test</span>
                  </button>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(quiz)}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                    title="Edit Quiz"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTargetId(quiz.id);
                      setDeleteTargetTitle(quiz.title);
                    }}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Delete Quiz"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredQuizzes.length === 0 && (
          <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No quizzes matched your criteria
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create a new quiz or adjust your filters above.
            </p>
          </div>
        )}
      </div>

      {/* Create / Edit Quiz Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl p-6 relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {editingQuiz ? (
                  <>
                    <Edit className="w-5 h-5 text-indigo-600" /> Edit Quiz Config
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-indigo-600" /> Create New Assessment Quiz
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
              {/* Title & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quiz Title *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Class 10 Physics Chapter 5 Complete Test"
                    className={`w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.title ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  {formErrors.title && (
                    <p className="text-red-500 text-[11px] mt-1">{formErrors.title}</p>
                  )}

                  {/* Immediate Duplicate Quiz UI Notification Banner */}
                  {duplicateWarning?.isDuplicate && duplicateWarning.existingTest && (
                    <div
                      id="quiz-duplicate-warning-banner"
                      className="mt-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 animate-in fade-in"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-xs text-amber-700 dark:text-amber-400">
                              Duplicate Quiz Title Detected
                            </p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                              {duplicateWarning.matchType === 'exact' ? 'Exact Match' : 'Duplicate Title'}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                            {duplicateWarning.reason}
                          </p>
                          <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-amber-500/20 text-[11px] space-y-1">
                            <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                              Existing ID: {duplicateWarning.existingTest.id}
                            </div>
                            <div className="text-slate-800 dark:text-slate-100 font-medium">
                              "{duplicateWarning.existingTest.title}"
                            </div>
                            <div className="flex flex-wrap gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                              <span>Subject: <strong className="text-slate-800 dark:text-slate-200">{duplicateWarning.existingTest.subject}</strong></span>
                              <span>•</span>
                              <span>Class: <strong className="text-slate-800 dark:text-slate-200">{duplicateWarning.existingTest.classLevel}</strong></span>
                              <span>•</span>
                              <span>Board: <strong className="text-slate-800 dark:text-slate-200">{duplicateWarning.existingTest.board}</strong></span>
                              <span>•</span>
                              <span>Questions: <strong className="text-slate-800 dark:text-slate-200">{duplicateWarning.existingTest.totalQuestions}</strong></span>
                            </div>
                          </div>
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            Submission blocked to prevent database duplicates. Please modify the quiz title.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Description / Instructions
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Complete chapter evaluation following BISE board pattern"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Assessment Rules (Duration, Passing %, Negative Marking, Test Type, Status) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Time Limit (Mins) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={formDurationMinutes}
                    onChange={(e) => setFormDurationMinutes(Number(e.target.value))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Passing Score % *
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={formPassPercentage}
                    onChange={(e) => setFormPassPercentage(Number(e.target.value))}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Test Type
                  </label>
                  <select
                    value={formTestType}
                    onChange={(e) => setFormTestType(e.target.value as TestType)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Chapter Test">Chapter Test</option>
                    <option value="Subject Test">Subject Test</option>
                    <option value="Full Book Test">Full Book Test</option>
                    <option value="Board Test">Board Test</option>
                    <option value="Entry Test">Entry Test</option>
                    <option value="Mock Test">Mock Test</option>
                    <option value="Practice Test">Practice Test</option>
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
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Negative Marking
                  </label>
                  <div className="flex items-center h-9">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formNegativeMarking}
                        onChange={(e) => setFormNegativeMarking(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Enable (-0.25)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Subject, Class, Board */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Class Level
                  </label>
                  <select
                    value={formClassLevel}
                    onChange={(e) => setFormClassLevel(e.target.value)}
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
                    Board Pattern
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
              </div>

              {/* Question Selection Interface */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FileQuestion className="w-4 h-4 text-indigo-600" />
                      Attach Questions from Question Bank ({selectedQuestionIds.length} Selected) *
                    </label>
                    {formErrors.questions && (
                      <p className="text-red-500 text-[11px] mt-0.5">{formErrors.questions}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAutoSelectSubjectQuestions(10)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] hover:bg-blue-100 cursor-pointer"
                    >
                      Auto-Pick 10 ({formSubject})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedQuestionIds([])}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[11px] hover:bg-slate-200 cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Filter questions within modal */}
                <input
                  type="text"
                  placeholder="Filter available questions below..."
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />

                {/* Questions Checklist Container */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                  {allQuestions
                    .filter(
                      (q) =>
                        !questionSearch ||
                        q.question.toLowerCase().includes(questionSearch.toLowerCase()) ||
                        q.subject.toLowerCase().includes(questionSearch.toLowerCase())
                    )
                    .map((q) => {
                      const isSelected = selectedQuestionIds.includes(q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => handleToggleQuestion(q.id)}
                          className={`p-2 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 font-semibold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className="text-xs truncate">{q.question}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {q.subject}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {q.difficulty}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Submit Row */}
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
                      ? 'Submission blocked: duplicate quiz title detected'
                      : undefined
                  }
                  className={`px-5 py-2 rounded-xl font-bold shadow-xs transition-colors flex items-center gap-2 ${
                    duplicateWarning?.isDuplicate
                      ? 'bg-slate-400 dark:bg-slate-700 text-slate-200 dark:text-slate-400 cursor-not-allowed opacity-80'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                  }`}
                >
                  {duplicateWarning?.isDuplicate ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Duplicate Blocked</span>
                    </>
                  ) : editingQuiz ? (
                    'Update Quiz Config'
                  ) : (
                    'Create & Publish Quiz'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AdminConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Delete Quiz?"
        message={`Are you sure you want to delete the quiz "${deleteTargetTitle}"? Students will no longer be able to attempt this test.`}
        confirmLabel="Delete Quiz"
        isDestructive={true}
        onConfirm={() => {
          if (deleteTargetId) {
            onDeleteQuiz(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
