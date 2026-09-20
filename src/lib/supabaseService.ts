import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { StudentProfile, TestResult, AdminUser } from '../types';
import { syncUserProfileWithDb, saveTestResultApi, updateUserProfileApi } from './api';
import { getAuthRedirectUrl } from './config';

export { supabase, isSupabaseConfigured };

export interface NormalizedAuthUser {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  roles?: string[];
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, any>;
}

export interface SupabaseAuthResult {
  user: NormalizedAuthUser;
  session: Session | null;
}

/**
 * Asserts that Supabase configuration is present.
 * Prevents silent failures or fake user creation.
 */
function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.'
    );
  }
}

/**
 * Friendly formatter for Supabase authentication error messages.
 */
export function formatAuthErrorMessage(error: any): string {
  if (!error) return 'An unexpected authentication error occurred.';
  const message = error.message || error.error_description || String(error);
  const lower = message.toLowerCase();

  // 1. Invalid credentials / wrong password / unverified credentials check FIRST
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials') ||
    lower.includes('invalid_grant') ||
    lower.includes('invalid email or password') ||
    lower.includes('invalid administrator credentials') ||
    lower.includes('invalid staff credentials') ||
    lower.includes('invalid credentials')
  ) {
    return 'Invalid email or password. Please verify your credentials and try again.';
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('user_already_exists') ||
    lower.includes('already registered')
  ) {
    return 'An account with this email address already exists. Please log in instead.';
  }
  if (
    ((lower.includes('invalid email') || lower.includes('invalid_email')) && !lower.includes('password')) ||
    lower.includes('unable to validate email') ||
    lower.includes('email is invalid') ||
    lower.includes('email address is invalid')
  ) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('Password should be at least') || message.includes('weak_password')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (message.includes('Email not confirmed') || message.includes('email_not_confirmed')) {
    return 'Please check your email to confirm your account before signing in.';
  }
  if (
    message.includes('User is banned') ||
    message.includes('user_banned') ||
    message.includes('User disabled') ||
    message.includes('user_disabled')
  ) {
    return 'This account has been disabled or suspended. Please contact support.';
  }
  if (message.includes('User not found') || message.includes('user_not_found')) {
    return 'No account found with this email. Please check your credentials or register a new account.';
  }
  if (
    message.includes('rate limit') ||
    message.includes('over_email_send_rate_limit') ||
    message.includes('over_request_rate_limit') ||
    message.includes('Too many requests') ||
    message.includes('too_many_requests')
  ) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }
  if (message.includes('network') || message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Network connection failed. Please check your internet connection.';
  }
  if (message.includes('unauthorized-domain') || message.includes('unauthorized_domain')) {
    return 'Domain is not authorized for authentication redirects. Please add this domain to your Supabase Auth redirect URLs.';
  }
  if (message.includes('JWT') || message.includes('token is expired') || message.includes('session_expired')) {
    return 'Your session has expired. Please sign in again.';
  }

  return message;
}

/**
 * Sign in user using Supabase email and password.
 * Returns normalized user and official Supabase session.
 */
export async function loginWithEmail(email: string, pass: string): Promise<SupabaseAuthResult> {
  assertSupabaseConfigured();

  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: pass,
  });

  if (error) throw error;
  if (!data.user) {
    throw new Error('Authentication failed: No user returned by authentication provider.');
  }

  // Ensure an active session was returned (if email confirmation is required, Supabase returns null session)
  if (!data.session) {
    throw new Error('Please check your email to confirm your account before signing in.');
  }

  const token = data.session?.access_token;
  const isAdmin = await isUserAdminInCloud(data.user.id, data.user.email, token);

  const normalizedUser: NormalizedAuthUser = {
    uid: data.user.id,
    id: data.user.id,
    email: data.user.email ? data.user.email.toLowerCase().trim() : cleanEmail,
    displayName: data.user.user_metadata?.name || data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
    roles: isAdmin ? ['Admin'] : ['Student'],
    email_confirmed_at: data.user.email_confirmed_at || (data.user as any).confirmed_at,
    user_metadata: {
      ...data.user.user_metadata,
      roles: isAdmin ? ['Admin'] : ['Student'],
    },
  };

  return {
    user: normalizedUser,
    session: data.session,
  };
}

/**
 * Register a new user using Supabase email and password with user metadata.
 * Strictly enforces 'Student' role and validates duplicate user states.
 */
export async function signUpWithEmail(
  email: string,
  pass: string,
  extraProfile?: {
    name?: string;
    board?: string;
    classLevel?: string;
    targetExam?: string;
    avatar?: string;
    role?: 'Student' | 'Teacher' | 'Admin';
  },
  emailRedirectTo?: string
): Promise<SupabaseAuthResult> {
  assertSupabaseConfigured();

  const cleanEmail = email.trim().toLowerCase();
  const targetRedirect = emailRedirectTo || getAuthRedirectUrl('/auth/callback');

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: pass,
    options: {
      emailRedirectTo: targetRedirect,
      data: {
        name: extraProfile?.name?.trim() || cleanEmail.split('@')[0],
        board: extraProfile?.board || 'BISE Lahore',
        class_level: extraProfile?.classLevel || 'Class 10 (Matric Pt 2)',
        target_exam: extraProfile?.targetExam || 'MDCAT / BISE Board Exam',
        avatar: extraProfile?.avatar || '👨‍🎓',
        role: 'Student', // Security: strictly enforce Student role for all signups
      },
    },
  });

  if (error) throw error;
  if (!data.user) {
    throw new Error('Registration failed: No user returned by authentication provider.');
  }

  // Detect existing user when email confirmation is enabled (Supabase returns user with empty identities array)
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('An account with this email address already exists. Please log in instead.');
  }

  const normalizedUser: NormalizedAuthUser = {
    uid: data.user.id,
    id: data.user.id,
    email: data.user.email ? data.user.email.toLowerCase().trim() : cleanEmail,
    displayName: data.user.user_metadata?.name || extraProfile?.name?.trim() || cleanEmail.split('@')[0],
    roles: ['Student'],
    user_metadata: {
      ...data.user.user_metadata,
      roles: ['Student'],
    },
  };

  return {
    user: normalizedUser,
    session: data.session,
  };
}

// Backward compatibility alias for signUpWithEmail
export const registerWithEmail = signUpWithEmail;

/**
 * Initiate Google OAuth sign-in via Supabase.
 * Strictly guarantees redirects return to canonical production domain (https://www.taleemguru.pk)
 * or local dev server during local development.
 */
export async function loginWithGoogle(redirectTo?: string): Promise<{ url?: string; provider: string }> {
  assertSupabaseConfigured();

  const targetRedirect = redirectTo || getAuthRedirectUrl('/auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: targetRedirect,
    },
  });

  if (error) throw error;
  return {
    url: data.url,
    provider: 'google',
  };
}

/**
 * Send password reset email via Supabase Auth.
 * Returns users to canonical production domain or local dev.
 */
export async function resetPasswordWithEmail(email: string, redirectTo?: string): Promise<void> {
  assertSupabaseConfigured();

  const targetRedirect = redirectTo || getAuthRedirectUrl('/auth/callback');

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: targetRedirect,
  });

  if (error) throw error;
}

let isLoggingOutInProgress = false;

/**
 * Sign out current user from Supabase session.
 * Centralized function providing safe deduplication and full local state clearance.
 */
export async function logoutUser(): Promise<void> {
  if (isLoggingOutInProgress) return;
  isLoggingOutInProgress = true;

  try {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn('Supabase sign-out notice:', error);
        }
      } catch (err) {
        console.warn('Supabase sign-out error:', err);
      }
    }
  } finally {
    // Clear any residual session caches from storage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('taleem_active_user');
      localStorage.removeItem('taleem_candidate_user');
      localStorage.removeItem('taleem_guru_student');
      localStorage.removeItem('taleem_guru_admin');
      localStorage.removeItem('taleemguru_admin_token');
      localStorage.removeItem('taleemguru_admin_profile');
    }
    isLoggingOutInProgress = false;
  }
}

export const signOutUser = logoutUser;

/**
 * Retrieve active Supabase user session.
 */
export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;
    return session;
  } catch (err) {
    console.warn('Failed to retrieve active Supabase session:', err);
    return null;
  }
}

/**
 * Retrieve active Supabase user.
 */
export async function getCurrentUser(): Promise<NormalizedAuthUser | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    const cleanUserEmail = user.email ? String(user.email).trim().toLowerCase() : null;
    return {
      uid: user.id,
      id: user.id,
      email: cleanUserEmail,
      displayName: user.user_metadata?.name || user.user_metadata?.full_name || (cleanUserEmail ? cleanUserEmail.split('@')[0] : null),
      roles: user.user_metadata?.roles || user.user_metadata?.role ? [user.user_metadata?.roles || user.user_metadata?.role] : ['Student'],
      user_metadata: user.user_metadata,
    };
  } catch (err) {
    console.warn('Failed to retrieve active Supabase user:', err);
    return null;
  }
}

/**
 * Convert a Supabase User object into an application StudentProfile.
 */
export function mapSupabaseUserToStudentProfile(
  user: User | NormalizedAuthUser | any,
  isAdminOverride?: boolean
): StudentProfile {
  const uid = user.id || user.uid;
  const metadata = user.user_metadata || {};
  const isExplicitAdmin = isAdminOverride === true || user.role === 'Admin';
  const cleanEmail = user.email ? String(user.email).trim().toLowerCase() : '';
  const rawName = metadata.name || metadata.full_name || user.displayName;
  const cleanName = (isExplicitAdmin || cleanEmail === 'admin@taleemguru.pk')
    ? (rawName === 'avatar-1' || !rawName ? 'Admin' : rawName)
    : (rawName === 'avatar-1' || !rawName ? (cleanEmail ? cleanEmail.split('@')[0] : 'Learner') : rawName);

  return {
    uid,
    name: cleanName,
    email: cleanEmail,
    board: metadata.board || 'BISE Lahore',
    classLevel: metadata.class_level || 'Class 10 (Matric Pt 2)',
    targetExam: metadata.target_exam || 'MDCAT / BISE Board Exam',
    points: metadata.points || (isExplicitAdmin ? 9999 : 100),
    streakDays: metadata.streak_days || 1,
    testsTaken: metadata.tests_taken || 0,
    savedQuestionIds: metadata.saved_question_ids || [],
    wrongQuestionIds: metadata.wrong_question_ids || [],
    certificates: metadata.certificates || [],
    avatar: metadata.avatar && metadata.avatar !== 'avatar-1' ? metadata.avatar : (isExplicitAdmin ? '👨‍💼' : '👨‍🎓'),
    roles: metadata.roles || (isExplicitAdmin ? ['Admin'] : ['Student']),
  };
}

/**
 * Convert a Supabase User object into an AdminUser.
 */
export function mapSupabaseUserToAdminUser(user: User | NormalizedAuthUser | any): AdminUser {
  const metadata = user.user_metadata || {};
  const cleanEmail = user.email ? String(user.email).trim().toLowerCase() : '';
  const rawName = metadata.name || metadata.full_name || user.displayName;
  const cleanName = (cleanEmail === 'admin@taleemguru.pk' || rawName === 'avatar-1' || !rawName)
    ? 'Admin'
    : rawName;

  return {
    id: user.id || user.uid,
    name: cleanName,
    email: cleanEmail,
    roles: ['Admin'],
    status: 'Active',
    testsCompleted: metadata.tests_taken || 0,
    points: metadata.points || 9999,
    joinedDate: user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
  };
}

export type AuthChangeEvent =
  | 'INITIAL_SESSION'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | string;

/**
 * Listen to real-time authentication changes in Supabase.
 * Authoritative listener handling INITIAL_SESSION, SIGNED_IN, SIGNED_OUT,
 * TOKEN_REFRESHED, and USER_UPDATED across browser tabs.
 */
export async function subscribeToAuthState(
  callback: (user: NormalizedAuthUser | null, session?: Session | null, event?: AuthChangeEvent) => void
): Promise<() => void> {
  if (!isSupabaseConfigured) {
    callback(null, null, 'INITIAL_SESSION');
    return () => {};
  }

  let hasEmittedInitial = false;

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    hasEmittedInitial = true;
    if (event === 'SIGNED_OUT' || !session?.user) {
      callback(null, null, event);
    } else {
      const cleanEmail = session.user.email ? String(session.user.email).trim().toLowerCase() : null;
      callback(
        {
          uid: session.user.id,
          id: session.user.id,
          email: cleanEmail,
          displayName:
            session.user.user_metadata?.name ||
            session.user.user_metadata?.full_name ||
            (cleanEmail ? cleanEmail.split('@')[0] : null),
          roles: ['Student'], // Authoritative role is strictly verified via database
          user_metadata: session.user.user_metadata,
        },
        session,
        event
      );
    }
  });

  // Fast-path initialization fallback if onAuthStateChange doesn't dispatch synchronously
  setTimeout(async () => {
    if (!hasEmittedInitial) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!hasEmittedInitial) {
          hasEmittedInitial = true;
          if (session?.user) {
            const cleanEmail = session.user.email ? String(session.user.email).trim().toLowerCase() : null;
            callback(
              {
                uid: session.user.id,
                id: session.user.id,
                email: cleanEmail,
                displayName:
                  session.user.user_metadata?.name ||
                  session.user.user_metadata?.full_name ||
                  (cleanEmail ? cleanEmail.split('@')[0] : null),
                roles: ['Student'], // Authoritative role is strictly verified via database
                user_metadata: session.user.user_metadata,
              },
              session,
              'INITIAL_SESSION'
            );
          } else {
            callback(null, null, 'INITIAL_SESSION');
          }
        }
      } catch {
        if (!hasEmittedInitial) {
          hasEmittedInitial = true;
          callback(null, null, 'INITIAL_SESSION');
        }
      }
    }
  }, 100);

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Retrieve user profile from Supabase user metadata and persistent database.
 */
export async function getUserProfile(uid: string): Promise<StudentProfile | null> {
  if (!uid || !isSupabaseConfigured) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === uid) {
      const userEmail = (user.email || '').toLowerCase().trim();
      const baseProfile = mapSupabaseUserToStudentProfile(user);

      // Attempt to load synced database stats (points, testsTaken, streakDays) if session is active
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await fetch('/api/user/profile', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.profile) {
              const isAdmin = data.profile.role === 'Admin' || userEmail === 'admin@taleemguru.pk';
              const safeName = data.profile.name === 'avatar-1' || !data.profile.name
                ? (isAdmin ? 'Admin' : baseProfile.name)
                : data.profile.name;
              return {
                ...baseProfile,
                name: safeName,
                board: data.profile.board || baseProfile.board,
                classLevel: data.profile.classLevel || baseProfile.classLevel,
                targetExam: data.profile.targetExam || baseProfile.targetExam,
                avatar: data.profile.avatar && data.profile.avatar !== 'avatar-1' ? data.profile.avatar : (isAdmin ? '👨‍💼' : baseProfile.avatar),
                points: data.profile.points ?? baseProfile.points,
                streakDays: data.profile.streakDays ?? baseProfile.streakDays,
                testsTaken: data.profile.testsTaken ?? baseProfile.testsTaken,
                roles: (data.profile.roles as any) || baseProfile.roles,
              };
            }
          }
        }
      } catch (dbErr) {
        // Fallback gracefully to baseProfile from Supabase user metadata
      }

      return baseProfile;
    }
  } catch (err) {
    console.warn('Failed to retrieve user profile from Supabase:', err);
  }

  return null;
}

/**
 * Verify administrative privileges authoritatively through the backend database.
 * Does NOT trust client-side user metadata, localStorage, or email pattern matching.
 * Fails closed on any error or missing authorization.
 */
export async function verifyUserRoleWithServer(
  uid: string,
  _email?: string | null,
  accessTokenOverride?: string
): Promise<{ isAdmin: boolean; role: 'Admin' | 'Student'; serverUser?: any; status?: number; isTransient?: boolean }> {
  if (!uid || !isSupabaseConfigured) return { isAdmin: false, role: 'Student' };

  let token = accessTokenOverride;
  if (!token) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token;
    } catch (e) {
      return { isAdmin: false, role: 'Student', isTransient: true };
    }
  }

  if (!token) {
    return { isAdmin: false, role: 'Student', status: 401 };
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      let res = await fetch('/api/admin/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok && res.status !== 403 && res.status !== 401) {
        try {
          const altRes = await fetch('/admin/verify', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (altRes.ok || altRes.status === 403 || altRes.status === 401) {
            res = altRes;
          }
        } catch {}
      }

      if (res.status === 401) {
        return { isAdmin: false, role: 'Student', status: 401 };
      }
      if (res.status === 403) {
        return { isAdmin: false, role: 'Student', status: 403 };
      }

      if (res.ok) {
        const data = await res.json();
        if (data.authorized) {
          return { isAdmin: true, role: 'Admin', serverUser: data, status: 200 };
        }
        return { isAdmin: false, role: 'Student', status: 200 };
      }

      if (res.status >= 500 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 500));
        continue;
      }

      // Fallback check against /api/user/profile
      let profileRes = await fetch('/api/user/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!profileRes.ok && profileRes.status !== 403 && profileRes.status !== 401) {
        try {
          const altProfileRes = await fetch('/user/profile', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (altProfileRes.ok) {
            profileRes = altProfileRes;
          }
        } catch {}
      }

      if (profileRes.status === 401) {
        return { isAdmin: false, role: 'Student', status: 401 };
      }
      if (profileRes.status === 403) {
        return { isAdmin: false, role: 'Student', status: 403 };
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const dbRole = (profileData?.profile?.role || '').trim().toLowerCase();
        const isDbAdmin = ['admin', 'superadmin', 'super_admin', 'administrator', 'editor', 'moderator'].includes(dbRole);
        return {
          isAdmin: isDbAdmin,
          role: isDbAdmin ? 'Admin' : 'Student',
          serverUser: profileData?.profile,
          status: 200,
        };
      }

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 500));
        continue;
      }
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 500));
        continue;
      }
      return { isAdmin: false, role: 'Student', isTransient: true };
    }
  }

  return { isAdmin: false, role: 'Student', isTransient: true };
}

export async function isUserAdminInCloud(
  uid: string,
  email?: string | null,
  accessTokenOverride?: string
): Promise<boolean> {
  const result = await verifyUserRoleWithServer(uid, email, accessTokenOverride);
  return result.isAdmin;
}

/**
 * Sync user profile to Supabase and backend database.
 */
export async function syncUserProfile(
  uid: string,
  profile: Partial<StudentProfile>,
  _allowRoleUpdate = false
): Promise<void> {
  if (!uid) return;

  // Update Supabase user metadata if signed in
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.updateUser({
        data: {
          name: profile.name,
          board: profile.board,
          class_level: profile.classLevel,
          target_exam: profile.targetExam,
          avatar: profile.avatar,
          points: profile.points,
          streak_days: profile.streakDays,
          tests_taken: profile.testsTaken,
        },
      });
    } catch (err) {
      console.warn('Supabase metadata sync note:', err);
    }
  }

  // Sync to PostgreSQL backend
  syncUserProfileWithDb({
    name: profile.name,
    avatar: profile.avatar,
    targetExam: profile.targetExam,
    classLevel: profile.classLevel,
    board: profile.board,
  }).catch((e) => console.warn('Database profile sync note:', e));
}

/**
 * Update user profile authoritatively in PostgreSQL and sync to Supabase metadata.
 * Use when the user explicitly saves their profile settings.
 */
export async function updateUserProfileCloud(
  uid: string,
  profile: Partial<StudentProfile>
): Promise<void> {
  if (!uid) return;

  // 1. Authoritative update to PostgreSQL backend via PUT /api/user/profile
  await updateUserProfileApi({
    name: profile.name?.trim(),
    avatar: profile.avatar,
    targetExam: profile.targetExam,
    classLevel: profile.classLevel,
    board: profile.board,
  });

  // 2. Keep Supabase metadata in sync
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.updateUser({
        data: {
          ...(profile.name ? { name: profile.name.trim() } : {}),
          ...(profile.board ? { board: profile.board } : {}),
          ...(profile.classLevel ? { class_level: profile.classLevel } : {}),
          ...(profile.targetExam ? { target_exam: profile.targetExam } : {}),
          ...(profile.avatar ? { avatar: profile.avatar } : {}),
        },
      });
    } catch (err) {
      console.warn('Supabase metadata update note:', err);
    }
  }
}

/**
 * Save test result to database and backend.
 */
export async function saveTestResultToCloud(result: TestResult, _userId?: string): Promise<void> {
  saveTestResultApi({
    resultId: result.id,
    testId: result.testId,
    testTitle: result.testTitle,
    testType: result.testType,
    subject: result.subject,
    category: result.category,
    totalQuestions: result.totalQuestions,
    answeredCount: result.answeredCount,
    correctCount: result.correctCount,
    wrongCount: result.wrongCount,
    skippedCount: result.skippedCount,
    marksObtained: result.marksObtained,
    totalMarks: result.totalMarks,
    percentage: result.percentage,
    grade: result.grade,
    timeUsedSeconds: result.timeUsedSeconds,
    percentileRank: result.percentileRank || 85,
    answers: result.answers || [],
  }).catch((e) => console.warn('Test result sync note:', e));
}
