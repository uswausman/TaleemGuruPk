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

  // Fallback to active administrative token if available in local storage
  if (typeof window !== 'undefined') {
    try {
      const adminToken = localStorage.getItem('taleemguru_admin_token');
      if (adminToken) {
        return { Authorization: `Bearer ${adminToken}` };
      }
    } catch (storageErr) {
      // Ignore storage errors
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

export async function fetchLeaderboardApi() {
  try {
    const url = '/api/leaderboard';
    console.log('Fetching leaderboard from:', url);
    const res = await fetch(url);
    if (!res.ok) {
        console.error('Leaderboard fetch failed with status:', res.status);
        return [];
    }
    const data = await res.json();
    return data.leaderboard || [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
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
    console.log('Fetching public stats from:', url);
    const res = await fetch(url);
    if (!res.ok) {
        console.error('Public stats fetch failed with status:', res.status);
        return null;
    }
    const json = await res.json();
    return json.data || null;
  } catch (error) {
    console.error('Error fetching public stats:', error);
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
export async function updateAdminUserRoleApi(uid: string, roles: string[]) {
  try {
    const headers = await getAuthHeader();
    if (!headers.Authorization) return null;

    const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/roles`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ roles }),
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

