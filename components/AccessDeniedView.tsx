import React from 'react';
import {
  ShieldAlert,
  Lock,
  ArrowLeft,
  LogIn,
  KeyRound,
  Home,
  UserCheck,
  AlertTriangle,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { RouteAuthResult, StudentProfile, AdminUser } from '../types';

interface AccessDeniedViewProps {
  authResult: RouteAuthResult;
  currentUser?: StudentProfile | AdminUser | null;
  onNavigateHome: () => void;
  onNavigateDashboard?: () => void;
  onOpenAuthModal?: () => void;
  onOpenAdminLogin?: () => void;
  onOpenLogin?: () => void;
  onSwitchAccount?: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  authResult,
  currentUser,
  onNavigateHome,
  onNavigateDashboard,
  onOpenAuthModal,
  onOpenAdminLogin,
  onOpenLogin,
  onSwitchAccount,
}) => {
  const isUnauthenticated = authResult.status === 'UNAUTHENTICATED';
  const isForbidden = authResult.status === 'FORBIDDEN';

  const handleOpenStudentLogin = onOpenAuthModal || onOpenLogin || (() => {});
  const handleOpenAdminLogin = onOpenAdminLogin || onOpenLogin || (() => {});

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Banner Header */}
        <div
          className={`p-6 sm:p-8 text-white text-center relative border-b ${
            isForbidden
              ? 'bg-gradient-to-r from-red-950 via-rose-900 to-slate-900 border-red-800/40'
              : 'bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border-amber-800/40'
          }`}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-4 shadow-xl">
            {isForbidden ? (
              <ShieldAlert className="w-9 h-9 text-rose-400 animate-pulse" />
            ) : (
              <Lock className="w-9 h-9 text-amber-400" />
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-black/30 border border-white/15 text-white/90 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            {isForbidden ? 'Security Gate: HTTP 403 Forbidden' : 'Security Gate: HTTP 401 Unauthorized'}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {isForbidden ? 'Access Denied: Insufficient Privileges' : 'Protected Area: Authentication Required'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-lg mx-auto leading-relaxed">
            {isForbidden
              ? 'This system resource is strictly restricted to authorized administrative personnel.'
              : 'You must be signed in with an active account to access this private student portal.'}
          </p>
        </div>

        {/* Diagnostic Security Details */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 text-xs space-y-3">
            <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Access Control Audit Log
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Attempted Route</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs break-all">
                  {authResult.path}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Required Role(s)</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {authResult.requiredRoles.map((role) => (
                    <span
                      key={role}
                      className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-md font-bold text-[10px] uppercase"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Current Identity</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {currentUser ? currentUser.email || currentUser.name : 'Unauthenticated Guest'}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Assigned Role</span>
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 rounded-md font-bold text-[10px] uppercase inline-block">
                  {authResult.currentRole || 'Guest (None)'}
                </span>
              </div>
            </div>

            {authResult.message && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-300 leading-relaxed">
                {authResult.message}
              </div>
            )}
          </div>

          {/* Action Pathways */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recommended Actions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isUnauthenticated ? (
                <>
                  <button
                    onClick={handleOpenStudentLogin}
                    className="py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Candidate Sign In / Register</span>
                  </button>

                  <button
                    onClick={handleOpenAdminLogin}
                    className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-cyan-400" />
                    <span>Staff & Admin Sign In</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleOpenAdminLogin}
                    className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Authenticate as Administrator</span>
                  </button>

                  {onSwitchAccount && (
                    <button
                      onClick={onSwitchAccount}
                      className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Switch Account</span>
                    </button>
                  )}

                  {onNavigateDashboard && (
                    <button
                      onClick={onNavigateDashboard}
                      className="py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Back to Student Dashboard</span>
                    </button>
                  )}
                </>
              )}

              <button
                onClick={onNavigateHome}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer sm:col-span-2"
              >
                <Home className="w-4 h-4" />
                <span>Return to Public Homepage</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
