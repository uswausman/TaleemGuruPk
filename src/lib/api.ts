import { supabase, isSupabaseConfigured } from './supabaseClient';
import { POPULAR_TESTS, PAST_PAPERS_DATA, STUDY_NOTES_DATA } from '../data/mockData';

let refreshPromise: Promise<any> | null = null;

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const adminToken = typeof localStorage !== 'undefined' ? localStorage.getItem('taleemguru_admin_token') : null;
    if (adminToken && adminToken.trim()) {
      return { Authorization: `Bearer ${adminToken.trim()}` };
    }
  } catch (e) {}

  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const bufferSeconds = 60;
        const isExpired = session.expires_at && (session.expires_at - bufferSeconds) < (Date.now() / 1000);
        
        if (isExpired) {
          if (!refreshPromise) {
            console.info('[AUTH_TOKEN_REFRESH] Token expired or soon to expire. Attempting refresh...');
            refreshPromise = supabase.auth.refreshSession()
              .then((res) => {
                if (res.error) {
                  console.error('[AUTH_TOKEN_REFRESH] Error refreshing Supabase session:', res.error.message);
                  return null;
                }
                console.info('[AUTH_TOKEN_REFRESH] Session refreshed successfully!');
                return res.data.session;
              })
              .catch((err) => {
                console.error('[AUTH_TOKEN_REFRESH] Exception during Supabase session refresh:', err);
                return null;
              })
              .finally(() => {
                refreshPromise = null;
              });
          }
          const newSession = await refreshPromise;
          if (newSession?.access_token) {
            return { Authorization: `Bearer ${newSession.access_token}` };
          } else {
            console.warn('[AUTH_TOKEN_REFRESH] Refresh failed. Sending empty Authorization to prevent 401 loop.');
            return {};
          }
        } else if (session.access_token) {
          return { Authorization: `Bearer ${session.access_token}` };
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve Supabase session token:', error);
    }
  }

  return {};
}

export async function syncUserProfileWithDb(profileData?: {
  name?: string;
  avatar?: string;
  targetExam?: string;
  classLevel?: string;
  board?: string;
}) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(profileData || {}),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error syncing profile with Cloud SQL backend:', error);
    return null;
  }
}

export async function updateUserProfileApi(updates: {
  name?: string;
  avatar?: string;
  targetExam?: string;
  classLevel?: string;
  board?: string;
}) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error updating profile in backend:', error);
    return null;
  }
}

export async function fetchUserProfileApi() {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch('/api/user/profile', {
      headers: {
        ...headers,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.profile || null;
  } catch (error) {
    console.error('Error fetching profile from backend:', error);
    return null;
  }
}

export async function saveTestResultApi(result: any) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch('/api/user/results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(result),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error saving result to backend:', error);
    return null;
  }
}

export async function fetchUserTestResultsApi() {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return [];

    const res = await fetch('/api/user/results', {
      headers: {
        ...headers,
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching test results:', error);
    return [];
  }
}

export async function toggleBookmarkApi(questionId: string) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch('/api/user/bookmarks/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ questionId }),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return null;
  }
}

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 1, delayMs = 500): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 404 || res.status === 401 || res.status === 403) return res;
    } catch {
      if (attempt === retries) return null;
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

export async function fetchLeaderboardApi() {
  try {
    const url = '/api/leaderboard';
    const res = await fetchWithRetry(url);
    if (!res || !res.ok) {
      return [];
    }
    const data = await res.json();
    return Array.isArray(data?.leaderboard) ? data.leaderboard : [];
  } catch (error) {
    console.warn('Notice: Leaderboard fetch fallback to local/cached state:', error);
    return [];
  }
}

export async function verifyAdminStatusApi(): Promise<{ authorized: boolean; role?: string; user?: any }> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return { authorized: false, role: 'Student' };

    let res = await fetch('/api/admin/verify', {
      headers: {
        ...headers,
      },
    });

    if (!res.ok && res.status !== 403 && res.status !== 401) {
      try {
        const altRes = await fetch('/admin/verify', {
          headers: {
            ...headers,
          },
        });
        if (altRes.ok || altRes.status === 403 || altRes.status === 401) {
          res = altRes;
        }
      } catch {}
    }

    if (res.ok) {
      const data = await res.json();
      return { authorized: Boolean(data.authorized), role: data.role || (data.authorized ? 'Admin' : 'Student'), user: data };
    }

    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      return { authorized: false, role: data.role || 'Student' };
    }

    return { authorized: false, role: 'Student' };
  } catch (error) {
    console.error('Error verifying admin authorization API:', error);
    return { authorized: false, role: 'Student' };
  }
}

export async function fetchAdminUsersApi() {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return [];

    const res = await fetch('/api/admin/users', {
      headers: {
        ...headers,
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.users || [];
  } catch (error) {
    console.warn('Notice: Unable to fetch admin users from backend:', error);
    return [];
  }
}

export async function fetchAdminStatsApi() {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch('/api/admin/stats', {
      headers: {
        ...headers,
      },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Notice: Unable to fetch admin stats from backend:', error);
    return null;
  }
}

export async function fetchUserCertificatesApi() {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return [];

    const res = await fetch('/api/user/certificates', {
      headers: {
        ...headers,
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.certificates || [];
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return [];
  }
}

export async function saveCertificateApi(certData: {
  resultId: string;
  testName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
}) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch('/api/user/certificates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(certData),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.certificate || null;
  } catch (error) {
    console.error('Error saving certificate:', error);
    return null;
  }
}

export async function verifyCertificateApi(certId: string) {
  try {
    const res = await fetch(`/api/certificates/verify/${encodeURIComponent(certId)}`);
    if (!res.ok) return { verified: false };
    return await res.json();
  } catch (error) {
    console.error('Error verifying certificate:', error);
    return { verified: false };
  }
}

export async function fetchPublicStatsApi() {
  try {
    const url = '/api/public-stats';
    const res = await fetchWithRetry(url);
    if (!res || !res.ok) {
      return null;
    }
    const json = await res.json();
    return json?.data || null;
  } catch (error) {
    console.warn('Notice: Public stats fetch fallback to local/default state:', error);
    return null;
  }
}

// 1. Fetch Real Database Comprehensive Admin Platform Statistics
export async function fetchAdminComprehensiveStatsApi() {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch('/api/admin/comprehensive-stats', {
      headers: { ...headers },
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.stats || null;
  } catch (error) {
    console.warn('Notice: Unable to fetch comprehensive admin stats from backend:', error);
    return null;
  }
}

// 2. Fetch All Genuine Test Submissions for Admin Audit
export async function fetchAdminTestResultsApi() {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return [];

    const res = await fetch('/api/admin/results', {
      headers: { ...headers },
    });

    if (!res.ok) return [];
    const json = await res.json();
    return json.results || [];
  } catch (error) {
    console.warn('Notice: Unable to fetch admin test results from backend:', error);
    return [];
  }
}

// 3. Fetch All Content / Question Reports for Admin Review
export async function fetchAdminReportsApi() {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return [];

    const res = await fetch('/api/admin/reports', {
      headers: { ...headers },
    });

    if (!res.ok) return [];
    const json = await res.json();
    return json.reports || [];
  } catch (error) {
    console.warn('Notice: Unable to fetch content reports from backend:', error);
    return [];
  }
}

// 4. Update Content Report Status (OPEN, IN_REVIEW, RESOLVED, REJECTED)
export async function updateAdminReportStatusApi(
  reportId: string,
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED',
  adminNotes?: string
) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch(`/api/admin/reports/${encodeURIComponent(reportId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ status, adminNotes }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.report || null;
  } catch (error) {
    console.error('Error updating report status:', error);
    return null;
  }
}

// 5. Fetch Admin Audit Logs
export async function fetchAdminAuditLogsApi(queryString: string = '') {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return [];

    const url = queryString ? `/api/admin/audit-logs?${queryString}` : '/api/admin/audit-logs';
    const res = await fetch(url, {
      headers: { ...headers },
    });

    if (!res.ok) return [];
    const json = await res.json();
    return json.logs || [];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

// 6. Record Admin Action in Audit Log
export async function recordAdminAuditLogApi(log: {
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
  board?: string;
  classLevel?: string;
  subject?: string;
}) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch('/api/admin/audit-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(log),
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.log || null;
  } catch (error) {
    console.error('Error recording audit log:', error);
    return null;
  }
}

// 7. Update User Role
export async function updateAdminUserRoleApi(uid: string, roles: string[] | string) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const rolesArray = Array.isArray(roles) ? roles : [roles];
    const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/roles`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ roles: rolesArray }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.user || null;
  } catch (error) {
    console.error('Error updating user role:', error);
    return null;
  }
}

// 7b. Update User Status (Active | Inactive | Suspended)
export async function updateAdminUserStatusApi(uid: string, status: 'Active' | 'Inactive' | 'Suspended') {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.user || null;
  } catch (error) {
    console.error('Error updating user status:', error);
    return null;
  }
}

// 7c. Update User Profile by Admin
export async function updateAdminUserProfileApi(uid: string, profile: { name?: string; classLevel?: string; board?: string; targetExam?: string }) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(profile),
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.user || null;
  } catch (error) {
    console.error('Error updating user profile by admin:', error);
    return null;
  }
}

// 8. Fetch System Health
export async function fetchAdminSystemHealthApi() {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch('/api/admin/system-health', {
      headers: { ...headers },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error fetching system health:', error);
    return null;
  }
}

// 9. Create New Staff or User Account
export async function createAdminUserApi(userData: {
  name: string;
  email: string;
  roles: string[];
  password?: string;
  status?: string;
}) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return { success: false, error: 'Authentication required' };

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(userData),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error || 'Failed to create staff account' };
    }
    return { success: true, user: json.user };
  } catch (error: any) {
    console.error('Error creating staff user:', error);
    return { success: false, error: error.message || 'Network error creating staff account' };
  }
}

// 10. Fetch Available Roles Matrix
export async function fetchAdminRolesApi() {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return [];

    const res = await fetch('/api/admin/roles', {
      headers: { ...headers },
    });

    if (!res.ok) return [];
    const json = await res.json();
    return json.roles || [];
  } catch (error) {
    console.error('Error fetching admin roles:', error);
    return [];
  }
}

// 11. Fetch Active Permissions
export async function fetchAdminPermissionsApi() {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch('/api/admin/permissions', {
      headers: { ...headers },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error fetching admin permissions:', error);
    return null;
  }
}

// 12. Staff Assignments
export async function fetchStaffAssignmentsApi(uid: string) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return [];
    const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/assignments`, {
      headers: { ...headers },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.assignments || [];
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }
}

export async function addStaffAssignmentApi(assignment: {
  userUid: string;
  role: string;
  board: string;
  classLevel: string;
  subject: string;
  contentTypes?: string[];
}) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;
    const res = await fetch(`/api/admin/users/${encodeURIComponent(assignment.userUid)}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(assignment),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.assignment;
  } catch (error) {
    console.error('Error adding assignment:', error);
    return null;
  }
}

export async function deleteStaffAssignmentApi(assignmentId: number) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return false;
    const res = await fetch(`/api/admin/assignments/${encodeURIComponent(assignmentId)}`, {
      method: 'DELETE',
      headers: { ...headers },
    });
    return res.ok;
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return false;
  }
}

// 13. Admin Reset User / Staff Password
export async function adminResetUserPasswordApi(uid: string, newPassword: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return { success: false, error: 'Authentication required' };

    const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ password: newPassword }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error || 'Failed to reset password' };
    }
    return { success: true, message: json.message || 'Password reset successfully' };
  } catch (error: any) {
    console.error('Error resetting user password by admin:', error);
    return { success: false, error: error.message || 'Network error resetting password' };
  }
}

// 14. Student / User Self Password Change
export async function changeStudentPasswordApi(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return { success: false, error: 'Authentication required' };

    const res = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error || 'Failed to change password' };
    }
    return { success: true, message: json.message || 'Password changed successfully' };
  } catch (error: any) {
    console.error('Error changing user password:', error);
    return { success: false, error: error.message || 'Network error changing password' };
  }
}

// 15. Admin Certificates Management
export async function fetchAdminCertificatesApi() {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return [];

    const res = await fetch('/api/admin/certificates', {
      headers: { ...headers },
    });

    if (!res.ok) return [];
    const json = await res.json();
    return json.certificates || [];
  } catch (error) {
    console.error('Error fetching admin certificates:', error);
    return [];
  }
}

export async function revokeAdminCertificateApi(certificateId: string, reason?: string) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return { success: false, error: 'Authentication required' };

    const res = await fetch(`/api/admin/certificates/${encodeURIComponent(certificateId)}/revoke`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ reason: reason || 'Admin action' }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error || 'Failed to revoke certificate' };
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error revoking certificate:', error);
    return { success: false, error: error.message || 'Network error revoking certificate' };
  }
}

export async function restoreAdminCertificateApi(certificateId: string) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return { success: false, error: 'Authentication required' };

    const res = await fetch(`/api/admin/certificates/${encodeURIComponent(certificateId)}/restore`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({}),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error || 'Failed to restore certificate' };
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error restoring certificate:', error);
    return { success: false, error: error.message || 'Network error restoring certificate' };
  }
}

// ============================================================================
// 16. Authoritative Educational Content APIs (PostgreSQL + Drizzle)
// ============================================================================

// --- MCQs ---
export async function fetchMCQsApi(filters: Record<string, any> = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'All') {
        params.append(k, String(v));
      }
    });
    const res = await fetch(`/api/mcqs?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.mcqs && data.mcqs.length > 0) ? data.mcqs : [];
  } catch (error) {
    return [];
  }
}

export async function createMCQApi(mcqData: any) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/mcqs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(mcqData),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to create MCQ' };
    return {
      success: true,
      status: json.status,
      message: json.message,
      approvalRequestId: json.approvalRequestId,
      changeRequest: json.changeRequest,
      mcq: json.mcq,
    };
  } catch (error: any) {
    console.error('Error creating MCQ:', error);
    return { success: false, error: error.message || 'Network error creating MCQ' };
  }
}

export async function updateMCQApi(id: string, updates: any) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/mcqs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update MCQ' };
    return {
      success: true,
      status: json.status,
      message: json.message,
      approvalRequestId: json.approvalRequestId,
      changeRequest: json.changeRequest,
      mcq: json.mcq,
    };
  } catch (error: any) {
    console.error('Error updating MCQ:', error);
    return { success: false, error: error.message || 'Network error updating MCQ' };
  }
}

export async function deleteMCQApi(id: string) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/mcqs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        ...headers,
      },
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to delete MCQ' };
    return {
      success: true,
      status: json.status,
      message: json.message,
      approvalRequestId: json.approvalRequestId,
      changeRequest: json.changeRequest,
    };
  } catch (error: any) {
    console.error('Error deleting MCQ:', error);
    return { success: false, error: error.message || 'Network error deleting MCQ' };
  }
}

// --- Tests & Quizzes ---
export async function fetchTestsApi(filters: Record<string, any> = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'All') {
        params.append(k, String(v));
      }
    });
    const res = await fetch(`/api/tests?${params.toString()}`);
    if (!res.ok) return POPULAR_TESTS;
    const data = await res.json();
    return (data.tests && data.tests.length > 0) ? data.tests : POPULAR_TESTS;
  } catch (error) {
    return POPULAR_TESTS;
  }
}

export async function fetchTestByIdApi(id: string) {
  try {
    const res = await fetch(`/api/tests/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.test || null;
  } catch (error) {
    console.error('Error fetching test by ID:', error);
    return null;
  }
}

export async function createTestApi(testData: any) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/tests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(testData),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to create assessment' };
    return {
      success: true,
      status: json.status,
      message: json.message,
      approvalRequestId: json.approvalRequestId,
      changeRequest: json.changeRequest,
      test: json.test,
    };
  } catch (error: any) {
    console.error('Error creating test:', error);
    return { success: false, error: error.message || 'Network error creating assessment' };
  }
}

export async function updateTestApi(id: string, updates: any) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/tests/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update assessment' };
    return {
      success: true,
      status: json.status,
      message: json.message,
      approvalRequestId: json.approvalRequestId,
      changeRequest: json.changeRequest,
      test: json.test,
    };
  } catch (error: any) {
    console.error('Error updating test:', error);
    return { success: false, error: error.message || 'Network error updating assessment' };
  }
}

export async function deleteTestApi(id: string) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/tests/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        ...headers,
      },
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to delete assessment' };
    return {
      success: true,
      status: json.status,
      message: json.message,
      approvalRequestId: json.approvalRequestId,
      changeRequest: json.changeRequest,
    };
  } catch (error: any) {
    console.error('Error deleting test:', error);
    return { success: false, error: error.message || 'Network error deleting assessment' };
  }
}

// --- Past Papers ---
export async function fetchPastPapersApi(filters: Record<string, any> = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'All') {
        params.append(k, String(v));
      }
    });
    const res = await fetch(`/api/past-papers?${params.toString()}`);
    if (!res.ok) return PAST_PAPERS_DATA;
    const data = await res.json();
    return (data.pastPapers && data.pastPapers.length > 0) ? data.pastPapers : PAST_PAPERS_DATA;
  } catch (error) {
    return PAST_PAPERS_DATA;
  }
}

export async function createPastPaperApi(paperData: any) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/past-papers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(paperData),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to create past paper' };
    return {
      success: true,
      status: json.status,
      message: json.message,
      approvalRequestId: json.approvalRequestId,
      changeRequest: json.changeRequest,
      pastPaper: json.pastPaper,
    };
  } catch (error: any) {
    console.error('Error creating past paper:', error);
    return { success: false, error: error.message || 'Network error creating past paper' };
  }
}

export async function updatePastPaperApi(id: string, updates: any) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/past-papers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update past paper' };
    return {
      success: true,
      status: json.status,
      message: json.message,
      approvalRequestId: json.approvalRequestId,
      changeRequest: json.changeRequest,
      pastPaper: json.pastPaper,
    };
  } catch (error: any) {
    console.error('Error updating past paper:', error);
    return { success: false, error: error.message || 'Network error updating past paper' };
  }
}

export async function deletePastPaperApi(id: string) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/past-papers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        ...headers,
      },
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to delete past paper' };
    return {
      success: true,
      status: json.status,
      message: json.message,
      approvalRequestId: json.approvalRequestId,
      changeRequest: json.changeRequest,
    };
  } catch (error: any) {
    console.error('Error deleting past paper:', error);
    return { success: false, error: error.message || 'Network error deleting past paper' };
  }
}

// --- Study Notes ---
export async function fetchStudyNotesApi(filters: Record<string, any> = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'All') {
        params.append(k, String(v));
      }
    });
    const res = await fetch(`/api/study-notes?${params.toString()}`);
    if (!res.ok) return STUDY_NOTES_DATA;
    const data = await res.json();
    return (data.studyNotes && data.studyNotes.length > 0) ? data.studyNotes : STUDY_NOTES_DATA;
  } catch (error) {
    return STUDY_NOTES_DATA;
  }
}

export async function createStudyNoteApi(noteData: any) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/study-notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(noteData),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to create study note' };
    return {
      success: true,
      status: json.status,
      message: json.message,
      approvalRequestId: json.approvalRequestId,
      changeRequest: json.changeRequest,
      studyNote: json.studyNote,
    };
  } catch (error: any) {
    console.error('Error creating study note:', error);
    return { success: false, error: error.message || 'Network error creating study note' };
  }
}

export async function updateStudyNoteApi(id: string, updates: any) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/study-notes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update study note' };
    return {
      success: true,
      status: json.status,
      message: json.message,
      approvalRequestId: json.approvalRequestId,
      changeRequest: json.changeRequest,
      studyNote: json.studyNote,
    };
  } catch (error: any) {
    console.error('Error updating study note:', error);
    return { success: false, error: error.message || 'Network error updating study note' };
  }
}

export async function deleteStudyNoteApi(id: string) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/study-notes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        ...headers,
      },
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to delete study note' };
    return {
      success: true,
      status: json.status,
      message: json.message,
      approvalRequestId: json.approvalRequestId,
      changeRequest: json.changeRequest,
    };
  } catch (error: any) {
    console.error('Error deleting study note:', error);
    return { success: false, error: error.message || 'Network error deleting study note' };
  }
}

// ============================================================================
// 17. Bulk CMS Operations APIs
// ============================================================================

export async function bulkUpdateMCQStatusApi(ids: string[], status: 'Published' | 'Draft' | 'Archived') {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/mcqs/bulk-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ ids, status }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update MCQs' };
    return { success: true, count: json.count };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function bulkDeleteMCQsApi(ids: string[]) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/mcqs/bulk-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ ids }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to delete MCQs' };
    return { success: true, count: json.count };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function bulkCreateMCQsApi(mcqs: any[]) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/mcqs/bulk-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ mcqs }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to bulk create MCQs' };
    return { success: true, inserted: json.inserted, errors: json.errors || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function bulkUpdateTestStatusApi(ids: string[], status: 'Published' | 'Draft' | 'Archived') {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/tests/bulk-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ ids, status }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update tests' };
    return { success: true, count: json.count };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function bulkDeleteTestsApi(ids: string[]) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/tests/bulk-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ ids }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to delete tests' };
    return { success: true, count: json.count };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function bulkUpdatePastPaperStatusApi(ids: string[], status: 'Published' | 'Draft' | 'Archived') {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/past-papers/bulk-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ ids, status }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update past papers' };
    return { success: true, count: json.count };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function bulkDeletePastPapersApi(ids: string[]) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/past-papers/bulk-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ ids }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to delete past papers' };
    return { success: true, count: json.count };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function bulkUpdateStudyNoteStatusApi(ids: string[], status: 'Published' | 'Draft' | 'Archived') {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/study-notes/bulk-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ ids, status }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update study notes' };
    return { success: true, count: json.count };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function bulkDeleteStudyNotesApi(ids: string[]) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/study-notes/bulk-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ ids }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to delete study notes' };
    return { success: true, count: json.count };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

// ============================================================================
// 18. Academic Hierarchy APIs (Boards, Classes, Subjects, Chapters)
// ============================================================================

export async function fetchHierarchyBoardsApi(status?: string) {
  try {
    const url = status ? `/api/hierarchy/boards?status=${encodeURIComponent(status)}` : '/api/hierarchy/boards';
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return json.boards || [];
  } catch (error) {
    console.error('Error fetching hierarchy boards:', error);
    return [];
  }
}

export async function createHierarchyBoardApi(name: string, status: string = 'Active') {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/hierarchy/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ name, status }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to create board' };
    return { success: true, board: json.board };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function updateHierarchyBoardApi(id: number, updates: { name?: string; status?: string }) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/hierarchy/boards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update board' };
    return { success: true, board: json.board };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function deleteHierarchyBoardApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/hierarchy/boards/${id}`, {
      method: 'DELETE',
      headers: { ...headers },
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to delete board' };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function fetchHierarchyClassesApi(boardId?: number, status?: string) {
  try {
    const params = new URLSearchParams();
    if (boardId) params.append('boardId', String(boardId));
    if (status) params.append('status', status);
    const res = await fetch(`/api/hierarchy/classes?${params.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.classes || [];
  } catch (error) {
    console.error('Error fetching hierarchy classes:', error);
    return [];
  }
}

export async function createHierarchyClassApi(boardId: number, name: string, status: string = 'Active') {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/hierarchy/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ boardId, name, status }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to create class' };
    return { success: true, class: json.class };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function updateHierarchyClassApi(id: number, updates: { name?: string; status?: string; boardId?: number }) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/hierarchy/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update class' };
    return { success: true, class: json.class };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function deleteHierarchyClassApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/hierarchy/classes/${id}`, {
      method: 'DELETE',
      headers: { ...headers },
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to delete class' };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function fetchHierarchySubjectsApi(classId?: number, status?: string) {
  try {
    const params = new URLSearchParams();
    if (classId) params.append('classId', String(classId));
    if (status) params.append('status', status);
    const res = await fetch(`/api/hierarchy/subjects?${params.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.subjects || [];
  } catch (error) {
    console.error('Error fetching hierarchy subjects:', error);
    return [];
  }
}

export async function createHierarchySubjectApi(classId: number, name: string, status: string = 'Active') {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/hierarchy/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ classId, name, status }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to create subject' };
    return { success: true, subject: json.subject };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function updateHierarchySubjectApi(id: number, updates: { name?: string; status?: string; classId?: number }) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/hierarchy/subjects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update subject' };
    return { success: true, subject: json.subject };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function deleteHierarchySubjectApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/hierarchy/subjects/${id}`, {
      method: 'DELETE',
      headers: { ...headers },
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to delete subject' };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function fetchHierarchyChaptersApi(subjectId?: number, status?: string) {
  try {
    const params = new URLSearchParams();
    if (subjectId) params.append('subjectId', String(subjectId));
    if (status) params.append('status', status);
    const res = await fetch(`/api/hierarchy/chapters?${params.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.chapters || [];
  } catch (error) {
    console.error('Error fetching hierarchy chapters:', error);
    return [];
  }
}

export async function createHierarchyChapterApi(
  subjectId: number,
  name: string,
  status: string = 'Active',
  draftStatus: string = 'Published'
) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/hierarchy/chapters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ subjectId, name, status, draftStatus }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to create chapter' };
    return { success: true, chapter: json.chapter };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function updateHierarchyChapterApi(
  id: number,
  updates: { name?: string; status?: string; draftStatus?: string; subjectId?: number }
) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/hierarchy/chapters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update chapter' };
    return { success: true, chapter: json.chapter };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function deleteHierarchyChapterApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/hierarchy/chapters/${id}`, {
      method: 'DELETE',
      headers: { ...headers },
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to delete chapter' };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

// ============================================================================
// --- ACADEMIC MANAGEMENT AUTHORITATIVE CLIENT APIS ---
// ============================================================================

// 1. BOARDS
export async function fetchAcademicBoardsApi() {
  try {
    const res = await fetch('/api/academic/boards');
    const json = await res.json();
    return { success: res.ok, data: json.boards || [], boards: json.boards || [], error: json.error };
  } catch (error: any) {
    return { success: false, data: [], boards: [], error: error.message || 'Network error' };
  }
}

export async function createAcademicBoardApi(payload: {
  name: string;
  code?: string;
  establishmentYear?: number;
  province?: string;
  city?: string;
  description?: string;
  status?: string;
}) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/academic/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return { success: res.ok, board: json.board, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function updateAcademicBoardApi(
  id: number,
  payload: {
    name?: string;
    code?: string;
    establishmentYear?: number;
    province?: string;
    city?: string;
    description?: string;
    status?: string;
  }
) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/boards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return { success: res.ok, board: json.board, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function deleteAcademicBoardApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/boards/${id}`, {
      method: 'DELETE',
      headers: { ...headers },
    });
    const json = await res.json();
    return {
      success: res.ok,
      message: json.message,
      error: json.error,
      dependencies: json.dependencies,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function checkAcademicBoardDepsApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/boards/${id}/dependencies`, {
      headers: { ...headers },
    });
    const json = await res.json();
    return { success: res.ok, dependencies: json.dependencies, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

// 2. CLASSES
export async function fetchAcademicClassesApi() {
  try {
    const res = await fetch('/api/academic/classes');
    const json = await res.json();
    return { success: res.ok, data: json.classes || [], classes: json.classes || [], error: json.error };
  } catch (error: any) {
    return { success: false, data: [], classes: [], error: error.message || 'Network error' };
  }
}

export async function createAcademicClassApi(payload: {
  name: string;
  boardId?: number;
  boardIds?: number[];
  status?: string;
}) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/academic/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return { success: res.ok, class: json.class, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function updateAcademicClassApi(
  id: number,
  payload: { name?: string; boardId?: number; boardIds?: number[]; status?: string }
) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return { success: res.ok, class: json.class, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function deleteAcademicClassApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/classes/${id}`, {
      method: 'DELETE',
      headers: { ...headers },
    });
    const json = await res.json();
    return {
      success: res.ok,
      message: json.message,
      error: json.error,
      dependencies: json.dependencies,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function checkAcademicClassDepsApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/classes/${id}/dependencies`, {
      headers: { ...headers },
    });
    const json = await res.json();
    return { success: res.ok, dependencies: json.dependencies, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

// 3. SUBJECTS
export async function fetchAcademicSubjectsApi() {
  try {
    const res = await fetch('/api/academic/subjects');
    const json = await res.json();
    return { success: res.ok, data: json.subjects || [], subjects: json.subjects || [], error: json.error };
  } catch (error: any) {
    return { success: false, data: [], subjects: [], error: error.message || 'Network error' };
  }
}

export async function createAcademicSubjectApi(payload: {
  name: string;
  classId?: number;
  classIds?: number[];
  boardId?: number;
  boardIds?: number[];
  status?: string;
}) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/academic/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return { success: res.ok, subject: json.subject, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function updateAcademicSubjectApi(
  id: number,
  payload: { name?: string; classId?: number; classIds?: number[]; boardId?: number; boardIds?: number[]; status?: string }
) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/subjects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return { success: res.ok, subject: json.subject, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function deleteAcademicSubjectApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/subjects/${id}`, {
      method: 'DELETE',
      headers: { ...headers },
    });
    const json = await res.json();
    return {
      success: res.ok,
      message: json.message,
      error: json.error,
      dependencies: json.dependencies,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function checkAcademicSubjectDepsApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/subjects/${id}/dependencies`, {
      headers: { ...headers },
    });
    const json = await res.json();
    return { success: res.ok, dependencies: json.dependencies, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

// 4. CHAPTERS
export async function fetchAcademicChaptersApi() {
  try {
    const res = await fetch('/api/academic/chapters');
    const json = await res.json();
    return { success: res.ok, data: json.chapters || [], chapters: json.chapters || [], error: json.error };
  } catch (error: any) {
    return { success: false, data: [], chapters: [], error: error.message || 'Network error' };
  }
}

export async function createAcademicChapterApi(payload: {
  name: string;
  subjectId: number;
  classId?: number;
  boardId?: number;
  status?: string;
  draftStatus?: string;
}) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/academic/chapters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return { success: res.ok, chapter: json.chapter, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function updateAcademicChapterApi(
  id: number,
  payload: { name?: string; subjectId?: number; classId?: number; boardId?: number; status?: string; draftStatus?: string }
) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/chapters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return { success: res.ok, chapter: json.chapter, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function deleteAcademicChapterApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/chapters/${id}`, {
      method: 'DELETE',
      headers: { ...headers },
    });
    const json = await res.json();
    return {
      success: res.ok,
      message: json.message,
      error: json.error,
      dependencies: json.dependencies,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function checkAcademicChapterDepsApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/chapters/${id}/dependencies`, {
      headers: { ...headers },
    });
    const json = await res.json();
    return { success: res.ok, dependencies: json.dependencies, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

// 5. ENTRY TEST CATEGORIES
export async function fetchAcademicEntryTestCategoriesApi() {
  try {
    const res = await fetch('/api/academic/entry-test-categories');
    const json = await res.json();
    return {
      success: res.ok,
      data: json.entryTestCategories || [],
      entryTestCategories: json.entryTestCategories || [],
      error: json.error,
    };
  } catch (error: any) {
    return { success: false, data: [], entryTestCategories: [], error: error.message || 'Network error' };
  }
}

export async function createAcademicEntryTestCategoryApi(payload: {
  name: string;
  type: string;
  description?: string;
  organizer?: string;
  totalMarks?: number;
  duration?: string;
  status?: string;
}) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/academic/entry-test-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return { success: res.ok, category: json.category || json.entryTestCategory, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function updateAcademicEntryTestCategoryApi(
  id: number,
  payload: {
    name?: string;
    type?: string;
    description?: string;
    organizer?: string;
    totalMarks?: number;
    duration?: string;
    status?: string;
  }
) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/entry-test-categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return { success: res.ok, category: json.category || json.entryTestCategory, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function deleteAcademicEntryTestCategoryApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/entry-test-categories/${id}`, {
      method: 'DELETE',
      headers: { ...headers },
    });
    const json = await res.json();
    return {
      success: res.ok,
      message: json.message,
      error: json.error,
      dependencies: json.dependencies,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function checkAcademicEntryTestCategoryDepsApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/entry-test-categories/${id}/dependencies`, {
      headers: { ...headers },
    });
    const json = await res.json();
    return { success: res.ok, dependencies: json.dependencies, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

// 6. ENTRY TEST SUBCATEGORIES
export async function fetchAcademicEntryTestSubcategoriesApi(categoryId?: number) {
  try {
    const url = categoryId
      ? `/api/academic/entry-test-subcategories?categoryId=${categoryId}`
      : '/api/academic/entry-test-subcategories';
    const res = await fetch(url);
    const json = await res.json();
    return {
      success: res.ok,
      data: json.subcategories || json.entryTestSubcategories || [],
      subcategories: json.subcategories || json.entryTestSubcategories || [],
      error: json.error,
    };
  } catch (error: any) {
    return { success: false, data: [], subcategories: [], error: error.message || 'Network error' };
  }
}

export async function createAcademicEntryTestSubcategoryApi(payload: {
  categoryId: number;
  name: string;
  description?: string;
  status?: string;
}) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/academic/entry-test-subcategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return { success: res.ok, subcategory: json.subcategory || json.entryTestSubcategory, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function updateAcademicEntryTestSubcategoryApi(
  id: number,
  payload: {
    categoryId?: number;
    name?: string;
    description?: string;
    status?: string;
  }
) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/entry-test-subcategories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return { success: res.ok, subcategory: json.subcategory || json.entryTestSubcategory, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function deleteAcademicEntryTestSubcategoryApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/entry-test-subcategories/${id}`, {
      method: 'DELETE',
      headers: { ...headers },
    });
    const json = await res.json();
    return {
      success: res.ok,
      message: json.message,
      error: json.error,
      dependencies: json.dependencies,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function checkAcademicEntryTestSubcategoryDepsApi(id: number) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/academic/entry-test-subcategories/${id}/dependencies`, {
      headers: { ...headers },
    });
    const json = await res.json();
    return { success: res.ok, dependencies: json.dependencies, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

// 6. ACADEMIC SUMMARY
export async function fetchAcademicSummaryApi() {
  try {
    const res = await fetch('/api/academic/summary');
    const json = await res.json();
    return {
      success: res.ok,
      summary: json.summary || { boards: 0, classes: 0, subjects: 0, chapters: 0, entryTestCategories: 0 },
      boards: json.boards || [],
      classes: json.classes || [],
      subjects: json.subjects || [],
      chapters: json.chapters || [],
      entryTestCategories: json.entryTestCategories || [],
      error: json.error,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

// Aliases for Hierarchy API
export async function fetchBoardsApi() {
  return fetchAcademicBoardsApi();
}

export async function createBoardApi(payload: { name: string; province?: string; code?: string; city?: string }) {
  return createAcademicBoardApi(payload);
}

export async function updateBoardApi(id: number, payload: { name: string; province?: string; code?: string; city?: string }) {
  return updateAcademicBoardApi(id, payload);
}

export async function deleteBoardApi(id: number) {
  return deleteAcademicBoardApi(id);
}

export async function fetchClassesApi(boardId?: number) {
  return fetchAcademicClassesApi();
}

export async function createClassApi(payload: { name: string; boardId?: number; orderIndex?: number }) {
  return createAcademicClassApi(payload);
}

export async function updateClassApi(id: number, payload: { name: string; boardId?: number; orderIndex?: number }) {
  return updateAcademicClassApi(id, payload);
}

export async function deleteClassApi(id: number) {
  return deleteAcademicClassApi(id);
}

export async function fetchSubjectsApi(classId?: number) {
  return fetchAcademicSubjectsApi();
}

export async function createSubjectApi(payload: { name: string; classId?: number; orderIndex?: number; boardId?: number }) {
  return createAcademicSubjectApi({ name: payload.name, classId: payload.classId || 1, boardId: payload.boardId });
}

export async function updateSubjectApi(id: number, payload: { name: string; classId?: number; orderIndex?: number; boardId?: number }) {
  return updateAcademicSubjectApi(id, { name: payload.name, classId: payload.classId, boardId: payload.boardId });
}

export async function deleteSubjectApi(id: number) {
  return deleteAcademicSubjectApi(id);
}

export async function fetchChaptersApi(subjectId?: number) {
  return fetchAcademicChaptersApi();
}

export async function createChapterApi(payload: { name: string; subjectId?: number; orderIndex?: number; description?: string }) {
  return createAcademicChapterApi({ name: payload.name, subjectId: payload.subjectId || 1 });
}

export async function updateChapterApi(id: number, payload: { name: string; subjectId?: number; orderIndex?: number; description?: string }) {
  return updateAcademicChapterApi(id, { name: payload.name, subjectId: payload.subjectId });
}

export async function deleteChapterApi(id: number) {
  return deleteAcademicChapterApi(id);
}

// ============================================================================
// --- EXAM & ASSESSMENT ENGINE CLIENT APIS ---
// ============================================================================

export async function startExamApi(params: {
  testId: string;
  candidateSessionId?: string;
  studentName?: string;
  studentEmail?: string;
}) {
  try {
    let candidateSessionId = params.candidateSessionId;
    if (!candidateSessionId && typeof localStorage !== 'undefined') {
      candidateSessionId = localStorage.getItem('taleem_guru_candidate_session') || undefined;
    }
    if (!candidateSessionId) {
      candidateSessionId = `candidate-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('taleem_guru_candidate_session', candidateSessionId);
      }
    }

    const headers = await getAuthHeader();
    const res = await fetch('/api/exams/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        ...params,
        candidateSessionId,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to start examination session');
    }
    if (data.candidateSessionId && typeof localStorage !== 'undefined') {
      localStorage.setItem('taleem_guru_candidate_session', data.candidateSessionId);
    }
    return data;
  } catch (error: any) {
    console.error('Error starting examination:', error);
    throw error;
  }
}

export async function saveExamAnswerApi(
  attemptId: string,
  params: {
    questionId: string;
    selectedOption: number | null;
    markedForReview?: boolean;
    timeSpentSeconds?: number;
    candidateSessionId?: string;
  }
) {
  try {
    if (!attemptId || attemptId === 'undefined' || attemptId === 'null') {
      return { success: false, error: 'Session identifier missing' };
    }

    let candidateSessionId = params.candidateSessionId;
    if (!candidateSessionId && typeof localStorage !== 'undefined') {
      candidateSessionId = localStorage.getItem('taleem_guru_candidate_session') || undefined;
    }
    if (!candidateSessionId) {
      candidateSessionId = `candidate-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('taleem_guru_candidate_session', candidateSessionId);
      }
    }

    const headers = await getAuthHeader();
    const res = await fetch(`/api/exams/${encodeURIComponent(attemptId.trim())}/save-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        ...params,
        attemptId: attemptId.trim(),
        candidateSessionId,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save answer');
    }
    return data;
  } catch (error: any) {
    console.warn('Notice: Background autosave response:', error);
    return { success: false, error: error.message };
  }
}

export async function submitExamApi(
  attemptId: string,
  params: {
    answers?: Record<string, { selectedOption: number | null; markedForReview?: boolean; timeSpentSeconds?: number }>;
    timeSpentSeconds?: number;
    candidateSessionId?: string;
  }
) {
  try {
    if (!attemptId || attemptId === 'undefined' || attemptId === 'null') {
      console.warn('Notice: submitExamApi called without an attemptId');
      return { success: false, error: 'Session identifier missing' };
    }

    let candidateSessionId = params.candidateSessionId;
    if (!candidateSessionId && typeof localStorage !== 'undefined') {
      candidateSessionId = localStorage.getItem('taleem_guru_candidate_session') || undefined;
    }
    if (!candidateSessionId) {
      candidateSessionId = `candidate-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('taleem_guru_candidate_session', candidateSessionId);
      }
    }

    const headers = await getAuthHeader();
    const res = await fetch(`/api/exams/${encodeURIComponent(attemptId.trim())}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        ...params,
        attemptId: attemptId.trim(),
        candidateSessionId,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit examination');
    }
    return data;
  } catch (error: any) {
    console.warn('Notice: Background exam submission response:', error);
    return { success: false, error: error.message || 'Failed to submit examination' };
  }
}

export async function fetchExamResultApi(attemptId: string, candidateSessionId?: string) {
  try {
    let resolvedSessionId = candidateSessionId;
    if (!resolvedSessionId && typeof localStorage !== 'undefined') {
      resolvedSessionId = localStorage.getItem('taleem_guru_candidate_session') || undefined;
    }

    const headers = await getAuthHeader();
    const query = resolvedSessionId ? `?candidateSessionId=${encodeURIComponent(resolvedSessionId)}` : '';
    const res = await fetch(`/api/exams/${encodeURIComponent(attemptId)}/result${query}`, {
      headers: {
        ...headers,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to retrieve examination result');
    }
    return data.result;
  } catch (error: any) {
    console.error('Error fetching exam result:', error);
    throw error;
  }
}

export async function fetchUserExamHistoryApi() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/user/exam-history', {
      headers: {
        ...headers,
      },
    });

    const data = await res.json();
    if (!res.ok) return [];
    return data.attempts || [];
  } catch (error: any) {
    console.error('Error fetching user exam history:', error);
    return [];
  }
}

export async function fetchAdminExamAttemptsApi(filters?: {
  testId?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const headers = await getAuthHeader();
    const params = new URLSearchParams();
    if (filters?.testId) params.append('testId', filters.testId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    const res = await fetch(`/api/admin/exam-attempts?${params.toString()}`, {
      headers: {
        ...headers,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch administrative exam attempts');
    }
    return data;
  } catch (error: any) {
    console.error('Error fetching admin exam attempts:', error);
    return { success: false, attempts: [], total: 0, analytics: null };
  }
}

// ============================================================================
// --- STUDENT & TEACHER PORTAL CLIENT APIS ---
// ============================================================================

export async function fetchStudentDashboardApi() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/student/dashboard', {
      headers: {
        ...headers,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch student dashboard data');
    }
    return data;
  } catch (error: any) {
    console.error('Error fetching student dashboard data:', error);
    return null;
  }
}

export async function fetchStudentPerformanceApi() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/student/performance', {
      headers: {
        ...headers,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch student performance analytics');
    }
    return data.analytics || null;
  } catch (error: any) {
    console.error('Error fetching student performance analytics:', error);
    return null;
  }
}

export async function fetchStudentActiveExamApi() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/student/active-exam', {
      headers: {
        ...headers,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      return null;
    }
    return data.activeExam || null;
  } catch (error: any) {
    console.error('Error checking active exam:', error);
    return null;
  }
}

export async function updateStudentProfileDataApi(updates: {
  name?: string;
  classLevel?: string;
  board?: string;
  targetExam?: string;
  avatar?: string;
}) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/student/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(updates),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update profile');
    }
    return { success: true, profile: data.profile };
  } catch (error: any) {
    console.error('Error updating student profile:', error);
    return { success: false, error: error.message || 'Failed to update profile' };
  }
}

export async function fetchTeacherDashboardApi() {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/teacher/dashboard', {
      headers: {
        ...headers,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch teacher dashboard');
    }
    return data;
  } catch (error: any) {
    console.error('Error fetching teacher dashboard:', error);
    return null;
  }
}

export async function moderateContentApi(params: {
  contentType: 'MCQ' | 'Test' | 'PastPaper' | 'StudyNote' | 'Document';
  id: string;
  targetStatus: 'Draft' | 'Pending Review' | 'Approved' | 'Published' | 'Rejected' | 'Archived';
  rejectionReason?: string;
  changeNotes?: string;
}) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/content/moderate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to moderate content');
    }
    return { success: true, item: data.item, message: data.message };
  } catch (error: any) {
    console.error('Error moderating content:', error);
    return { success: false, error: error.message || 'Failed to moderate content' };
  }
}

export async function bulkModerateContentApi(params: {
  contentType: 'MCQ' | 'Test' | 'PastPaper' | 'StudyNote' | 'Document';
  ids: string[];
  targetStatus: 'Draft' | 'Pending Review' | 'Approved' | 'Published' | 'Rejected' | 'Archived';
  rejectionReason?: string;
  changeNotes?: string;
}) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/content/bulk-moderate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to bulk moderate content');
    }
    return { success: true, ...data };
  } catch (error: any) {
    console.error('Error bulk moderating content:', error);
    return { success: false, error: error.message || 'Failed to bulk moderate content' };
  }
}

export async function fetchContentVersionsApi(contentType: string, id: string) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/content/versions/${contentType}/${id}`, {
      headers: {
        ...headers,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch version history');
    }
    return data.versions || [];
  } catch (error: any) {
    console.error('Error fetching content version history:', error);
    return [];
  }
}

// ============================================================================
// --- CENTRALIZED SITE SETTINGS CLIENT APIS ---
// ============================================================================

export async function fetchPublicSettingsApi(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`/api/settings/public?_t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
      cache: 'no-store',
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.settings || {};
  } catch (error) {
    console.error('Error fetching public settings:', error);
    return {};
  }
}

export async function fetchAdminSettingsApi(): Promise<{ success: boolean; settings?: Record<string, string>; error?: string }> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) {
      return { success: false, error: 'Authentication required' };
    }

    const res = await fetch(`/api/admin/settings?_t=${Date.now()}`, {
      headers: {
        ...headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
      cache: 'no-store',
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to fetch administrative site settings' };
    }
    return { success: true, settings: data.settings || {} };
  } catch (error: any) {
    console.error('Error fetching admin settings:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function saveAdminSettingsApi(
  settings: Record<string, string>
): Promise<{ success: boolean; settings?: Record<string, string>; message?: string; error?: string }> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) {
      return { success: false, error: 'Authentication required' };
    }

    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ settings }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to save site settings' };
    }

    return {
      success: true,
      message: data.message || 'Site settings saved successfully.',
      settings: data.settings,
    };
  } catch (error: any) {
    console.error('Error saving site settings:', error);
    return { success: false, error: error.message || 'Network error saving site settings' };
  }
}

export async function uploadAdminSettingAssetApi(
  fileBase64: string,
  filename: string
): Promise<{ success: boolean; url?: string; filename?: string; error?: string }> {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) {
      return { success: false, error: 'Authentication required' };
    }

    const res = await fetch('/api/admin/settings/upload-asset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ fileBase64, filename }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to upload asset' };
    }

    return { success: true, url: data.url, filename: data.filename };
  } catch (error: any) {
    console.error('Error uploading setting asset:', error);
    return { success: false, error: error.message || 'Network error uploading asset' };
  }
}

// -------------------------------------------------------------
// Content Approvals & Staff Submissions API Client
// -------------------------------------------------------------

export interface ContentChangeRequestItem {
  id: number;
  entityType: string;
  entityId: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | string;
  submittedBy: string;
  submitterName?: string;
  submitterEmail?: string;
  submitterRoles?: string[];
  contentTitle: string;
  proposedData: any;
  previousData: any;
  reviewComment?: string | null;
  reviewedBy?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ApprovalStats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  totalMonth: number;
  total: number;
}

export async function fetchPendingApprovalsApi(filters?: {
  status?: string;
  entityType?: string;
  submittedBy?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: ContentChangeRequestItem[]; total: number }> {
  try {
    const headers = await getAuthHeader();
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.entityType) params.append('entityType', filters.entityType);
    if (filters?.submittedBy) params.append('submittedBy', filters.submittedBy);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    const res = await fetch(`/api/approvals?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch approval requests');
    }

    return await res.json();
  } catch (error: any) {
    console.error('Error in fetchPendingApprovalsApi:', error);
    return { items: [], total: 0 };
  }
}

export async function fetchApprovalStatsApi(): Promise<ApprovalStats> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/approvals/stats', {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!res.ok) {
      return { pending: 0, approvedToday: 0, rejectedToday: 0, totalMonth: 0, total: 0 };
    }

    return await res.json();
  } catch (error) {
    console.error('Error in fetchApprovalStatsApi:', error);
    return { pending: 0, approvedToday: 0, rejectedToday: 0, totalMonth: 0, total: 0 };
  }
}

export async function fetchMySubmissionsApi(): Promise<ContentChangeRequestItem[]> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/approvals/my', {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch your submissions');
    }

    const data = await res.json();
    return data.submissions || [];
  } catch (error: any) {
    console.error('Error in fetchMySubmissionsApi:', error);
    return [];
  }
}

export async function approveChangeRequestApi(
  id: number,
  comment?: string
): Promise<{ success: boolean; error?: string; message?: string; request?: any }> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/approvals/${id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ comment }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to approve change request' };
    }

    return { success: true, message: data.message, request: data.request };
  } catch (error: any) {
    console.error('Error in approveChangeRequestApi:', error);
    return { success: false, error: error.message || 'Network error approving request' };
  }
}

export async function rejectChangeRequestApi(
  id: number,
  reason: string
): Promise<{ success: boolean; error?: string; message?: string; request?: any }> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/approvals/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ reason }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to reject change request' };
    }

    return { success: true, message: data.message, request: data.request };
  } catch (error: any) {
    console.error('Error in rejectChangeRequestApi:', error);
    return { success: false, error: error.message || 'Network error rejecting request' };
  }
}

// ============================================================================
// WEBSITE COMMAND CENTER API HELPERS
// ============================================================================

export async function fetchWebsiteCommandCenterSummaryApi(): Promise<any> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health', { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error fetching website command center summary:', error);
    return null;
  }
}

export async function triggerWebsiteScanApi(): Promise<any> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error triggering website scan:', error);
    return null;
  }
}

export async function fetchSeoAuditApi(url?: string): Promise<any> {
  try {
    const headers = await getAuthHeader();
    const query = url ? `?url=${encodeURIComponent(url)}` : '';
    const res = await fetch(`/api/admin/website-health/seo${query}`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error fetching SEO audit:', error);
    return null;
  }
}

export async function fetchPerformanceMetricsApi(): Promise<any> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/performance', { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return null;
  }
}

export async function fetchLiveErrorLogsApi(filters?: { category?: string; severity?: string; status?: string }): Promise<any[]> {
  try {
    const headers = await getAuthHeader();
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.status) params.append('status', filters.status);

    const res = await fetch(`/api/admin/website-health/errors?${params.toString()}`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.logs || [];
  } catch (error) {
    console.error('Error fetching live error logs:', error);
    return [];
  }
}

export async function updateErrorLogStatusApi(id: string, status: string): Promise<boolean> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/errors/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ id, status }),
    });
    return res.ok;
  } catch (error) {
    console.error('Error updating error status:', error);
    return false;
  }
}

export async function investigateErrorLogApi(id: string): Promise<any> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/website-health/errors/${id}/investigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
    });
    if (res.status === 401) {
      return { success: false, status: 401, error: 'Session expired or unauthenticated.' };
    }
    if (res.status === 403) {
      return { success: false, status: 403, error: 'Permission denied. You do not have elevated privileges.' };
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, status: res.status, error: data.error || `HTTP error ${res.status}` };
    }
    const data = await res.json();
    return { success: true, report: data.report };
  } catch (error: any) {
    console.error('Error investigating error log:', error);
    return { success: false, error: error.message || 'Network communication failure.' };
  }
}

export async function fetchBrokenLinksApi(): Promise<any> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/links', { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error fetching broken links report:', error);
    return null;
  }
}

export async function fetchApiHealthApi(): Promise<any[]> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/apis', { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching API health:', error);
    return [];
  }
}

export async function fetchDatabaseHealthApi(): Promise<any> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/database', { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error fetching database health:', error);
    return null;
  }
}

export async function fetchTrafficAnalyticsApi(timeRange: string = '30 Days'): Promise<any> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/website-health/analytics?timeRange=${encodeURIComponent(timeRange)}`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error fetching traffic analytics:', error);
    return null;
  }
}

export async function triggerAiDiagnosisApi(): Promise<any[]> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/ai/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.diagnoses || [];
  } catch (error) {
    console.error('Error triggering AI diagnosis:', error);
    return [];
  }
}

export async function fetchFixProposalsApi(): Promise<any[]> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/fixes', { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.proposals || [];
  } catch (error) {
    console.error('Error fetching fix proposals:', error);
    return [];
  }
}

export async function approveFixProposalApi(fixId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/fixes/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ fixId }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Failed to approve fix' };
    return { success: true, message: data.message };
  } catch (error: any) {
    console.error('Error approving fix proposal:', error);
    return { success: false, error: error.message || 'Network error approving fix' };
  }
}

export async function rejectFixProposalApi(fixId: string): Promise<boolean> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/fixes/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ fixId }),
    });
    return res.ok;
  } catch (error) {
    console.error('Error rejecting fix proposal:', error);
    return false;
  }
}

export async function fetchCommandHistoryApi(): Promise<any[]> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/history', { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.history || [];
  } catch (error) {
    console.error('Error fetching command history:', error);
    return [];
  }
}

export async function fetchCommandCenterSettingsApi(): Promise<any> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/settings', { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error fetching command center settings:', error);
    return null;
  }
}

export async function updateCommandCenterSettingsApi(settings: any): Promise<any> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(settings),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error updating command center settings:', error);
    return null;
  }
}

export async function fetchSearchConsoleDataApi(timeRange: string = '28 Days'): Promise<any> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/website-health/search-console?timeRange=${encodeURIComponent(timeRange)}`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error fetching Search Console data:', error);
    return null;
  }
}

export async function fetchSearchConsoleIntelligenceApi(): Promise<any[]> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/search-console/intelligence', { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.recommendations || [];
  } catch (error) {
    console.error('Error fetching Search Console intelligence:', error);
    return [];
  }
}

export async function fetchPageSpeedAuditApi(route: string = '/', strategy: 'mobile' | 'desktop' = 'mobile'): Promise<any> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/website-health/pagespeed?route=${encodeURIComponent(route)}&strategy=${encodeURIComponent(strategy)}`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error fetching PageSpeed audit:', error);
    return null;
  }
}

export async function fetchPageSpeedHistoryApi(): Promise<any[]> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/pagespeed/history', { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.snapshots || [];
  } catch (error) {
    console.error('Error fetching PageSpeed history:', error);
    return [];
  }
}

export async function triggerDeploymentVerificationApi(): Promise<any> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/deploy/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error triggering deployment verification:', error);
    return null;
  }
}

export async function triggerDeploymentRollbackApi(): Promise<{ success: boolean; message?: string }> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/deploy/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch (error) {
    console.error('Error triggering deployment rollback:', error);
    return { success: false };
  }
}

export async function fetchSystemAlertsApi(): Promise<any[]> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/alerts', { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.alerts || [];
  } catch (error) {
    console.error('Error fetching system alerts:', error);
    return [];
  }
}

export async function updateAlertStatusApi(id: string, status: string): Promise<boolean> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/website-health/alerts/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ id, status }),
    });
    return res.ok;
  } catch (error) {
    console.error('Error updating alert status:', error);
    return false;
  }
}









