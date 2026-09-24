import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Sparkles,
  Loader2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { MCQ, Difficulty } from '../../types';
import { BOARDS_LIST, SCHOOL_CLASSES } from '../../data/mockData';
import { SUBJECTS_LIST } from '../SubjectsView';
import { bulkCreateMCQsApi } from '../../lib/api';
import { useToast } from '../ui/Toast';

interface BulkMCQRow {
  id: string;
  question: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  correctAnswer: number;
  explanation: string;
  difficulty: Difficulty;
  status: 'Published' | 'Draft';
  error?: string;
}

interface BulkMCQEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  existingMCQs?: MCQ[];
}

export const BulkMCQEntryModal: React.FC<BulkMCQEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();

  // Shared Scope
  const [board, setBoard] = useState('BISE Lahore');
  const [classLevel, setClassLevel] = useState('Class 10 (Matric Pt 2)');
  const [subject, setSubject] = useState('Physics');
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');
  const [defaultDifficulty, setDefaultDifficulty] = useState<Difficulty>('Medium');
  const [defaultStatus, setDefaultStatus] = useState<'Published' | 'Draft'>('Published');
  const [language, setLanguage] = useState<'English' | 'Urdu'>('English');

  // Question Rows
  const createEmptyRow = (): BulkMCQRow => ({
    id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    question: '',
    optA: '',
    optB: '',
    optC: '',
    optD: '',
    correctAnswer: 0,
    explanation: '',
    difficulty: defaultDifficulty,
    status: defaultStatus,
  });

  const [rows, setRows] = useState<BulkMCQRow[]>([createEmptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionErrors, setSubmissionErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  const handleDuplicateRow = (index: number) => {
    const target = rows[index];
    const duplicated: BulkMCQRow = {
      ...target,
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const newRows = [...rows];
    newRows.splice(index + 1, 0, duplicated);
    setRows(newRows);
    showToast({
      type: 'info',
      title: 'Row Duplicated',
      message: `Question #${index + 1} duplicated successfully.`,
      duration: 2000,
    });
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) {
      showToast({
        type: 'warning',
        title: 'Cannot Remove',
        message: 'At least one question row is required.',
      });
      return;
    }
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
  };

  const handleRowChange = (index: number, field: keyof BulkMCQRow, value: any) => {
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      [field]: value,
      error: undefined, // Clear error on change
    };
    setRows(updated);
  };

  const validateRows = (): boolean => {
    let hasError = false;
    const updated = rows.map((r, i) => {
      let err: string | undefined;
      if (!r.question.trim()) {
        err = 'Question statement is required';
      } else if (r.question.trim().length < 5) {
        err = 'Question statement must be at least 5 characters';
      } else if (!r.optA.trim()) {
        err = 'Option A is required';
      } else if (!r.optB.trim()) {
        err = 'Option B is required';
      } else if (!r.optC.trim()) {
        err = 'Option C is required';
      } else if (!r.optD.trim()) {
        err = 'Option D is required';
      }

      if (err) {
        hasError = true;
      }
      return { ...r, error: err };
    });

    setRows(updated);
    return !hasError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionErrors([]);

    if (!validateRows()) {
      showToast({
        type: 'error',
        title: 'Validation Failed',
        message: 'Please resolve all highlighted row errors before submitting.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = rows.map((r) => ({
        question: r.question.trim(),
        options: [r.optA.trim(), r.optB.trim(), r.optC.trim(), r.optD.trim()],
        correctAnswer: r.correctAnswer,
        explanation: r.explanation.trim() || undefined,
        board,
        classLevel,
        subject,
        chapter: chapter.trim() || 'General Chapter',
        topic: topic.trim() || 'Core Concept',
        difficulty: r.difficulty || defaultDifficulty,
        status: r.status || defaultStatus,
        language,
        tags: [subject.toLowerCase(), classLevel.toLowerCase()],
      }));

      const res = await bulkCreateMCQsApi(payload);

      if (res.success && res.inserted > 0) {
        showToast({
          type: 'success',
          title: 'Bulk Entry Successful',
          message: `Successfully created ${res.inserted} MCQs in PostgreSQL database.`,
          duration: 4000,
        });
        onSuccess(res.inserted);
        onClose();
      } else if (res.errors && res.errors.length > 0) {
        const errorMessages = res.errors.map((err: any) => err.error);
        setSubmissionErrors(errorMessages);
        showToast({
          type: 'error',
          title: 'Partial Insertion',
          message: `Saved ${res.inserted} items, but ${res.errors.length} failed.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Bulk Creation Failed',
          message: res.error || 'Server error during batch creation.',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Bulk MCQ Rapid Entry
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Set common academic scope and enter multiple questions in a single workflow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* 1. Academic Scope Bar */}
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Shared Academic Scope
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {/* Board */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Board
                </label>
                <select
                  value={board}
                  onChange={(e) => setBoard(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  {BOARDS_LIST.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Class
                </label>
                <select
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
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

              {/* Subject */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  {SUBJECTS_LIST.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chapter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Chapter
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 1"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Topic */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Topic
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vectors"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Language */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'English' | 'Urdu')}
                  className="w-full text-xs py-1.5 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="English">English</option>
                  <option value="Urdu">Urdu</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submission Errors Callout */}
          {submissionErrors.length > 0 && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 space-y-1 text-xs text-red-800 dark:text-red-300">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-red-600" /> Errors during batch save:
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {submissionErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 2. Questions Rows */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Questions List</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs">
                  {rows.length} {rows.length === 1 ? 'Question' : 'Questions'}
                </span>
              </h3>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Row
              </button>
            </div>

            {rows.map((row, index) => (
              <div
                key={row.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 ${
                  row.error
                    ? 'border-red-300 dark:border-red-800 bg-red-50/20 dark:bg-red-950/10'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30'
                }`}
              >
                {/* Row Top Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Question #{index + 1}
                    </span>
                    {row.error && (
                      <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" /> {row.error}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Row Difficulty */}
                    <select
                      value={row.difficulty}
                      onChange={(e) => handleRowChange(index, 'difficulty', e.target.value)}
                      className="text-[11px] py-1 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={() => handleDuplicateRow(index)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      title="Duplicate this question"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <div>
                  <textarea
                    rows={2}
                    placeholder="Enter question statement here..."
                    value={row.question}
                    onChange={(e) => handleRowChange(index, 'question', e.target.value)}
                    className="w-full text-xs p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* 4 Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(['optA', 'optB', 'optC', 'optD'] as const).map((optKey, oIdx) => {
                    const isSelectedCorrect = row.correctAnswer === oIdx;
                    const optLabel = String.fromCharCode(65 + oIdx);
                    return (
                      <div
                        key={optKey}
                        className={`flex items-center gap-2 p-2 rounded-xl border ${
                          isSelectedCorrect
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleRowChange(index, 'correctAnswer', oIdx)}
                          className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                            isSelectedCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                          title={`Click to mark ${optLabel} as correct answer`}
                        >
                          {isSelectedCorrect ? <Check className="w-3.5 h-3.5" /> : optLabel}
                        </button>
                        <input
                          type="text"
                          placeholder={`Option ${optLabel}...`}
                          value={row[optKey]}
                          onChange={(e) => handleRowChange(index, optKey, e.target.value)}
                          className="w-full text-xs bg-transparent border-0 focus:outline-hidden text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                <div>
                  <input
                    type="text"
                    placeholder="Explanation for student feedback (recommended)..."
                    value={row.explanation}
                    onChange={(e) => handleRowChange(index, 'explanation', e.target.value)}
                    className="w-full text-xs py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            ))}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Another Question
          </button>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving {rows.length} MCQs...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save All ({rows.length} MCQs)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
