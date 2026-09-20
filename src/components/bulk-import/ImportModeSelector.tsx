import React from 'react';
import {
  Sparkles,
  Sliders,
  Layers,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Copy,
  Check,
  ShieldAlert,
  ArrowDownCircle,
  Cpu,
} from 'lucide-react';
import {
  ImportMode,
  DuplicateStrategy,
  ScopeOverridePolicy,
  EducationalScope,
} from '../../types/bulkImport';
import { generateDynamicTemplate } from '../../utils/hierarchicalImporter';
import { downloadFile } from '../../utils/importer';

interface ImportModeSelectorProps {
  mode: ImportMode;
  onChangeMode: (mode: ImportMode) => void;
  overridePolicy: ScopeOverridePolicy;
  onChangeOverridePolicy: (policy: ScopeOverridePolicy) => void;
  duplicateStrategy: DuplicateStrategy;
  onChangeDuplicateStrategy: (strat: DuplicateStrategy) => void;
  scope: EducationalScope;
  format: 'json' | 'csv' | 'tsv';
  onChangeFormat: (fmt: 'json' | 'csv' | 'tsv') => void;
  onPopulateTemplateIntoInput: () => void;
}

export const ImportModeSelector: React.FC<ImportModeSelectorProps> = ({
  mode,
  onChangeMode,
  overridePolicy,
  onChangeOverridePolicy,
  duplicateStrategy,
  onChangeDuplicateStrategy,
  scope,
  format,
  onChangeFormat,
  onPopulateTemplateIntoInput,
}) => {
  const handleDownloadCustomTemplate = () => {
    const content = generateDynamicTemplate(scope, format);
    const mime =
      format === 'json'
        ? 'application/json'
        : format === 'tsv'
        ? 'text/tab-separated-values'
        : 'text/csv';
    const filename = `taleemguru_${scope.board.toLowerCase().replace(/\s+/g, '_')}_${scope.classLevel.toLowerCase().replace(/\s+/g, '_')}_${scope.subject.toLowerCase()}_template.${format}`;
    downloadFile(filename, content, mime);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Top Title & Step 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 mb-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Step 2: Choose Import Strategy & Data Format</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            Import Mode & Hierarchy Mapping Rules
          </h3>
        </div>

        {/* Dynamic Template Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPopulateTemplateIntoInput}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors shadow-2xs"
            title="Load realistic example records into text editor matching active scope"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Load Scope Sample</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadCustomTemplate}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors shadow-2xs"
            title="Download blank template pre-filled with chosen board, class, subject & chapter"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Custom Template</span>
          </button>
        </div>
      </div>

      {/* 4 Mode Option Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Mode A: Single Scope */}
        <button
          type="button"
          onClick={() => onChangeMode('single-scope')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            mode === 'single-scope'
              ? 'border-emerald-600 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-500/20'
              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
              Mode A
            </span>
            <Sliders className="w-4 h-4 text-emerald-600" />
          </div>
          <h4 className="font-extrabold text-xs text-slate-900 mt-2.5">
            Single Scope Bulk Import
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            All imported records automatically inherit the selected Board, Class, Subject & Chapter.
          </p>
        </button>

        {/* Mode B: Multiple Scopes */}
        <button
          type="button"
          onClick={() => onChangeMode('multiple-scopes')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            mode === 'multiple-scopes'
              ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-2 ring-indigo-500/20'
              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-800">
              Mode B
            </span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <h4 className="font-extrabold text-xs text-slate-900 mt-2.5">
            Multiple Scopes / Mixed
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            File columns dictate board, class, and subject for each row. Selected scope serves as fallback.
          </p>
        </button>

        {/* Mode C: Smart Auto-Detect */}
        <button
          type="button"
          onClick={() => onChangeMode('smart-detect')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            mode === 'smart-detect'
              ? 'border-cyan-600 bg-cyan-50/60 shadow-xs ring-2 ring-cyan-500/20'
              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-cyan-100 text-cyan-800">
              Mode C
            </span>
            <Cpu className="w-4 h-4 text-cyan-600" />
          </div>
          <h4 className="font-extrabold text-xs text-slate-900 mt-2.5">
            Smart Auto-Detect
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Automatically scans question statements and file headers to detect board, language, and subject.
          </p>
        </button>

        {/* Mode D: Template-Based */}
        <button
          type="button"
          onClick={() => onChangeMode('template-based')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            mode === 'template-based'
              ? 'border-purple-600 bg-purple-50/60 shadow-xs ring-2 ring-purple-500/20'
              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800">
              Mode D
            </span>
            <FileSpreadsheet className="w-4 h-4 text-purple-600" />
          </div>
          <h4 className="font-extrabold text-xs text-slate-900 mt-2.5">
            Template-Based Import
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Download our verified CSV/JSON structure with pre-formatted Pakistani curriculum columns.
          </p>
        </button>
      </div>

      {/* Mode Sub-Settings Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Scope Overwrite Policy (Mode A & B) */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Field Precedence & Overrides:
          </label>
          <div className="flex flex-col gap-1 text-[11px]">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
              <input
                type="radio"
                name="overridePolicy"
                checked={overridePolicy === 'override_all'}
                onChange={() => onChangeOverridePolicy('override_all')}
                className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Force Scope on all rows (Recommended)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
              <input
                type="radio"
                name="overridePolicy"
                checked={overridePolicy === 'fallback_only'}
                onChange={() => onChangeOverridePolicy('fallback_only')}
                className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Keep row values if present, use Scope as fallback</span>
            </label>
          </div>
        </div>

        {/* Duplicate Handling Policy */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>Duplicate Detection Logic:</span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-sm">
              Zero Silo Duplicates
            </span>
          </label>
          <select
            value={duplicateStrategy}
            onChange={(e) => onChangeDuplicateStrategy(e.target.value as DuplicateStrategy)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="skip">Skip duplicates (Ignore existing records)</option>
            <option value="update">Update existing (Overwrite matches)</option>
            <option value="create_new">Keep both (Generate new IDs)</option>
          </select>
          <p className="text-[10px] text-slate-400 leading-tight">
            Compares normalized question text against current database and batch.
          </p>
        </div>

        {/* File Format Selector */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Source File / Text Format:
          </label>
          <div className="inline-flex w-full p-0.5 bg-slate-200/70 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => onChangeFormat('json')}
              className={`flex-1 py-1 rounded-lg text-center transition-all ${
                format === 'json'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              JSON (.json)
            </button>
            <button
              type="button"
              disabled={scope.dataType === 'bundle'}
              onClick={() => onChangeFormat('csv')}
              className={`flex-1 py-1 rounded-lg text-center transition-all ${
                format === 'csv'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : scope.dataType === 'bundle'
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CSV (.csv)
            </button>
            <button
              type="button"
              disabled={scope.dataType === 'bundle'}
              onClick={() => onChangeFormat('tsv')}
              className={`flex-1 py-1 rounded-lg text-center transition-all ${
                format === 'tsv'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : scope.dataType === 'bundle'
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              TSV / Tab (.tsv)
            </button>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            {scope.dataType === 'bundle'
              ? 'Bundles require structured JSON.'
              : 'Supports standard comma or tab-delimited Excel exports.'}
          </p>
        </div>
      </div>
    </div>
  );
};
