import React, { useState, useMemo } from 'react';
import {
  FileText,
  BookOpen,
  Plus,
  Search,
  Trash2,
  Edit,
  Download,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  Layers,
  Sparkles,
  X,
  FileCheck,
  Globe,
  Lock,
  Tag,
  FileCode,
  Image as ImageIcon,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { StudyNote, PastPaper, MCQ, ContentStatus } from '../../types';
import {
  PAKISTAN_BOARDS,
  ACADEMIC_CLASSES,
  ACADEMIC_SUBJECTS,
  ACADEMIC_CHAPTERS,
} from '../../data/educationalHierarchy';
import { AdminConfirmDialog } from './AdminConfirmDialog';
import { documentBrandingService } from '../../services/documentBrandingService';
import { AdminDocumentLibraryTab } from './AdminDocumentLibraryTab';
import { useSiteSettings } from '../../context/SiteSettingsContext';

interface AdminContentTabsProps {
  type: 'notes' | 'past-papers' | 'documents';
  notes?: StudyNote[];
  pastPapers?: PastPaper[];
  onAddNote?: (note: StudyNote) => void;
  onUpdateNote?: (note: StudyNote) => void;
  onDeleteNote?: (id: string) => void;
  onAddPastPaper?: (paper: PastPaper) => void;
  onUpdatePastPaper?: (paper: PastPaper) => void;
  onDeletePastPaper?: (id: string) => void;
}

export const AdminContentTabs: React.FC<AdminContentTabsProps> = ({
  type,
  notes = [],
  pastPapers = [],
  onAddNote = (_note: StudyNote) => {},
  onUpdateNote = (_note: StudyNote) => {},
  onDeleteNote = (_id: string) => {},
  onAddPastPaper = (_paper: PastPaper) => {},
  onUpdatePastPaper = (_paper: PastPaper) => {},
  onDeletePastPaper = (_id: string) => {},
}) => {
  const { siteName } = useSiteSettings();
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [boardFilter, setBoardFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Confirmation dialog
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetTitle, setDeleteTargetTitle] = useState<string>('');

  // Preview modals
  const [previewNote, setPreviewNote] = useState<StudyNote | null>(null);
  const [previewPaper, setPreviewPaper] = useState<PastPaper | null>(null);

  // Note Modal Form State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StudyNote | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBoard, setNoteBoard] = useState('BISE Lahore');
  const [noteClass, setNoteClass] = useState('Class 10 (Matric Pt 2)');
  const [noteSubject, setNoteSubject] = useState('Physics');
  const [noteChapter, setNoteChapter] = useState('');
  const [noteTopic, setNoteTopic] = useState('');
  const [noteType, setNoteType] = useState<StudyNote['type']>('Notes');
  const [noteSnippet, setNoteSnippet] = useState('');
  const [noteFullContent, setNoteFullContent] = useState('');
  const [noteStatus, setNoteStatus] = useState<ContentStatus>('Published');
  const [notePdfUrl, setNotePdfUrl] = useState('');
  const [noteThumbnail, setNoteThumbnail] = useState('');
  const [noteKeyPointsStr, setNoteKeyPointsStr] = useState('');
  const [noteFile, setNoteFile] = useState<File | null>(null);

  // Past Paper Modal Form State
  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState<PastPaper | null>(null);
  const [paperTitle, setPaperTitle] = useState('');
  const [paperBoard, setPaperBoard] = useState('BISE Lahore');
  const [paperProvince, setPaperProvince] = useState('Punjab');
  const [paperClass, setPaperClass] = useState('Class 10 (Matric Pt 2)');
  const [paperSubject, setPaperSubject] = useState('Physics');
  const [paperChapter, setPaperChapter] = useState('');
  const [paperYear, setPaperYear] = useState<number>(2024);
  const [paperGroup, setPaperGroup] = useState<PastPaper['paperGroup']>('Annual');
  const [paperType, setPaperType] = useState<PastPaper['type']>('Objective (MCQs)');
  const [paperStatus, setPaperStatus] = useState<ContentStatus>('Published');
  const [paperPdfUrl, setPaperPdfUrl] = useState('');
  const [paperThumbnail, setPaperThumbnail] = useState('');
  const [paperDescription, setPaperDescription] = useState('');
  const [paperFile, setPaperFile] = useState<File | null>(null);

  // File upload processing
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  // Available chapters for selected subject & class in form
  const dynamicFormChapters = useMemo(() => {
    const subObj = ACADEMIC_SUBJECTS.find(
      (s) => s.name.toLowerCase() === (type === 'notes' ? noteSubject.toLowerCase() : paperSubject.toLowerCase())
    );
    if (!subObj) return [];
    return ACADEMIC_CHAPTERS.filter((c) => c.subjectId === subObj.id);
  }, [type, noteSubject, paperSubject]);

  // ==========================================
  // 0. DOCUMENT LIBRARY TAB
  // ==========================================
  if (type === 'documents') {
    return <AdminDocumentLibraryTab />;
  }

  // ==========================================
  // 1. NOTES TAB MANAGEMENT
  // ==========================================
  if (type === 'notes') {
    const filteredNotes = notes.filter((n) => {
      const matchSearch =
        !searchQuery ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.chapter.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.board && n.board.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchBoard =
        boardFilter === 'All' || (n.board && n.board.toLowerCase().includes(boardFilter.toLowerCase()));
      const matchSub = subjectFilter === 'All' || n.subject === subjectFilter;
      const matchCls =
        classFilter === 'All' || n.classLevel.toLowerCase().includes(classFilter.toLowerCase());
      const matchStatus = statusFilter === 'All' || (n.status || 'Published') === statusFilter;
      return matchSearch && matchBoard && matchSub && matchCls && matchStatus;
    });

    const handleOpenNoteModal = (note?: StudyNote) => {
      if (note) {
        setEditingNote(note);
        setNoteTitle(note.title);
        setNoteBoard(note.board || 'BISE Lahore');
        setNoteClass(note.classLevel);
        setNoteSubject(note.subject);
        setNoteChapter(note.chapter);
        setNoteTopic(note.topic || '');
        setNoteType(note.type || 'Notes');
        setNoteSnippet(note.contentSnippet || note.description || '');
        setNoteFullContent(note.fullContent || note.content || '');
        setNoteStatus(note.status || 'Published');
        setNotePdfUrl(note.pdfUrl || note.fileUrl || '');
        setNoteThumbnail(note.thumbnail || '');
        setNoteKeyPointsStr(note.keyPoints ? note.keyPoints.join('\n') : '');
      } else {
        setEditingNote(null);
        setNoteTitle('');
        setNoteBoard('BISE Lahore');
        setNoteClass('Class 10 (Matric Pt 2)');
        setNoteSubject('Physics');
        setNoteChapter('Chapter 5: Geometrical Optics');
        setNoteTopic('Refraction and Snell Law');
        setNoteType('Notes');
        setNoteSnippet('');
        setNoteFullContent('');
        setNoteStatus('Published');
        setNotePdfUrl('');
        setNoteThumbnail('');
        setNoteKeyPointsStr('Refraction Index formula n = c / v\nTotal internal reflection conditions\nSnell Law sin(i) / sin(r)');
      }
      setIsNoteModalOpen(true);
    };

    const handleToggleNoteStatus = (note: StudyNote) => {
      const updatedStatus: 'Published' | 'Draft' = note.status === 'Draft' ? 'Published' : 'Draft';
      onUpdateNote({ ...note, status: updatedStatus });
    };

    const handleSaveNote = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!noteTitle.trim()) return;

      setIsUploadingFile(true);
      setFileUploadError(null);

      let finalPdfUrl = notePdfUrl.trim() || undefined;

      try {
        if (noteFile) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result as string;
              resolve(res.split(',')[1] || res);
            };
            reader.onerror = reject;
            reader.readAsDataURL(noteFile);
          });

          const token = localStorage.getItem('tg_auth_token') || sessionStorage.getItem('tg_auth_token');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const uploadRes = await fetch('/api/documents/upload', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              fileBase64: base64,
              filename: noteFile.name,
              title: noteTitle.trim(),
              documentType: 'Study Note',
              board: noteBoard,
              classLevel: noteClass,
              subject: noteSubject,
              chapter: noteChapter,
              topic: noteTopic,
              status: noteStatus,
              allowDuplicate: true,
            }),
          });

          const uploadData = await uploadRes.json();
          if (uploadRes.ok && uploadData.document) {
            finalPdfUrl = `/api/documents/${uploadData.document.id}/download`;
          } else {
            console.warn('Document upload warning:', uploadData.error);
          }
        }

        const pointsArray = noteKeyPointsStr
          .split('\n')
          .map((p) => p.trim())
          .filter(Boolean);

        const payload: StudyNote = {
          id: editingNote ? editingNote.id : `note-${Date.now()}`,
          title: noteTitle.trim(),
          board: noteBoard,
          classLevel: noteClass,
          subject: noteSubject,
          chapter: noteChapter.trim() || 'Unit 1: Fundamentals',
          topic: noteTopic.trim() || undefined,
          type: noteType,
          description: noteSnippet.trim(),
          contentSnippet: noteSnippet.trim() || 'Structured study notes with formulas and solutions.',
          content: noteFullContent.trim() || noteSnippet.trim(),
          fullContent: noteFullContent.trim() || noteSnippet.trim(),
          readTime: '8 mins',
          downloadsCount: editingNote ? (editingNote.downloadsCount ?? 0) : 0,
          status: noteStatus,
          pdfUrl: finalPdfUrl,
          fileUrl: finalPdfUrl,
          thumbnail: noteThumbnail.trim() || undefined,
          keyPoints: pointsArray.length > 0 ? pointsArray : undefined,
        };

        if (editingNote) {
          onUpdateNote(payload);
        } else {
          onAddNote(payload);
        }
        setIsNoteModalOpen(false);
        setNoteFile(null);
      } catch (err: any) {
        console.error('Error saving note:', err);
        setFileUploadError(err.message || 'Failed to upload document');
      } finally {
        setIsUploadingFile(false);
      }
    };

    return (
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              Educational Notes & Handouts Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Create, edit, publish/unpublish, and manage syllabus notes across all Pakistani Boards & Classes
            </p>
          </div>

          <button
            onClick={() => handleOpenNoteModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Study Note</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title, board, chapter, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
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
                  {b.name} ({b.code})
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
              <option value="Published">Published Only</option>
              <option value="Draft">Draft Only</option>
            </select>
          </div>
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const isPublished = note.status !== 'Draft';
            return (
              <div
                key={note.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-2xs transition-all flex flex-col justify-between ${
                  isPublished
                    ? 'border-slate-200 dark:border-slate-800 hover:border-amber-400/60'
                    : 'border-dashed border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                        {note.type || 'Notes'}
                      </span>
                      {note.board && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {note.board}
                        </span>
                      )}
                    </div>

                    {/* 1-Click Publish Toggle */}
                    <button
                      onClick={() => handleToggleNoteStatus(note)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer transition-all flex items-center gap-1 ${
                        isPublished
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                      title="Click to toggle Published / Draft"
                    >
                      {isPublished ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {isPublished ? 'Published' : 'Draft'}
                    </button>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                    {note.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {note.contentSnippet || note.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-3 text-[11px] text-slate-500 font-medium">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">{note.subject}</span>
                    <span>•</span>
                    <span>{note.classLevel}</span>
                    {note.chapter && <span>• {note.chapter}</span>}
                    {note.topic && <span>• {note.topic}</span>}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> {note.downloadsCount ?? 0}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Branded
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => documentBrandingService.downloadStudyNote(note)}
                      className="p-1.5 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer"
                      title="Test Branded PDF Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewNote(note)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                      title="Preview Note"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenNoteModal(note)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
                      title="Edit Note"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTargetId(note.id);
                        setDeleteTargetTitle(note.title);
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredNotes.length === 0 && (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
            No study notes found matching your search and filter criteria.
          </div>
        )}

        {/* Add / Edit Note Modal */}
        {isNoteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 relative max-h-[92vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  {editingNote ? 'Edit Study Note & Handout' : 'Add New Study Note'}
                </h3>
                <button
                  onClick={() => setIsNoteModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveNote} className="space-y-4 text-xs">
                {/* Title */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Note Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="e.g. Class 10 Physics Chapter 5: Geometrical Optics Revision Notes"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                {/* Board + Class */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Education Board
                    </label>
                    <select
                      value={noteBoard}
                      onChange={(e) => setNoteBoard(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="All">All Pakistan Boards</option>
                      {PAKISTAN_BOARDS.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Class Level
                    </label>
                    <select
                      value={noteClass}
                      onChange={(e) => setNoteClass(e.target.value)}
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

                {/* Subject + Note Type + Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Subject
                    </label>
                    <select
                      value={noteSubject}
                      onChange={(e) => setNoteSubject(e.target.value)}
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
                      Format Type
                    </label>
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="Notes">Notes / Revision Handout</option>
                      <option value="Short Questions">Short Questions</option>
                      <option value="Long Questions">Long Questions</option>
                      <option value="Formulas">Formula Sheet</option>
                      <option value="Definitions">Definitions & Key Terms</option>
                      <option value="Summary">Chapter Summary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Publish Status
                    </label>
                    <select
                      value={noteStatus}
                      onChange={(e) => setNoteStatus(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="Published">Published (Public)</option>
                      <option value="Draft">Draft (Admin Only)</option>
                    </select>
                  </div>
                </div>

                {/* Chapter + Topic */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Chapter
                    </label>
                    <input
                      type="text"
                      value={noteChapter}
                      onChange={(e) => setNoteChapter(e.target.value)}
                      placeholder="e.g. Chapter 5: Geometrical Optics"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Topic
                    </label>
                    <input
                      type="text"
                      value={noteTopic}
                      onChange={(e) => setNoteTopic(e.target.value)}
                      placeholder="e.g. Refraction of Light & Snell Law"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>

                {/* Description Snippet */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Short Description / Snippet
                  </label>
                  <textarea
                    rows={2}
                    value={noteSnippet}
                    onChange={(e) => setNoteSnippet(e.target.value)}
                    placeholder="Brief description visible on note card preview..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Full Formatted Content */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Formatted Study Note Content (Markdown / Plain Text)
                  </label>
                  <textarea
                    rows={5}
                    value={noteFullContent}
                    onChange={(e) => setNoteFullContent(e.target.value)}
                    placeholder="Enter complete chapter formulas, step-by-step proofs, diagrams explanations, and solved short questions..."
                    className="w-full p-2.5 font-mono text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Key Bullet Points */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Key Learning Points (One per line)
                  </label>
                  <textarea
                    rows={2}
                    value={noteKeyPointsStr}
                    onChange={(e) => setNoteKeyPointsStr(e.target.value)}
                    placeholder="Snell Law: n1 sin(θ1) = n2 sin(θ2)&#10;Total internal reflection requires i > θc"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* PDF File Upload or URL */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Upload PDF Document (Automatic {siteName} Branding)
                    </label>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(e) => setNoteFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-900 dark:text-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                    />
                    {noteFile && (
                      <div className="mt-1 text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready to upload & brand: {noteFile.name} ({(noteFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Or existing PDF File / Handout URL
                    </label>
                    <input
                      type="text"
                      value={notePdfUrl}
                      onChange={(e) => setNotePdfUrl(e.target.value)}
                      placeholder="https://taleemguru.pk/notes/phy-ch5.pdf or /api/documents/:id/download"
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Thumbnail Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={noteThumbnail}
                    onChange={(e) => setNoteThumbnail(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* TaleemGuru Branding Notice */}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-900 dark:text-emerald-300 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Permanent {siteName} Branding Active:</span> All student and public downloads of this study note are automatically protected and stamped with official branding (<span className="font-mono">© {siteName} | Downloaded from {siteName}</span>) and verified document metadata.
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNoteModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer shadow-xs"
                  >
                    {editingNote ? 'Save Changes' : 'Create Study Note'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Note Preview Modal */}
        {previewNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 relative max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    {previewNote.type || 'Study Notes'}
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">
                    {previewNote.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {previewNote.subject} • {previewNote.classLevel} • {previewNote.board || 'All Boards'}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewNote(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs whitespace-pre-line leading-relaxed text-slate-800 dark:text-slate-200">
                {previewNote.fullContent || previewNote.content || previewNote.contentSnippet}
              </div>

              {previewNote.keyPoints && previewNote.keyPoints.length > 0 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 text-xs text-amber-950 dark:text-amber-200">
                  <div className="font-bold uppercase tracking-wider text-[10px] text-amber-800 dark:text-amber-300 mb-1.5">
                    Key Exam Points:
                  </div>
                  <ul className="space-y-1">
                    {previewNote.keyPoints.map((pt, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setPreviewNote(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        <AdminConfirmDialog
          isOpen={Boolean(deleteTargetId)}
          title="Delete Study Note?"
          message={`Are you sure you want to delete "${deleteTargetTitle}"? This will remove the note from the student repository.`}
          confirmLabel="Delete Note"
          isDestructive={true}
          onConfirm={() => {
            if (deleteTargetId) {
              onDeleteNote(deleteTargetId);
              setDeleteTargetId(null);
            }
          }}
          onCancel={() => setDeleteTargetId(null)}
        />
      </div>
    );
  }

  // ==========================================
  // 2. PAST PAPERS TAB MANAGEMENT
  // ==========================================
  const filteredPapers = pastPapers.filter((p) => {
    const matchSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.board.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBoard = boardFilter === 'All' || p.board === boardFilter;
    const matchSub = subjectFilter === 'All' || p.subject === subjectFilter;
    const matchCls = classFilter === 'All' || p.classLevel.toLowerCase().includes(classFilter.toLowerCase());
    const matchStatus = statusFilter === 'All' || (p.status || 'Published') === statusFilter;
    return matchSearch && matchBoard && matchSub && matchCls && matchStatus;
  });

  const handleOpenPaperModal = (paper?: PastPaper) => {
    if (paper) {
      setEditingPaper(paper);
      setPaperTitle(paper.title);
      setPaperBoard(paper.board);
      setPaperProvince(paper.province);
      setPaperClass(paper.classLevel);
      setPaperSubject(paper.subject);
      setPaperChapter(paper.chapter || '');
      setPaperYear(paper.year);
      setPaperGroup(paper.paperGroup || 'Annual');
      setPaperType(paper.type);
      setPaperStatus(paper.status || 'Published');
      setPaperPdfUrl(paper.fileUrl || paper.pdfUrl || '');
      setPaperThumbnail(paper.thumbnail || '');
      setPaperDescription(paper.description || '');
    } else {
      setEditingPaper(null);
      setPaperTitle('');
      setPaperBoard('BISE Lahore');
      setPaperProvince('Punjab');
      setPaperClass('Class 10 (Matric Pt 2)');
      setPaperSubject('Physics');
      setPaperChapter('');
      setPaperYear(2024);
      setPaperGroup('Annual');
      setPaperType('Objective (MCQs)');
      setPaperStatus('Published');
      setPaperPdfUrl('');
      setPaperThumbnail('');
      setPaperDescription('');
    }
    setIsPaperModalOpen(true);
  };

  const handleTogglePaperStatus = (paper: PastPaper) => {
    const updatedStatus: 'Published' | 'Draft' = paper.status === 'Draft' ? 'Published' : 'Draft';
    onUpdatePastPaper({ ...paper, status: updatedStatus });
  };

  const handleSavePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paperTitle.trim()) return;

    setIsUploadingFile(true);
    setFileUploadError(null);

    let finalPaperUrl = paperPdfUrl.trim() || undefined;

    try {
      if (paperFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result as string;
            resolve(res.split(',')[1] || res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(paperFile);
        });

        const token = localStorage.getItem('tg_auth_token') || sessionStorage.getItem('tg_auth_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const uploadRes = await fetch('/api/documents/upload', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fileBase64: base64,
            filename: paperFile.name,
            title: paperTitle.trim(),
            documentType: 'Past Paper',
            board: paperBoard,
            province: paperProvince,
            classLevel: paperClass,
            subject: paperSubject,
            chapter: paperChapter,
            year: Number(paperYear),
            status: paperStatus,
            allowDuplicate: true,
          }),
        });

        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.document) {
          finalPaperUrl = `/api/documents/${uploadData.document.id}/download`;
        } else {
          console.warn('Past paper upload warning:', uploadData.error);
        }
      }

      const payload: PastPaper = {
        id: editingPaper ? editingPaper.id : `paper-${Date.now()}`,
        title: paperTitle.trim(),
        board: paperBoard,
        province: paperProvince,
        classLevel: paperClass,
        subject: paperSubject,
        chapter: paperChapter.trim() || undefined,
        year: Number(paperYear),
        paperGroup: paperGroup,
        type: paperType,
        questionsCount: editingPaper ? editingPaper.questionsCount : 12,
        status: paperStatus,
        fileUrl: finalPaperUrl,
        pdfUrl: finalPaperUrl,
        thumbnail: paperThumbnail.trim() || undefined,
        description: paperDescription.trim() || undefined,
        questions: editingPaper ? editingPaper.questions : [],
      };

      if (editingPaper) {
        onUpdatePastPaper(payload);
      } else {
        onAddPastPaper(payload);
      }
      setIsPaperModalOpen(false);
      setPaperFile(null);
    } catch (err: any) {
      console.error('Error saving past paper:', err);
      setFileUploadError(err.message || 'Failed to upload past paper');
    } finally {
      setIsUploadingFile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-600" />
            Solved Board Past Papers Catalog
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage SSC, HSSC, Entry Test past examination papers, solutions, and downloadable PDF papers
          </p>
        </div>

        <button
          onClick={() => handleOpenPaperModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Past Paper</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search past papers by title, board, year, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
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
                {b.name} ({b.code})
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

      {/* Past Papers Table / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPapers.map((paper) => {
          const isPublished = paper.status !== 'Draft';
          return (
            <div
              key={paper.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-2xs transition-all flex flex-col justify-between ${
                isPublished
                  ? 'border-slate-200 dark:border-slate-800 hover:border-teal-400/60'
                  : 'border-dashed border-teal-300 dark:border-teal-900/60 bg-teal-50/20 dark:bg-teal-950/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[11px] font-extrabold bg-slate-900 text-white px-2 py-0.5 rounded">
                      {paper.year}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                      {paper.board}
                    </span>
                  </div>

                  {/* 1-Click Publish Toggle */}
                  <button
                    onClick={() => handleTogglePaperStatus(paper)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer transition-all flex items-center gap-1 ${
                      isPublished
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                    }`}
                    title="Click to toggle Published / Draft"
                  >
                    {isPublished ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {isPublished ? 'Published' : 'Draft'}
                  </button>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                  {paper.title}
                </h3>

                <div className="flex flex-wrap gap-1.5 mt-2.5 text-[11px] text-slate-500 font-medium">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{paper.subject}</span>
                  <span>•</span>
                  <span>{paper.classLevel}</span>
                  <span>•</span>
                  <span>{paper.paperGroup || 'Annual'}</span>
                </div>

                {paper.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                    {paper.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">
                    {paper.questionsCount || 12} MCQs Solved
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Branded
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => documentBrandingService.downloadPastPaper(paper)}
                    className="p-1.5 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer"
                    title="Test Branded PDF Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewPaper(paper)}
                    className="p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                    title="Preview Paper"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenPaperModal(paper)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
                    title="Edit Past Paper"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTargetId(paper.id);
                      setDeleteTargetTitle(paper.title);
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                    title="Delete Past Paper"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPapers.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
          No past papers found matching your search and filter criteria.
        </div>
      )}

      {/* Add / Edit Past Paper Modal */}
      {isPaperModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[90vh] my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-600" />
                {editingPaper ? 'Edit Past Paper Record' : 'Upload Past Paper Record'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPaperModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaper} className="flex-1 flex flex-col min-h-0 mt-4 text-xs">
              <div className="flex-1 overflow-y-auto pr-1.5 space-y-4 min-h-0">
              {/* Title */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Past Paper Title *
                </label>
                <input
                  type="text"
                  required
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                  placeholder="e.g. BISE Lahore Class 10 Physics Annual Paper 2024 Group 1"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* Board + Province */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Board
                  </label>
                  <select
                    value={paperBoard}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPaperBoard(val);
                      const bObj = PAKISTAN_BOARDS.find((b) => b.name === val);
                      if (bObj) setPaperProvince(bObj.province);
                    }}
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
                    Province / Jurisdiction
                  </label>
                  <input
                    type="text"
                    value={paperProvince}
                    onChange={(e) => setPaperProvince(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* Class + Subject + Year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Class Level
                  </label>
                  <select
                    value={paperClass}
                    onChange={(e) => setPaperClass(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  >
                    {ACADEMIC_CLASSES.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject
                  </label>
                  <select
                    value={paperSubject}
                    onChange={(e) => setPaperSubject(e.target.value)}
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
                    Examination Year
                  </label>
                  <input
                    type="number"
                    value={paperYear}
                    min={2015}
                    max={2030}
                    onChange={(e) => setPaperYear(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              {/* Paper Group + Paper Type + Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Paper Group
                  </label>
                  <select
                    value={paperGroup}
                    onChange={(e) => setPaperGroup(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="Annual">Annual Exam</option>
                    <option value="Group 1">Group 1 (Morning)</option>
                    <option value="Group 2">Group 2 (Evening)</option>
                    <option value="Supplementary">Supplementary / 2nd Annual</option>
                    <option value="Model Paper">Model Paper</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Paper Type
                  </label>
                  <select
                    value={paperType}
                    onChange={(e) => setPaperType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="Objective (MCQs)">Objective (MCQs)</option>
                    <option value="Subjective (Theory)">Subjective (Theory)</option>
                    <option value="Combined Paper">Combined Paper</option>
                    <option value="Solved Marking Key">Solved Marking Key</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Publish Status
                  </label>
                  <select
                    value={paperStatus}
                    onChange={(e) => setPaperStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="Published">Published (Live)</option>
                    <option value="Draft">Draft (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Remarks
                </label>
                <textarea
                  rows={2}
                  value={paperDescription}
                  onChange={(e) => setPaperDescription(e.target.value)}
                  placeholder="Official solved board examination paper with authentic questions and answer explanations..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* PDF File Upload or URL */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Upload Past Paper PDF (Automatic {siteName} Branding)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setPaperFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-900 dark:text-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer"
                  />
                  {paperFile && (
                    <div className="mt-1 text-[11px] text-teal-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready to upload & brand: {paperFile.name} ({(paperFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Or existing PDF File / Past Paper URL
                  </label>
                  <input
                    type="text"
                    value={paperPdfUrl}
                    onChange={(e) => setPaperPdfUrl(e.target.value)}
                    placeholder="https://taleemguru.pk/pastpapers/lhr-10-phy-2024.pdf or /api/documents/:id/download"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Thumbnail URL (Optional)
                </label>
                <input
                  type="text"
                  value={paperThumbnail}
                  onChange={(e) => setPaperThumbnail(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* TaleemGuru Branding Notice */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-900 dark:text-emerald-300 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Permanent {siteName} Branding Active:</span> All student and public downloads of this past paper are automatically protected and stamped with official branding (<span className="font-mono">© {siteName} | Downloaded from {siteName}</span>).
                </div>
              </div>
              </div>

              {/* Pinned Action Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setIsPaperModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  {editingPaper ? 'Save Changes' : 'Save Past Paper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Past Paper Preview Modal */}
      {previewPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                    {previewPaper.year}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                    {previewPaper.board}
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">
                  {previewPaper.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {previewPaper.subject} • {previewPaper.classLevel} • {previewPaper.paperGroup || 'Annual'}
                </p>
              </div>
              <button
                onClick={() => setPreviewPaper(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Official Board Details:
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {previewPaper.description ||
                  `Verified ${previewPaper.board} ${previewPaper.year} paper with answer keys.`}
              </p>
              <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500">
                <span>Questions: {previewPaper.questionsCount || 12}</span>
                <span>•</span>
                <span>Type: {previewPaper.type}</span>
                <span>•</span>
                <span>Status: {previewPaper.status || 'Published'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setPreviewPaper(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Delete Past Paper?"
        message={`Are you sure you want to permanently delete "${deleteTargetTitle}"?`}
        confirmLabel="Delete Paper"
        isDestructive={true}
        onConfirm={() => {
          if (deleteTargetId) {
            onDeletePastPaper(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
