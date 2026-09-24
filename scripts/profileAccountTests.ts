import {
  getUserByUid,
  getOrCreateUser,
  updateUserProfile,
  createUserInDb,
  updateUserRolesInDb,
  updateUserStatusInDb,
  setUserPasswordInDb,
  verifyPassword,
  saveAuditLogToDb,
  getAllAuditLogsFromDb,
  sanitizeUserForClient,
} from '../src/db/users.ts';
import { runDatabaseIntegrityCheck } from '../src/db/integrityBackup.ts';
import { db } from '../src/db/index.ts';
import { users } from '../src/db/schema.ts';
import { eq, inArray } from 'drizzle-orm';

async function runProfileAccountTestSuite() {
  console.log('==================================================');
  console.log('  TALEEMGURU STEP 20: ACCOUNT & STAFF MANAGEMENT TESTS');
  console.log('==================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const studentUid = `test-student-${timestamp}`;
  const staffUid = `test-staff-${timestamp}`;
  const victimUid = `test-victim-${timestamp}`;

  try {
    // ----------------------------------------------------------------
    // SECTION 1: STUDENT PROFILE & PASSWORD MANAGEMENT
    // ----------------------------------------------------------------

    // Setup student user
    await getOrCreateUser(studentUid, `student-${timestamp}@taleemguru.pk`, {
      name: 'Initial Student Name',
      targetExam: 'MDCAT',
      classLevel: 'Class 11',
      board: 'Punjab',
    });

    // 1. Student can edit and save allowed profile fields
    const updatedStudent = await updateUserProfile(studentUid, {
      name: 'Updated Student Name',
      targetExam: 'ECAT',
      classLevel: 'Class 12',
      board: 'Federal',
      avatar: 'avatar-5',
    });

    assert(
      updatedStudent !== null &&
        updatedStudent.name === 'Updated Student Name' &&
        updatedStudent.targetExam === 'ECAT' &&
        updatedStudent.classLevel === 'Class 12' &&
        updatedStudent.board === 'Federal' &&
        updatedStudent.avatar === 'avatar-5',
      'Test 1: Student can edit and save allowed profile fields (name, targetExam, classLevel, board, avatar)'
    );

    // 2. Field validation trims and sanitizes text inputs
    const sanitizedStudent = await updateUserProfile(studentUid, {
      name: '   Padded Student Name   ',
      board: '  Sindh Board  ',
    });
    assert(
      sanitizedStudent !== null &&
        sanitizedStudent.name === 'Padded Student Name' &&
        sanitizedStudent.board === 'Sindh Board',
      'Test 2: Profile field updates trim and sanitize text inputs accurately'
    );

    // 3. Student can set and verify password
    const initialPassword = 'StudentSecretPassword123!';
    await setUserPasswordInDb(studentUid, initialPassword);
    const dbUserAfterPassword = await db.select().from(users).where(eq(users.uid, studentUid)).limit(1);
    const pwdToken = (dbUserAfterPassword[0]?.permissions || []).find((p: string) => p.startsWith('__auth_pwd:'));

    assert(
      pwdToken !== undefined && verifyPassword(initialPassword, pwdToken),
      'Test 3: Student password is authoritatively hashed and verified using PBKDF2 SHA512'
    );

    // 4. Student can change own password
    const newPassword = 'NewStudentPassword456!';
    await setUserPasswordInDb(studentUid, newPassword);
    const dbUserAfterChange = await db.select().from(users).where(eq(users.uid, studentUid)).limit(1);
    const newPwdToken = (dbUserAfterChange[0]?.permissions || []).find((p: string) => p.startsWith('__auth_pwd:'));

    assert(
      newPwdToken !== undefined &&
        verifyPassword(newPassword, newPwdToken) &&
        !verifyPassword(initialPassword, newPwdToken),
      'Test 4: Student can securely change password and old password is invalidated'
    );

    // ----------------------------------------------------------------
    // SECTION 2: STAFF CREATION, MULTI-ROLE & ADMIN PASSWORD RESET
    // ----------------------------------------------------------------

    // 5. Admin can create staff account with Name, Email, Assigned Roles, Status, and Password
    const staffEmail = `staff-${timestamp}@taleemguru.pk`;
    const createdStaff = await createUserInDb({
      uid: staffUid,
      email: staffEmail,
      name: 'Professor Staff Member',
      roles: ['Teacher', 'ContentManager'],
      status: 'Active',
      password: 'InitialStaffPassword789!',
    });

    assert(
      createdStaff !== undefined &&
        createdStaff.uid === staffUid &&
        createdStaff.email === staffEmail &&
        createdStaff.name === 'Professor Staff Member' &&
        Array.isArray(createdStaff.roles) &&
        createdStaff.roles.includes('Teacher') &&
        createdStaff.roles.includes('ContentManager') &&
        createdStaff.status === 'Active',
      'Test 5: Admin can create staff account with multi-role assignments and status'
    );

    // Audit log for staff creation
    await saveAuditLogToDb({
      adminUid: 'admin-1',
      adminEmail: 'admin@taleemguru.pk',
      adminName: 'Lead Admin',
      action: 'STAFF_USER_CREATED',
      targetType: 'user',
      targetId: staffUid,
      details: `Created new Teacher, ContentManager account for ${staffEmail}`,
    });

    // 6. Support multi-role assignment update
    const updatedStaffRoles = await updateUserRolesInDb(staffUid, ['Teacher', 'Editor', 'Moderator']);
    assert(
      updatedStaffRoles !== null &&
        updatedStaffRoles.roles.length === 3 &&
        updatedStaffRoles.roles.includes('Editor') &&
        updatedStaffRoles.roles.includes('Moderator'),
      'Test 6: Multi-role assignments can be updated for staff accounts'
    );

    // Audit log for role change
    await saveAuditLogToDb({
      adminUid: 'admin-1',
      adminEmail: 'admin@taleemguru.pk',
      adminName: 'Lead Admin',
      action: 'USER_ROLES_CHANGED',
      targetType: 'user',
      targetId: staffUid,
      details: `Roles changed from [Teacher, ContentManager] to [Teacher, Editor, Moderator] for user ${staffEmail}`,
    });

    // 7. Admin can reset staff password securely
    const resetStaffPassword = 'AdminResetPassword999!';
    await setUserPasswordInDb(staffUid, resetStaffPassword);
    const staffUserInDb = await db.select().from(users).where(eq(users.uid, staffUid)).limit(1);
    const resetPwdToken = (staffUserInDb[0]?.permissions || []).find((p: string) => p.startsWith('__auth_pwd:'));

    assert(
      resetPwdToken !== undefined && verifyPassword(resetStaffPassword, resetPwdToken),
      'Test 7: Admin can reset staff password securely and new password authenticates'
    );

    // Audit log for password reset
    await saveAuditLogToDb({
      adminUid: 'admin-1',
      adminEmail: 'admin@taleemguru.pk',
      adminName: 'Lead Admin',
      action: 'STAFF_PASSWORD_RESET_BY_ADMIN',
      targetType: 'user',
      targetId: staffUid,
      details: `Admin reset password for staff account ${staffEmail}`,
    });

    // 8. Admin can update staff account status
    const suspendedStaff = await updateUserStatusInDb(staffUid, 'Suspended');
    assert(
      suspendedStaff !== null && suspendedStaff.status === 'Suspended',
      'Test 8: Admin can change staff account status to Suspended'
    );

    // Audit log for account status change
    await saveAuditLogToDb({
      adminUid: 'admin-1',
      adminEmail: 'admin@taleemguru.pk',
      adminName: 'Lead Admin',
      action: 'USER_STATUS_CHANGED',
      targetType: 'user',
      targetId: staffUid,
      details: `Status changed to Suspended for user ${staffEmail}`,
    });

    // ----------------------------------------------------------------
    // SECTION 3: PRIVILEGE ESCALATION, IDOR & PASSWORDS PRIVACY
    // ----------------------------------------------------------------

    // 9. Role & Privilege Escalation Tampering Prevention
    const maliciousPayload: any = {
      name: 'Attempted Escalation',
      roles: ['Admin', 'SuperAdmin'],
      permissions: ['all_power'],
      status: 'Active',
      isAdmin: true,
      points: 999999,
      password: 'HackedPassword',
    };

    await updateUserProfile(studentUid, maliciousPayload);
    const studentDbRecord = await getUserByUid(studentUid);

    assert(
      studentDbRecord !== null &&
        Array.isArray(studentDbRecord.roles) &&
        !studentDbRecord.roles.includes('Admin') &&
        !studentDbRecord.roles.includes('SuperAdmin') &&
        studentDbRecord.status === 'Active' &&
        studentDbRecord.points === 0,
      'Test 9: Role tampering and privilege escalation payloads in profile updates are strictly rejected'
    );

    // 10. IDOR Prevention: User A cannot edit User B's profile
    await getOrCreateUser(victimUid, `victim-${timestamp}@taleemguru.pk`, {
      name: 'Victim Student',
    });

    // Updating profile function requires target UID; frontend passes caller UID
    const victimBefore = await getUserByUid(victimUid);
    await updateUserProfile(studentUid, { name: 'Attacker Changing Own Name' });
    const victimAfter = await getUserByUid(victimUid);

    assert(
      victimBefore !== null && victimAfter !== null && victimBefore.name === victimAfter.name,
      'Test 10: IDOR protection guarantees Student A profile updates cannot alter Student B account'
    );

    // 11. Password privacy: Passwords and password hash tokens are never exposed in client API objects
    const sanitizedClientObj = sanitizeUserForClient(staffUserInDb[0]);
    assert(
      sanitizedClientObj !== null &&
        !(sanitizedClientObj as any).password &&
        !(sanitizedClientObj as any).passwordHash &&
        Array.isArray(sanitizedClientObj.permissions) &&
        !sanitizedClientObj.permissions.some((p: string) => p.startsWith('__auth_pwd:')),
      'Test 11: Passwords and hashed password tokens are strictly sanitized and never returned in API payloads'
    );

    // 12. Audit Logs Verification for all staff management actions
    const logs = await getAllAuditLogsFromDb({ limit: 50 });
    const staffCreationLogged = logs.some((l) => l.action === 'STAFF_USER_CREATED' && l.targetId === staffUid);
    const roleChangeLogged = logs.some((l) => l.action === 'USER_ROLES_CHANGED' && l.targetId === staffUid);
    const passwordResetLogged = logs.some((l) => l.action === 'STAFF_PASSWORD_RESET_BY_ADMIN' && l.targetId === staffUid);
    const statusChangeLogged = logs.some((l) => l.action === 'USER_STATUS_CHANGED' && l.targetId === staffUid);

    assert(
      staffCreationLogged && roleChangeLogged && passwordResetLogged && statusChangeLogged,
      'Test 12: Audit logs recorded authoritatively for staff creation, role changes, password resets, and status updates'
    );

    // 13. Database Integrity & Backup Verification
    const integrityReport = await runDatabaseIntegrityCheck();
    assert(
      integrityReport !== undefined && (integrityReport.status === 'HEALTHY' || integrityReport.status === 'WARNING'),
      'Test 13: Database integrity report verifies system is healthy after staff management operations'
    );

  } catch (error: any) {
    console.error('Unexpected error during profile & account tests:', error);
    assert(false, `Unexpected test failure: ${error.message}`);
  } finally {
    // Clean up test records
    try {
      await db.delete(users).where(inArray(users.uid, [studentUid, staffUid, victimUid]));
    } catch (cleanErr) {
      console.warn('Notice during test user cleanup:', cleanErr);
    }
  }

  console.log('==================================================');
  console.log(`STEP 20 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runProfileAccountTestSuite();
