import { supabase, isSupabaseConfigured } from './supabaseClient';

async function getAuthHeader(): Promise<Record<string, string>> {
  if (isSupabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return { Authorization: `Bearer ${session.access_token}` };
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
    return data.mcqs || [];
  } catch (error) {
    console.error('Error fetching MCQs:', error);
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
    return { success: true, mcq: json.mcq };
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
    return { success: true, mcq: json.mcq };
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
    return { success: true };
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
    if (!res.ok) return [];
    const data = await res.json();
    return data.tests || [];
  } catch (error) {
    console.error('Error fetching tests:', error);
    return [];
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
    return { success: true, test: json.test };
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
    return { success: true, test: json.test };
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
    return { success: true };
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
    if (!res.ok) return [];
    const data = await res.json();
    return data.pastPapers || [];
  } catch (error) {
    console.error('Error fetching past papers:', error);
    return [];
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
    return { success: true, pastPaper: json.pastPaper };
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
    return { success: true, pastPaper: json.pastPaper };
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
    return { success: true };
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
    if (!res.ok) return [];
    const data = await res.json();
    return data.studyNotes || [];
  } catch (error) {
    console.error('Error fetching study notes:', error);
    return [];
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
    return { success: true, studyNote: json.studyNote };
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
    return { success: true, studyNote: json.studyNote };
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
    return { success: true };
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

// Aliases for Hierarchy API
export async function fetchBoardsApi() {
  const data = await fetchHierarchyBoardsApi();
  return { success: true, data };
}

export async function createBoardApi(payload: { name: string; province?: string }) {
  return createHierarchyBoardApi(payload.name);
}

export async function updateBoardApi(id: number, payload: { name: string; province?: string }) {
  return updateHierarchyBoardApi(id, { name: payload.name });
}

export async function deleteBoardApi(id: number) {
  return deleteHierarchyBoardApi(id);
}

export async function fetchClassesApi(boardId?: number) {
  const data = await fetchHierarchyClassesApi(boardId);
  return { success: true, data };
}

export async function createClassApi(payload: { name: string; boardId?: number; orderIndex?: number }) {
  return createHierarchyClassApi(payload.boardId || 1, payload.name);
}

export async function updateClassApi(id: number, payload: { name: string; boardId?: number; orderIndex?: number }) {
  return updateHierarchyClassApi(id, { name: payload.name, boardId: payload.boardId });
}

export async function deleteClassApi(id: number) {
  return deleteHierarchyClassApi(id);
}

export async function fetchSubjectsApi(classId?: number) {
  const data = await fetchHierarchySubjectsApi(classId);
  return { success: true, data };
}

export async function createSubjectApi(payload: { name: string; classId?: number; orderIndex?: number }) {
  return createHierarchySubjectApi(payload.classId || 1, payload.name);
}

export async function updateSubjectApi(id: number, payload: { name: string; classId?: number; orderIndex?: number }) {
  return updateHierarchySubjectApi(id, { name: payload.name, classId: payload.classId });
}

export async function deleteSubjectApi(id: number) {
  return deleteHierarchySubjectApi(id);
}

export async function fetchChaptersApi(subjectId?: number) {
  const data = await fetchHierarchyChaptersApi(subjectId);
  return { success: true, data };
}

export async function createChapterApi(payload: { name: string; subjectId?: number; orderIndex?: number; description?: string }) {
  return createHierarchyChapterApi(payload.subjectId || 1, payload.name);
}

export async function updateChapterApi(id: number, payload: { name: string; subjectId?: number; orderIndex?: number; description?: string }) {
  return updateHierarchyChapterApi(id, { name: payload.name, subjectId: payload.subjectId });
}

export async function deleteChapterApi(id: number) {
  return deleteHierarchyChapterApi(id);
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
    const headers = await getAuthHeader();
    const res = await fetch('/api/exams/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to start examination session');
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
    const headers = await getAuthHeader();
    const res = await fetch(`/api/exams/${encodeURIComponent(attemptId)}/save-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(params),
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
    const headers = await getAuthHeader();
    const res = await fetch(`/api/exams/${encodeURIComponent(attemptId)}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit examination');
    }
    return data;
  } catch (error: any) {
    console.error('Error submitting exam to backend:', error);
    throw error;
  }
}

export async function fetchExamResultApi(attemptId: string, candidateSessionId?: string) {
  try {
    const headers = await getAuthHeader();
    const query = candidateSessionId ? `?candidateSessionId=${encodeURIComponent(candidateSessionId)}` : '';
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







