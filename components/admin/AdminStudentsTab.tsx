import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  Award,
  BookOpen,
  Calendar,
  Shield,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  X,
  Save,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AdminUser, TestResult } from '../../types';
import { AdminConfirmDialog } from './AdminConfirmDialog';
import {
  updateAdminUserRoleApi,
  createAdminUserApi,
  updateAdminUserStatusApi,
  adminResetUserPasswordApi,
} from '../../lib/api';

interface AdminStudentsTabProps {
  students: AdminUser[];
  historyResults: TestResult[];
  onUpdateStudent: (student: AdminUser) => void;
  onDeleteStudent?: (id: string) => void;
  onAddStudent?: (student: AdminUser) => void;
  onRefresh?: () => void;
}

export const AdminStudentsTab: React.FC<AdminStudentsTabProps> = ({
  students,
  historyResults,
  onUpdateStudent,
  onDeleteStudent,
  onAddStudent,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Status toggle confirmation
  const [toggleConfirmTarget, setToggleConfirmTarget] = useState<AdminUser | null>(null);
  const [roleEditTarget, setRoleEditTarget] = useState<AdminUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['Student']);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);

  // Reset Password Modal State
  const [passwordResetTarget, setPasswordResetTarget] = useState<AdminUser | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null);

  // Add Staff Account modal
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRoles, setNewStaffRoles] = useState<string[]>(['Teacher']);
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffConfirmPassword, setNewStaffConfirmPassword] = useState('');
  const [showNewStaffPassword, setShowNewStaffPassword] = useState(false);
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [createStaffError, setCreateStaffError] = useState<string | null>(null);
  const [createStaffSuccess, setCreateStaffSuccess] = useState<string | null>(null);

  // Generate random password for new staff
  const handleGenerateNewStaffPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewStaffPassword(pass);
    setNewStaffConfirmPassword(pass);
    setShowNewStaffPassword(true);
  };

  // Generate random password for reset
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

  // Submit Reset Password
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
      setResetPasswordError('Passwords do not match.');
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

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateStaffError(null);
    setCreateStaffSuccess(null);
    const cleanEmail = newStaffEmail.toLowerCase().trim();
    const cleanName = newStaffName.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setCreateStaffError('Please enter a valid email address.');
      return;
    }
    if (!cleanName) {
      setCreateStaffError('Full name is required.');
      return;
    }
    if (newStaffRoles.length === 0) {
      setCreateStaffError('Please select at least one role.');
      return;
    }
    if (!newStaffPassword || newStaffPassword.length < 6) {
      setCreateStaffError('Password must be at least 6 characters.');
      return;
    }
    if (newStaffConfirmPassword && newStaffPassword !== newStaffConfirmPassword) {
      setCreateStaffError('Passwords do not match. Please verify your confirm password.');
      return;
    }

    setIsCreatingStaff(true);
    try {
      const res = await createAdminUserApi({
        name: cleanName,
        email: cleanEmail,
        roles: newStaffRoles,
        password: newStaffPassword,
      });
      if (res.success && res.user) {
        setCreateStaffSuccess(`Successfully created account with roles [${newStaffRoles.join(', ')}] for ${cleanEmail}.`);
        if (onAddStudent) {
          onAddStudent({
            id: res.user.uid,
            name: res.user.name,
            email: res.user.email,
            role: (res.user.roles?.[0] || res.user.role) as any,
            roles: (res.user.roles || [res.user.role || 'Teacher']) as any,
            testsCompleted: 0,
            targetExam: res.user.targetExam || 'MDCAT',
            classLevel: res.user.classLevel || 'Class 10',
            board: res.user.board || 'Punjab',
            status: 'Active',
            points: 0,
            streakDays: 0,
            testsTaken: 0,
            joinedDate: new Date().toISOString().split('T')[0],
          });
        }
        setTimeout(() => {
          setIsAddStaffOpen(false);
          setCreateStaffSuccess(null);
          setNewStaffName('');
          setNewStaffEmail('');
          setNewStaffPassword('');
          setNewStaffRoles(['Teacher']);
          if (onRefresh) onRefresh();
        }, 1200);
      } else {
        setCreateStaffError(res.error || 'Failed to create staff account.');
      }
    } catch (err: any) {
      setCreateStaffError(err.message || 'Error communicating with server.');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  // Filtered list
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.board && s.board.toLowerCase().includes(q)) ||
      (s.classLevel && s.classLevel.toLowerCase().includes(q));

    const userRolesList = (s.roles && s.roles.length > 0) ? s.roles : [s.role || 'Student'];
    const matchesRole = roleFilter === 'All' || userRolesList.includes(roleFilter as any);
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleToggleStatus = async (student: AdminUser) => {
    const newStatus = (student.status === 'Active' ? 'Suspended' : 'Active') as 'Active' | 'Suspended';
    try {
      await updateAdminUserStatusApi(student.id, newStatus);
    } catch (err) {
      console.error('Failed to update student status on backend:', err);
    }
    onUpdateStudent({ ...student, status: newStatus });
    setToggleConfirmTarget(null);
  };

  const handleOpenRoleModal = (student: AdminUser) => {
    setRoleEditTarget(student);
    const initialRoles = (student.roles && student.roles.length > 0)
      ? student.roles
      : [student.role || 'Student'];
    setSelectedRoles(initialRoles);
    setRoleNotice(null);
  };

  const handleToggleRoleSelection = (role: string) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        if (prev.length === 1) return prev; // At least one role must remain selected
        return prev.filter((r) => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleSaveRole = async () => {
    if (!roleEditTarget || selectedRoles.length === 0) return;
    setIsUpdatingRole(true);
    try {
      const res = await updateAdminUserRoleApi(roleEditTarget.id, selectedRoles);
      const updatedRoles = (res && res.roles) || selectedRoles;
      onUpdateStudent({
        ...roleEditTarget,
        roles: updatedRoles as any,
        role: updatedRoles[0] as any,
      });
      setRoleNotice(`Roles for ${roleEditTarget.email} updated to [${updatedRoles.join(', ')}].`);
      setTimeout(() => {
        setRoleEditTarget(null);
        setRoleNotice(null);
      }, 1200);
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Student Accounts & Candidate Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real registered database accounts • {students.length} Total Users • {students.filter((s) => s.status === 'Active').length} Active
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-create-staff-account"
            onClick={() => {
              setIsAddStaffOpen(true);
              setCreateStaffError(null);
              setCreateStaffSuccess(null);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Staff Account
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          )}
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
            {students.filter((s) => s.status === 'Active').length} Active
          </span>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300/40">
            {students.filter((s) => ['Admin', 'Teacher', 'Editor', 'ContentManager', 'Moderator'].includes(s.role)).length} Staff
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search students by name, email, target board, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Role Filter
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold"
            >
              <option value="All">All Roles</option>
              <option value="Student">Student</option>
              <option value="Teacher">Teacher</option>
              <option value="Admin">Admin</option>
              <option value="Editor">Editor</option>
              <option value="ContentManager">ContentManager</option>
              <option value="Moderator">Moderator</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {filteredStudents.length === 0 ? (
          <div className="py-16 text-center space-y-3 p-6">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {searchQuery || roleFilter !== 'All' ? 'No Matching Accounts Found' : 'No Accounts in Database Yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery || roleFilter !== 'All'
                ? 'Try adjusting your search criteria or clearing active filters.'
                : 'Registered students will appear here in real-time as they sign up via Supabase Auth.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Student / Candidate</th>
                  <th className="py-3 px-4">Class & Board</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4">Tests Taken</th>
                  <th className="py-3 px-4">Earned Points</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((s) => {
                  const isActive = s.status === 'Active';
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center text-xs shrink-0">
                            {s.name.slice(0, 1)}
                          </div>
                          <div>
                            <div>{s.name}</div>
                            <div className="text-[11px] text-slate-400 font-normal">{s.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        <div className="font-semibold">{s.classLevel || 'Class 10'}</div>
                        <div className="text-[11px] text-slate-400">{s.board || 'BISE Lahore'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {((s.roles && s.roles.length > 0) ? s.roles : [s.role || 'Student']).map((rName) => (
                            <span
                              key={rName}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rName === 'Admin' || rName === 'SuperAdmin'
                                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                  : rName === 'Teacher'
                                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  : rName === 'Editor' || rName === 'Moderator' || rName === 'ContentManager'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {rName}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {s.testsCompleted || 0}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400">
                        {s.points || 0} pts
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {s.joinedDate || 'Recent'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            isActive
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300/30'
                              : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-300/30'
                          }`}
                        >
                          {isActive ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {s.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenRoleModal(s)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors cursor-pointer flex items-center gap-1"
                            title="Assign role (Admin, Teacher, Editor, Student)"
                          >
                            <Shield className="w-3 h-3" />
                            Role
                          </button>

                          <button
                            onClick={() => {
                              setPasswordResetTarget(s);
                              setResetNewPassword('');
                              setResetConfirmPassword('');
                              setResetPasswordError(null);
                              setResetPasswordSuccess(null);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1"
                            title="Reset Account Password"
                          >
                            <Lock className="w-3 h-3" />
                            Reset Pwd
                          </button>

                          <button
                            onClick={() => setToggleConfirmTarget(s)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                            }`}
                            title={isActive ? 'Suspend candidate account' : 'Reactivate account'}
                          >
                            {isActive ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Assignment Modal */}
      {roleEditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setRoleEditTarget(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Assign User Role
                </h3>
                <p className="text-xs text-slate-500">
                  {roleEditTarget.name} ({roleEditTarget.email})
                </p>
              </div>
            </div>

            {roleNotice && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {roleNotice}
              </div>
            )}

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Roles (Multiple Allowed)
                </label>
                <div className="space-y-2">
                  {[
                    { role: 'Student', desc: 'Can take quizzes, track score, earn certificates' },
                    { role: 'Teacher', desc: 'Can create custom quizzes and view class test results' },
                    { role: 'Editor', desc: 'Can add, edit, and audit MCQs, notes, and past papers' },
                    { role: 'ContentManager', desc: 'Can manage curriculum content, questions, and test suites' },
                    { role: 'Moderator', desc: 'Can audit student feedback and error reports' },
                    { role: 'Admin', desc: 'Full administrative access to platform and database' },
                  ].map((item) => {
                    const isSelected = selectedRoles.includes(item.role);
                    return (
                      <label
                        key={item.role}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-700 shadow-2xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="userRoles"
                          value={item.role}
                          checked={isSelected}
                          onChange={() => handleToggleRoleSelection(item.role)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-600 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                            <span>{item.role}</span>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">Assigned</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span className="font-semibold">Selected:</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                    [{selectedRoles.join(', ')}]
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRoleEditTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRole}
                  disabled={isUpdatingRole || selectedRoles.length === 0}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isUpdatingRole ? 'Updating...' : `Save Roles (${selectedRoles.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Account Modal */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddStaffOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Create Staff Account
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provision new team members with multi-role access and secure credentials
                </p>
              </div>
            </div>

            {createStaffError && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                {createStaffError}
              </div>
            )}

            {createStaffSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {createStaffSuccess}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Tariq Mahmood"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="staff@taleemguru.pk"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Assign Multi-Roles (Select all that apply)
                  </label>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                    {newStaffRoles.length} role(s) selected
                  </span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {[
                    { role: 'Teacher', desc: 'Create tests, track student quiz scores' },
                    { role: 'Staff', desc: 'Institutional operations & content maintenance' },
                    { role: 'Editor', desc: 'Curate MCQs, past papers, notes' },
                    { role: 'ContentManager', desc: 'Manage curriculum suites and question bank' },
                    { role: 'Moderator', desc: 'Review reports, feedback, and audit logs' },
                    { role: 'Admin', desc: 'Full administrative staff and user management' },
                    { role: 'Student', desc: 'Candidate learner access' },
                  ].map((item) => {
                    const isSelected = newStaffRoles.includes(item.role);
                    return (
                      <label
                        key={item.role}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-700 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setNewStaffRoles((prev) =>
                              isSelected
                                ? (prev.length > 1 ? prev.filter((r) => r !== item.role) : prev)
                                : [...prev, item.role]
                            );
                          }}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-600 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-900 dark:text-white">{item.role}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5 truncate">
                            — {item.desc}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Password (min 6 characters)
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateNewStaffPassword}
                    className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewStaffPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewStaffPassword(!showNewStaffPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewStaffPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type={showNewStaffPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Repeat password"
                  value={newStaffConfirmPassword}
                  onChange={(e) => setNewStaffConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Credentials are encrypted server-side using secure cryptographic hashing.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingStaff}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isCreatingStaff ? 'Creating...' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {passwordResetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setPasswordResetTarget(null);
                setResetPasswordError(null);
                setResetPasswordSuccess(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Reset Account Password
                </h3>
                <p className="text-xs text-slate-500">
                  Authoritative administrative password override
                </p>
              </div>
            </div>

            {resetPasswordError && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                {resetPasswordError}
              </div>
            )}

            {resetPasswordSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {resetPasswordSuccess}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white">{passwordResetTarget.name}</div>
                <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{passwordResetTarget.email}</div>
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-500 text-[11px]">Roles:</span>
                  {(passwordResetTarget.roles || [passwordResetTarget.role || 'Student']).map(r => (
                    <span key={r} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    New Password (min 6 chars)
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                  >
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter new password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showResetPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Repeat new password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordResetTarget(null);
                    setResetPasswordError(null);
                    setResetPasswordSuccess(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword || !resetNewPassword || !resetConfirmPassword}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {isResettingPassword ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Toggle Confirmation */}
      <AdminConfirmDialog
        isOpen={Boolean(toggleConfirmTarget)}
        title={
          toggleConfirmTarget?.status === 'Active'
            ? 'Suspend Student Account?'
            : 'Activate Student Account?'
        }
        message={
          toggleConfirmTarget?.status === 'Active'
            ? `Are you sure you want to suspend access for ${toggleConfirmTarget.name} (${toggleConfirmTarget.email})? They will be unable to take tests or save progress.`
            : `Reactivate access for ${toggleConfirmTarget?.name}?`
        }
        confirmLabel={
          toggleConfirmTarget?.status === 'Active' ? 'Suspend Account' : 'Activate Account'
        }
        isDestructive={toggleConfirmTarget?.status === 'Active'}
        onConfirm={() => {
          if (toggleConfirmTarget) {
            handleToggleStatus(toggleConfirmTarget);
          }
        }}
        onCancel={() => setToggleConfirmTarget(null)}
      />
    </div>
  );
};
