import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Trash2,
  Edit,
  BookOpen,
  GraduationCap,
  Bookmark,
  School,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { AdminConfirmDialog } from './AdminConfirmDialog';
import { useToast } from '../ui/Toast';
import {
  fetchBoardsApi,
  createBoardApi,
  updateBoardApi,
  deleteBoardApi,
  fetchClassesApi,
  createClassApi,
  updateClassApi,
  deleteClassApi,
  fetchSubjectsApi,
  createSubjectApi,
  updateSubjectApi,
  deleteSubjectApi,
  fetchChaptersApi,
  createChapterApi,
  updateChapterApi,
  deleteChapterApi,
} from '../../lib/api';

interface AdminBoardsClassesTabsProps {
  boards?: any[];
  classes?: any[];
  subjects?: any[];
  chapters?: any[];
  canEdit?: boolean;
}

export const AdminBoardsClassesTabs: React.FC<AdminBoardsClassesTabsProps> = ({
  boards: initialBoards = [],
  classes: initialClasses = [],
  subjects: initialSubjects = [],
  chapters: initialChapters = [],
  canEdit = true,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'boards' | 'classes' | 'subjects' | 'chapters'>('boards');

  // Hierarchy Data States
  const [boards, setBoards] = useState<any[]>(initialBoards);
  const [classes, setClasses] = useState<any[]>(initialClasses);
  const [subjects, setSubjects] = useState<any[]>(initialSubjects);
  const [chapters, setChapters] = useState<any[]>(initialChapters);
  const [isLoading, setIsLoading] = useState(false);

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Active filters for cascading view
  const [selectedBoardId, setSelectedBoardId] = useState<number | 'All'>('All');
  const [selectedClassId, setSelectedClassId] = useState<number | 'All'>('All');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | 'All'>('All');

  // Modals & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formProvince, setFormProvince] = useState('Punjab');
  const [formBoardId, setFormBoardId] = useState<number | ''>('');
  const [formClassId, setFormClassId] = useState<number | ''>('');
  const [formSubjectId, setFormSubjectId] = useState<number | ''>('');
  const [formOrderIndex, setFormOrderIndex] = useState<number>(0);
  const [formDescription, setFormDescription] = useState('');

  // Delete Target Dialog State
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
    type: 'board' | 'class' | 'subject' | 'chapter';
  } | null>(null);

  // Load from database on mount or refresh
  const loadHierarchyData = async () => {
    setIsLoading(true);
    try {
      const [bRes, cRes, sRes, chRes] = await Promise.all([
        fetchBoardsApi(),
        fetchClassesApi(),
        fetchSubjectsApi(),
        fetchChaptersApi(),
      ]);

      if (bRes.success && bRes.data) setBoards(bRes.data);
      if (cRes.success && cRes.data) setClasses(cRes.data);
      if (sRes.success && sRes.data) setSubjects(sRes.data);
      if (chRes.success && chRes.data) setChapters(chRes.data);
    } catch (err) {
      console.error('Failed to load hierarchy data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHierarchyData();
  }, []);

  // Modal Open Handlers
  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingItem(null);
    setFormName('');
    setFormProvince('Punjab');
    setFormBoardId(boards.length > 0 ? boards[0].id : '');
    setFormClassId(classes.length > 0 ? classes[0].id : '');
    setFormSubjectId(subjects.length > 0 ? subjects[0].id : '');
    setFormOrderIndex(0);
    setFormDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any, type: 'board' | 'class' | 'subject' | 'chapter') => {
    setModalMode('edit');
    setEditingItem({ ...item, type });
    setFormName(item.name || '');
    setFormProvince(item.province || 'Punjab');
    setFormBoardId(item.boardId || (boards.length > 0 ? boards[0].id : ''));
    setFormClassId(item.classId || (classes.length > 0 ? classes[0].id : ''));
    setFormSubjectId(item.subjectId || (subjects.length > 0 ? subjects[0].id : ''));
    setFormOrderIndex(item.orderIndex || 0);
    setFormDescription(item.description || '');
    setIsModalOpen(true);
  };

  // Submit Handler
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast({ type: 'error', title: 'Name Required', message: 'Please enter a valid title/name.' });
      return;
    }

    try {
      if (activeTab === 'boards') {
        if (modalMode === 'create') {
          const res = await createBoardApi({ name: formName.trim(), province: formProvince });
          if (res.success) {
            showToast({ type: 'success', title: 'Board Created', message: `Board "${formName}" created.` });
          }
        } else {
          const res = await updateBoardApi(editingItem.id, { name: formName.trim(), province: formProvince });
          if (res.success) {
            showToast({ type: 'success', title: 'Board Updated', message: `Board "${formName}" updated.` });
          }
        }
      } else if (activeTab === 'classes') {
        if (modalMode === 'create') {
          const res = await createClassApi({
            name: formName.trim(),
            boardId: formBoardId ? Number(formBoardId) : undefined,
            orderIndex: formOrderIndex,
          });
          if (res.success) {
            showToast({ type: 'success', title: 'Class Created', message: `Class "${formName}" created.` });
          }
        } else {
          const res = await updateClassApi(editingItem.id, {
            name: formName.trim(),
            boardId: formBoardId ? Number(formBoardId) : undefined,
            orderIndex: formOrderIndex,
          });
          if (res.success) {
            showToast({ type: 'success', title: 'Class Updated', message: `Class "${formName}" updated.` });
          }
        }
      } else if (activeTab === 'subjects') {
        if (modalMode === 'create') {
          const res = await createSubjectApi({
            name: formName.trim(),
            classId: formClassId ? Number(formClassId) : undefined,
            orderIndex: formOrderIndex,
          });
          if (res.success) {
            showToast({ type: 'success', title: 'Subject Created', message: `Subject "${formName}" created.` });
          }
        } else {
          const res = await updateSubjectApi(editingItem.id, {
            name: formName.trim(),
            classId: formClassId ? Number(formClassId) : undefined,
            orderIndex: formOrderIndex,
          });
          if (res.success) {
            showToast({ type: 'success', title: 'Subject Updated', message: `Subject "${formName}" updated.` });
          }
        }
      } else if (activeTab === 'chapters') {
        if (modalMode === 'create') {
          const res = await createChapterApi({
            name: formName.trim(),
            subjectId: formSubjectId ? Number(formSubjectId) : undefined,
            orderIndex: formOrderIndex,
            description: formDescription.trim(),
          });
          if (res.success) {
            showToast({ type: 'success', title: 'Chapter Created', message: `Chapter "${formName}" created.` });
          }
        } else {
          const res = await updateChapterApi(editingItem.id, {
            name: formName.trim(),
            subjectId: formSubjectId ? Number(formSubjectId) : undefined,
            orderIndex: formOrderIndex,
            description: formDescription.trim(),
          });
          if (res.success) {
            showToast({ type: 'success', title: 'Chapter Updated', message: `Chapter "${formName}" updated.` });
          }
        }
      }

      setIsModalOpen(false);
      loadHierarchyData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Operation Failed', message: err.message || 'Server error' });
    }
  };

  // Delete Handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'board') {
        await deleteBoardApi(deleteTarget.id);
      } else if (deleteTarget.type === 'class') {
        await deleteClassApi(deleteTarget.id);
      } else if (deleteTarget.type === 'subject') {
        await deleteSubjectApi(deleteTarget.id);
      } else if (deleteTarget.type === 'chapter') {
        await deleteChapterApi(deleteTarget.id);
      }

      showToast({
        type: 'success',
        title: 'Deleted Successfully',
        message: `${deleteTarget.type.toUpperCase()} "${deleteTarget.name}" deleted from database.`,
      });
      setDeleteTarget(null);
      loadHierarchyData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Delete Failed', message: err.message });
    }
  };

  // Filtered lists
  const filteredBoards = boards.filter((b) =>
    !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase()) || (b.province && b.province.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredClasses = classes.filter((c) => {
    const matchSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBoard = selectedBoardId === 'All' || c.boardId === Number(selectedBoardId);
    return matchSearch && matchBoard;
  });

  const filteredSubjects = subjects.filter((s) => {
    const matchSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchClass = selectedClassId === 'All' || s.classId === Number(selectedClassId);
    return matchSearch && matchClass;
  });

  const filteredChapters = chapters.filter((ch) => {
    const matchSearch = !searchQuery || ch.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject = selectedSubjectId === 'All' || ch.subjectId === Number(selectedSubjectId);
    return matchSearch && matchSubject;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-blue-600" />
            Curriculum Hierarchy Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage educational structure: Boards → Classes → Subjects → Chapters
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>
              Add New{' '}
              {activeTab === 'boards'
                ? 'Board'
                : activeTab === 'classes'
                ? 'Class'
                : activeTab === 'subjects'
                ? 'Subject'
                : 'Chapter'}
            </span>
          </button>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => {
            setActiveTab('boards');
            setSearchQuery('');
          }}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'boards'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Boards ({boards.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('classes');
            setSearchQuery('');
          }}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'classes'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Classes ({classes.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('subjects');
            setSearchQuery('');
          }}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'subjects'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Subjects ({subjects.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('chapters');
            setSearchQuery('');
          }}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'chapters'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Chapters ({chapters.length})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Dynamic Context Filters based on active tab */}
        {activeTab === 'classes' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0 font-medium">Board:</span>
            <select
              value={selectedBoardId}
              onChange={(e) => setSelectedBoardId(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              className="text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Boards</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0 font-medium">Class:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              className="text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'chapters' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0 font-medium">Subject:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              className="text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab Content 1: Boards */}
      {activeTab === 'boards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBoards.map((b) => (
            <div
              key={b.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 hover:border-blue-400/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                  <School className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {b.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {b.province || 'Pakistan'} • ID #{b.id}
                  </p>
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(b, 'board')}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ id: b.id, name: b.name, type: 'board' })}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab Content 2: Classes */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((c) => {
            const parentBoard = boards.find((b) => b.id === c.boardId);
            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 hover:border-blue-400/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {c.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {parentBoard ? parentBoard.name : 'General'} • Order: {c.orderIndex || 0}
                    </p>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(c, 'class')}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: c.id, name: c.name, type: 'class' })}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab Content 3: Subjects */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((s) => {
            const parentClass = classes.find((c) => c.id === s.classId);
            return (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 hover:border-blue-400/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {s.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {parentClass ? parentClass.name : 'Core Curriculum'}
                    </p>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(s, 'subject')}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: s.id, name: s.name, type: 'subject' })}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab Content 4: Chapters */}
      {activeTab === 'chapters' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChapters.map((ch) => {
            const parentSubject = subjects.find((s) => s.id === ch.subjectId);
            return (
              <div
                key={ch.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 hover:border-blue-400/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                    <Bookmark className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {ch.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {parentSubject ? parentSubject.name : 'General'}
                      {ch.description ? ` • ${ch.description}` : ''}
                    </p>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(ch, 'chapter')}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: ch.id, name: ch.name, type: 'chapter' })}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[90vh] my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {modalMode === 'create' ? 'Add' : 'Edit'}{' '}
                {activeTab === 'boards'
                  ? 'Board'
                  : activeTab === 'classes'
                  ? 'Class'
                  : activeTab === 'subjects'
                  ? 'Subject'
                  : 'Chapter'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="flex-1 flex flex-col min-h-0 mt-4 text-xs">
              <div className="flex-1 overflow-y-auto pr-1.5 space-y-4">
              {/* Name */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Name / Title *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. BISE Lahore, Physics, Class 10..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Province if Board */}
              {activeTab === 'boards' && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Province
                  </label>
                  <select
                    value={formProvince}
                    onChange={(e) => setFormProvince(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Punjab">Punjab</option>
                    <option value="Sindh">Sindh</option>
                    <option value="KPK">Khyber Pakhtunkhwa</option>
                    <option value="Balochistan">Balochistan</option>
                    <option value="Federal / Islamabad">Federal / Islamabad</option>
                    <option value="AJK / Gilgit">AJK / Gilgit</option>
                  </select>
                </div>
              )}

              {/* Parent Board if Class */}
              {activeTab === 'classes' && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Associated Board (Optional)
                  </label>
                  <select
                    value={formBoardId}
                    onChange={(e) => setFormBoardId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">-- None (All Boards) --</option>
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Parent Class if Subject */}
              {activeTab === 'subjects' && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Associated Class
                  </label>
                  <select
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Parent Subject if Chapter */}
              {activeTab === 'chapters' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Associated Board
                    </label>
                    <select
                      value={formBoardId}
                      onChange={(e) => setFormBoardId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="">-- All Boards --</option>
                      {boards.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Associated Class
                    </label>
                    <select
                      value={formClassId}
                      onChange={(e) => {
                        const newClassId = e.target.value ? Number(e.target.value) : '';
                        setFormClassId(newClassId);
                        if (newClassId) {
                          const matchingSubs = subjects.filter((s) => Number(s.classId) === newClassId);
                          const curSub = subjects.find((s) => Number(s.id) === Number(formSubjectId));
                          if (matchingSubs.length > 0) {
                            const isCurInMatching = matchingSubs.some((s) => Number(s.id) === Number(formSubjectId));
                            if (!isCurInMatching) {
                              const sameName = curSub
                                ? matchingSubs.find((s) => s.name.trim().toLowerCase() === curSub.name.trim().toLowerCase())
                                : null;
                              setFormSubjectId(sameName ? sameName.id : matchingSubs[0].id);
                            }
                          } else {
                            setFormSubjectId('');
                          }
                        }
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="">-- All Classes --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Associated Subject
                    </label>
                    <select
                      value={formSubjectId}
                      onChange={(e) => {
                        const newSubjectId = e.target.value ? Number(e.target.value) : '';
                        setFormSubjectId(newSubjectId);
                        if (newSubjectId) {
                          const sub = subjects.find((s) => Number(s.id) === Number(newSubjectId));
                          if (sub && sub.classId) setFormClassId(sub.classId);
                        }
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Select Subject --</option>
                      {(formClassId ? subjects.filter((s) => Number(s.classId) === Number(formClassId)) : subjects).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.className || 'General'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Description / Overview
                    </label>
                    <input
                      type="text"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="e.g. Fundamental physics concepts"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </>
              )}
              </div>

              {/* Pinned Action Buttons Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AdminConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.type.toUpperCase()}?`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This may affect linked educational hierarchy records.`}
        confirmLabel="Confirm Delete"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
