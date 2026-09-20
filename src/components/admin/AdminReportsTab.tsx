import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  MessageSquare,
  Mail,
  FileQuestion,
  BookOpen,
  Filter,
  Save,
  X,
} from 'lucide-react';
import { fetchAdminReportsApi, updateAdminReportStatusApi } from '../../lib/api';

export interface ContentReportItem {
  id: number;
  reportId: string;
  category: string;
  questionId?: string;
  subject?: string;
  description: string;
  userEmail?: string;
  userUid?: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
  adminNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const AdminReportsTab: React.FC = () => {
  const [reports, setReports] = useState<ContentReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReport, setActiveReport] = useState<ContentReportItem | null>(null);
  const [newStatus, setNewStatus] = useState<'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED'>('OPEN');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminReportsApi();
      if (Array.isArray(data)) {
        setReports(data);
      }
    } catch (err) {
      console.error('Failed to load content reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const openStatusCount = reports.filter((r) => r.status === 'OPEN').length;
  const inReviewCount = reports.filter((r) => r.status === 'IN_REVIEW').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;
  const rejectedCount = reports.filter((r) => r.status === 'REJECTED').length;

  const filteredReports = reports.filter((r) => {
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      r.description.toLowerCase().includes(q) ||
      (r.userEmail && r.userEmail.toLowerCase().includes(q)) ||
      (r.questionId && r.questionId.toLowerCase().includes(q)) ||
      (r.subject && r.subject.toLowerCase().includes(q)) ||
      r.category.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const handleOpenModal = (report: ContentReportItem) => {
    setActiveReport(report);
    setNewStatus(report.status);
    setAdminNotes(report.adminNotes || '');
    setActionSuccess(null);
  };

  const handleUpdateStatus = async () => {
    if (!activeReport) return;
    setIsUpdating(true);
    try {
      const updated = await updateAdminReportStatusApi(
        activeReport.reportId,
        newStatus,
        adminNotes.trim() || undefined
      );

      if (updated) {
        setReports((prev) =>
          prev.map((r) => (r.reportId === activeReport.reportId ? { ...r, ...updated } : r))
        );
        setActionSuccess(`Report #${activeReport.reportId} status updated to ${newStatus}.`);
        setTimeout(() => {
          setActiveReport(null);
          setActionSuccess(null);
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to update report status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Content Error & Question Issue Reports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit student submissions regarding question keys, typos, syllabus errors, or text ambiguities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReports}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('OPEN')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'OPEN'
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">Open Issues</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{openStatusCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Awaiting review</div>
        </div>

        <div
          onClick={() => setStatusFilter('IN_REVIEW')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'IN_REVIEW'
              ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">In Review</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{inReviewCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Under editorial audit</div>
        </div>

        <div
          onClick={() => setStatusFilter('RESOLVED')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'RESOLVED'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Resolved</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{resolvedCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Corrected in database</div>
        </div>

        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'REJECTED'
              ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase">Rejected</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{rejectedCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Verified as correct</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reports by question ID, subject, email, or issue description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>

        <div className="w-full sm:w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
          >
            <option value="All">All Statuses ({reports.length})</option>
            <option value="OPEN">Open ({openStatusCount})</option>
            <option value="IN_REVIEW">In Review ({inReviewCount})</option>
            <option value="RESOLVED">Resolved ({resolvedCount})</option>
            <option value="REJECTED">Rejected ({rejectedCount})</option>
          </select>
        </div>
      </div>

      {/* Reports Table / List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
            <p>Loading authoritative content reports from database...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-16 text-center space-y-3 p-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/60 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {statusFilter === 'All' ? 'No Error Reports Found' : `No ${statusFilter} Reports`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {statusFilter === 'All'
                ? 'No content errors have been submitted by students or teachers yet. When an issue is reported on a question, it will appear here.'
                : `There are currently no reports with status "${statusFilter}".`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Question Reference</th>
                  <th className="py-3 px-4">Report Details</th>
                  <th className="py-3 px-4">Reporter</th>
                  <th className="py-3 px-4">Reported On</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReports.map((report) => {
                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/30">
                      OPEN
                    </span>
                  );
                  if (report.status === 'IN_REVIEW') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300/30">
                        IN REVIEW
                      </span>
                    );
                  } else if (report.status === 'RESOLVED') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/30">
                        RESOLVED
                      </span>
                    );
                  } else if (report.status === 'REJECTED') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300/30">
                        REJECTED
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={report.reportId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">{statusBadge}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {report.category}
                      </td>
                      <td className="py-3 px-4">
                        {report.questionId ? (
                          <div className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                            {report.questionId}
                            {report.subject && (
                              <div className="text-[10px] text-slate-400 font-sans font-normal">
                                {report.subject}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">General</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="truncate text-slate-700 dark:text-slate-300 font-medium" title={report.description}>
                          {report.description}
                        </div>
                        {report.adminNotes && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                            <span className="font-bold">Note:</span> {report.adminNotes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {report.userEmail ? (
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {report.userEmail}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Anonymous</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(report.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenModal(report)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Resolution Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setActiveReport(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Audit Report #{activeReport.reportId}
                </h3>
                <p className="text-xs text-slate-500">
                  Category: <span className="font-bold text-slate-700 dark:text-slate-300">{activeReport.category}</span>
                </p>
              </div>
            </div>

            {actionSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {actionSuccess}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Question</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {activeReport.questionId || 'General Inquiry'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Subject</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {activeReport.subject || 'All Subjects'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Reporter</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {activeReport.userEmail || 'Anonymous'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Submitted Date</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {new Date(activeReport.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Report Description
                </label>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700 font-medium whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {activeReport.description}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Update Audit Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200"
                >
                  <option value="OPEN">OPEN (Needs Attention)</option>
                  <option value="IN_REVIEW">IN_REVIEW (Editorial Verification Ongoing)</option>
                  <option value="RESOLVED">RESOLVED (Content Modified / Fixed)</option>
                  <option value="REJECTED">REJECTED (Verified Accurate / No Action Needed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Editorial Notes / Resolution Details
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Corrected option (B) to option (C) as per Punjab Textbook Board Biology Class 10 Chapter 3..."
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveReport(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isUpdating ? 'Saving...' : 'Save Audit Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
