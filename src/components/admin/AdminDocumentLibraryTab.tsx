import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Files,
  UploadCloud,
  Search,
  Filter,
  RefreshCw,
  Download,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  ShieldCheck,
  FileText,
  BookOpen,
  X,
  Plus,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ArrowUpDown,
  FileCheck,
} from 'lucide-react';
import {
  PAKISTAN_BOARDS,
  ACADEMIC_CLASSES,
  ACADEMIC_SUBJECTS,
} from '../../data/educationalHierarchy';
import { AdminConfirmDialog } from './AdminConfirmDialog';

export interface DocumentItem {
  id: string;
  title: string;
  originalFilename: string;
  sanitizedFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  originalFileHash: string;
  brandedFileHash?: string;
  brandingStatus: 'Pending' | 'Completed' | 'Failed' | 'NotApplicable';
  brandingVersion?: string;
  documentType: 'Past Paper' | 'Study Note' | 'Syllabus' | 'Textbook' | 'Other';
  board?: string;
  classLevel?: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  year?: number;
  language?: string;
  status: 'Published' | 'Draft' | 'Archived';
  version: number;
  downloadsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersionItem {
  id: string;
  documentId: string;
  version: number;
  fileSizeBytes: number;
  fileHash: string;
  brandedFileHash?: string;
  changeNotes?: string;
  createdAt: string;
}

export const AdminDocumentLibraryTab: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [boardFilter, setBoardFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Multi-selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDocType, setUploadDocType] = useState<DocumentItem['documentType']>('Past Paper');
  const [uploadBoard, setUploadBoard] = useState('BISE Lahore');
  const [uploadClass, setUploadClass] = useState('Class 10 (Matric Pt 2)');
  const [uploadSubject, setUploadSubject] = useState('Physics');
  const [uploadChapter, setUploadChapter] = useState('');
  const [uploadTopic, setUploadTopic] = useState('');
  const [uploadYear, setUploadYear] = useState<number>(2024);
  const [uploadLanguage, setUploadLanguage] = useState('English');
  const [uploadStatus, setUploadStatus] = useState<'Published' | 'Draft'>('Published');
  const [uploadAllowDuplicate, setUploadAllowDuplicate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Version history modal state
  const [historyDoc, setHistoryDoc] = useState<DocumentItem | null>(null);
  const [versions, setVersions] = useState<DocumentVersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [newVersionNotes, setNewVersionNotes] = useState('');
  const [uploadingVersion, setUploadingVersion] = useState(false);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Confirm delete dialog
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reprocess all state
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessStatus, setReprocessStatus] = useState<string | null>(null);

  // Fetch documents from server
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('tg_auth_token') || sessionStorage.getItem('tg_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/documents?limit=300', { headers });
      if (!res.ok) {
        throw new Error(`Failed to load documents (HTTP ${res.status})`);
      }
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message || 'Unable to fetch document library');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchSearch =
        !searchQuery ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.originalFileHash && doc.originalFileHash.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.subject && doc.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.board && doc.board.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType = typeFilter === 'All' || doc.documentType === typeFilter;
      const matchBoard = boardFilter === 'All' || doc.board === boardFilter;
      const matchClass = classFilter === 'All' || (doc.classLevel && doc.classLevel.includes(classFilter));
      const matchSub = subjectFilter === 'All' || doc.subject === subjectFilter;
      const matchStatus = statusFilter === 'All' || doc.status === statusFilter;

      return matchSearch && matchType && matchBoard && matchClass && matchSub && matchStatus;
    });
  }, [documents, searchQuery, typeFilter, boardFilter, classFilter, subjectFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = documents.length;
    const published = documents.filter((d) => d.status === 'Published').length;
    const draft = documents.filter((d) => d.status === 'Draft').length;
    const archived = documents.filter((d) => d.status === 'Archived').length;
    const brandedCount = documents.filter((d) => d.brandingStatus === 'Completed').length;
    const totalDownloads = documents.reduce((sum, d) => sum + (d.downloadsCount || 0), 0);
    const totalBytes = documents.reduce((sum, d) => sum + (d.fileSizeBytes || 0), 0);
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

    return { total, published, draft, archived, brandedCount, totalDownloads, totalMb };
  }, [documents]);

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Handle single or bulk upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      setUploadMessage({ type: 'error', text: 'Please select at least one PDF file to upload.' });
      return;
    }

    setUploading(true);
    setUploadMessage(null);

    const token = localStorage.getItem('tg_auth_token') || sessionStorage.getItem('tg_auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      if (uploadFiles.length === 1) {
        const file = uploadFiles[0];
        const base64 = await fileToBase64(file);

        const payload = {
          fileBase64: base64,
          filename: file.name,
          title: uploadTitle.trim() || file.name.replace(/\.[^/.]+$/, ''),
          documentType: uploadDocType,
          board: uploadBoard,
          classLevel: uploadClass,
          subject: uploadSubject,
          chapter: uploadChapter,
          topic: uploadTopic,
          year: uploadYear,
          language: uploadLanguage,
          status: uploadStatus,
          allowDuplicate: uploadAllowDuplicate,
        };

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to upload and brand document');
        }

        setUploadMessage({
          type: 'success',
          text: `Document uploaded successfully! Original preserved and branded distribution copy generated (Hash: ${data.document?.brandedFileHash?.substring(0, 10)}...).`,
        });
      } else {
        // Bulk Upload
        const fileItems = [];
        for (const file of uploadFiles) {
          const base64 = await fileToBase64(file);
          fileItems.push({
            fileBase64: base64,
            filename: file.name,
            title: file.name.replace(/\.[^/.]+$/, ''),
            documentType: uploadDocType,
            board: uploadBoard,
            classLevel: uploadClass,
            subject: uploadSubject,
            year: uploadYear,
            language: uploadLanguage,
            status: uploadStatus,
            allowDuplicate: uploadAllowDuplicate,
          });
        }

        const res = await fetch('/api/documents/bulk-upload', {
          method: 'POST',
          headers,
          body: JSON.stringify({ files: fileItems }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Bulk upload failed');
        }

        setUploadMessage({
          type: 'success',
          text: `Bulk upload completed: ${data.successful} documents processed, ${data.failed} failed.`,
        });
      }

      await fetchDocuments();
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadFiles([]);
        setUploadTitle('');
        setUploadMessage(null);
      }, 1200);
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadMessage({ type: 'error', text: err.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  // Toggle single status
  const handleToggleStatus = async (doc: DocumentItem) => {
    const nextStatus: DocumentItem['status'] =
      doc.status === 'Published' ? 'Draft' : 'Published';

    const token = localStorage.getItem('tg_auth_token') || sessionStorage.getItem('tg_auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, status: nextStatus } : d))
        );
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Bulk status update
  const handleBulkStatusChange = async (targetStatus: DocumentItem['status']) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);

    const token = localStorage.getItem('tg_auth_token') || sessionStorage.getItem('tg_auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch('/api/documents/bulk-status', {
        method: 'POST',
        headers,
        body: JSON.stringify({ documentIds: ids, status: targetStatus }),
      });
      if (res.ok) {
        setDocuments((prev) =>
          prev.map((d) => (ids.includes(d.id) ? { ...d, status: targetStatus } : d))
        );
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error('Failed bulk status update:', err);
    }
  };

  // Re-brand document
  const handleRebrand = async (docId: string) => {
    const token = localStorage.getItem('tg_auth_token') || sessionStorage.getItem('tg_auth_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`/api/documents/${docId}/rebrand`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (res.ok && data.document) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, ...data.document } : d))
        );
      } else {
        alert(data.error || 'Failed to rebrand document');
      }
    } catch (err: any) {
      alert(`Rebrand failed: ${err.message}`);
    }
  };

  // Reprocess all documents
  const handleReprocessAll = async () => {
    if (!window.confirm('Are you sure you want to re-check and brand all documents with updated TaleemGuru branding? Original files will remain immutable.')) {
      return;
    }

    setIsReprocessing(true);
    setReprocessStatus('Reprocessing documents pipeline...');

    const token = localStorage.getItem('tg_auth_token') || sessionStorage.getItem('tg_auth_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch('/api/documents/reprocess-all', {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (res.ok) {
        setReprocessStatus(`Reprocess completed: ${data.migrated} branded, ${data.skipped} already up-to-date.`);
        await fetchDocuments();
      } else {
        setReprocessStatus(`Error: ${data.error || 'Reprocess failed'}`);
      }
    } catch (err: any) {
      setReprocessStatus(`Error: ${err.message}`);
    } finally {
      setIsReprocessing(false);
      setTimeout(() => setReprocessStatus(null), 5000);
    }
  };

  // Delete document
  const handleDeleteDocument = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    const token = localStorage.getItem('tg_auth_token') || sessionStorage.getItem('tg_auth_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`/api/documents/${deleteTarget.id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete document');
      }
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Load version history
  const handleOpenVersions = async (doc: DocumentItem) => {
    setHistoryDoc(doc);
    setLoadingVersions(true);
    setNewVersionFile(null);
    setNewVersionNotes('');

    const token = localStorage.getItem('tg_auth_token') || sessionStorage.getItem('tg_auth_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`/api/documents/${doc.id}/versions`, { headers });
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch (err) {
      console.error('Failed to load version history:', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  // Upload new version
  const handleUploadNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyDoc || !newVersionFile) return;

    setUploadingVersion(true);
    const token = localStorage.getItem('tg_auth_token') || sessionStorage.getItem('tg_auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const base64 = await fileToBase64(newVersionFile);
      const res = await fetch(`/api/documents/${historyDoc.id}/version`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fileBase64: base64,
          filename: newVersionFile.name,
          changeNotes: newVersionNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload new version');
      }

      // Refresh versions & doc list
      await handleOpenVersions(data.document || historyDoc);
      await fetchDocuments();
      setNewVersionFile(null);
      setNewVersionNotes('');
    } catch (err: any) {
      alert(`Failed to create version: ${err.message}`);
    } finally {
      setUploadingVersion(false);
    }
  };

  // Toggle select all
  const handleSelectAll = () => {
    if (selectedIds.size === filteredDocuments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocuments.map((d) => d.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Files className="w-5 h-5 text-indigo-600" />
            Centralized Document Library & Automatic Branding
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Authoritative repository for educational PDFs, past papers, and study handouts. Every document maintains an immutable original file and automatically generated TaleemGuru branded distribution copy (<span className="font-semibold text-slate-700 dark:text-slate-300">"Learn. Practice. Test. Improve."</span>).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleReprocessAll}
            disabled={isReprocessing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            title="Reprocess all documents and ensure branded copies are up-to-date"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isReprocessing ? 'Processing...' : 'Reprocess Branding'}</span>
          </button>

          <button
            onClick={() => {
              setIsUploadModalOpen(true);
              setUploadFiles([]);
              setUploadMessage(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {reprocessStatus && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 rounded-xl text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>{reprocessStatus}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Docs</span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Published</span>
          <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">{stats.published}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Draft</span>
          <div className="text-xl font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">{stats.draft}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Branded Copies</span>
          <div className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400 mt-0.5">{stats.brandedCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Storage</span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{stats.totalMb} MB</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Downloads</span>
          <div className="text-xl font-extrabold text-teal-700 dark:text-teal-400 mt-0.5">{stats.totalDownloads}</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by title, filename, SHA-256 hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
          >
            <option value="All">All Types</option>
            <option value="Past Paper">Past Paper</option>
            <option value="Study Note">Study Note</option>
            <option value="Syllabus">Syllabus</option>
            <option value="Textbook">Textbook</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Board Filter */}
        <div>
          <select
            value={boardFilter}
            onChange={(e) => setBoardFilter(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
          >
            <option value="All">All Boards</option>
            {PAKISTAN_BOARDS.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subject Filter */}
        <div>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
          >
            <option value="All">All Subjects</option>
            {ACADEMIC_SUBJECTS.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft Only</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Published">Published Only</option>
            <option value="Rejected">Rejected</option>
            <option value="Archived">Archived Only</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="font-bold text-indigo-900 dark:text-indigo-200">
            {selectedIds.size} document{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange('Published')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
            >
              Publish Selected
            </button>
            <button
              onClick={() => handleBulkStatusChange('Draft')}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
            >
              Draft Selected
            </button>
            <button
              onClick={() => handleBulkStatusChange('Archived')}
              className="px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-700 text-white font-bold cursor-pointer"
            >
              Archive Selected
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300 font-bold cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredDocuments.length > 0 && selectedIds.size === filteredDocuments.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                  />
                </th>
                <th className="p-3.5">Document Details</th>
                <th className="p-3.5">Academic Hierarchy</th>
                <th className="p-3.5">File & Integrity</th>
                <th className="p-3.5">Branding Status</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Downloads</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDocuments.map((doc) => {
                const isSelected = selectedIds.has(doc.id);
                const isPublished = doc.status === 'Published';
                return (
                  <tr
                    key={doc.id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(doc.id)}
                        className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                      />
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white leading-snug">
                        {doc.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {doc.sanitizedFilename}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                          {doc.documentType}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          v{doc.version || 1}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {doc.board || 'All Boards'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {doc.subject} • {doc.classLevel}
                      </div>
                      {doc.year && (
                        <div className="text-[10px] font-mono font-bold text-slate-400">
                          Year: {doc.year}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">
                      <div>{formatSize(doc.fileSizeBytes)}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]" title={`Original SHA-256: ${doc.originalFileHash}`}>
                        Orig: {doc.originalFileHash?.substring(0, 10)}...
                      </div>
                      {doc.brandedFileHash && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate max-w-[120px]" title={`Branded SHA-256: ${doc.brandedFileHash}`}>
                          Brand: {doc.brandedFileHash?.substring(0, 10)}...
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      {doc.brandingStatus === 'Completed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          <ShieldCheck className="w-3 h-3" /> Branded
                        </span>
                      ) : doc.brandingStatus === 'Failed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                          <AlertTriangle className="w-3 h-3" /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleStatus(doc)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer transition-all flex items-center gap-1 ${
                          isPublished
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                            : doc.status === 'Archived'
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 hover:bg-amber-200'
                        }`}
                        title="Click to toggle Published / Draft"
                      >
                        {isPublished ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {doc.status}
                      </button>
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                      {doc.downloadsCount || 0}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Download Branded Copy */}
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                          title="Download Branded Distribution PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>

                        {/* Download Original Copy (Admin privileged) */}
                        <a
                          href={`/api/documents/${doc.id}/download?original=true`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[10px] font-mono font-bold"
                          title="Download Original Immutable PDF (Staff only)"
                        >
                          Orig
                        </a>

                        {/* Versions History */}
                        <button
                          onClick={() => handleOpenVersions(doc)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg cursor-pointer"
                          title="View Version History & Upload Replacement"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        {/* 1-Click Rebrand */}
                        <button
                          onClick={() => handleRebrand(doc.id)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg cursor-pointer"
                          title="Force Re-brand Document"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(doc)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredDocuments.length === 0 && !loading && (
          <div className="p-8 text-center text-slate-500 text-xs">
            No documents found matching your filter criteria.
          </div>
        )}

        {loading && (
          <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Loading document library...</span>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 relative max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-600" />
                Upload & Automatically Brand Educational Documents
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* File Dropzone */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select PDF Document(s) *
                </label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  required
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setUploadFiles(files);
                    if (files.length === 1 && !uploadTitle) {
                      setUploadTitle(files[0].name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                  className="w-full p-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 text-slate-900 dark:text-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Supports single or multiple PDF uploads (up to 50MB per file). PDF header/footer magic bytes verified server-side.
                </span>
              </div>

              {/* Title (Single file only) */}
              {uploadFiles.length <= 1 && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. BISE Lahore Class 10 Physics Annual Paper 2024"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              )}

              {/* Doc Type & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Document Type
                  </label>
                  <select
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="Past Paper">Past Paper</option>
                    <option value="Study Note">Study Note / Handout</option>
                    <option value="Syllabus">Curriculum / Syllabus</option>
                    <option value="Textbook">Textbook Resource</option>
                    <option value="Other">Other Educational Material</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={uploadStatus}
                    onChange={(e) => setUploadStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="Published">Published (Public)</option>
                    <option value="Draft">Draft (Staff Only)</option>
                  </select>
                </div>
              </div>

              {/* Board + Class */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Board / Jurisdiction
                  </label>
                  <select
                    value={uploadBoard}
                    onChange={(e) => setUploadBoard(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  >
                    {PAKISTAN_BOARDS.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name} ({b.province})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Class Level
                  </label>
                  <select
                    value={uploadClass}
                    onChange={(e) => setUploadClass(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  >
                    {ACADEMIC_CLASSES.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject + Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Subject
                  </label>
                  <select
                    value={uploadSubject}
                    onChange={(e) => setUploadSubject(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  >
                    {ACADEMIC_SUBJECTS.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Exam Year / Academic Year
                  </label>
                  <input
                    type="number"
                    value={uploadYear}
                    onChange={(e) => setUploadYear(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              {/* Duplicate Protection Option */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="allowDup"
                  checked={uploadAllowDuplicate}
                  onChange={(e) => setUploadAllowDuplicate(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                />
                <label htmlFor="allowDup" className="text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  Allow upload even if a document with the exact same SHA-256 hash already exists
                </label>
              </div>

              {/* Pipeline Notice */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-900 dark:text-emerald-300 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Automated Production Pipeline:</span> The uploaded document will be saved into immutable storage (<span className="font-mono">storage/documents/originals</span>). The system will then brand the distribution copy with official TaleemGuru headers and footers (<span className="font-mono">Learn. Practice. Test. Improve.</span>) without modifying the original.
                </div>
              </div>

              {uploadMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    uploadMessage.type === 'success'
                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200'
                  }`}
                >
                  {uploadMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{uploadMessage.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={uploading}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>{uploading ? 'Processing & Branding...' : 'Upload & Brand'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {historyDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 relative max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Document Version History
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{historyDoc.title}</p>
              </div>
              <button
                onClick={() => setHistoryDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Versions List */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                All Recorded Versions:
              </span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {versions.map((ver) => (
                  <div key={ver.id} className="p-3 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Version {ver.version}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatSize(ver.fileSizeBytes)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ver.createdAt).toLocaleString('en-GB')}
                        </span>
                      </div>
                      {ver.changeNotes && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          {ver.changeNotes}
                        </p>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-sm">
                        SHA-256: {ver.fileHash}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload New Version */}
            <form onSubmit={handleUploadNewVersion} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
              <span className="font-bold text-slate-900 dark:text-white block">
                Upload New Document Revision
              </span>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">
                  Replacement PDF File *
                </label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                  onChange={(e) => setNewVersionFile(e.target.files?.[0] || null)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">
                  Revision Notes (e.g. Corrected MCQ #4 answer key)
                </label>
                <input
                  type="text"
                  value={newVersionNotes}
                  onChange={(e) => setNewVersionNotes(e.target.value)}
                  placeholder="Describe changes in this revision..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setHistoryDoc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={uploadingVersion || !newVersionFile}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploadingVersion ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  <span>{uploadingVersion ? 'Saving...' : 'Upload Revision'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <AdminConfirmDialog
          isOpen={true}
          title="Delete Educational Document"
          message={`Are you sure you want to delete "${deleteTarget.title}"? Both the original file and branded distribution copies will be permanently deleted.`}
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete Permanently'}
          isDestructive={true}
          onConfirm={handleDeleteDocument}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
