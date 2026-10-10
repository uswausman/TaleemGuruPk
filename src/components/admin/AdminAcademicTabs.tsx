import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  School,
  BookOpen,
  Layers,
  Sparkles,
  Plus,
  Search,
  Trash2,
  Edit,
  Check,
  X,
  MapPin,
  RefreshCw,
  AlertTriangle,
  FileQuestion,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FolderTree,
  Filter,
  ArrowRight,
  Info,
  ListOrdered,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  fetchAcademicSummaryApi,
  fetchAcademicBoardsApi,
  createAcademicBoardApi,
  updateAcademicBoardApi,
  deleteAcademicBoardApi,
  checkAcademicBoardDepsApi,
  fetchAcademicClassesApi,
  createAcademicClassApi,
  updateAcademicClassApi,
  deleteAcademicClassApi,
  checkAcademicClassDepsApi,
  fetchAcademicSubjectsApi,
  createAcademicSubjectApi,
  updateAcademicSubjectApi,
  deleteAcademicSubjectApi,
  checkAcademicSubjectDepsApi,
  fetchAcademicChaptersApi,
  createAcademicChapterApi,
  updateAcademicChapterApi,
  deleteAcademicChapterApi,
  checkAcademicChapterDepsApi,
  fetchAcademicEntryTestCategoriesApi,
  createAcademicEntryTestCategoryApi,
  updateAcademicEntryTestCategoryApi,
  deleteAcademicEntryTestCategoryApi,
  checkAcademicEntryTestCategoryDepsApi,
  fetchAcademicEntryTestSubcategoriesApi,
  createAcademicEntryTestSubcategoryApi,
  updateAcademicEntryTestSubcategoryApi,
  deleteAcademicEntryTestSubcategoryApi,
  checkAcademicEntryTestSubcategoryDepsApi,
} from '../../lib/api';
import { AdminConfirmDialog } from './AdminConfirmDialog';
import { useToast } from '../ui/Toast';

export type AcademicTabSection = 'boards' | 'classes' | 'subjects' | 'chapters' | 'entry-tests';

interface AdminAcademicTabsProps {
  initialSection?: AcademicTabSection;
  canEdit?: boolean;
}

export const AdminAcademicTabs: React.FC<AdminAcademicTabsProps> = ({
  initialSection = 'boards',
  canEdit = true,
}) => {
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<AcademicTabSection>(initialSection);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data Collections from PostgreSQL Database
  const [boards, setBoards] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [entryTestCategories, setEntryTestCategories] = useState<any[]>([]);
  const [entryTestSubcategories, setEntryTestSubcategories] = useState<any[]>([]);

  // Search Queries
  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('All');
  const [selectedBoardFilter, setSelectedBoardFilter] = useState<string>('All');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('All');
  const [entryTestTypeFilter, setEntryTestTypeFilter] = useState<string>('All');
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  // Modals & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [entryTestFormMode, setEntryTestFormMode] = useState<'parent' | 'subcategory'>('parent');

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formEstablishmentYear, setFormEstablishmentYear] = useState<number | ''>('');
  const [formProvince, setFormProvince] = useState('Punjab');
  const [formCity, setFormCity] = useState('');
  const [formBoardId, setFormBoardId] = useState<number | ''>('');
  const [formBoardIds, setFormBoardIds] = useState<number[]>([]);
  const [formClassId, setFormClassId] = useState<number | ''>('');
  const [formClassIds, setFormClassIds] = useState<number[]>([]);
  const [formSubjectId, setFormSubjectId] = useState<number | ''>('');
  const [formParentCategoryId, setFormParentCategoryId] = useState<number | ''>('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formDraftStatus, setFormDraftStatus] = useState<'Published' | 'Draft'>('Published');
  const [formType, setFormType] = useState('Medical');
  const [formOrganizer, setFormOrganizer] = useState('');
  const [formTotalMarks, setFormTotalMarks] = useState<number | ''>('');
  const [formDuration, setFormDuration] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion & Dependency State
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
    type: AcademicTabSection | 'entry-test-subcategories';
  } | null>(null);
  const [dependencyWarning, setDependencyWarning] = useState<{
    hasDeps: boolean;
    total: number;
    details: Record<string, number>;
    name: string;
  } | null>(null);
  const [isCheckingDeps, setIsCheckingDeps] = useState(false);

  // Load all academic data authoritatively from database
  const loadAcademicData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [bRes, cRes, sRes, chRes, etcRes, etsRes] = await Promise.all([
        fetchAcademicBoardsApi(),
        fetchAcademicClassesApi(),
        fetchAcademicSubjectsApi(),
        fetchAcademicChaptersApi(),
        fetchAcademicEntryTestCategoriesApi(),
        fetchAcademicEntryTestSubcategoriesApi(),
      ]);

      if (bRes.success && bRes.data) setBoards(bRes.data);
      if (cRes.success && cRes.data) setClasses(cRes.data);
      if (sRes.success && sRes.data) setSubjects(sRes.data);
      if (chRes.success && chRes.data) setChapters(chRes.data);
      if (etcRes.success && etcRes.data) setEntryTestCategories(etcRes.data);
      if (etsRes.success && etsRes.data) setEntryTestSubcategories(etsRes.data);
    } catch (error) {
      console.error('Failed to load academic data from database:', error);
      showToast({
        type: 'error',
        title: 'Data Load Error',
        message: 'Failed to load academic data from the database.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAcademicData();
  }, []);

  // Sync initialSection prop if changes
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
      setSearchQuery('');
    }
  }, [initialSection]);

  const toggleCategoryExpand = (catId: number) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Memoized available classes for chapter modal based on selected Board
  const availableClassesForChapter = useMemo(() => {
    if (!formBoardId) return classes;
    return classes.filter(
      (c) =>
        Number(c.boardId) === Number(formBoardId) ||
        (Array.isArray(c.boardIds) && c.boardIds.includes(Number(formBoardId)))
    );
  }, [classes, formBoardId]);

  // Memoized available subjects for chapter modal based on selected Board & Class
  const availableSubjectsForChapter = useMemo(() => {
    return subjects.filter((s) => {
      const matchClass =
        !formClassId ||
        Number(s.classId) === Number(formClassId) ||
        (Array.isArray(s.classIds) && s.classIds.includes(Number(formClassId)));

      const matchBoard =
        !formBoardId ||
        !s.boardId ||
        Number(s.boardId) === Number(formBoardId) ||
        (Array.isArray(s.boardIds) && (s.boardIds.length === 0 || s.boardIds.includes(Number(formBoardId))));

      return matchClass && matchBoard;
    });
  }, [subjects, formClassId, formBoardId]);

  // Handle board selection change when editing or adding a chapter
  const handleBoardChangeForChapter = (newBoardId: number | '') => {
    setFormBoardId(newBoardId);

    const validClasses = newBoardId
      ? classes.filter(
          (c) =>
            Number(c.boardId) === Number(newBoardId) ||
            (Array.isArray(c.boardIds) && c.boardIds.includes(Number(newBoardId)))
        )
      : classes;

    let targetClassId = formClassId;
    if (validClasses.length > 0) {
      const isCurValid = validClasses.some((c) => Number(c.id) === Number(formClassId));
      if (!isCurValid) {
        targetClassId = validClasses[0].id;
        setFormClassId(targetClassId);
      }
    } else {
      targetClassId = '';
      setFormClassId('');
    }

    const validSubjects = subjects.filter((s) => {
      const matchClass =
        !targetClassId ||
        Number(s.classId) === Number(targetClassId) ||
        (Array.isArray(s.classIds) && s.classIds.includes(Number(targetClassId)));
      const matchBoard =
        !newBoardId ||
        !s.boardId ||
        Number(s.boardId) === Number(newBoardId) ||
        (Array.isArray(s.boardIds) && (s.boardIds.length === 0 || s.boardIds.includes(Number(newBoardId))));
      return matchClass && matchBoard;
    });

    if (validSubjects.length > 0) {
      const isCurSubValid = validSubjects.some((s) => Number(s.id) === Number(formSubjectId));
      if (!isCurSubValid) {
        setFormSubjectId(validSubjects[0].id);
      }
    } else {
      setFormSubjectId('');
    }
  };

  // Handle class selection change when editing or adding a chapter
  const handleClassChangeForChapter = (newClassId: number | '') => {
    setFormClassId(newClassId);

    const validSubjects = subjects.filter((s) => {
      const matchClass =
        !newClassId ||
        Number(s.classId) === Number(newClassId) ||
        (Array.isArray(s.classIds) && s.classIds.includes(Number(newClassId)));
      const matchBoard =
        !formBoardId ||
        !s.boardId ||
        Number(s.boardId) === Number(formBoardId) ||
        (Array.isArray(s.boardIds) && (s.boardIds.length === 0 || s.boardIds.includes(Number(formBoardId))));
      return matchClass && matchBoard;
    });

    if (validSubjects.length > 0) {
      const isCurSubValid = validSubjects.some((s) => Number(s.id) === Number(formSubjectId));
      if (!isCurSubValid) {
        const curSub = subjects.find((s) => Number(s.id) === Number(formSubjectId));
        const sameName = curSub
          ? validSubjects.find((s) => s.name.trim().toLowerCase() === curSub.name.trim().toLowerCase())
          : null;
        setFormSubjectId(sameName ? sameName.id : validSubjects[0].id);
      }
    } else {
      setFormSubjectId('');
    }
  };

  // Handle subject selection change when editing or adding a chapter
  const handleSubjectChangeForChapter = (newSubjectId: number | '') => {
    setFormSubjectId(newSubjectId);
    if (!newSubjectId) return;

    const sub = subjects.find((s) => Number(s.id) === Number(newSubjectId));
    if (sub) {
      if (sub.classId) setFormClassId(sub.classId);
      if (sub.boardId) setFormBoardId(sub.boardId);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingItem(null);
    setEntryTestFormMode('parent');
    setFormName('');
    setFormCode('');
    setFormEstablishmentYear('');
    setFormProvince('Punjab');
    setFormCity('');
    setFormStatus('Active');
    setFormDraftStatus('Published');
    setFormType('Medical');
    setFormOrganizer('');
    setFormTotalMarks('');
    setFormDuration('');
    setFormDescription('');

    const defaultBoardId = boards.length > 0 ? boards[0].id : '';
    const defaultClassId = classes.length > 0 ? classes[0].id : '';

    setFormBoardId(defaultBoardId);
    setFormBoardIds(boards.map((b) => b.id));
    setFormClassId(defaultClassId);
    setFormClassIds(classes.length > 0 ? [classes[0].id] : []);

    if (activeSection === 'chapters') {
      const initBoardId = defaultBoardId;
      const validClasses = initBoardId
        ? classes.filter(
            (c) =>
              Number(c.boardId) === Number(initBoardId) ||
              (Array.isArray(c.boardIds) && c.boardIds.includes(Number(initBoardId)))
          )
        : classes;
      const initClassId = validClasses.length > 0 ? validClasses[0].id : defaultClassId;
      setFormClassId(initClassId);

      const validSubs = subjects.filter((s) => {
        const mC =
          !initClassId ||
          Number(s.classId) === Number(initClassId) ||
          (Array.isArray(s.classIds) && s.classIds.includes(Number(initClassId)));
        const mB =
          !initBoardId ||
          !s.boardId ||
          Number(s.boardId) === Number(initBoardId) ||
          (Array.isArray(s.boardIds) && (s.boardIds.length === 0 || s.boardIds.includes(Number(initBoardId))));
        return mC && mB;
      });
      setFormSubjectId(validSubs.length > 0 ? validSubs[0].id : (subjects.length > 0 ? subjects[0].id : ''));
    } else {
      setFormSubjectId(subjects.length > 0 ? subjects[0].id : '');
    }

    setFormParentCategoryId(entryTestCategories.length > 0 ? entryTestCategories[0].id : '');
    setIsModalOpen(true);
  };

  // Open Create Subcategory Modal specifically
  const handleOpenCreateSubcategory = (parentCategory?: any) => {
    setActiveSection('entry-tests');
    setModalMode('create');
    setEditingItem(null);
    setEntryTestFormMode('subcategory');
    setFormName('');
    setFormDescription('');
    setFormStatus('Active');
    setFormParentCategoryId(parentCategory?.id || (entryTestCategories.length > 0 ? entryTestCategories[0].id : ''));
    setIsModalOpen(true);
  };

  // Open Edit Subcategory Modal
  const handleOpenEditSubcategory = (subItem: any) => {
    setActiveSection('entry-tests');
    setModalMode('edit');
    setEditingItem(subItem);
    setEntryTestFormMode('subcategory');
    setFormName(subItem.name || '');
    setFormParentCategoryId(subItem.categoryId || (entryTestCategories.length > 0 ? entryTestCategories[0].id : ''));
    setFormDescription(subItem.description || '');
    setFormStatus(subItem.status === 'Inactive' ? 'Inactive' : 'Active');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: any) => {
    setModalMode('edit');
    setEditingItem(item);
    setEntryTestFormMode('parent');
    setFormName(item.name || '');
    setFormCode(item.code || '');
    setFormEstablishmentYear(item.establishmentYear || '');
    setFormProvince(item.province || 'Punjab');
    setFormCity(item.city || '');
    setFormStatus(item.status === 'Inactive' ? 'Inactive' : 'Active');
    setFormDraftStatus(item.draftStatus === 'Draft' ? 'Draft' : 'Published');

    const itemBoardId = item.boardId || (boards.length > 0 ? boards[0].id : '');
    const itemBoardIds =
      item.boardIds && item.boardIds.length > 0 ? item.boardIds : itemBoardId ? [itemBoardId] : [];
    setFormBoardId(itemBoardId);
    setFormBoardIds(itemBoardIds);

    const itemClassId = item.classId || '';
    const itemClassIds =
      item.classIds && item.classIds.length > 0 ? item.classIds : itemClassId ? [itemClassId] : [];
    setFormClassId(itemClassId || (classes.length > 0 ? classes[0].id : ''));
    setFormClassIds(itemClassIds);

    const itemSubjectId = item.subjectId || '';

    if (activeSection === 'chapters') {
      const sub = subjects.find((s) => Number(s.id) === Number(itemSubjectId));
      const effectiveBoardId = item.boardId || sub?.boardId || itemBoardId;
      const effectiveClassId = itemClassId || sub?.classId || (classes.length > 0 ? classes[0].id : '');
      setFormBoardId(effectiveBoardId);
      setFormClassId(effectiveClassId);
      setFormSubjectId(itemSubjectId || (subjects.length > 0 ? subjects[0].id : ''));
    } else {
      setFormSubjectId(itemSubjectId || (subjects.length > 0 ? subjects[0].id : ''));
    }

    setFormType(item.type || 'Medical');
    setFormOrganizer(item.organizer || '');
    setFormTotalMarks(item.totalMarks || '');
    setFormDuration(item.duration || '');
    setFormDescription(item.description || '');

    setIsModalOpen(true);
  };

  // Quick Toggle Status ('Active' <-> 'Inactive')
  const handleToggleStatus = async (item: any, section: AcademicTabSection | 'entry-test-subcategories') => {
    if (!canEdit) return;
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    try {
      let res: any;
      if (section === 'boards') {
        res = await updateAcademicBoardApi(item.id, { status: newStatus });
      } else if (section === 'classes') {
        res = await updateAcademicClassApi(item.id, { status: newStatus });
      } else if (section === 'subjects') {
        res = await updateAcademicSubjectApi(item.id, { status: newStatus });
      } else if (section === 'chapters') {
        res = await updateAcademicChapterApi(item.id, { status: newStatus });
      } else if (section === 'entry-tests') {
        res = await updateAcademicEntryTestCategoryApi(item.id, { status: newStatus });
      } else if (section === 'entry-test-subcategories') {
        res = await updateAcademicEntryTestSubcategoryApi(item.id, { status: newStatus });
      }

      if (res?.success) {
        showToast({
          type: 'success',
          title: 'Status Updated',
          message: `"${item.name}" marked as ${newStatus}.`,
        });
        await loadAcademicData(true);
      } else {
        showToast({
          type: 'error',
          title: 'Update Failed',
          message: res?.error || 'Failed to update status.',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'An unexpected error occurred.',
      });
    }
  };

  // Handle Form Submit
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast({
        type: 'error',
        title: 'Name Required',
        message: 'Please enter a valid title/name.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let res: any;

      if (activeSection === 'boards') {
        if (modalMode === 'create') {
          res = await createAcademicBoardApi({
            name: formName.trim(),
            code: formCode.trim() || undefined,
            establishmentYear: formEstablishmentYear ? Number(formEstablishmentYear) : undefined,
            province: formProvince.trim() || undefined,
            city: formCity.trim() || undefined,
            description: formDescription.trim() || undefined,
            status: formStatus,
          });
        } else {
          res = await updateAcademicBoardApi(editingItem.id, {
            name: formName.trim(),
            code: formCode.trim() || undefined,
            establishmentYear: formEstablishmentYear ? Number(formEstablishmentYear) : undefined,
            province: formProvince.trim() || undefined,
            city: formCity.trim() || undefined,
            description: formDescription.trim() || undefined,
            status: formStatus,
          });
        }
      } else if (activeSection === 'classes') {
        const targetBoardIds = formBoardIds.length > 0 ? formBoardIds : formBoardId ? [Number(formBoardId)] : [];
        const payload = {
          name: formName.trim(),
          boardId: targetBoardIds[0] || 1,
          boardIds: targetBoardIds,
          status: formStatus,
        };
        if (modalMode === 'create') {
          res = await createAcademicClassApi(payload);
        } else {
          res = await updateAcademicClassApi(editingItem.id, payload);
        }
      } else if (activeSection === 'subjects') {
        const targetClassIds = formClassIds.length > 0 ? formClassIds : formClassId ? [Number(formClassId)] : [1];
        const targetBoardIds = formBoardIds.length > 0 ? formBoardIds : formBoardId ? [Number(formBoardId)] : [];
        const payload = {
          name: formName.trim(),
          classId: targetClassIds[0],
          classIds: targetClassIds,
          boardId: targetBoardIds[0] || undefined,
          boardIds: targetBoardIds,
          status: formStatus,
        };
        if (modalMode === 'create') {
          res = await createAcademicSubjectApi(payload);
        } else {
          res = await updateAcademicSubjectApi(editingItem.id, payload);
        }
      } else if (activeSection === 'chapters') {
        if (!formSubjectId) {
          showToast({
            type: 'error',
            title: 'Subject Required',
            message: 'Please select an associated subject for this chapter.',
          });
          setIsSubmitting(false);
          return;
        }

        const selectedSub = subjects.find((s) => Number(s.id) === Number(formSubjectId));
        const targetClassId = formClassId ? Number(formClassId) : (selectedSub?.classId || undefined);
        const targetBoardId = formBoardId ? Number(formBoardId) : (selectedSub?.boardId || undefined);

        if (targetClassId && selectedSub && Number(selectedSub.classId) !== Number(targetClassId)) {
          const selClass = classes.find((c) => Number(c.id) === Number(targetClassId));
          showToast({
            type: 'error',
            title: 'Class/Subject Mismatch',
            message: `Selected subject "${selectedSub.name}" does not belong to ${selClass?.name || 'the selected class'}.`,
          });
          setIsSubmitting(false);
          return;
        }

        const payload = {
          name: formName.trim(),
          subjectId: Number(formSubjectId),
          classId: targetClassId,
          boardId: targetBoardId,
          status: formStatus,
          draftStatus: formDraftStatus,
        };

        if (modalMode === 'create') {
          res = await createAcademicChapterApi(payload);
        } else {
          res = await updateAcademicChapterApi(editingItem.id, payload);
        }
      } else if (activeSection === 'entry-tests') {
        if (entryTestFormMode === 'subcategory') {
          if (!formParentCategoryId) {
            showToast({
              type: 'error',
              title: 'Parent Category Required',
              message: 'Please select a parent category for the subcategory.',
            });
            setIsSubmitting(false);
            return;
          }

          if (modalMode === 'create') {
            res = await createAcademicEntryTestSubcategoryApi({
              categoryId: Number(formParentCategoryId),
              name: formName.trim(),
              description: formDescription.trim() || undefined,
              status: formStatus,
            });
          } else {
            res = await updateAcademicEntryTestSubcategoryApi(editingItem.id, {
              categoryId: Number(formParentCategoryId),
              name: formName.trim(),
              description: formDescription.trim() || undefined,
              status: formStatus,
            });
          }
        } else {
          if (modalMode === 'create') {
            res = await createAcademicEntryTestCategoryApi({
              name: formName.trim(),
              type: formType.trim(),
              description: formDescription.trim() || undefined,
              organizer: formOrganizer.trim() || undefined,
              totalMarks: formTotalMarks ? Number(formTotalMarks) : undefined,
              duration: formDuration.trim() || undefined,
              status: formStatus,
            });
          } else {
            res = await updateAcademicEntryTestCategoryApi(editingItem.id, {
              name: formName.trim(),
              type: formType.trim(),
              description: formDescription.trim() || undefined,
              organizer: formOrganizer.trim() || undefined,
              totalMarks: formTotalMarks ? Number(formTotalMarks) : undefined,
              duration: formDuration.trim() || undefined,
              status: formStatus,
            });
          }
        }
      }

      if (res?.success) {
        showToast({
          type: 'success',
          title: modalMode === 'create' ? 'Item Created' : 'Item Updated',
          message: `"${formName}" has been successfully saved to the database.`,
        });
        setIsModalOpen(false);
        await loadAcademicData(true);
      } else {
        showToast({
          type: 'error',
          title: 'Operation Failed',
          message: res?.error || 'Failed to save item. Duplicate names in the same parent category are not allowed.',
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

  // Check Dependencies and Request Deletion
  const handleRequestDelete = async (item: any, section: AcademicTabSection | 'entry-test-subcategories') => {
    setIsCheckingDeps(true);
    try {
      let depRes: any;
      if (section === 'boards') depRes = await checkAcademicBoardDepsApi(item.id);
      else if (section === 'classes') depRes = await checkAcademicClassDepsApi(item.id);
      else if (section === 'subjects') depRes = await checkAcademicSubjectDepsApi(item.id);
      else if (section === 'chapters') depRes = await checkAcademicChapterDepsApi(item.id);
      else if (section === 'entry-tests') depRes = await checkAcademicEntryTestCategoryDepsApi(item.id);
      else if (section === 'entry-test-subcategories') depRes = await checkAcademicEntryTestSubcategoryDepsApi(item.id);

      if (depRes?.success && depRes?.dependencies?.hasDependencies) {
        setDependencyWarning({
          hasDeps: true,
          total: depRes.dependencies.total,
          details: depRes.dependencies.details,
          name: item.name,
        });
        return;
      }

      // Safe to delete confirmation
      setDeleteTarget({
        id: item.id,
        name: item.name,
        type: section,
      });
    } catch (error) {
      console.error('Error checking dependencies:', error);
      setDeleteTarget({
        id: item.id,
        name: item.name,
        type: section,
      });
    } finally {
      setIsCheckingDeps(false);
    }
  };

  // Confirm Deletion
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, name, type } = deleteTarget;

    try {
      let res: any;
      if (type === 'boards') res = await deleteAcademicBoardApi(id);
      else if (type === 'classes') res = await deleteAcademicClassApi(id);
      else if (type === 'subjects') res = await deleteAcademicSubjectApi(id);
      else if (type === 'chapters') res = await deleteAcademicChapterApi(id);
      else if (type === 'entry-tests') res = await deleteAcademicEntryTestCategoryApi(id);
      else if (type === 'entry-test-subcategories') res = await deleteAcademicEntryTestSubcategoryApi(id);

      if (res?.success) {
        showToast({
          type: 'success',
          title: 'Item Deleted',
          message: `"${name}" was deleted from the database.`,
        });
        setDeleteTarget(null);
        await loadAcademicData(true);
      } else {
        setDeleteTarget(null);
        if (res?.dependencies) {
          setDependencyWarning({
            hasDeps: true,
            total: Object.values(res.dependencies as Record<string, number>).reduce((a: number, b: number) => a + b, 0),
            details: res.dependencies,
            name,
          });
        } else {
          showToast({
            type: 'error',
            title: 'Deletion Prevented',
            message: res?.error || 'Could not delete item because dependencies exist.',
          });
        }
      }
    } catch (err: any) {
      setDeleteTarget(null);
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'An error occurred while attempting deletion.',
      });
    }
  };

  // Filtered Lists
  const filteredBoards = useMemo(() => {
    return boards.filter((b) => {
      const matchSearch =
        !searchQuery ||
        (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.city || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchProv = provinceFilter === 'All' || b.province === provinceFilter;
      return matchSearch && matchProv;
    });
  }, [boards, searchQuery, provinceFilter]);

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchSearch =
        !searchQuery ||
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.boardName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchBoard =
        selectedBoardFilter === 'All' || String(c.boardId) === String(selectedBoardFilter);
      return matchSearch && matchBoard;
    });
  }, [classes, searchQuery, selectedBoardFilter]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchSearch =
        !searchQuery ||
        (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.className || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass =
        selectedClassFilter === 'All' || String(s.classId) === String(selectedClassFilter);
      return matchSearch && matchClass;
    });
  }, [subjects, searchQuery, selectedClassFilter]);

  const filteredChapters = useMemo(() => {
    return chapters.filter((ch) => {
      const matchSearch =
        !searchQuery ||
        (ch.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ch.subjectName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchSubject =
        selectedSubjectFilter === 'All' || String(ch.subjectId) === String(selectedSubjectFilter);
      return matchSearch && matchSubject;
    });
  }, [chapters, searchQuery, selectedSubjectFilter]);

  const filteredEntryTests = useMemo(() => {
    return entryTestCategories.filter((etc) => {
      const matchSearch =
        !searchQuery ||
        (etc.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (etc.type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (etc.organizer || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchType =
        entryTestTypeFilter === 'All' || etc.type === entryTestTypeFilter;
      return matchSearch && matchType;
    });
  }, [entryTestCategories, searchQuery, entryTestTypeFilter]);

  const provinces = ['Punjab', 'Federal', 'Sindh', 'KPK', 'Balochistan', 'AJK', 'Gilgit-Baltistan'];
  const entryTestTypes = ['Medical', 'Engineering', 'Armed Forces', 'Civil Services', 'Law', 'Business', 'General'];

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Academic Management
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Authoritative curriculum hierarchy: Boards, Classes, Subjects, Chapters & Entry Tests
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadAcademicData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            title="Reload from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>

          {canEdit && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                Add{' '}
                {activeSection === 'boards'
                  ? 'Board'
                  : activeSection === 'classes'
                  ? 'Class'
                  : activeSection === 'subjects'
                  ? 'Subject'
                  : activeSection === 'chapters'
                  ? 'Chapter'
                  : 'Entry Test'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 5-Section Switcher Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-200/60 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => {
            setActiveSection('boards');
            setSearchQuery('');
          }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeSection === 'boards'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Landmark className="w-4 h-4 shrink-0" />
          <span>Boards</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {boards.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSection('classes');
            setSearchQuery('');
          }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeSection === 'classes'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <School className="w-4 h-4 shrink-0" />
          <span>Classes</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {classes.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSection('subjects');
            setSearchQuery('');
          }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeSection === 'subjects'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>Subjects</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {subjects.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSection('chapters');
            setSearchQuery('');
          }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeSection === 'chapters'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>Chapters</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {chapters.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSection('entry-tests');
            setSearchQuery('');
          }}
          className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeSection === 'entry-tests'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4 shrink-0" />
          <span>Entry Tests</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {entryTestCategories.length}
          </span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeSection}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Section Specific Filter Dropdowns */}
        {activeSection === 'boards' && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Province:</span>
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="w-full md:w-auto px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
            >
              <option value="All">All Provinces</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeSection === 'classes' && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Board:</span>
            <select
              value={selectedBoardFilter}
              onChange={(e) => setSelectedBoardFilter(e.target.value)}
              className="w-full md:w-auto px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
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

        {activeSection === 'subjects' && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Class:</span>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full md:w-auto px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
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

        {activeSection === 'chapters' && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Subject:</span>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="w-full md:w-auto px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
            >
              <option value="All">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.className || 'General'})
                </option>
              ))}
            </select>
          </div>
        )}

        {activeSection === 'entry-tests' && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Category:</span>
            <select
              value={entryTestTypeFilter}
              onChange={(e) => setEntryTestTypeFilter(e.target.value)}
              className="w-full md:w-auto px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
            >
              <option value="All">All Types</option>
              {entryTestTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading academic data from database...</p>
        </div>
      ) : (
        <>
          {/* 1. BOARDS SECTION */}
          {activeSection === 'boards' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Showing {filteredBoards.length} of {boards.length} Boards
                </span>
              </div>
              {filteredBoards.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No education boards found matching your criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                      <tr>
                        <th className="py-3 px-4">Board Name</th>
                        <th className="py-3 px-4">Short Code</th>
                        <th className="py-3 px-4">Establishment Year</th>
                        <th className="py-3 px-4">Province / City</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {filteredBoards.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <Landmark className="w-4 h-4 text-blue-600 shrink-0" />
                              <div>
                                <span>{b.name}</span>
                                {b.description && (
                                  <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                    {b.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                            {b.code || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                            {b.establishmentYear || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                            {b.province || 'National'} {b.city ? `• ${b.city}` : ''}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleStatus(b, 'boards')}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                b.status === 'Active'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {b.status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {b.status || 'Active'}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canEdit && (
                                <>
                                  <button
                                    onClick={() => handleOpenEdit(b)}
                                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                                    title="Edit Board"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRequestDelete(b, 'boards')}
                                    disabled={isCheckingDeps}
                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                                    title="Delete Board"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 2. CLASSES SECTION */}
          {activeSection === 'classes' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Showing {filteredClasses.length} of {classes.length} Classes
                </span>
              </div>
              {filteredClasses.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No academic classes found matching your search.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                      <tr>
                        <th className="py-3 px-4">Class Level / Name</th>
                        <th className="py-3 px-4">Associated Board</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {filteredClasses.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <School className="w-4 h-4 text-blue-600 shrink-0" />
                            {c.name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                            {c.boardNames && c.boardNames.length > 0
                              ? c.boardNames.join(', ')
                              : c.boardName || 'All Pakistan Boards'}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleStatus(c, 'classes')}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                c.status === 'Active'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {c.status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {c.status || 'Active'}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canEdit && (
                                <>
                                  <button
                                    onClick={() => handleOpenEdit(c)}
                                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                                    title="Edit Class"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRequestDelete(c, 'classes')}
                                    disabled={isCheckingDeps}
                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                                    title="Delete Class"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. SUBJECTS SECTION */}
          {activeSection === 'subjects' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Showing {filteredSubjects.length} of {subjects.length} Subjects
                </span>
              </div>
              {filteredSubjects.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No academic subjects found matching your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                      <tr>
                        <th className="py-3 px-4">Subject Name</th>
                        <th className="py-3 px-4">Assigned Class</th>
                        <th className="py-3 px-4">Board Jurisdiction</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {filteredSubjects.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                            {s.name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                            {s.classNames && s.classNames.length > 0 ? s.classNames.join(', ') : s.className || 'General'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                            {s.boardNames && s.boardNames.length > 0 ? s.boardNames.join(', ') : s.boardName || 'All Boards'}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleStatus(s, 'subjects')}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                s.status === 'Active'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {s.status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {s.status || 'Active'}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canEdit && (
                                <>
                                  <button
                                    onClick={() => handleOpenEdit(s)}
                                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                                    title="Edit Subject"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRequestDelete(s, 'subjects')}
                                    disabled={isCheckingDeps}
                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                                    title="Delete Subject"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. CHAPTERS SECTION */}
          {activeSection === 'chapters' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Showing {filteredChapters.length} of {chapters.length} Chapters
                </span>
              </div>
              {filteredChapters.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No syllabus chapters found matching your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                      <tr>
                        <th className="py-3 px-4">Chapter Title</th>
                        <th className="py-3 px-4">Board</th>
                        <th className="py-3 px-4">Class Level</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {filteredChapters.map((ch) => (
                        <tr key={ch.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                            {ch.name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                            {ch.boardName || 'All Boards'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                            {ch.className || 'All Levels'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                            {ch.subjectName || 'General'}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleStatus(ch, 'chapters')}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                ch.status === 'Active'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {ch.status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {ch.status || 'Active'}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canEdit && (
                                <>
                                  <button
                                    onClick={() => handleOpenEdit(ch)}
                                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                                    title="Edit Chapter"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRequestDelete(ch, 'chapters')}
                                    disabled={isCheckingDeps}
                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                                    title="Delete Chapter"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 5. ENTRY TEST CATEGORIES & SUBCATEGORIES HIERARCHY */}
          {activeSection === 'entry-tests' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-blue-600" /> Entry Test Categories & Subcategories
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hierarchical structure (e.g. Armed Forces &rarr; Army, Navy, Air Force)
                  </p>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenCreateSubcategory()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Add Subcategory
                    </button>
                    <button
                      onClick={handleOpenCreate}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Add Parent Category
                    </button>
                  </div>
                )}
              </div>

              {filteredEntryTests.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
                  No entry test categories found matching your filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEntryTests.map((parent) => {
                    const children = entryTestSubcategories.filter((sub) => sub.categoryId === parent.id);
                    const isExpanded = expandedCategories[parent.id] !== false; // expanded by default

                    return (
                      <div
                        key={parent.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-all"
                      >
                        {/* Parent Category Header */}
                        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800/60">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleCategoryExpand(parent.id)}
                              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            <GraduationCap className="w-5 h-5 text-blue-600 shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                  {parent.name}
                                </span>
                                <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-[10px] border border-blue-200 dark:border-blue-900">
                                  {parent.type || 'Parent Category'}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                                  {children.length} subcategories
                                </span>
                              </div>
                              {parent.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {parent.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleStatus(parent, 'entry-tests')}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                parent.status === 'Active'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {parent.status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {parent.status || 'Active'}
                            </button>

                            {canEdit && (
                              <div className="flex items-center gap-1 ml-2 border-l border-slate-200 dark:border-slate-700 pl-2">
                                <button
                                  onClick={() => handleOpenCreateSubcategory(parent)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer flex items-center gap-1"
                                  title="Add Child Subcategory"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Subcategory
                                </button>
                                <button
                                  onClick={() => handleOpenEdit(parent)}
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                                  title="Edit Parent Category"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRequestDelete(parent, 'entry-tests')}
                                  disabled={isCheckingDeps}
                                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                                  title="Delete Parent Category"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Subcategories Indented Section */}
                        {isExpanded && (
                          <div className="p-3 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/80">
                            {children.length === 0 ? (
                              <div className="py-4 text-center text-slate-400 text-xs italic">
                                No subcategories added under {parent.name} yet.{' '}
                                {canEdit && (
                                  <button
                                    onClick={() => handleOpenCreateSubcategory(parent)}
                                    className="text-blue-600 hover:underline font-bold not-italic ml-1"
                                  >
                                    + Add Subcategory
                                  </button>
                                )}
                              </div>
                            ) : (
                              children.map((sub) => (
                                <div
                                  key={sub.id}
                                  className="py-2.5 px-4 sm:pl-10 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 rounded-xl transition-colors"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                                    <div>
                                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                                        {sub.name}
                                      </span>
                                      {sub.description && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                          {sub.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => handleToggleStatus(sub, 'entry-test-subcategories')}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                        sub.status === 'Active'
                                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                                      }`}
                                    >
                                      {sub.status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                      {sub.status || 'Active'}
                                    </button>

                                    {canEdit && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleOpenEditSubcategory(sub)}
                                          className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                                          title="Edit Subcategory"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleRequestDelete(sub, 'entry-test-subcategories')}
                                          disabled={isCheckingDeps}
                                          className="p-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                                          title="Delete Subcategory"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[90vh] my-auto">
            {/* Modal Header (Pinned Top) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                  {modalMode === 'create' ? <Plus className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {modalMode === 'create' ? 'Add New' : 'Edit'}{' '}
                  {activeSection === 'boards'
                    ? 'Education Board'
                    : activeSection === 'classes'
                    ? 'Academic Class'
                    : activeSection === 'subjects'
                    ? 'Subject'
                    : activeSection === 'chapters'
                    ? 'Syllabus Chapter'
                    : entryTestFormMode === 'subcategory'
                    ? 'Entry Test Subcategory'
                    : 'Parent Category'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveItem} className="flex-1 flex flex-col min-h-0 mt-4">
              <div className="flex-1 overflow-y-auto pr-1.5 space-y-4">
                {/* Entry Test Category Mode Selector */}
                {activeSection === 'entry-tests' && modalMode === 'create' && (
                  <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setEntryTestFormMode('parent')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        entryTestFormMode === 'parent'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Parent Category
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryTestFormMode('subcategory')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        entryTestFormMode === 'subcategory'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Subcategory
                    </button>
                  </div>
                )}

              {/* Subcategory Parent Selection */}
              {activeSection === 'entry-tests' && entryTestFormMode === 'subcategory' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Parent Category *
                  </label>
                  <select
                    required
                    value={formParentCategoryId}
                    onChange={(e) => setFormParentCategoryId(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {entryTestCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.type || 'Category'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {activeSection === 'boards'
                    ? 'Board Name *'
                    : activeSection === 'classes'
                    ? 'Class Name *'
                    : activeSection === 'subjects'
                    ? 'Subject Title *'
                    : activeSection === 'chapters'
                    ? 'Chapter Name *'
                    : entryTestFormMode === 'subcategory'
                    ? 'Subcategory Name *'
                    : 'Category Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    activeSection === 'boards'
                      ? 'e.g., Federal Board'
                      : activeSection === 'classes'
                      ? 'e.g., Class 13 (Associate Degree)'
                      : activeSection === 'subjects'
                      ? 'e.g., Applied Physics'
                      : activeSection === 'chapters'
                      ? 'e.g., Quantum Mechanics'
                      : entryTestFormMode === 'subcategory'
                      ? 'e.g., Army, Navy, Air Force, MDCAT'
                      : 'e.g., Armed Forces, Medical, Engineering'
                  }
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* BOARDS FIELDS */}
              {activeSection === 'boards' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Establishment Year
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 1975"
                        value={formEstablishmentYear}
                        onChange={(e) => setFormEstablishmentYear(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Short Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., FBISE"
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Province
                      </label>
                      <select
                        value={formProvince}
                        onChange={(e) => setFormProvince(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        {provinces.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        City / Headquarters
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Islamabad"
                        value={formCity}
                        onChange={(e) => setFormCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief description of the education board..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* CLASSES FIELDS */}
              {activeSection === 'classes' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Assigned Board(s) * ({formBoardIds.length} Selected)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormBoardIds(boards.map((b) => b.id))}
                        className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={() => setFormBoardIds([])}
                        className="text-[10px] text-slate-500 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto space-y-1.5">
                    {boards.map((b) => {
                      const isSelected = formBoardIds.includes(b.id);
                      return (
                        <label
                          key={b.id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setFormBoardIds(formBoardIds.filter((id) => id !== b.id));
                              } else {
                                setFormBoardIds([...formBoardIds, b.id]);
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>{b.name}</span>
                          {b.province && (
                            <span className="ml-auto text-[10px] text-slate-400">({b.province})</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {formBoardIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formBoardIds.map((bId) => {
                        const bObj = boards.find((b) => b.id === bId);
                        if (!bObj) return null;
                        return (
                          <span
                            key={bId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
                          >
                            {bObj.name}
                            <button
                              type="button"
                              onClick={() => setFormBoardIds(formBoardIds.filter((id) => id !== bId))}
                              className="hover:text-red-500 cursor-pointer ml-0.5"
                            >
                              &times;
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SUBJECTS FIELDS */}
              {activeSection === 'subjects' && (
                <div className="space-y-3">
                  {/* Multi-select Classes */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Assigned Class(es) * ({formClassIds.length} Selected)
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormClassIds(classes.map((c) => c.id))}
                          className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          type="button"
                          onClick={() => setFormClassIds([])}
                          className="text-[10px] text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto space-y-1.5">
                      {classes.map((c) => {
                        const isSelected = formClassIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setFormClassIds(formClassIds.filter((id) => id !== c.id));
                                } else {
                                  setFormClassIds([...formClassIds, c.id]);
                                }
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    {formClassIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {formClassIds.map((cId) => {
                          const cObj = classes.find((c) => c.id === cId);
                          if (!cObj) return null;
                          return (
                            <span
                              key={cId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                            >
                              {cObj.name}
                              <button
                                type="button"
                                onClick={() => setFormClassIds(formClassIds.filter((id) => id !== cId))}
                                className="hover:text-red-500 cursor-pointer ml-0.5"
                              >
                                &times;
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Multi-select Boards */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Assigned Board(s) ({formBoardIds.length} Selected - Leave empty for All Boards)
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormBoardIds(boards.map((b) => b.id))}
                          className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          type="button"
                          onClick={() => setFormBoardIds([])}
                          className="text-[10px] text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto space-y-1.5">
                      {boards.map((b) => {
                        const isSelected = formBoardIds.includes(b.id);
                        return (
                          <label
                            key={b.id}
                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setFormBoardIds(formBoardIds.filter((id) => id !== b.id));
                                } else {
                                  setFormBoardIds([...formBoardIds, b.id]);
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>{b.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    {formBoardIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {formBoardIds.map((bId) => {
                          const bObj = boards.find((b) => b.id === bId);
                          if (!bObj) return null;
                          return (
                            <span
                              key={bId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
                            >
                              {bObj.name}
                              <button
                                type="button"
                                onClick={() => setFormBoardIds(formBoardIds.filter((id) => id !== bId))}
                                className="hover:text-red-500 cursor-pointer ml-0.5"
                              >
                                &times;
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CHAPTERS FIELDS */}
              {activeSection === 'chapters' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        1. Select Board
                      </label>
                      <select
                        value={formBoardId}
                        onChange={(e) => handleBoardChangeForChapter(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
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
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        2. Select Class *
                      </label>
                      <select
                        required
                        value={formClassId}
                        onChange={(e) => handleClassChangeForChapter(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="">-- Select Class --</option>
                        {availableClassesForChapter.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        3. Associated Subject *
                      </label>
                      <select
                        required
                        value={formSubjectId}
                        onChange={(e) => handleSubjectChangeForChapter(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      >
                        {availableSubjectsForChapter.length > 0 ? (
                          availableSubjectsForChapter.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.className || 'General'})
                            </option>
                          ))
                        ) : (
                          <option value="">No subject available for this Board & Class</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Publishing State
                    </label>
                    <select
                      value={formDraftStatus}
                      onChange={(e) => setFormDraftStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="Published">Published</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ENTRY TEST PARENT CATEGORY FIELDS */}
              {activeSection === 'entry-tests' && entryTestFormMode === 'parent' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Category Type *
                      </label>
                      <select
                        required
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        {entryTestTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Conducting Body
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., PMDC, UHS, NTS, NUMS"
                        value={formOrganizer}
                        onChange={(e) => setFormOrganizer(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief overview of this category..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* ENTRY TEST SUBCATEGORY DESCRIPTION FIELD */}
              {activeSection === 'entry-tests' && entryTestFormMode === 'subcategory' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of this subcategory..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Status Selector */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Record Status
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="Active"
                      checked={formStatus === 'Active'}
                      onChange={() => setFormStatus('Active')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="Inactive"
                      checked={formStatus === 'Inactive'}
                      onChange={() => setFormStatus('Inactive')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Inactive (Disabled)</span>
                  </label>
                </div>
              </div>
              </div>

              {/* Pinned Action Buttons Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{modalMode === 'create' ? 'Create Item' : 'Save Changes'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <AdminConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.type === 'boards' ? 'Board' : deleteTarget?.type === 'classes' ? 'Class' : deleteTarget?.type === 'subjects' ? 'Subject' : deleteTarget?.type === 'chapters' ? 'Chapter' : 'Entry Test'}?`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action will permanently remove it from the authoritative database.`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* DEPENDENCY WARNING MODAL (Safely Blocks Deletion) */}
      {dependencyWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Deletion Blocked: Active Dependencies Exist
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              Cannot delete <strong>&ldquo;{dependencyWarning.name}&rdquo;</strong> because it is actively referenced by{' '}
              <strong>{dependencyWarning.total}</strong> educational resource(s) in the database.
            </p>

            <div className="mt-3.5 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
              <div className="font-bold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                Dependency Breakdown:
              </div>
              {Object.entries(dependencyWarning.details).map(([key, count]) => {
                if (count <= 0) return null;
                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="font-bold px-1.5 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/80">
                      {count} items
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
              To delete this item safely, reassign or remove its related classes, subjects, MCQs, or tests first.
            </p>

            <div className="flex justify-end pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setDependencyWarning(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
