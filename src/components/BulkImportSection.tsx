import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileCode,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Copy,
  Check,
  Trash2,
  Eye,
  Layers,
  Sparkles,
  HelpCircle,
  Database,
  ArrowRight,
  BookOpen,
  GraduationCap,
  FileCheck,
  Sliders,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MCQ, PastPaper, StudyNote, TestConfig } from '../types';
import {
  EducationalScope,
  ImportMode,
  DuplicateStrategy,
  ScopeOverridePolicy,
  ParsedItemWrapper,
  EducationalDataType,
} from '../types/bulkImport';
import { EducationalScopeSelector } from './bulk-import/EducationalScopeSelector';
import { ImportModeSelector } from './bulk-import/ImportModeSelector';
import { BulkPreviewTable } from './bulk-import/BulkPreviewTable';
import {
  parseHierarchicalMCQs,
  parseHierarchicalPastPapers,
  parseHierarchicalTests,
  parseHierarchicalStudyNotes,
  parseHierarchicalBundle,
  generateDynamicTemplate,
  autoDetectScopeFromContent,
} from '../utils/hierarchicalImporter';
import { downloadFile, getSampleImportData } from '../utils/importer';

interface BulkImportSectionProps {
  allMCQs: MCQ[];
  allTests: TestConfig[];
  allPastPapers: PastPaper[];
  allStudyNotes: StudyNote[];
  onBulkImportMCQs: (mcqs: MCQ[], replace?: boolean) => void;
  onBulkImportTests: (tests: TestConfig[], replace?: boolean) => void;
  onBulkImportPastPapers: (papers: PastPaper[], replace?: boolean) => void;
  onBulkImportStudyNotes: (notes: StudyNote[], replace?: boolean) => void;
  onBulkImportBundle: (
    bundle: { mcqs?: MCQ[]; tests?: TestConfig[]; pastPapers?: PastPaper[]; studyNotes?: StudyNote[] },
    replace?: boolean
  ) => void;
  onNavigateTab?: (tab: string) => void;
}

export const BulkImportSection: React.FC<BulkImportSectionProps> = ({
  allMCQs,
  allTests,
  allPastPapers,
  allStudyNotes,
  onBulkImportMCQs,
  onBulkImportTests,
  onBulkImportPastPapers,
  onBulkImportStudyNotes,
  onBulkImportBundle,
  onNavigateTab,
}) => {
  // 1. Educational Scope State
  const [scope, setScope] = useState<EducationalScope>({
    board: 'BISE Lahore',
    province: 'Punjab',
    classLevel: 'Class 10 (Matric Pt 2)',
    subject: 'Physics',
    chapter: 'Current Electricity',
    topic: 'auto-detect',
    medium: 'English',
    academicYear: 2024,
    examType: 'Annual Exam',
    dataType: 'mcqs',
  });

  // 2. Import Strategy & Options
  const [mode, setMode] = useState<ImportMode>('single-scope');
  const [overridePolicy, setOverridePolicy] = useState<ScopeOverridePolicy>('override_all');
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip');
  const [format, setFormat] = useState<'json' | 'csv' | 'tsv'>('json');

  // 3. Raw Data & File State
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [autoDetectNotice, setAutoDetectNotice] = useState<string | null>(null);

  // 4. Progress & Feedback
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSuccessAlert, setImportSuccessAlert] = useState<{
    count: number;
    categoryLabel: string;
    details?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Switch format if bundle is chosen (bundle only supports JSON)
  useEffect(() => {
    if (scope.dataType === 'bundle' && format !== 'json') {
      setFormat('json');
    }
  }, [scope.dataType, format]);

  // Handle Drag & Drop / File selection
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    const isCsv = file.name.endsWith('.csv');
    const isTsv = file.name.endsWith('.tsv') || file.name.endsWith('.txt');
    const isJson = file.name.endsWith('.json');

    if (isCsv && scope.dataType !== 'bundle') {
      setFormat('csv');
    } else if (isTsv && scope.dataType !== 'bundle') {
      setFormat('tsv');
    } else if (isJson) {
      setFormat('json');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        // If mode is smart-detect, automatically detect scope from content
        if (mode === 'smart-detect') {
          runAutoDetection(content);
        }
      }
    };
    reader.readAsText(file);
  };

  // Run Smart Auto-Detection
  const runAutoDetection = (textToScan: string) => {
    if (!textToScan.trim()) return;
    const detected = autoDetectScopeFromContent(textToScan);
    const updates: string[] = [];

    const updatedScope = { ...scope };
    if (detected.board && detected.board !== scope.board) {
      updatedScope.board = detected.board;
      updates.push(`Board: ${detected.board}`);
    }
    if (detected.province && detected.province !== scope.province) {
      updatedScope.province = detected.province;
    }
    if (detected.classLevel && detected.classLevel !== scope.classLevel) {
      updatedScope.classLevel = detected.classLevel;
      updates.push(`Class: ${detected.classLevel}`);
    }
    if (detected.subject && detected.subject !== scope.subject) {
      updatedScope.subject = detected.subject;
      updates.push(`Subject: ${detected.subject}`);
    }
    if (detected.academicYear && detected.academicYear !== scope.academicYear) {
      updatedScope.academicYear = detected.academicYear;
      updates.push(`Year: ${detected.academicYear}`);
    }
    if (detected.medium && detected.medium !== scope.medium) {
      updatedScope.medium = detected.medium;
      updates.push(`Medium: ${detected.medium}`);
    }
    if (detected.dataType && detected.dataType !== scope.dataType) {
      updatedScope.dataType = detected.dataType;
      updates.push(`Data Type: ${detected.dataType.toUpperCase()}`);
    }

    setScope(updatedScope);

    if (updates.length > 0) {
      setAutoDetectNotice(`Smart Inferred: ${updates.join(' • ')}`);
      setTimeout(() => setAutoDetectNotice(null), 6000);
    }
  };

  // Populate sample data matching scope
  const handlePopulateScopeSample = () => {
    const sample = generateDynamicTemplate(scope, format);
    setRawText(sample);
    setFileName(`sample_${scope.subject.toLowerCase()}_${scope.dataType}.${format}`);
  };

  // Export current active collection backup (preserved from existing implementation)
  const handleExportBackup = () => {
    if (scope.dataType === 'mcqs') {
      downloadFile(`taleemguru_all_mcqs_${Date.now()}.json`, JSON.stringify(allMCQs, null, 2));
    } else if (scope.dataType === 'past-papers') {
      downloadFile(`taleemguru_past_papers_${Date.now()}.json`, JSON.stringify(allPastPapers, null, 2));
    } else if (scope.dataType === 'tests') {
      downloadFile(`taleemguru_all_tests_${Date.now()}.json`, JSON.stringify(allTests, null, 2));
    } else if (scope.dataType === 'study-notes') {
      downloadFile(`taleemguru_study_notes_${Date.now()}.json`, JSON.stringify(allStudyNotes, null, 2));
    } else {
      const fullBackup = {
        exportedAt: new Date().toISOString(),
        mcqs: allMCQs,
        tests: allTests,
        pastPapers: allPastPapers,
        studyNotes: allStudyNotes,
      };
      downloadFile(`taleemguru_complete_academic_backup_${Date.now()}.json`, JSON.stringify(fullBackup, null, 2));
    }
  };

  // Live Hierarchical Parsing & Validation Engine
  const parseResult = useMemo(() => {
    if (!rawText.trim()) {
      return {
        items: [] as ParsedItemWrapper[],
        totalParsed: 0,
        validCount: 0,
        warningCount: 0,
        errorCount: 0,
        duplicateCount: 0,
        globalErrors: [],
        bundleResult: null,
      };
    }

    const fmt = format === 'tsv' ? 'csv' : format; // internal CSV parser handles TSV tab delimiter automatically

    if (scope.dataType === 'mcqs') {
      const res = parseHierarchicalMCQs(
        rawText,
        fmt,
        scope,
        mode,
        overridePolicy,
        duplicateStrategy,
        allMCQs
      );
      return {
        items: res.items,
        totalParsed: res.totalParsed,
        validCount: res.validCount,
        warningCount: res.warningCount,
        errorCount: res.errorCount,
        duplicateCount: res.duplicateCount,
        globalErrors: res.globalErrors,
        bundleResult: null,
      };
    } else if (scope.dataType === 'past-papers') {
      const res = parseHierarchicalPastPapers(
        rawText,
        fmt,
        scope,
        mode,
        overridePolicy,
        duplicateStrategy,
        allPastPapers
      );
      return {
        items: res.items,
        totalParsed: res.totalParsed,
        validCount: res.validCount,
        warningCount: res.warningCount,
        errorCount: res.errorCount,
        duplicateCount: res.duplicateCount,
        globalErrors: res.globalErrors,
        bundleResult: null,
      };
    } else if (scope.dataType === 'tests') {
      const res = parseHierarchicalTests(
        rawText,
        fmt,
        scope,
        mode,
        overridePolicy,
        duplicateStrategy,
        allTests,
        allMCQs
      );
      return {
        items: res.items,
        totalParsed: res.totalParsed,
        validCount: res.validCount,
        warningCount: res.warningCount,
        errorCount: res.errorCount,
        duplicateCount: res.duplicateCount,
        globalErrors: res.globalErrors,
        bundleResult: null,
      };
    } else if (scope.dataType === 'study-notes') {
      const res = parseHierarchicalStudyNotes(
        rawText,
        fmt,
        scope,
        mode,
        overridePolicy,
        duplicateStrategy,
        allStudyNotes
      );
      return {
        items: res.items,
        totalParsed: res.totalParsed,
        validCount: res.validCount,
        warningCount: res.warningCount,
        errorCount: res.errorCount,
        duplicateCount: res.duplicateCount,
        globalErrors: res.globalErrors,
        bundleResult: null,
      };
    } else {
      // Academic Bundle
      const res = parseHierarchicalBundle(
        rawText,
        scope,
        mode,
        overridePolicy,
        duplicateStrategy,
        {
          mcqs: allMCQs,
          tests: allTests,
          pastPapers: allPastPapers,
          studyNotes: allStudyNotes,
        }
      );
      return {
        items: res.items,
        totalParsed: res.totalParsed,
        validCount: res.validCount,
        warningCount: res.warningCount,
        errorCount: res.errorCount,
        duplicateCount: res.duplicateCount,
        globalErrors: res.globalErrors,
        bundleResult: res.bundleResult,
      };
    }
  }, [
    rawText,
    scope,
    mode,
    overridePolicy,
    duplicateStrategy,
    format,
    allMCQs,
    allTests,
    allPastPapers,
    allStudyNotes,
  ]);

  // Execute Import
  const handleExecuteImport = (onlyValid: boolean = true) => {
    const allowedStatuses = onlyValid
      ? ['valid', 'warning']
      : ['valid', 'warning', 'error', 'duplicate'];

    // Include duplicates if duplicateStrategy is 'update' or 'create_new'
    if (duplicateStrategy !== 'skip') {
      allowedStatuses.push('duplicate');
    }

    const itemsToImport = parseResult.items
      .filter((w) => allowedStatuses.includes(w.status))
      .map((w) => w.item);

    if (itemsToImport.length === 0) {
      alert('No eligible records to import.');
      return;
    }

    setIsImporting(true);
    setImportProgress(15);

    setTimeout(() => {
      setImportProgress(55);

      setTimeout(() => {
        setImportProgress(100);

        if (scope.dataType === 'mcqs') {
          onBulkImportMCQs(itemsToImport as MCQ[], replaceExisting);
          setImportSuccessAlert({
            count: itemsToImport.length,
            categoryLabel: 'MCQ Questions',
            details: `Mapped to ${scope.board} • ${scope.classLevel} • ${scope.subject} (${scope.chapter || 'All Chapters'})`,
          });
        } else if (scope.dataType === 'past-papers') {
          onBulkImportPastPapers(itemsToImport as PastPaper[], replaceExisting);
          setImportSuccessAlert({
            count: itemsToImport.length,
            categoryLabel: 'Exams & Past Papers',
            details: `Mapped to ${scope.board} • ${scope.classLevel} • ${scope.academicYear}`,
          });
        } else if (scope.dataType === 'tests') {
          onBulkImportTests(itemsToImport as TestConfig[], replaceExisting);
          setImportSuccessAlert({
            count: itemsToImport.length,
            categoryLabel: 'Online Tests / Mocks',
            details: `Mapped to ${scope.subject} (${scope.classLevel})`,
          });
        } else if (scope.dataType === 'study-notes') {
          onBulkImportStudyNotes(itemsToImport as StudyNote[], replaceExisting);
          setImportSuccessAlert({
            count: itemsToImport.length,
            categoryLabel: 'Study Notes & Guides',
            details: `Mapped to ${scope.subject} • ${scope.chapter}`,
          });
        } else if (scope.dataType === 'bundle' && parseResult.bundleResult) {
          const bundleObj = {
            mcqs: parseResult.bundleResult.mcqs
              .filter((w) => allowedStatuses.includes(w.status))
              .map((w) => w.item),
            tests: parseResult.bundleResult.tests
              .filter((w) => allowedStatuses.includes(w.status))
              .map((w) => w.item),
            pastPapers: parseResult.bundleResult.pastPapers
              .filter((w) => allowedStatuses.includes(w.status))
              .map((w) => w.item),
            studyNotes: parseResult.bundleResult.studyNotes
              .filter((w) => allowedStatuses.includes(w.status))
              .map((w) => w.item),
          };
          onBulkImportBundle(bundleObj, replaceExisting);
          setImportSuccessAlert({
            count: itemsToImport.length,
            categoryLabel: 'Complete Bundle Records',
            details: `${bundleObj.mcqs.length} MCQs, ${bundleObj.tests.length} Tests, ${bundleObj.pastPapers.length} Papers, ${bundleObj.studyNotes.length} Notes`,
          });
        }

        // Trigger celebratory confetti
        try {
          confetti({
            particleCount: 85,
            spread: 75,
            origin: { y: 0.6 },
          });
        } catch (e) {}

        setIsImporting(false);
        setImportProgress(0);
        setRawText('');
        setFileName(null);
      }, 350);
    }, 250);
  };

  const getCategoryLabel = (c: EducationalDataType) => {
    switch (c) {
      case 'mcqs':
        return 'MCQs Question Bank';
      case 'past-papers':
        return 'Exams & Past Papers';
      case 'tests':
        return 'Online Tests & Mocks';
      case 'study-notes':
        return 'Study Notes & Guides';
      case 'bundle':
        return 'All-in-One Academic Bundle';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
              <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hierarchical Educational Bulk Data Ingestion Hub</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Bulk Import Hub
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Bulk import hundreds or thousands of MCQs, past examination papers, mock tests, and chapter study notes structured by Pakistani educational boards, classes, and subjects.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shadow-2xs"
              title="Download backup of current data as JSON"
            >
              <Database className="w-3.5 h-3.5 text-slate-600" />
              <span>Export Active Backup</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Alert Banner */}
      {importSuccessAlert && (
        <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-emerald-950 animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm sm:text-base text-emerald-950">
                Successfully Imported {importSuccessAlert.count} {importSuccessAlert.categoryLabel}!
              </h4>
              {importSuccessAlert.details && (
                <p className="text-xs text-emerald-800 font-medium mt-0.5">
                  {importSuccessAlert.details}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => {
                  if (scope.dataType === 'mcqs') onNavigateTab('mcqs');
                  else if (scope.dataType === 'past-papers') onNavigateTab('past-papers');
                  else if (scope.dataType === 'tests') onNavigateTab('tests');
                  else if (scope.dataType === 'study-notes') onNavigateTab('study-material');
                }}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
              >
                <span>View Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setImportSuccessAlert(null)}
              className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: Educational Scope */}
      <EducationalScopeSelector
        scope={scope}
        onChangeScope={setScope}
        counts={{
          mcqs: allMCQs.length,
          tests: allTests.length,
          pastPapers: allPastPapers.length,
          studyNotes: allStudyNotes.length,
        }}
      />

      {/* STEP 2: Import Strategy & Data Format */}
      <ImportModeSelector
        mode={mode}
        onChangeMode={setMode}
        overridePolicy={overridePolicy}
        onChangeOverridePolicy={setOverridePolicy}
        duplicateStrategy={duplicateStrategy}
        onChangeDuplicateStrategy={setDuplicateStrategy}
        scope={scope}
        format={format}
        onChangeFormat={setFormat}
        onPopulateTemplateIntoInput={handlePopulateScopeSample}
      />

      {/* STEP 3: Input Area (Upload or Paste) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 mb-1">
              <FileCode className="w-3.5 h-3.5 text-purple-600" />
              <span>Step 3: Provide Data File or Paste Raw Content</span>
            </div>
            <h3 className="text-base font-black text-slate-900">
              Data Ingestion ({format.toUpperCase()})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {rawText && (
              <button
                type="button"
                onClick={() => {
                  setRawText('');
                  setFileName(null);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Input</span>
              </button>
            )}

            {rawText && (
              <button
                type="button"
                onClick={() => runAutoDetection(rawText)}
                className="text-xs text-cyan-700 hover:text-cyan-800 font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-colors"
                title="Scan content and automatically align educational scope dropdowns"
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-600" />
                <span>Run Smart Auto-Detect</span>
              </button>
            )}
          </div>
        </div>

        {/* Auto-detect notification pill */}
        {autoDetectNotice && (
          <div className="p-3 bg-cyan-50 border border-cyan-300 rounded-xl text-xs font-bold text-cyan-900 flex items-center gap-2 animate-fadeIn">
            <Cpu className="w-4 h-4 text-cyan-600 shrink-0" />
            <span>{autoDetectNotice}</span>
          </div>
        )}

        {/* Drag & Drop File Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json,.csv,.tsv,.txt"
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center mx-auto text-slate-500 group-hover:text-emerald-700 transition-colors">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">
              {fileName ? (
                <span className="text-emerald-700 font-extrabold">File loaded: {fileName}</span>
              ) : (
                <>
                  <span className="text-emerald-700 underline">Click to upload</span> or drag and drop your curriculum file
                </>
              )}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Supports .json (full hierarchy), .csv (comma-separated), and .tsv (Excel tab-separated) files
            </p>
          </div>
        </div>

        {/* Direct Paste Textarea */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Or copy & paste raw {format.toUpperCase()} rows directly below:</span>
            <span className="font-mono text-[11px]">
              {rawText ? `${rawText.split('\n').length} lines` : '0 lines'}
            </span>
          </div>
          <textarea
            rows={10}
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setFileName(null);
            }}
            placeholder={
              format === 'json'
                ? '[\n  {\n    "question": "What is the unit of force?",\n    "options": ["Newton", "Joule", "Pascal", "Watt"],\n    "correctAnswer": 0,\n    "subject": "Physics"\n  }\n]'
                : 'Question,Option A,Option B,Option C,Option D,Correct Answer,Subject,Class,Board,Difficulty\n"What is the unit of force?","Newton","Joule","Pascal","Watt","A","Physics","Class 10 (Matric Pt 2)","BISE Lahore","Easy"'
            }
            className="w-full p-3.5 bg-slate-50 font-mono text-xs text-slate-900 rounded-xl border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-y"
          />
        </div>

        {/* Global Errors Banner */}
        {parseResult.globalErrors.length > 0 && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-rose-800">
              <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Parsing Error</span>
            </div>
            {parseResult.globalErrors.map((err, i) => (
              <p key={i} className="text-[11px] text-rose-700 pl-5">
                • {err}
              </p>
            ))}
          </div>
        )}

        {/* Import Progress Bar */}
        {isImporting && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Validating & Committing Records to TaleemGuru Database...</span>
              </span>
              <span>{importProgress}%</span>
            </div>
            <div className="w-full h-2 bg-emerald-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300 ease-out"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Execution Actions Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="replaceCheck"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
            />
            <label htmlFor="replaceCheck" className="text-xs text-slate-700 font-bold cursor-pointer select-none">
              Replace entire collection <span className="text-slate-400 font-normal">(Default is append new items)</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            {/* Import Valid Records Only */}
            <button
              type="button"
              onClick={() => handleExecuteImport(true)}
              disabled={
                isImporting ||
                parseResult.validCount +
                  parseResult.warningCount +
                  (duplicateStrategy !== 'skip' ? parseResult.duplicateCount : 0) ===
                  0
              }
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                parseResult.validCount + parseResult.warningCount > 0
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {parseResult.validCount + parseResult.warningCount > 0
                  ? `Import ${
                      parseResult.validCount +
                      parseResult.warningCount +
                      (duplicateStrategy !== 'skip' ? parseResult.duplicateCount : 0)
                    } Valid Records Now`
                  : 'Awaiting Valid Data'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* STEP 4: Live Bulk Preview & Validation UI */}
      <BulkPreviewTable
        items={parseResult.items}
        totalParsed={parseResult.totalParsed}
        validCount={parseResult.validCount}
        warningCount={parseResult.warningCount}
        errorCount={parseResult.errorCount}
        duplicateCount={parseResult.duplicateCount}
        dataType={scope.dataType}
      />
    </div>
  );
};
