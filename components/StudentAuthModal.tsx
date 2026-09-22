import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  Target,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { StudentProfile } from '../types';
import { BOARDS_LIST, SCHOOL_CLASSES } from '../data/mockData';
import {
  loginWithEmail,
  signUpWithEmail,
  loginWithGoogle,
  resetPasswordWithEmail,
  syncUserProfile,
  getUserProfile,
  isUserAdminInCloud,
  verifyUserRoleWithServer,
  formatAuthErrorMessage,
  mapSupabaseUserToStudentProfile,
  isSupabaseConfigured,
} from '../lib/supabaseService';
import { getAuthRedirectUrl } from '../lib/config';

interface StudentAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudent: StudentProfile | null;
  onUpdateStudent: (updated: StudentProfile) => void;
  initialMode?: 'login' | 'register' | 'forgot-password';
}

export const StudentAuthModal: React.FC<StudentAuthModalProps> = ({
  isOpen,
  onClose,
  currentStudent,
  onUpdateStudent,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>(initialMode);
  const [name, setName] = useState(currentStudent?.name || '');
  const [email, setEmail] = useState(currentStudent?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState(currentStudent?.board || 'BISE Lahore');
  const [selectedClass, setSelectedClass] = useState(currentStudent?.classLevel || 'Class 10 (Matric Pt 2)');
  const [targetExam, setTargetExam] = useState(currentStudent?.targetExam || 'MDCAT / BISE Board Exam');
  const [avatar, setAvatar] = useState(currentStudent?.avatar || '👨‍🎓');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setInterval(() => {
      setResetCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCooldown]);

  const avatarOptions = ['👨‍🎓', '👩‍🎓', '🧑‍🔬', '👩‍⚕️', '👨‍💻', '👩‍🏫', '🚀', '🌟'];

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsUnauthorizedDomain(false);
      setCopiedDomain(false);
      setPassword('');
      setConfirmPassword('');
      if (currentStudent) {
        setName(currentStudent.name || '');
        setEmail(currentStudent.email || '');
        setSelectedBoard(currentStudent.board || 'BISE Lahore');
        setSelectedClass(currentStudent.classLevel || 'Class 10 (Matric Pt 2)');
        setTargetExam(currentStudent.targetExam || 'MDCAT / BISE Board Exam');
        setAvatar(currentStudent.avatar || '👨‍🎓');
      }
    }
  }, [isOpen, initialMode, currentStudent]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsUnauthorizedDomain(false);
    try {
      const redirectUrl = getAuthRedirectUrl('/auth/callback');
      const result = await loginWithGoogle(redirectUrl);
      if (result.url) {
        setSuccessMsg('Redirecting to Google for authentication...');
        window.location.href = result.url;
        return;
      }
      setSuccessMsg('Connecting to Google through Supabase Auth...');
    } catch (err: any) {
      console.error('Google sign in error:', err);
      const isUnauth = err?.code === 'auth/unauthorized-domain' ||
                       String(err?.message || '').includes('unauthorized-domain');
      if (isUnauth) {
        setIsUnauthorizedDomain(true);
      }
      setErrorMsg(formatAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (resetCooldown > 0) {
      setErrorMsg(`Please wait ${resetCooldown}s before requesting another reset email.`);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await resetPasswordWithEmail(cleanEmail);
      setResetCooldown(60);
      setSuccessMsg(`Password reset instructions sent to ${cleanEmail}. Please check your inbox and spam folders.`);
    } catch (err: any) {
      console.warn('Password reset notice:', err?.message || err);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent double submission
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (!confirmPassword) {
        setErrorMsg('Please confirm your password.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please re-check.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'register') {
        const { user, session } = await signUpWithEmail(cleanEmail, password, {
          name: name.trim(),
          board: selectedBoard,
          classLevel: selectedClass,
          targetExam: targetExam.trim() || 'BISE Annual Exam',
          avatar,
        });

        if (user) {
          // If Supabase email confirmation is enabled and session is null:
          // DO NOT treat the student as logged in.
          // DO NOT close the signup flow as if login succeeded.
          // DO NOT call onUpdateStudent.
          if (!session) {
            setSuccessMsg(
              'Your account has been created. Please check your email and confirm your account before signing in.'
            );
            setMode('login');
            setPassword('');
            setConfirmPassword('');
            return;
          }

          // If email confirmation is disabled or session is immediately returned, allow the student to continue normally
          const newProfile = mapSupabaseUserToStudentProfile(user);
          await syncUserProfile(user.uid, newProfile);
          onUpdateStudent(newProfile);
          setSuccessMsg('Account registered successfully via Supabase Auth! Welcome to Taleem Guru.');
          setTimeout(() => {
            onClose();
          }, 800);
          return;
        }
      } else {
        // Login mode
        let user: any = null;
        let session: any = null;
        let supabaseLoginErr: any = null;

        try {
          const cred = await loginWithEmail(cleanEmail, password);
          user = cred.user;
          session = cred.session;
        } catch (err: any) {
          supabaseLoginErr = err;
        }

        // Fallback for authorized administrators / staff accounts
        if (!user || !session) {
          try {
            const adminRes = await fetch('/api/admin/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail, password }),
            });

            if (adminRes.ok) {
              const adminData = await adminRes.json();
              if (adminData.success && adminData.user) {
                try {
                  localStorage.setItem('taleemguru_admin_token', adminData.token);
                  localStorage.setItem('taleemguru_admin_profile', JSON.stringify({
                    id: adminData.user.uid,
                    name: adminData.user.name,
                    email: adminData.user.email,
                    role: adminData.user.role,
                    status: 'Active',
                    testsCompleted: 0,
                    points: 9999,
                    joinedDate: new Date().toLocaleDateString('en-GB'),
                  }));
                } catch {}

                const adminStudentProfile: StudentProfile = {
                  uid: adminData.user.uid,
                  name: adminData.user.name || 'Administrator',
                  email: adminData.user.email || cleanEmail,
                  targetExam: 'MDCAT / BISE Board Exam',
                  classLevel: 'Class 12 (FSc Pre-Medical)',
                  board: 'Federal Board (FBISE)',
                  points: 9999,
                  streakDays: 30,
                  testsTaken: 100,
                  savedQuestionIds: [],
                  wrongQuestionIds: [],
                  certificates: [],
                  avatar: '👨‍💼',
                  roles: ['Admin'],
                };

                onUpdateStudent(adminStudentProfile);
                setSuccessMsg('Signed in successfully with Administrator privileges!');
                setTimeout(() => {
                  onClose();
                }, 700);
                return;
              }
            }
          } catch {}

          if (supabaseLoginErr) {
            throw supabaseLoginErr;
          }
          throw new Error('Please check your email to confirm your account before signing in.');
        }

        // Authoritatively retrieve database profile and verify admin privileges
        const normalizedEmail = (user.email || cleanEmail).toLowerCase().trim();
        const serverAuth = await verifyUserRoleWithServer(user.uid, normalizedEmail, session?.access_token);
        const authoritativeRole: 'Admin' | 'Student' = serverAuth.isAdmin ? 'Admin' : 'Student';
        let cloudProfile = await getUserProfile(user.uid);
        
        if (!cloudProfile) {
          // First-time user without database profile: create initial profile using initial provider name
          const baseProfile = mapSupabaseUserToStudentProfile(user, serverAuth.isAdmin);
          await syncUserProfile(user.uid, baseProfile);
          cloudProfile = (await getUserProfile(user.uid)) || baseProfile;
        }

        const studentProfile: StudentProfile = {
          ...cloudProfile,
          email: (cloudProfile.email || normalizedEmail).toLowerCase().trim(),
          roles: authoritativeRole === 'Admin' ? ['Admin'] : ['Student'],
        };

        // Normal login must NOT call syncUserProfile when database profile exists
        onUpdateStudent(studentProfile);
        setSuccessMsg(
          serverAuth.isAdmin
            ? 'Signed in successfully with Administrator privileges!'
            : 'Signed in successfully with Supabase Auth!'
        );
        setTimeout(() => {
          onClose();
        }, 700);
        return;
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setErrorMsg(formatAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between border-b border-blue-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden shrink-0">
              <img 
                src="/assets/taleemguru-logo-original.png" 
                alt="Taleem Guru Official Logo" 
                className="w-8 h-8 object-contain" 
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Taleem Guru Official Portal</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-0.5">
                {mode === 'login'
                  ? 'Candidate Sign In'
                  : mode === 'register'
                  ? 'Create Student Account'
                  : 'Reset Password'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer self-start"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher for Login / Register */}
        {mode !== 'forgot-password' && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'text-blue-600 dark:text-cyan-400 border-b-2 border-blue-600 dark:border-cyan-400 bg-blue-50/50 dark:bg-blue-950/30 font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'text-blue-600 dark:text-cyan-400 border-b-2 border-blue-600 dark:border-cyan-400 bg-blue-50/50 dark:bg-blue-950/30 font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              New Registration
            </button>
          </div>
        )}

        {/* Domain Authorization Helper Card */}
        {isUnauthorizedDomain && (
          <div className="mx-6 mt-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-extrabold text-sm text-amber-800 dark:text-amber-300">
                  Domain Authorization Required
                </p>
                <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  Google OAuth requires this preview domain in your Supabase Redirect URLs whitelist. You can add this domain in your Supabase Auth settings, or sign up / log in with Email & Password below.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
              <code className="text-[11px] font-mono text-slate-800 dark:text-slate-200 flex-1 truncate select-all">
                {typeof window !== 'undefined' ? window.location.hostname : 'current domain'}
              </code>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(window.location.hostname);
                    setCopiedDomain(true);
                    setTimeout(() => setCopiedDomain(false), 2000);
                  }
                }}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors text-[10px]"
              >
                {copiedDomain ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Feedback alerts */}
        {errorMsg && !isUnauthorizedDomain && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Forgot Password View */}
        {mode === 'forgot-password' ? (
          <form onSubmit={handleForgotPassword} className="p-6 space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Enter your registered email address below and we will send you a secure link to reset your password.
            </p>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Registered Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || resetCooldown > 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white font-extrabold rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <KeyRound className="w-4 h-4" />
              <span>
                {isLoading
                  ? 'Sending Reset Link...'
                  : resetCooldown > 0
                  ? `Resend available in ${resetCooldown}s`
                  : 'Send Password Reset Link'}
              </span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          /* Login / Register Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
            {/* Quick Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
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
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              <span className="text-[10px] uppercase font-bold text-slate-400">Or with Email & Password</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>

            {mode === 'register' && (
              <>
                {/* Avatar Picker */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Choose Candidate Avatar</label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {avatarOptions.map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setAvatar(av)}
                        className={`w-8 h-8 rounded-xl text-base flex items-center justify-center border transition-all cursor-pointer ${
                          avatar === av
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/80 ring-2 ring-blue-500 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-400'
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Muhammad Usman"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot-password');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (min 6 characters)"
                  className="w-full pl-10 pr-10 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Academic Profile Selection */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Education Board</label>
                    <select
                      value={selectedBoard}
                      onChange={(e) => setSelectedBoard(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
                    >
                      {BOARDS_LIST.map((b) => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Class / Level</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
                    >
                      {SCHOOL_CLASSES.slice(8).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Examination Goal</label>
                  <div className="relative">
                    <Target className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={targetExam}
                      onChange={(e) => setTargetExam(e.target.value)}
                      placeholder="e.g. Matric Board Topper, MDCAT 2026, ECAT, CSS"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white font-extrabold rounded-xl shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.01] active:scale-98 mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isLoading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Student Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
