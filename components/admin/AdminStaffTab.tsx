import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Search,
  Filter,
  Plus,
  Edit3,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Copy,
  Check,
  Briefcase,
  GraduationCap,
  Layers,
  FileText,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { AdminUser, StaffRole } from '../../types';
import { StaffAcademicAssignments } from './StaffAcademicAssignments';
import { AdminConfirmDialog } from './AdminConfirmDialog';
import {
  createAdminUserApi,
  updateAdminUserRoleApi,
  updateAdminUserStatusApi,
  updateAdminUserProfileApi,
  adminResetUserPasswordApi,
} from '../../lib/api';

export type StaffRoleType = StaffRole;

interface AdminStaffTabProps {
  students: AdminUser[];
  adminUser?: AdminUser | null;
  onUpdateStudent: (user: AdminUser) => void;
  onAddStudent?: (user: AdminUser) => void;
  onRefresh?: () => void;
}

export const AdminStaffTab: React.FC<AdminStaffTabProps> = ({
  students,
  adminUser,
  onUpdateStudent,
  onAddStudent,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Create Staff Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createConfirmPassword, setCreateConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createRoles, setCreateRoles] = useState<StaffRole[]>(['Teacher']);
  const [createStatus, setCreateStatus] = useState<'Active' | 'Inactive'>('Active');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Reset Staff Password Modal state
  const [passwordResetTarget, setPasswordResetTarget] = useState<AdminUser | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null);

  // Edit Staff Modal state
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoles, setEditRoles] = useState<StaffRole[]>(['Teacher']);
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive' | 'Suspended'>('Active');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Change Role Dialog state
  const [roleChangeTarget, setRoleChangeTarget] = useState<AdminUser | null>(null);
  const [newSelectedRoles, setNewSelectedRoles] = useState<StaffRole[]>(['Teacher']);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [roleChangeError, setRoleChangeError] = useState<string | null>(null);
  const [roleChangeSuccess, setRoleChangeSuccess] = useState<string | null>(null);

  // Status Toggle Confirmation Dialog
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<AdminUser | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Copied email state
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Filter only staff members (or all non-pure students, plus all users when role filter is set)
  const staffRoles = ['Admin', 'Teacher', 'Editor', 'ContentManager', 'Moderator', 'SuperAdmin'];
  
  // All staff users
  const staffList = students.filter((u) => u.roles && u.roles.some(r => staffRoles.includes(r)));

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.roles.some(r => r.toLowerCase().includes(q));

    const matchesRole = roleFilter === 'All' || s.roles.includes(roleFilter as StaffRole);
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;

    return matchesQuery && matchesRole && matchesStatus;
  });

  const staffCountByRole = {
    Admin: staffList.filter((s) => s.roles.includes('Admin') || s.roles.includes('SuperAdmin')).length,
    Teacher: staffList.filter((s) => s.roles.includes('Teacher')).length,
    Editor: staffList.filter((s) => s.roles.includes('Editor')).length,
    ContentManager: staffList.filter((s) => s.roles.includes('ContentManager')).length,
    Moderator: staffList.filter((s) => s.roles.includes('Moderator')).length,
    Active: staffList.filter((s) => s.status === 'Active').length,
    Inactive: staffList.filter((s) => s.status === 'Inactive' || s.status === 'Suspended').length,
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Submit Create Staff
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    const cleanEmail = createEmail.toLowerCase().trim();
    const cleanName = createName.trim();

    if (!cleanName) {
      setCreateError('Full name is required.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setCreateError('Please enter a valid email address.');
      return;
    }
    if (!createPassword || createPassword.length < 6) {
      setCreateError('Password must be at least 6 characters long.');
      return;
    }
    if (createConfirmPassword && createPassword !== createConfirmPassword) {
      setCreateError('Passwords do not match. Please verify your confirm password.');
      return;
    }

    setIsCreating(true);
    try {
      const res = await createAdminUserApi({
        name: cleanName,
        email: cleanEmail,
        roles: createRoles,
        password: createPassword,
        status: createStatus,
      });

      if (res.success && res.user) {
        setCreateSuccess(`Successfully created ${createRoles[0]} account for ${cleanEmail}!`);
        
        const newStaffUser: AdminUser = {
          id: res.user.uid || `staff-${Date.now()}`,
          name: res.user.name || cleanName,
          email: res.user.email || cleanEmail,
          roles: createRoles as any,
          status: (res.user.status || createStatus) as any,
          points: 0,
          testsCompleted: 0,
          joinedDate: new Date().toLocaleDateString('en-GB'),
        };

        if (onAddStudent) {
          onAddStudent(newStaffUser);
        } else {
          onUpdateStudent(newStaffUser);
        }

        setTimeout(() => {
          setIsCreateOpen(false);
          setCreateSuccess(null);
          setCreateName('');
          setCreateEmail('');
          setCreatePassword('');
          setCreateRoles(['Teacher']);
          setCreateStatus('Active');
          if (onRefresh) onRefresh();
        }, 1200);
      } else {
        setCreateError(res.error || 'Failed to create staff account. Please try again.');
      }
    } catch (err: any) {
      setCreateError(err.message || 'An unexpected error occurred while communicating with the server.');
    } finally {
      setIsCreating(false);
    }
  };

  // Generate random password helper
  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetNewPassword(pass);
    setResetConfirmPassword(pass);
    setShowResetPassword(true);
  };

  // Submit Reset Password by Admin
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetTarget) return;

    setResetPasswordError(null);
    setResetPasswordSuccess(null);

    if (!resetNewPassword || resetNewPassword.length < 6) {
      setResetPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetPasswordError('Passwords do not match. Please verify.');
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await adminResetUserPasswordApi(passwordResetTarget.id, resetNewPassword);
      if (res.success) {
        setResetPasswordSuccess(`Password for ${passwordResetTarget.email} has been reset successfully!`);
        setTimeout(() => {
          setPasswordResetTarget(null);
          setResetPasswordSuccess(null);
          setResetNewPassword('');
          setResetConfirmPassword('');
        }, 1500);
      } else {
        setResetPasswordError(res.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      setResetPasswordError(err.message || 'Error communicating with server.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: AdminUser) => {
    setEditTarget(user);
    setEditName(user.name);
    const resolvedRoles = (user.roles && user.roles.length > 0)
      ? user.roles
      : [user.role as StaffRole || 'Teacher'];
    setEditRoles(resolvedRoles as StaffRole[]);
    setEditStatus((user.status as any) || 'Active');
    setEditPassword('');
    setEditConfirmPassword('');
    setShowEditPassword(false);
    setEditError(null);
    setEditSuccess(null);
  };

  // Submit Edit Staff
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    if (editPassword.trim()) {
      if (editPassword.length < 6) {
        setEditError('Password must be at least 6 characters long.');
        return;
      }
      if (editPassword !== editConfirmPassword) {
        setEditError('Passwords do not match. Please verify.');
        return;
      }
    }

    setIsEditing(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      // 1. Update profile name if changed
      if (editName.trim() !== editTarget.name) {
        await updateAdminUserProfileApi(editTarget.id, { name: editName.trim() });
      }

      // 2. Update roles if changed
      const rolesChanged = JSON.stringify(editRoles.sort()) !== JSON.stringify(editTarget.roles.sort());
      if (rolesChanged) {
        const roleRes = await updateAdminUserRoleApi(editTarget.id, editRoles);
        if (!roleRes) {
          throw new Error('Failed to update roles. Please ensure you have administrator privileges.');
        }
      }

      // 3. Update status if changed
      if (editStatus !== editTarget.status) {
        await updateAdminUserStatusApi(editTarget.id, editStatus);
      }

      // 4. Update password if provided
      if (editPassword.trim()) {
        const pwRes = await adminResetUserPasswordApi(editTarget.id, editPassword);
        if (!pwRes.success) {
          throw new Error(pwRes.error || 'Failed to update credentials.');
        }
      }

      const updatedUser: AdminUser = {
        ...editTarget,
        name: editName.trim(),
        roles: editRoles,
        status: editStatus as any,
      };

      onUpdateStudent(updatedUser);
      setEditSuccess('Staff profile updated successfully.');

      setTimeout(() => {
        setEditTarget(null);
        setEditSuccess(null);
        setEditPassword('');
        setEditConfirmPassword('');
        if (onRefresh) onRefresh();
      }, 1000);
    } catch (err: any) {
      setEditError(err.message || 'Failed to save staff updates.');
    } finally {
      setIsEditing(false);
    }
  };

  // Open Change Role Modal
  const handleOpenChangeRole = (user: AdminUser) => {
    setRoleChangeTarget(user);
    const resolvedRoles = (user.roles && user.roles.length > 0)
      ? user.roles
      : [user.role as StaffRole || 'Teacher'];
    setNewSelectedRoles(resolvedRoles as StaffRole[]);
    setRoleChangeError(null);
    setRoleChangeSuccess(null);
  };

  // Submit Change Role
  const handleChangeRoleSubmit = async () => {
    if (!roleChangeTarget) return;

    setIsChangingRole(true);
    setRoleChangeError(null);
    setRoleChangeSuccess(null);

    try {
      console.log('Sending roles to updateAdminUserRoleApi:', newSelectedRoles);
      const res = await updateAdminUserRoleApi(roleChangeTarget.id, newSelectedRoles);
      if (res) {
        const updated: AdminUser = {
          ...roleChangeTarget,
          roles: newSelectedRoles,
        };
        onUpdateStudent(updated);
        setRoleChangeSuccess(`Roles successfully updated.`);

        setTimeout(() => {
          setRoleChangeTarget(null);
          setRoleChangeSuccess(null);
          if (onRefresh) onRefresh();
        }, 1000);
      } else {
        // Optimistically apply if server accepted
        const updated: AdminUser = {
          ...roleChangeTarget,
          roles: newSelectedRoles,
        };
        onUpdateStudent(updated);
        setRoleChangeTarget(null);
      }
    } catch (err: any) {
      setRoleChangeError(err.message || 'Server error updating role.');
    } finally {
      setIsChangingRole(false);
    }
  };

  // Toggle Active / Inactive Status
  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmTarget) return;

    setIsTogglingStatus(true);
    const newStatus = statusConfirmTarget.status === 'Active' ? 'Inactive' : 'Active';

    try {
      await updateAdminUserStatusApi(statusConfirmTarget.id, newStatus as any);
      const updated: AdminUser = {
        ...statusConfirmTarget,
        status: newStatus as any,
      };
      onUpdateStudent(updated);
      setStatusConfirmTarget(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Admin':
      case 'SuperAdmin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Admin
          </span>
        );
      case 'Teacher':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Teacher
          </span>
        );
      case 'Editor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Editor
          </span>
        );
      case 'ContentManager':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            ContentManager
          </span>
        );
      case 'Moderator':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Moderator
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {role}
          </span>
        );
    }
  };

  const getRoleDescription = (role: StaffRoleType) => {
    switch (role) {
      case 'Admin':
        return 'Full access to user administration, role assignment, portal settings, audit trails, and all content.';
      case 'Teacher':
        return 'Create and edit MCQ questions, author custom tests, and review student assessment progress.';
      case 'Editor':
        return 'Manage study notes, curate past papers, and review academic content.';
      case 'ContentManager':
        return 'Manage academic boards, classes, subjects, chapters, and curriculum structure.';
      case 'Moderator':
        return 'Audit error reports, inspect reported questions, and moderate community content.';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Staff & User Role Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Role-based access control (RBAC) powered by Supabase Auth & PostgreSQL • {staffList.length} Staff Members
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="create-staff-btn"
            onClick={() => {
              setIsCreateOpen(true);
              setCreateError(null);
              setCreateSuccess(null);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            Create Staff User
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Role Distribution Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setRoleFilter('All')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'All'
              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Staff</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{staffList.length}</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
            {staffCountByRole.Active} Active
          </div>
        </div>

        <div
          onClick={() => setRoleFilter('Admin')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'Admin'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Admins
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{staffCountByRole.Admin}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Full Authority</div>
        </div>

        <div
          onClick={() => setRoleFilter('Teacher')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'Teacher'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5" /> Teachers
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{staffCountByRole.Teacher}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">MCQs & Quizzes</div>
        </div>

        <div
          onClick={() => setRoleFilter('Editor')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'Editor'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <Edit3 className="w-3.5 h-3.5" /> Editors
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{staffCountByRole.Editor}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Notes & Papers</div>
        </div>

        <div
          onClick={() => setRoleFilter('ContentManager')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'ContentManager'
              ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Content Mgrs
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{staffCountByRole.ContentManager}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Curriculum</div>
        </div>

        <div
          onClick={() => setRoleFilter('Moderator')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'Moderator'
              ? 'bg-cyan-50/80 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-800 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Moderators
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{staffCountByRole.Moderator}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Audit & Flags</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff members by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Role Filter
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-hidden"
            >
              <option value="All">All Roles ({staffList.length})</option>
              <option value="Admin">Admin ({staffCountByRole.Admin})</option>
              <option value="Teacher">Teacher ({staffCountByRole.Teacher})</option>
              <option value="Editor">Editor ({staffCountByRole.Editor})</option>
              <option value="ContentManager">ContentManager ({staffCountByRole.ContentManager})</option>
              <option value="Moderator">Moderator ({staffCountByRole.Moderator})</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-hidden"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only ({staffCountByRole.Active})</option>
              <option value="Inactive">Inactive / Suspended ({staffCountByRole.Inactive})</option>
            </select>
          </div>

          <div className="col-span-2 flex items-end justify-end">
            {(searchQuery || roleFilter !== 'All' || statusFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('All');
                  setStatusFilter('All');
                }}
                className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
            Showing {filteredStaff.length} of {staffList.length} staff accounts
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-400" />
                    <p className="text-sm font-semibold">No staff members found matching your criteria.</p>
                    <p className="text-xs mt-1">Click "Create Staff User" above to add new faculty or administrative accounts.</p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const isActive = staff.status === 'Active';
                  const isSelf = adminUser && (staff.id === adminUser.id || staff.email.toLowerCase() === adminUser.email.toLowerCase());

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs ${
                              staff.roles.includes('Admin') || staff.roles.includes('SuperAdmin')
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-700'
                                : staff.roles.includes('Teacher')
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-700'
                                : staff.roles.includes('Editor')
                                ? 'bg-gradient-to-br from-amber-500 to-orange-700'
                                : staff.roles.includes('ContentManager')
                                ? 'bg-gradient-to-br from-purple-500 to-pink-700'
                                : 'bg-gradient-to-br from-cyan-500 to-teal-700'
                            }`}
                          >
                            {staff.name ? staff.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{staff.name}</span>
                              {isSelf && (
                                <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 px-1.5 py-0.2 rounded font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Joined: {staff.joinedDate || 'Recent'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email with copy */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span>{staff.email}</span>
                          <button
                            onClick={() => handleCopyEmail(staff.email)}
                            title="Copy email"
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            {copiedEmail === staff.email ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {staff.roles && staff.roles.length > 0
                            ? staff.roles.map((r) => <span key={r}>{getRoleBadge(r)}</span>)
                            : getRoleBadge(staff.roles[0])}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            {staff.status || 'Inactive'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenEdit(staff)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Edit Staff Member"
                          >
                            <Edit3 className="w-3 h-3 text-indigo-500" />
                            <span>Edit</span>
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setPasswordResetTarget(staff);
                              setResetNewPassword('');
                              setResetConfirmPassword('');
                              setResetPasswordError(null);
                              setResetPasswordSuccess(null);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
                            title="Reset Staff Password"
                          >
                            <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Reset Pwd</span>
                          </button>

                          {/* Change Role */}
                          <button
                            onClick={() => handleOpenChangeRole(staff)}
                            disabled={isSelf}
                            className={`px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                              isSelf ? 'opacity-40 cursor-not-allowed' : 'hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer'
                            }`}
                            title={isSelf ? 'You cannot modify your own role' : 'Change Role'}
                          >
                            <SlidersHorizontal className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            <span>Change Role</span>
                          </button>

                          {/* Activate / Deactivate Toggle */}
                          <button
                            onClick={() => setStatusConfirmTarget(staff)}
                            disabled={isSelf}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isSelf
                                ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800'
                                : isActive
                                ? 'border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer'
                                : 'border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer'
                            }`}
                            title={
                              isSelf
                                ? 'You cannot deactivate your own account'
                                : isActive
                                ? 'Deactivate Staff Account'
                                : 'Activate Staff Account'
                            }
                          >
                            {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE STAFF MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Top Close Button */}
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Staff User</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provision a new administrative or faculty account
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              {/* Error / Success Banners */}
              {createError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              {createSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{createSuccess}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Prof. Tariq Mahmood"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. faculty@taleemguru.pk"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Minimum 6 characters"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Repeat password"
                      value={createConfirmPassword}
                      onChange={(e) => setCreateConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Credentials are automatically synced with Supabase Auth and never stored in plaintext.
                  </p>
                </div>

                {/* Role Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Staff Role <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-1.5">
                    {(['Student', 'Teacher', 'Editor', 'ContentManager', 'Moderator', 'Admin'] as StaffRole[]).map((r) => {
                      const isSelected = createRoles.includes(r);
                      return (
                        <button
                          type="button"
                          key={r}
                          onClick={() => {
                            setCreateRoles(prev => 
                              isSelected ? (prev.length > 1 ? prev.filter(role => role !== r) : prev) : [...prev, r]
                            );
                          }}
                          className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={isSelected} readOnly className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                            <div>
                              <div className="font-bold text-xs">{r}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {getRoleDescription(r)}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Status Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Initial Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateStatus('Active')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        createStatus === 'Active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateStatus('Inactive')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        createStatus === 'Inactive'
                          ? 'bg-slate-200 dark:bg-slate-700 border-slate-400 text-slate-800 dark:text-slate-200 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Inactive
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-2.5 p-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shadow-indigo-600/20 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Create Staff User
                  </>
                )}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Fixed Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Staff User Profile</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {editTarget.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body Content */}
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
                {editError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{editError}</span>
                  </div>
                )}

                {editSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{editSuccess}</span>
                  </div>
                )}

                {/* 2-Column Responsive Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Personal Info & Security */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Personal Details
                    </h4>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. Prof. Tariq Mahmood"
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        disabled
                        value={editTarget.email}
                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Account Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </div>

                    {/* Security Sub-section */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Account Security
                        </h4>
                        <span className="text-[11px] text-slate-400">Leave blank to keep unchanged</span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                              Temporary Password (min 6 characters)
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
                                let pass = '';
                                for (let i = 0; i < 12; i++) {
                                  pass += chars.charAt(Math.floor(Math.random() * chars.length));
                                }
                                setEditPassword(pass);
                                setEditConfirmPassword(pass);
                                setShowEditPassword(true);
                              }}
                              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              Generate Random
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type={showEditPassword ? 'text' : 'password'}
                              minLength={6}
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full px-3 py-2 pr-9 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditPassword(!showEditPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Confirm Temporary Password
                          </label>
                          <input
                            type={showEditPassword ? 'text' : 'password'}
                            minLength={6}
                            value={editConfirmPassword}
                            onChange={(e) => setEditConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <StaffAcademicAssignments userUid={editTarget.uid || editTarget.id} />
                    </div>
                  </div>

                  {/* Right Column: Staff Roles Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Assign Staff Roles (Multiple Allowed)
                      </h4>
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        {editRoles.length} selected
                      </span>
                    </div>

                    <div className="space-y-2">
                      {[
                        { role: 'Teacher', desc: 'Create tests, track student quiz scores' },
                        { role: 'Editor', desc: 'Curate MCQs, past papers, notes' },
                        { role: 'ContentManager', label: 'Content Manager', desc: 'Manage curriculum suites and question bank' },
                        { role: 'Moderator', desc: 'Review reports, feedback, and audit logs' },
                        { role: 'Admin', desc: 'Full administrative staff and user management' },
                        { role: 'Student', desc: 'Candidate learner access' },
                      ].map((item) => {
                        const r = item.role as StaffRole;
                        const isSelected = editRoles.includes(r);
                        return (
                          <label
                            key={r}
                            className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                            }`}
                            style={{ borderRadius: '8px' }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setEditRoles(prev =>
                                  isSelected
                                    ? (prev.length > 1 ? prev.filter(role => role !== r) : prev)
                                    : [...prev, r]
                                );
                              }}
                              className="mt-1 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="ml-3">
                              <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                                {item.label || item.role}
                              </span>
                              <span className="block text-xs text-slate-500 dark:text-slate-400">
                                {item.desc}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 z-10">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isEditing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE ROLE DIALOG */}
      {roleChangeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setRoleChangeTarget(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Change Staff Role</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update role and privileges for {roleChangeTarget.name}
                </p>
              </div>
            </div>

            {roleChangeError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{roleChangeError}</span>
              </div>
            )}

            {roleChangeSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{roleChangeSuccess}</span>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">{roleChangeTarget.name}</div>
                <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{roleChangeTarget.email}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Current Role:</span>
                  {getRoleBadge(roleChangeTarget.role || roleChangeTarget.roles?.[0] || 'Teacher')}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Roles:
                </label>
                <div className="space-y-1.5">
                  {(['Student', 'Teacher', 'Editor', 'ContentManager', 'Moderator', 'Admin'] as StaffRoleType[]).map((r) => {
                    const isSelected = newSelectedRoles.includes(r);
                    return (
                      <label
                        key={r}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={() => {
                              setNewSelectedRoles(prev => 
                                isSelected ? prev.filter(role => role !== r) : [...prev, r]
                              );
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" 
                          />
                          <div>
                            <div className="font-bold text-xs">{r}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {getRoleDescription(r)}
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRoleChangeTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isChangingRole || JSON.stringify(newSelectedRoles.sort()) === JSON.stringify(roleChangeTarget.roles.sort())}
                  onClick={handleChangeRoleSubmit}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isChangingRole ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving Roles...
                    </>
                  ) : (
                    'Save Roles'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESET STAFF PASSWORD MODAL */}
      {passwordResetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setPasswordResetTarget(null);
                setResetPasswordError(null);
                setResetPasswordSuccess(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Reset User Password</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Authoritative administrative password override
                </p>
              </div>
            </div>

            {resetPasswordError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{resetPasswordError}</span>
              </div>
            )}

            {resetPasswordSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{resetPasswordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="mt-4 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">{passwordResetTarget.name}</div>
                <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{passwordResetTarget.email}</div>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-500 dark:text-slate-400">Assigned Roles:</span>
                  {passwordResetTarget.roles?.map(r => getRoleBadge(r))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    Generate Random Password
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter new password (min 6 chars)"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  >
                    {showResetPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Confirm new password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordResetTarget(null);
                    setResetPasswordError(null);
                    setResetPasswordSuccess(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword || !resetNewPassword || !resetConfirmPassword}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isResettingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    'Confirm Password Reset'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVATE / DEACTIVATE CONFIRMATION DIALOG */}
      <AdminConfirmDialog
        isOpen={Boolean(statusConfirmTarget)}
        title={
          statusConfirmTarget?.status === 'Active'
            ? 'Deactivate Staff Account?'
            : 'Activate Staff Account?'
        }
        message={
          statusConfirmTarget?.status === 'Active'
            ? `Are you sure you want to deactivate ${statusConfirmTarget?.name} (${statusConfirmTarget?.email})? This staff member will not be able to log into the staff portal until reactivated.`
            : `Are you sure you want to reactivate ${statusConfirmTarget?.name} (${statusConfirmTarget?.email})? This staff member will regain access to their assigned ${statusConfirmTarget?.role || statusConfirmTarget?.roles?.join(', ') || 'Staff'} privileges.`
        }
        confirmLabel={
          statusConfirmTarget?.status === 'Active' ? 'Deactivate Account' : 'Activate Account'
        }
        isDestructive={statusConfirmTarget?.status === 'Active'}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setStatusConfirmTarget(null)}
      />
    </div>
  );
};
