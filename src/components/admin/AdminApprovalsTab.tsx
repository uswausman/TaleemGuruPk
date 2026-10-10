import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
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
  FileText,
  Tag,
  AlertTriangle,
  Send,
  Check,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  fetchPendingApprovalsApi,
  fetchApprovalStatsApi,
  approveChangeRequestApi,
  rejectChangeRequestApi,
  ContentChangeRequestItem,
  ApprovalStats,
} from '../../lib/api';

interface AdminApprovalsTabProps {
  currentUserId?: string;
  onContentPublished?: () => void;
}

export const AdminApprovalsTab: React.FC<AdminApprovalsTabProps> = ({
  currentUserId,
  onContentPublished,
}) => {
  const [requests, setRequests] = useState<ContentChangeRequestItem[]>([]);
  const [stats, setStats] = useState<ApprovalStats>({
    pending: 0,
    approvedToday: 0,
    rejectedToday: 0,
    totalMonth: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [submitterFilter, setSubmitterFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected item for review modal
  const [activeRequest, setActiveRequest] = useState<ContentChangeRequestItem | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [approvalRes, statsRes] = await Promise.all([
        fetchPendingApprovalsApi({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          entityType: entityFilter === 'ALL' ? undefined : entityFilter,
        }),
        fetchApprovalStatsApi(),
      ]);
      setRequests(approvalRes.items || []);
      setStats(statsRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, entityFilter]);

  // Client filtered list
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (actionFilter !== 'ALL' && req.action.toUpperCase() !== actionFilter.toUpperCase()) return false;
      if (submitterFilter !== 'ALL' && req.submittedBy !== submitterFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = req.contentTitle?.toLowerCase().includes(query);
        const matchesType = req.entityType?.toLowerCase().includes(query);
        const matchesSubmitterName = req.submitterName?.toLowerCase().includes(query);
        const matchesSubmitterEmail = req.submitterEmail?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesType && !matchesSubmitterName && !matchesSubmitterEmail) return false;
      }
      return true;
    });
  }, [requests, actionFilter, submitterFilter, searchQuery]);

  const uniqueSubmitters = useMemo(() => {
    const map = new Map<string, string>();
    requests.forEach((r) => {
      if (r.submittedBy) {
        map.set(r.submittedBy, r.submitterName || r.submitterEmail || r.submittedBy);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [requests]);

  const handleApprove = async () => {
    if (!activeRequest) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await approveChangeRequestApi(activeRequest.id, reviewComment);
      if (!res.success) {
        setActionFeedback({ type: 'error', message: res.error || 'Failed to approve request' });
        return;
      }

      setActionFeedback({ type: 'success', message: 'Request approved and change published live to production!' });
      setTimeout(() => {
        setActiveRequest(null);
        setReviewComment('');
        setShowRejectInput(false);
        setActionFeedback(null);
        loadData();
        onContentPublished?.();
      }, 1000);
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Error occurred while approving' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!activeRequest) return;
    if (!rejectionReason.trim()) {
      setActionFeedback({ type: 'error', message: 'A rejection reason is required so staff know what to correct.' });
      return;
    }

    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await rejectChangeRequestApi(activeRequest.id, rejectionReason.trim());
      if (!res.success) {
        setActionFeedback({ type: 'error', message: res.error || 'Failed to reject request' });
        return;
      }

      setActionFeedback({ type: 'success', message: 'Request rejected. Staff will see your rejection reason.' });
      setTimeout(() => {
        setActiveRequest(null);
        setRejectionReason('');
        setShowRejectInput(false);
        setActionFeedback(null);
        loadData();
      }, 1000);
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Error occurred while rejecting' });
    } finally {
      setActionLoading(false);
    }
  };

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

  const isSelfSubmission = activeRequest?.submittedBy === currentUserId;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Content Approval Queue
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review, diff-compare, and publish educational content changes submitted by Teachers, Editors, and Content Managers.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'PENDING'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-sm ring-1 ring-amber-500/20'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Pending Reviews
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.pending}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Awaiting approval</div>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-sm ring-1 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Approved Today
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.approvedToday}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Live in production</div>
        </div>

        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'REJECTED'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 shadow-sm ring-1 ring-rose-500/20'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Rejected Today
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.rejectedToday}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sent back with reason</div>
        </div>

        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-sm ring-1 ring-indigo-500/20'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              Total Recorded
            </span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.total}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Historical audits</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, question, or staff member..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
          >
            <option value="PENDING">Status: Pending Reviews</option>
            <option value="APPROVED">Status: Approved</option>
            <option value="REJECTED">Status: Rejected</option>
            <option value="ALL">Status: All</option>
          </select>

          {/* Content Type Filter */}
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
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

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>

          {/* Submitter Filter */}
          <select
            value={submitterFilter}
            onChange={(e) => setSubmitterFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Submitters</option>
            {uniqueSubmitters.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading pending requests...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-rose-800 dark:text-rose-200">Unable to load requests</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{error}</p>
            <button onClick={loadData} className="text-xs font-semibold text-rose-800 underline mt-2">
              Try again
            </button>
          </div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">All clear! No pending approvals</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1">
            {statusFilter === 'PENDING'
              ? 'No staff submissions are currently awaiting review. New staff additions or modifications will appear here immediately.'
              : 'No records found matching your selected filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const badge = getEntityBadge(req.entityType);
            const isPending = req.status === 'PENDING';
            const isRejected = req.status === 'REJECTED';
            const isApproved = req.status === 'APPROVED';

            return (
              <div
                key={req.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 transition shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border shrink-0 mt-0.5 ${badge.color}`}
                  >
                    {badge.icon}
                    {badge.label}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {getActionBadge(req.action)}
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                        {req.contentTitle || `${req.entityType} item`}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Submitted by: {req.submitterName || req.submitterEmail || 'Staff Member'}
                        {req.submitterRoles && req.submitterRoles.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 font-normal">
                            {req.submitterRoles.join(', ')}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Date: {formatDate(req.createdAt)}
                      </span>
                      {req.reviewedAt && (
                        <span className="flex items-center gap-1">
                          Reviewed: {formatDate(req.reviewedAt)}
                          {req.reviewerName && ` by ${req.reviewerName}`}
                        </span>
                      )}
                    </div>

                    {isRejected && req.reviewComment && (
                      <div className="mt-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1.5 rounded border border-rose-200 dark:border-rose-900/50">
                        <span className="font-bold">Rejection reason: </span>
                        {req.reviewComment}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                  <button
                    onClick={() => {
                      setActiveRequest(req);
                      setReviewComment('');
                      setRejectionReason('');
                      setShowRejectInput(false);
                      setActionFeedback(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Review & Compare
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review & Diff Comparison Modal */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${getEntityBadge(activeRequest.entityType).color}`}>
                  {getEntityBadge(activeRequest.entityType).icon}
                  {getEntityBadge(activeRequest.entityType).label}
                </span>
                {getActionBadge(activeRequest.action)}
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Review Change Request #{activeRequest.id}
                </h3>
              </div>
              <button
                onClick={() => setActiveRequest(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Feedback Alert */}
              {actionFeedback && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-sm ${
                    actionFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200'
                  }`}
                >
                  {actionFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <span>{actionFeedback.message}</span>
                </div>
              )}

              {/* Submitter Info Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Submitted by: </span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {activeRequest.submitterName || 'Staff Member'}
                  </span>
                  <span className="text-slate-500 ml-1">({activeRequest.submitterEmail || activeRequest.submittedBy})</span>
                  {activeRequest.submitterRoles && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold">
                      {activeRequest.submitterRoles.join(', ')}
                    </span>
                  )}
                </div>
                <div className="text-slate-500">
                  Submission Date: {formatDate(activeRequest.createdAt)}
                </div>
              </div>

              {/* Warning if self-submission */}
              {isSelfSubmission && activeRequest.status === 'PENDING' && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Self-Approval Protection: </span>
                    You created this submission. As required by governance policy, you cannot approve your own submission. Another administrator must review and approve it.
                  </div>
                </div>
              )}

              {/* Summary / Title */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Content Title
                </label>
                <div className="text-base font-semibold text-slate-900 dark:text-white">
                  {activeRequest.contentTitle}
                </div>
              </div>

              {/* Side-by-Side Comparison: Live Data vs Proposed Changes */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  {activeRequest.action === 'CREATE'
                    ? 'Proposed New Content'
                    : activeRequest.action === 'DELETE'
                    ? 'Item Slated for Deletion (Live Data Snapshot)'
                    : 'Comparison: Current Live Data vs. Proposed Changes'}
                </label>

                {activeRequest.action === 'CREATE' ? (
                  /* Single Proposed Card for Create */
                  <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3">
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      New Content to be Published Live
                    </div>

                    {/* Format MCQ nicely if MCQ */}
                    {(activeRequest.entityType === 'mcqs' || activeRequest.entityType === 'mcq') && activeRequest.proposedData ? (
                      <div className="space-y-3 text-sm">
                        <div className="font-semibold text-slate-900 dark:text-white p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {activeRequest.proposedData.question}
                        </div>
                        {Array.isArray(activeRequest.proposedData.options) && (
                          <div className="space-y-1.5 pl-2">
                            {activeRequest.proposedData.options.map((opt: string, idx: number) => {
                              const isCorrect = idx === activeRequest.proposedData.correctAnswer;
                              return (
                                <div
                                  key={idx}
                                  className={`p-2 rounded-lg text-xs font-medium flex items-center justify-between border ${
                                    isCorrect
                                      ? 'bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 font-bold'
                                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  <span>
                                    {String.fromCharCode(65 + idx)}. {opt}
                                  </span>
                                  {isCorrect && (
                                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Correct Answer
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {activeRequest.proposedData.explanation && (
                          <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 text-xs text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-900/60">
                            <span className="font-bold">Explanation: </span>
                            {activeRequest.proposedData.explanation}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500 pt-1">
                          {activeRequest.proposedData.subject && <span>Subject: <strong>{activeRequest.proposedData.subject}</strong></span>}
                          {activeRequest.proposedData.classLevel && <span>• Class: <strong>{activeRequest.proposedData.classLevel}</strong></span>}
                          {activeRequest.proposedData.board && <span>• Board: <strong>{activeRequest.proposedData.board}</strong></span>}
                          {activeRequest.proposedData.chapter && <span>• Chapter: <strong>{activeRequest.proposedData.chapter}</strong></span>}
                        </div>
                      </div>
                    ) : (
                      /* General Raw JSON View */
                      <div className="p-3.5 rounded-lg bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-72">
                        <pre>{JSON.stringify(activeRequest.proposedData, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Side-by-Side Comparison for UPDATE / DELETE */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Live Data Snapshot */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Current Live Data</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          Production
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-xs overflow-x-auto max-h-64 border border-slate-200 dark:border-slate-800">
                        <pre>
                          {activeRequest.previousData
                            ? JSON.stringify(activeRequest.previousData, null, 2)
                            : 'No prior snapshot recorded'}
                        </pre>
                      </div>
                    </div>

                    {/* Proposed Changes */}
                    <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/20 space-y-2">
                      <div className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center justify-between">
                        <span>
                          {activeRequest.action === 'DELETE' ? 'Target to be Removed' : 'Proposed Updates'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold">
                          Staff Submission
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-xs overflow-x-auto max-h-64 border border-blue-200 dark:border-blue-900">
                        <pre>
                          {activeRequest.action === 'DELETE'
                            ? 'REQUESTED ACTION: DELETE THIS RECORD FROM PRODUCTION'
                            : JSON.stringify(activeRequest.proposedData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Rejection Input Section */}
              {showRejectInput && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 space-y-2">
                  <label className="text-xs font-bold text-rose-800 dark:text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    Required Reason for Rejection
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Explain clearly to the staff member why this submission was rejected and what should be corrected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-2.5 text-sm bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
                  />
                  <div className="text-xs text-rose-700 dark:text-rose-300">
                    This reason will be visible to the staff member in their "My Submissions" portal.
                  </div>
                </div>
              )}

              {/* Approval Notes Input (Optional) */}
              {!showRejectInput && activeRequest.status === 'PENDING' && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Approval Comment (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Verified against official Federal Board curriculum guidelines."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => setActiveRequest(null)}
                disabled={actionLoading}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Close
              </button>

              {activeRequest.status === 'PENDING' && (
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  {showRejectInput ? (
                    <>
                      <button
                        onClick={() => setShowRejectInput(false)}
                        disabled={actionLoading}
                        className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
                      >
                        Cancel Rejection
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={actionLoading || !rejectionReason.trim()}
                        className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        {actionLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        Confirm Rejection
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowRejectInput(true)}
                        disabled={actionLoading}
                        className="px-3.5 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject with Reason
                      </button>
                      <button
                        onClick={handleApprove}
                        disabled={actionLoading || isSelfSubmission}
                        title={isSelfSubmission ? 'Staff cannot approve their own submissions' : 'Approve and publish live'}
                        className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        {actionLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Approve & Publish Live
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
