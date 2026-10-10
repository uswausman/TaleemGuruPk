import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  Eye,
  Calendar,
  User,
  ArrowRight,
  X,
  FileQuestion,
  BookOpen,
  Layers,
  GraduationCap,
  FolderTree,
  FileCheck,
  Tag,
} from 'lucide-react';
import { fetchMySubmissionsApi, ContentChangeRequestItem } from '../../lib/api';

export const StaffSubmissionsTab: React.FC = () => {
  const [submissions, setSubmissions] = useState<ContentChangeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<ContentChangeRequestItem | null>(null);

  const loadSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchMySubmissionsApi();
      setSubmissions(items);
    } catch (err: any) {
      setError(err.message || 'Failed to load your submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const counts = useMemo(() => {
    return {
      all: submissions.length,
      pending: submissions.filter((s) => s.status === 'PENDING').length,
      approved: submissions.filter((s) => s.status === 'APPROVED').length,
      rejected: submissions.filter((s) => s.status === 'REJECTED').length,
    };
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && item.entityType.toLowerCase() !== typeFilter.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.contentTitle?.toLowerCase().includes(query);
        const matchesType = item.entityType?.toLowerCase().includes(query);
        const matchesAction = item.action?.toLowerCase().includes(query);
        const matchesComment = item.reviewComment?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesType && !matchesAction && !matchesComment) return false;
      }
      return true;
    });
  }, [submissions, statusFilter, typeFilter, searchQuery]);

  const getEntityBadge = (type: string) => {
    const norm = type.toLowerCase();
    switch (norm) {
      case 'mcqs':
      case 'mcq':
        return { label: 'MCQ', icon: <FileQuestion className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      case 'tests':
      case 'test':
        return { label: 'Test / Quiz', icon: <Clock className="w-3.5 h-3.5" />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
      case 'past_papers':
      case 'past_paper':
        return { label: 'Past Paper', icon: <BookOpen className="w-3.5 h-3.5" />, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      case 'study_notes':
      case 'study_note':
        return { label: 'Study Note', icon: <FileText className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      case 'chapters':
      case 'chapter':
        return { label: 'Chapter', icon: <Layers className="w-3.5 h-3.5" />, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' };
      case 'subjects':
      case 'subject':
        return { label: 'Subject', icon: <GraduationCap className="w-3.5 h-3.5" />, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800' };
      case 'boards':
      case 'classes':
        return { label: norm === 'boards' ? 'Board' : 'Class', icon: <FolderTree className="w-3.5 h-3.5" />, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
      case 'documents':
      case 'document':
        return { label: 'Document', icon: <FileCheck className="w-3.5 h-3.5" />, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' };
      default:
        return { label: type, icon: <Tag className="w-3.5 h-3.5" />, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    }
  };

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">CREATE</span>;
      case 'UPDATE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">UPDATE</span>;
      case 'DELETE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">DELETE</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{action}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <Clock className="w-3 h-3 animate-spin text-amber-500" />
            Pending Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Approved & Live
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
            <XCircle className="w-3 h-3 text-rose-500" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            My Submissions & Approvals
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track all educational content changes you have submitted for Administrator review.
          </p>
        </div>
        <button
          onClick={loadSubmissions}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-sm ring-1 ring-blue-500/20'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">All Submissions</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{counts.all}</div>
        </button>

        <button
          onClick={() => setStatusFilter('PENDING')}
          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === 'PENDING'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-sm ring-1 ring-amber-500/20'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Pending Review
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{counts.pending}</div>
        </button>

        <button
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-sm ring-1 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved & Live
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{counts.approved}</div>
        </button>

        <button
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === 'REJECTED'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 shadow-sm ring-1 ring-rose-500/20'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{counts.rejected}</div>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, question, or note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Content Types</option>
            <option value="mcqs">MCQs / Questions</option>
            <option value="tests">Tests / Quizzes</option>
            <option value="past_papers">Past Papers</option>
            <option value="study_notes">Study Notes</option>
            <option value="chapters">Chapters</option>
            <option value="subjects">Subjects</option>
            <option value="classes">Classes</option>
            <option value="boards">Boards</option>
            <option value="documents">Documents</option>
          </select>
        </div>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading your submissions...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-rose-800 dark:text-rose-200">Unable to load submissions</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{error}</p>
            <button onClick={loadSubmissions} className="text-xs font-semibold text-rose-800 underline mt-2">
              Try again
            </button>
          </div>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No submissions found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1">
            {statusFilter !== 'ALL' || typeFilter !== 'ALL' || searchQuery
              ? 'No submissions match your active filter criteria. Try resetting filters.'
              : 'When you create, edit, or delete questions, tests, past papers, or notes, they will appear here awaiting Administrator approval before going live.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.map((sub) => {
            const badge = getEntityBadge(sub.entityType);
            const isRejected = sub.status === 'REJECTED';
            const isApproved = sub.status === 'APPROVED';

            return (
              <div
                key={sub.id}
                onClick={() => setSelectedSubmission(sub)}
                className={`p-4 rounded-xl border transition cursor-pointer hover:shadow-md ${
                  isRejected
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                    : isApproved
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border shrink-0 mt-0.5 ${badge.color}`}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {getActionBadge(sub.action)}
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                          {sub.contentTitle || `${sub.entityType} item`}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Submitted: {formatDate(sub.createdAt)}
                        </span>
                        {isApproved && (sub.publishedAt || sub.reviewedAt) && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approved: {formatDate(sub.publishedAt || sub.reviewedAt)}
                          </span>
                        )}
                        {!isApproved && sub.reviewedAt && (
                          <span className="flex items-center gap-1 text-slate-500">
                            Reviewed: {formatDate(sub.reviewedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700/60">
                    {getStatusBadge(sub.status)}
                    <button
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      aria-label="View details"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Prominent Admin Rejection Reason Banner */}
                {isRejected && sub.reviewComment && (
                  <div className="mt-3.5 p-3 rounded-lg bg-rose-100/80 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900/70 flex items-start gap-2.5">
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-bold text-rose-900 dark:text-rose-200">Rejection Reason: </span>
                      <span className="text-rose-800 dark:text-rose-300">{sub.reviewComment}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${getEntityBadge(selectedSubmission.entityType).color}`}>
                  {getEntityBadge(selectedSubmission.entityType).icon}
                  {getEntityBadge(selectedSubmission.entityType).label}
                </span>
                {getActionBadge(selectedSubmission.action)}
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Submission #{selectedSubmission.id}</h3>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Status Header Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status:</span>
                  {getStatusBadge(selectedSubmission.status)}
                </div>
                <div className="text-xs text-slate-500">
                  Submitted: {formatDate(selectedSubmission.createdAt)}
                </div>
              </div>

              {/* Admin Rejection Notice if rejected */}
              {selectedSubmission.status === 'REJECTED' && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-sm">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Admin Rejection Reason
                  </div>
                  <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-200 pl-6 leading-relaxed">
                    {selectedSubmission.reviewComment || 'No explanation provided.'}
                  </p>
                  {selectedSubmission.reviewedAt && (
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 pl-6">
                      Reviewed on: {formatDate(selectedSubmission.reviewedAt)}
                    </div>
                  )}
                </div>
              )}

              {/* Admin Approval Notice if approved */}
              {selectedSubmission.status === 'APPROVED' && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Approved and Published
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 pl-6 leading-relaxed">
                    {selectedSubmission.reviewComment || 'Approved and published to production website.'}
                  </p>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 pl-6">
                    Approved date: {formatDate(selectedSubmission.publishedAt || selectedSubmission.reviewedAt)}
                  </div>
                </div>
              )}

              {/* Title & Overview */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Content Title</label>
                <div className="font-semibold text-slate-900 dark:text-white text-base mt-1">
                  {selectedSubmission.contentTitle}
                </div>
              </div>

              {/* Proposed Data Payload Presentation */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                  Proposed Changes Data
                </label>
                <div className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800 max-h-72">
                  <pre>{JSON.stringify(selectedSubmission.proposedData, null, 2)}</pre>
                </div>
              </div>

              {/* Previous Data snapshot if update/delete */}
              {selectedSubmission.previousData && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                    Previous Live Version Snapshot
                  </label>
                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-300 font-mono text-xs overflow-x-auto border border-slate-200 dark:border-slate-700 max-h-56">
                    <pre>{JSON.stringify(selectedSubmission.previousData, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
