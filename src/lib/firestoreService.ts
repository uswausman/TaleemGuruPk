/**
 * Migrated to Supabase Service Layer
 * Re-exports all authentication, profile, and result methods backed by Supabase & PostgreSQL.
 */
export {
  formatAuthErrorMessage,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  resetPasswordWithEmail,
  logoutUser,
  subscribeToAuthState,
  getUserProfile,
  isUserAdminInCloud,
  syncUserProfile,
  saveTestResultToCloud,
} from './supabaseService';
