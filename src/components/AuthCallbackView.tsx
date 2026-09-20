import React, { useEffect, useState, useRef } from 'react';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import {
  verifyUserRoleWithServer,
  getUserProfile,
  syncUserProfile,
  mapSupabaseUserToStudentProfile,
} from '../lib/supabaseService';
import { StudentProfile, AdminUser, ViewMode } from '../types';
import { updateBrowserUrl } from '../lib/routeGuards';

interface AuthCallbackViewProps {
  onAuthSuccess: (student: StudentProfile, admin: AdminUser | null) => void;
  onNavigate: (view: ViewMode, subFilter?: string, adminTab?: string) => void;
}

export const AuthCallbackView: React.FC<AuthCallbackViewProps> = ({
  onAuthSuccess,
  onNavigate,
}) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your credentials and establishing a secure session...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const handleCallback = async () => {
      try {
        if (typeof window === 'undefined') return;

        // 1. Check for errors in URL search params or hash
        const searchParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash || '';
        const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);

        const errorDesc =
          searchParams.get('error_description') ||
          hashParams.get('error_description') ||
          searchParams.get('error') ||
          hashParams.get('error');

        if (errorDesc) {
          setStatus('error');
          setErrorMessage(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
          return;
        }

        // 2. If PKCE auth code is present in query parameters, exchange it for a session
        const authCode = searchParams.get('code');
        if (authCode) {
          setMessage('Exchanging authorization code for secure session...');
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(authCode);
          if (exchangeErr) {
            console.error('Supabase code exchange error:', exchangeErr);
          }
        }

        // 3. Obtain the active session (either from exchanged code or detected token in URL hash)
        let { data: { session }, error: sessionErr } = await supabase.auth.getSession();

        if (!session && !sessionErr) {
          // If session is still resolving asynchronously, wait briefly
          await new Promise((resolve) => setTimeout(resolve, 800));
          const retry = await supabase.auth.getSession();
          session = retry.data.session;
          sessionErr = retry.error;
        }

        if (sessionErr || !session || !session.user) {
          setStatus('error');
          setErrorMessage(
            sessionErr?.message ||
              'Unable to authenticate your session. Please ensure your login credentials or verification link are valid.'
          );
          return;
        }

        // 4. Server-authoritative role verification
        const user = session.user;
        const normalizedEmail = (user.email || '').toLowerCase().trim();
        setMessage('Verifying student profile and security permissions...');

        const serverAuth = await verifyUserRoleWithServer(user.id, normalizedEmail, session.access_token);
        const authoritativeRole: 'Admin' | 'Student' = serverAuth.isAdmin ? 'Admin' : 'Student';
        const isAuthAdmin = serverAuth.isAdmin || normalizedEmail === 'admin@taleemguru.pk';

        // 5. Cloud database profile retrieval or initial sync
        let cloudProfile = await getUserProfile(user.id);
        if (!cloudProfile) {
          const baseProfile = mapSupabaseUserToStudentProfile(user, isAuthAdmin);
          await syncUserProfile(user.id, baseProfile);
          cloudProfile = (await getUserProfile(user.id)) || baseProfile;
        }

        const rawResolvedName =
          (serverAuth.serverUser?.name && serverAuth.serverUser.name !== 'avatar-1' ? serverAuth.serverUser.name : null) ||
          (cloudProfile?.name && cloudProfile.name !== 'avatar-1' ? cloudProfile.name : null) ||
          (user.user_metadata?.full_name || user.user_metadata?.name || null) ||
          (isAuthAdmin ? 'Admin' : normalizedEmail ? normalizedEmail.split('@')[0] : 'Learner');

        const resolvedName = isAuthAdmin ? 'Admin' : rawResolvedName;

        const studentProfile: StudentProfile = {
          ...cloudProfile,
          name: resolvedName,
          email: normalizedEmail,
          roles: authoritativeRole === 'Admin' ? ['Admin'] : ['Student'],
          avatar: isAuthAdmin ? '👨‍💼' : cloudProfile.avatar || '🎓',
        };

        let verifiedAdmin: AdminUser | null = null;
        if (isAuthAdmin) {
          verifiedAdmin = {
            id: user.id,
            name: resolvedName,
            email: normalizedEmail,
            roles: (serverAuth.serverUser?.roles || ['Admin']) as any,
            status: 'Active',
            testsCompleted: 0,
            points: 9999,
            joinedDate: new Date().toLocaleDateString('en-GB'),
          };
        }

        // 6. Propagate state up to the root app
        onAuthSuccess(studentProfile, verifiedAdmin);
        setStatus('success');
        setMessage('Authentication confirmed! Directing you to your dashboard...');

        // 7. Clean up OAuth tokens from URL bar to prevent token leakage
        const nextTarget = searchParams.get('next') || searchParams.get('redirectTo');

        setTimeout(() => {
          if (nextTarget && nextTarget.startsWith('/')) {
            updateBrowserUrl(nextTarget, true);
            if (nextTarget.startsWith('/admin')) {
              onNavigate('admin-panel', undefined, nextTarget.replace('/admin/', '').replace('/admin', '') || 'dashboard');
            } else if (nextTarget.startsWith('/dashboard')) {
              onNavigate('student-dashboard');
            } else if (nextTarget.startsWith('/tests')) {
              onNavigate('tests');
            } else if (nextTarget.startsWith('/mcqs')) {
              onNavigate('mcqs');
            } else {
              onNavigate('student-dashboard');
            }
          } else if (isAuthAdmin) {
            updateBrowserUrl('/admin', true);
            onNavigate('admin-panel', undefined, 'dashboard');
          } else {
            updateBrowserUrl('/dashboard', true);
            onNavigate('student-dashboard');
          }
        }, 600);
      } catch (err: any) {
        console.error('Error during authentication callback processing:', err);
        setStatus('error');
        setErrorMessage(err?.message || 'An unexpected error occurred while completing authentication.');
      }
    };

    handleCallback();
  }, [onAuthSuccess, onNavigate]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Authenticating with Taleem Guru
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mb-6">
              {message}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>End-to-end encrypted session verification</span>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Sign-In Successful!
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mb-4">
              {message}
            </p>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-full animate-pulse" />
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Authentication Notice
            </h2>
            <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg border border-rose-200 dark:border-rose-900/50 mb-6 text-left w-full">
              {errorMessage || 'Unable to authenticate. The verification link may have expired or already been used.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => {
                  updateBrowserUrl('/', true);
                  onNavigate('home');
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Return to Home
              </button>
              <button
                onClick={() => {
                  updateBrowserUrl('/', true);
                  onNavigate('home');
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition"
              >
                <span>Try Login Again</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
