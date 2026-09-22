import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Search,
  Download,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  FileText,
  FileCheck,
  BookOpen,
} from 'lucide-react';
import {
  ParsedItemWrapper,
  ValidationStatus,
  EducationalDataType,
} from '../../types/bulkImport';
import { exportFailedRowsLog } from '../../utils/hierarchicalImporter';
import { downloadFile } from '../../utils/importer';

interface BulkPreviewTableProps {
  items: ParsedItemWrapper[];
  totalParsed: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  duplicateCount: number;
  dataType: EducationalDataType;
}

export const BulkPreviewTable: React.FC<BulkPreviewTableProps> = ({
  items,
  totalParsed,
  validCount,
  warningCount,
  errorCount,
  duplicateCount,
  dataType,
}) => {
  const [filterStatus, setFilterStatus] = useState<ValidationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterStatus !== 'all' && item.status !== filterStatus) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const rawItem = item.item;
      const questionOrTitle = String(
        rawItem.question || rawItem.title || rawItem.description || ''
      ).toLowerCase();
      const subject = String(item.hierarchy.subject || '').toLowerCase();
      const chapter = String(item.hierarchy.chapter || '').toLowerCase();
      const board = String(item.hierarchy.board || '').toLowerCase();

      return (
        questionOrTitle.includes(q) ||
        subject.includes(q) ||
        chapter.includes(q) ||
        board.includes(q)
      );
    });
  }, [items, filterStatus, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Export error log
  const handleExportErrors = () => {
    const failedItems = items.filter(
      (it) => it.status === 'error' || it.status === 'warning' || it.status === 'duplicate'
    );
    if (failedItems.length === 0) {
      alert('No validation errors or duplicates found!');
      return;
    }
    const logCsv = exportFailedRowsLog(failedItems, 'csv');
    downloadFile(`taleemguru_import_error_log_${Date.now()}.csv`, logCsv, 'text/csv');
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400 space-y-3">
        <Eye className="w-8 h-8 mx-auto text-slate-300" />
        <h4 className="font-extrabold text-sm text-slate-700">No Data Loaded for Validation</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Upload a file, click "Load Scope Sample", or paste raw data to see real-time parsing, duplicate detection, and schema validation.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
      {/* Top Header & Validation Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>Bulk Verification & Validation Preview</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {totalParsed} Records Parsed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Every record is inspected for complete options, correct answer keys, and duplicates.
          </p>
        </div>

        {/* Export Error Log button */}
        {(errorCount > 0 || warningCount > 0 || duplicateCount > 0) && (
          <button
            type="button"
            onClick={handleExportErrors}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors shadow-2xs self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span>Export Error Log ({errorCount + duplicateCount})</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setFilterStatus('all');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({totalParsed})
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterStatus('valid');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              filterStatus === 'valid'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Valid ({validCount})</span>
          </button>

          {warningCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus('warning');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                filterStatus === 'warning'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Warnings ({warningCount})</span>
            </button>
          )}

          {duplicateCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus('duplicate');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                filterStatus === 'duplicate'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Duplicates ({duplicateCount})</span>
            </button>
          )}

          {errorCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus('error');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                filterStatus === 'error'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Errors ({errorCount})</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search parsed records..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {paginatedItems.map((wrapped, idx) => {
          const item = wrapped.item;
          const status = wrapped.status;
          const isMCQ = dataType === 'mcqs' || item._type === 'MCQ' || item.options;

          return (
            <div
              key={wrapped.rawIndex}
              className={`p-4 rounded-2xl border text-xs transition-all space-y-2.5 ${
                status === 'valid'
                  ? 'border-emerald-200 bg-emerald-50/20 hover:bg-emerald-50/40'
                  : status === 'warning'
                  ? 'border-amber-200 bg-amber-50/30 hover:bg-amber-50/50'
                  : status === 'duplicate'
                  ? 'border-orange-200 bg-orange-50/30 hover:bg-orange-50/50'
                  : 'border-rose-300 bg-rose-50/40'
              }`}
            >
              {/* Row header: status badge, row number, scope chips */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-400 text-[11px]">
                    #{wrapped.rawIndex + 1}
                  </span>

                  {status === 'valid' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Ready to Import</span>
                    </span>
                  )}

                  {status === 'warning' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-amber-100 text-amber-900 border border-amber-300">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>Auto-Corrected / Warning</span>
                    </span>
                  )}

                  {status === 'duplicate' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-orange-100 text-orange-900 border border-orange-300">
                      <AlertCircle className="w-3 h-3 text-orange-600" />
                      <span>Duplicate Record</span>
                    </span>
                  )}

                  {status === 'error' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-rose-100 text-rose-900 border border-rose-300">
                      <XCircle className="w-3 h-3 text-rose-600" />
                      <span>Invalid Format</span>
                    </span>
                  )}

                  <span className="text-slate-400 text-[10px] font-mono">
                    ID: {item.id}
                  </span>
                </div>

                {/* Scope tags */}
                <div className="flex flex-wrap items-center gap-1 text-[10px] font-semibold text-slate-600">
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                    {wrapped.hierarchy.board}
                  </span>
                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                    {wrapped.hierarchy.classLevel}
                  </span>
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                    {wrapped.hierarchy.subject}
                  </span>
                  {wrapped.hierarchy.chapter && (
                    <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-200 truncate max-w-[140px]">
                      {wrapped.hierarchy.chapter}
                    </span>
                  )}
                </div>
              </div>

              {/* Validation errors/warnings callouts */}
              {wrapped.errors.length > 0 && (
                <div className="p-2.5 bg-rose-100/70 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                  {wrapped.errors.map((err, errI) => (
                    <div key={errI} className="flex items-center gap-1.5 text-[11px] font-bold">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {wrapped.duplicateReason && (
                <div className="p-2.5 bg-orange-100/70 border border-orange-200 rounded-xl text-orange-900 flex items-center gap-1.5 text-[11px] font-bold">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span>{wrapped.duplicateReason}</span>
                </div>
              )}

              {wrapped.warnings.length > 0 && (
                <div className="p-2 bg-amber-100/60 border border-amber-200 rounded-xl text-amber-900 space-y-0.5">
                  {wrapped.warnings.map((warn, wI) => (
                    <div key={wI} className="text-[11px]">
                      • {warn}
                    </div>
                  ))}
                </div>
              )}

              {/* Item Content Preview */}
              {isMCQ ? (
                <div className="space-y-2">
                  <p className="font-extrabold text-slate-900 leading-snug">
                    {item.question || 'Missing question statement'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 pt-1">
                    {item.options?.map((opt: string, optI: number) => {
                      const isCorrect = optI === item.correctAnswer;
                      return (
                        <div
                          key={optI}
                          className={`p-2 rounded-xl text-[11px] truncate flex items-center justify-between gap-1.5 ${
                            isCorrect
                              ? 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-400'
                              : 'bg-white text-slate-700 border border-slate-200'
                          }`}
                        >
                          <span className="truncate">
                            {String.fromCharCode(65 + optI)}. {opt}
                          </span>
                          {isCorrect && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {item.explanation && (
                    <p className="text-[11px] text-slate-500 italic">
                      <span className="font-bold">Explanation:</span> {item.explanation}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-xs">
                    {item.title || 'Untitled item'}
                  </h4>
                  {item.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  {item.contentSnippet && (
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {item.contentSnippet}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 pt-1">
                    {item.year && <span>Year: {item.year}</span>}
                    {item.paperGroup && <span>Group: {item.paperGroup}</span>}
                    {item.type && <span>Type: {item.type}</span>}
                    {item.durationMinutes && <span>Duration: {item.durationMinutes}m</span>}
                    {item.readTime && <span>Read Time: {item.readTime}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length} records
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
