import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { AdminUser } from '../types';
import {
  loginWithEmail,
  loginWithGoogle,
  resetPasswordWithEmail,
  logoutUser,
  formatAuthErrorMessage,
  isUserAdminInCloud,
  getUserProfile,
  verifyUserRoleWithServer,
} from '../lib/supabaseService';
import { getAuthRedirectUrl } from '../lib/config';
import { useSiteSettings } from '../context/SiteSettingsContext';

export interface AdminLoginPortalProps {
  onLoginSuccess?: (admin: AdminUser) => void;
  onLogin?: (admin: AdminUser) => void;
  onBackToHome?: () => void;
}

export const AdminLoginPortal: React.FC<AdminLoginPortalProps> = ({
  onLoginSuccess,
  onLogin,
  onBackToHome,
}) => {
  const { siteName, logoUrl, logoAlt } = useSiteSettings();
  const triggerLoginSuccess = onLoginSuccess || onLogin || (() => {});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resetCooldown, setResetCooldown] = useState(0);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setInterval(() => {
      setResetCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCooldown]);

  const handleAdminEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid administrator or teacher email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[DEBUG-AUTH] AdminLoginPortal submitting to /api/admin/login for', cleanEmail);
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.user && data.token) {
        const resolvedRoles: any = Array.isArray(data.user.roles) && data.user.roles.length > 0
          ? data.user.roles
          : [data.user.role || 'Admin'];

        const adminData: AdminUser = {
          id: data.user.uid,
          name: data.user.name || 'Administrator',
          email: (data.user.email || cleanEmail).trim().toLowerCase(),
          roles: resolvedRoles,
          status: data.user.status || 'Active',
          testsCompleted: 0,
          points: 9999,
          joinedDate: new Date().toLocaleDateString('en-GB'),
        };

        try {
          localStorage.setItem('taleemguru_admin_token', data.token);
        } catch {}
        try {
          localStorage.setItem('taleemguru_admin_profile', JSON.stringify(adminData));
        } catch {}

        setSuccessMsg('Admin authentication verified successfully.');
        setTimeout(() => {
          triggerLoginSuccess(adminData);
        }, 600);
      } else {
        const errMsg = data.error || data.message || 'Invalid email or password.';
        setErrorMsg(errMsg);
      }
    } catch (err: any) {
      console.error('Error in AdminLoginPortal submit:', err);
      setErrorMsg('Network connection failed. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const redirectUrl = getAuthRedirectUrl('/admin');
      const result = await loginWithGoogle(redirectUrl);
      if (result.url) {
        setSuccessMsg('Redirecting to Google for authentication...');
        window.location.href = result.url;
        return;
      }
      setSuccessMsg('Connecting to Google through Supabase Auth...');
    } catch (err: any) {
      console.error('Admin Google sign in error:', err);
      setErrorMsg(formatAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (resetCooldown > 0) {
      setErrorMsg(`Please wait ${resetCooldown}s before requesting another reset email.`);
      return;
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await resetPasswordWithEmail(cleanEmail);
      setResetCooldown(60);
      setSuccessMsg(`Password reset instructions sent to ${cleanEmail}. Please check your email.`);
    } catch (err: any) {
      console.warn('Admin password reset notice:', err?.message || err);
      const isRateLimited =
        String(err?.message || '').toLowerCase().includes('rate limit') ||
        String(err?.message || '').toLowerCase().includes('once every') ||
        err?.status === 429;
      if (isRateLimited) {
        setResetCooldown(60);
      }
      setErrorMsg(formatAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header Banner */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/40 text-center relative">
          <div className="flex justify-center mb-3">
            <div className="bg-white/95 rounded-2xl p-3 shadow-xl border border-white/20">
              <img 
                src={logoUrl || "/assets/taleemguru-logo-original.png"} 
                alt={logoAlt || `${siteName} Official Logo`} 
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-indigo-500/20 text-cyan-300 border border-indigo-400/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Staff & Admin Security Gate
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">{siteName} Administration</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
            Authorized portal for teachers, paper setters, and board coordinators. Please authenticate to proceed.
          </p>
        </div>

        {/* Feedback notifications */}
        {errorMsg && (
          <div className="mx-6 sm:mx-8 mt-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 sm:mx-8 mt-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Form Container */}
        <div className="p-6 sm:p-8">
          {isForgotPassword ? (
            <form onSubmit={handleAdminPasswordReset} className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-300 text-xs">
                Enter your administrative account email address to receive a password reset link.
              </p>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Admin Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter official staff/admin email"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-indigo-500 text-xs"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || resetCooldown > 0}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <KeyRound className="w-4 h-4" />
                <span>
                  {isLoading
                    ? 'Sending Link...'
                    : resetCooldown > 0
                    ? `Resend available in ${resetCooldown}s`
                    : 'Send Password Reset Email'}
                </span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  ← Back to Admin Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAdminEmailLogin} className="space-y-4 text-xs">
              {/* Google Sign-in for Staff */}
              <button
                type="button"
                onClick={handleAdminGoogleLogin}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-xl border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google Workspace</span>
              </button>

              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="text-[10px] uppercase font-bold text-slate-400">Or enter staff credentials</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Official Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter official email address"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-indigo-500 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Staff Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] font-bold text-indigo-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-indigo-500 text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.01] active:scale-98 mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Admin Console'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {onBackToHome && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={onBackToHome}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    ← Return to Homepage
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
