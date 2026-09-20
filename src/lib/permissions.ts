// Centralized Granular Permission & Academic Scope Definition

export type PermissionKey =
  // Users
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'users.assign_role'
  // Questions
  | 'questions.view'
  | 'questions.create'
  | 'questions.edit'
  | 'questions.delete'
  | 'questions.publish'
  // Tests
  | 'tests.view'
  | 'tests.create'
  | 'tests.edit'
  | 'tests.delete'
  | 'tests.publish'
  // Educational Content
  | 'content.view'
  | 'content.create'
  | 'content.edit'
  | 'content.delete'
  | 'content.publish'
  // Results
  | 'results.view'
  | 'results.export'
  // Certificates
  | 'certificates.view'
  | 'certificates.verify'
  // Reports
  | 'reports.view'
  | 'reports.export'
  // Settings
  | 'settings.view'
  | 'settings.edit';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  category: 'Users' | 'Questions' | 'Tests' | 'Educational Content' | 'Results' | 'Certificates' | 'Reports' | 'Settings';
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Users
  { key: 'users.view', label: 'View Users', description: 'Can view registered students, staff rosters, and public profiles', category: 'Users' },
  { key: 'users.create', label: 'Create Staff/Users', description: 'Can provision new student and staff accounts', category: 'Users' },
  { key: 'users.edit', label: 'Edit Users', description: 'Can update user profiles, academic board/class, and account settings', category: 'Users' },
  { key: 'users.delete', label: 'Deactivate Users', description: 'Can change user account status (Active, Inactive, Suspended)', category: 'Users' },
  { key: 'users.assign_role', label: 'Assign Roles & Permissions', description: 'Can assign staff roles and grant custom granular permissions', category: 'Users' },

  // Questions
  { key: 'questions.view', label: 'View Questions', description: 'Can browse question bank and search MCQs', category: 'Questions' },
  { key: 'questions.create', label: 'Create Questions', description: 'Can draft new MCQs in assigned subjects and classes', category: 'Questions' },
  { key: 'questions.edit', label: 'Edit Questions', description: 'Can edit existing MCQs and explanations', category: 'Questions' },
  { key: 'questions.delete', label: 'Delete Questions', description: 'Can remove questions from the test bank', category: 'Questions' },
  { key: 'questions.publish', label: 'Publish Questions', description: 'Can mark questions as verified and published for live exams', category: 'Questions' },

  // Tests
  { key: 'tests.view', label: 'View Tests', description: 'Can view mock tests and assessment packages', category: 'Tests' },
  { key: 'tests.create', label: 'Create Tests', description: 'Can build new chapter, subject, or full book tests', category: 'Tests' },
  { key: 'tests.edit', label: 'Edit Tests', description: 'Can modify test timing, marks, negative marking, and questions', category: 'Tests' },
  { key: 'tests.delete', label: 'Delete Tests', description: 'Can remove mock tests and assessment suites', category: 'Tests' },
  { key: 'tests.publish', label: 'Publish Tests', description: 'Can activate tests for student participation', category: 'Tests' },

  // Educational Content
  { key: 'content.view', label: 'View Content', description: 'Can access past papers, chapter notes, and study material', category: 'Educational Content' },
  { key: 'content.create', label: 'Create Content', description: 'Can upload and author new notes, past papers, and syllabi', category: 'Educational Content' },
  { key: 'content.edit', label: 'Edit Content', description: 'Can revise study material, answer keys, and syllabus documents', category: 'Educational Content' },
  { key: 'content.delete', label: 'Delete Content', description: 'Can archive or remove obsolete educational content', category: 'Educational Content' },
  { key: 'content.publish', label: 'Publish Content', description: 'Can publish notes and past papers to public student portal', category: 'Educational Content' },

  // Results
  { key: 'results.view', label: 'View Results', description: 'Can view candidate test submissions and performance breakdowns', category: 'Results' },
  { key: 'results.export', label: 'Export Results', description: 'Can download candidate scorecards and audit spreadsheets', category: 'Results' },

  // Certificates
  { key: 'certificates.view', label: 'View Certificates', description: 'Can view issued passing certificates', category: 'Certificates' },
  { key: 'certificates.verify', label: 'Verify Certificates', description: 'Can validate cryptographic authenticity of certificates', category: 'Certificates' },

  // Reports
  { key: 'reports.view', label: 'View Reports', description: 'Can access student question error flags and content issue reports', category: 'Reports' },
  { key: 'reports.export', label: 'Export Reports', description: 'Can export report resolution audits and moderation queues', category: 'Reports' },

  // Settings
  { key: 'settings.view', label: 'View System Settings', description: 'Can view platform telemetry, cache, and database configuration', category: 'Settings' },
  { key: 'settings.edit', label: 'Edit System Settings', description: 'Can modify platform metadata and operational settings', category: 'Settings' },
];

export const PERMISSION_CATEGORIES = [
  'Users',
  'Questions',
  'Tests',
  'Educational Content',
  'Results',
  'Certificates',
  'Reports',
  'Settings',
] as const;

/**
 * Standard Role Default Permissions Matrix
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, PermissionKey[]> = {
  superadmin: ALL_PERMISSIONS.map((p) => p.key),
  super_admin: ALL_PERMISSIONS.map((p) => p.key),
  admin: [
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'users.assign_role',
    'questions.view',
    'questions.create',
    'questions.edit',
    'questions.delete',
    'questions.publish',
    'tests.view',
    'tests.create',
    'tests.edit',
    'tests.delete',
    'tests.publish',
    'content.view',
    'content.create',
    'content.edit',
    'content.delete',
    'content.publish',
    'results.view',
    'results.export',
    'certificates.view',
    'certificates.verify',
    'reports.view',
    'reports.export',
    'settings.view',
    'settings.edit',
  ],
  contentmanager: [
    'questions.view',
    'questions.create',
    'questions.edit',
    'questions.delete',
    'questions.publish',
    'tests.view',
    'tests.create',
    'tests.edit',
    'tests.delete',
    'tests.publish',
    'content.view',
    'content.create',
    'content.edit',
    'content.delete',
    'content.publish',
    'results.view',
    'reports.view',
  ],
  content_manager: [
    'questions.view',
    'questions.create',
    'questions.edit',
    'questions.delete',
    'questions.publish',
    'tests.view',
    'tests.create',
    'tests.edit',
    'tests.delete',
    'tests.publish',
    'content.view',
    'content.create',
    'content.edit',
    'content.delete',
    'content.publish',
    'results.view',
    'reports.view',
  ],
  teacher: [
    'questions.view',
    'questions.create',
    'questions.edit',
    'tests.view',
    'tests.create',
    'tests.edit',
    'results.view',
  ],
  editor: [
    'questions.view',
    'questions.create',
    'questions.edit',
    'content.view',
    'content.create',
    'content.edit',
    'reports.view',
  ],
  moderator: [
    'reports.view',
    'reports.export',
    'content.view',
    'questions.view',
  ],
  student: [
    'results.view',
    'certificates.view',
    'certificates.verify',
  ],
};

/**
 * Computes effective permissions for a user considering:
 * 1. Account status (Inactive/Suspended accounts lose ALL permissions)
 * 2. Base role defaults
 * 3. Explicit permissions granted/overridden in database
 */
export function computeEffectivePermissions(
  roles: string[] = ['Student'],
  explicitPermissions?: string[] | null,
  status: string = 'Active'
): string[] {
  // If account is suspended or inactive, all permissions are revoked
  const normalizedStatus = (status || 'Active').trim().toLowerCase();
  if (normalizedStatus === 'suspended' || normalizedStatus === 'inactive') {
    return [];
  }

  const effectivePermissions = new Set<string>();

  // SuperAdmin gets everything
  const hasSuperAdmin = roles.some(role => {
    const normalizedRole = role.trim().toLowerCase().replace(/\s+/g, '_');
    return normalizedRole === 'superadmin' || normalizedRole === 'super_admin';
  });

  if (hasSuperAdmin) {
    return ALL_PERMISSIONS.map((p) => p.key);
  }

  // Merge permissions from all roles
  for (const role of roles) {
    const normalizedRole = (role || 'Student').trim().toLowerCase().replace(/\s+/g, '_');
    const rolePermissions = ROLE_DEFAULT_PERMISSIONS[normalizedRole] || [];
    for (const perm of rolePermissions) {
      effectivePermissions.add(perm);
    }
  }

  // Merge explicit permissions if provided
  if (Array.isArray(explicitPermissions)) {
    for (const perm of explicitPermissions) {
      if (typeof perm === 'string') {
        const clean = perm.trim();
        if (clean.startsWith('-')) {
          // Explicit negation / revocation e.g. "-questions.delete"
          effectivePermissions.delete(clean.slice(1));
        } else if (clean) {
          effectivePermissions.add(clean);
        }
      }
    }
  }

  return Array.from(effectivePermissions);
}

/**
 * Checks if a specific permission key is allowed by effective permissions
 */
export function hasPermission(
  effectivePermissions: string[],
  requiredPermission: PermissionKey | string
): boolean {
  if (!Array.isArray(effectivePermissions) || effectivePermissions.length === 0) {
    return false;
  }
  if (effectivePermissions.includes('*') || effectivePermissions.includes('all')) {
    return true;
  }
  return effectivePermissions.includes(requiredPermission);
}

export interface AcademicScopeTarget {
  board?: string;
  classLevel?: string;
  subject?: string;
  contentType?: string;
}

export interface StaffAssignmentRecord {
  id?: number;
  userUid: string;
  role: string;
  board: string;
  classLevel: string;
  subject: string;
  contentTypes?: string[] | null;
}

/**
 * Validates whether an action within a specific Board, Class, Subject, or Content Type
 * is authorized according to the staff member's academic assignments.
 *
 * Rules:
 * - High Admins and SuperAdmins bypass academic scope constraints.
 * - For Teachers, Editors, and ContentManagers:
 *   If no assignments exist in the database, access is DENIED (fail-closed).
 *   If at least one assignment matches the target board, class, subject, and content type, access is GRANTED.
 */
export function isAcademicAssignmentAllowed(
  userRole: string,
  assignments: StaffAssignmentRecord[] = [],
  target: AcademicScopeTarget
): { allowed: boolean; reason?: string } {
  const normRole = (userRole || '').trim().toLowerCase().replace(/\s+/g, '_');

  // High Admin / SuperAdmin can manage everything across all boards, classes, and subjects
  if (['admin', 'superadmin', 'super_admin', 'administrator'].includes(normRole)) {
    return { allowed: true };
  }

  // If no assignments are configured for this staff member, fail-closed
  if (!assignments || assignments.length === 0) {
    return {
      allowed: false,
      reason: `No academic areas have been assigned to your ${userRole} account. Please contact an administrator to assign your boards, classes, and subjects.`,
    };
  }

  const targetBoard = (target.board || '').trim().toLowerCase();
  const targetClass = (target.classLevel || '').trim().toLowerCase();
  const targetSubject = (target.subject || '').trim().toLowerCase();
  const targetContentType = (target.contentType || '').trim().toLowerCase();

  const match = assignments.some((a) => {
    // Check Board
    const aBoard = (a.board || 'All').trim().toLowerCase();
    const boardMatches = !targetBoard || aBoard === 'all' || aBoard === targetBoard;

    // Check Class
    const aClass = (a.classLevel || 'All').trim().toLowerCase();
    const classMatches = !targetClass || aClass === 'all' || aClass === targetClass;

    // Check Subject
    const aSubject = (a.subject || 'All').trim().toLowerCase();
    const subjectMatches = !targetSubject || aSubject === 'all' || aSubject === targetSubject;

    // Check Content Type (primarily for Editors & ContentManagers)
    let contentTypeMatches = true;
    if (targetContentType && a.contentTypes && Array.isArray(a.contentTypes) && a.contentTypes.length > 0) {
      const normTypes = a.contentTypes.map((t) => t.trim().toLowerCase());
      contentTypeMatches = normTypes.includes('all') || normTypes.includes(targetContentType);
    }

    return boardMatches && classMatches && subjectMatches && contentTypeMatches;
  });

  if (!match) {
    return {
      allowed: false,
      reason: `You are not assigned to manage content for ${target.subject || 'this subject'} in ${target.classLevel || 'this class'} (${target.board || 'this board'}).`,
    };
  }

  return { allowed: true };
}
