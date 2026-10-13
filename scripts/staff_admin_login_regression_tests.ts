import assert from 'assert';
import { db } from '../src/db/index.ts';
import { getOrCreateUser, updateUserRolesInDb, setUserPasswordInDb } from '../src/db/users.ts';
import { verifyServerSignedToken } from '../src/middleware/auth.ts';

async function runStaffAdminLoginRegressionTests() {
  console.log('=== Running Staff & Admin Login Regression Test Suite ===\n');

  const BASE_URL = 'http://localhost:3000';

  // Test emails and UIDs
  const adminEmail = 'test.admin.login@taleemguru.pk';
  const adminUid = 'uid-test-admin-login-001';
  const adminPassword = 'AdminPassword123!';

  const studentEmail = 'test.student.only@taleemguru.pk';
  const studentUid = 'uid-test-student-only-001';
  const studentPassword = 'StudentPassword123!';

  const teacherEmail = 'test.teacher.staff@taleemguru.pk';
  const teacherUid = 'uid-test-teacher-staff-001';
  const teacherPassword = 'TeacherPassword123!';

  try {
    // -------------------------------------------------------------
    // Setup Test Users in Database
    // -------------------------------------------------------------
    console.log('--- Step 0: Setting up test users in database ---');

    // 1. Setup Admin User
    await getOrCreateUser(adminUid, adminEmail, { name: 'Test Admin User' });
    await updateUserRolesInDb(adminUid, ['Admin']);
    await setUserPasswordInDb(adminUid, adminPassword);
    console.log('  [+] Created Admin user:', adminEmail);

    // 2. Setup Student User (non-staff)
    await getOrCreateUser(studentUid, studentEmail, { name: 'Test Student User' });
    await updateUserRolesInDb(studentUid, ['Student']);
    await setUserPasswordInDb(studentUid, studentPassword);
    console.log('  [+] Created Student user:', studentEmail);

    // 3. Setup Teacher User (authorized staff)
    await getOrCreateUser(teacherUid, teacherEmail, { name: 'Test Teacher User' });
    await updateUserRolesInDb(teacherUid, ['Teacher']);
    await setUserPasswordInDb(teacherUid, teacherPassword);
    console.log('  [+] Created Teacher user:', teacherEmail);

    // -------------------------------------------------------------
    // Test 1: Successful Admin Login
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Successful Admin Login via /api/admin/login ---');
    const adminLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });

    const adminLoginData = await adminLoginRes.json();
    assert.strictEqual(adminLoginRes.status, 200, `Admin login HTTP status should be 200, got ${adminLoginRes.status}`);
    assert.strictEqual(adminLoginData.success, true, 'Admin login response success should be true');
    assert.strictEqual(typeof adminLoginData.token, 'string', 'Admin login should return a token string');
    assert.strictEqual(adminLoginData.user.email, adminEmail, 'Admin user email should match');
    assert.strictEqual(adminLoginData.user.role, 'Admin', 'Admin user role should be Admin');
    console.log('  [PASS] Admin login succeeded, token issued.');

    const adminToken = adminLoginData.token;

    // -------------------------------------------------------------
    // Test 2: Invalid Password Rejection
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Invalid Password Rejection ---');
    const badPasswordRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'WrongPassword999!' }),
    });

    const badPasswordData = await badPasswordRes.json();
    assert.strictEqual(badPasswordRes.status, 401, `Wrong password status should be 401, got ${badPasswordRes.status}`);
    assert.strictEqual(badPasswordData.error, 'Invalid email or password.', 'Error message should state "Invalid email or password."');
    console.log('  [PASS] Invalid password correctly rejected with 401.');

    // -------------------------------------------------------------
    // Test 3: Student-Only Account Rejection
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Student-Only Account Rejection ---');
    const studentLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail, password: studentPassword }),
    });

    const studentLoginData = await studentLoginRes.json();
    assert.strictEqual(studentLoginRes.status, 403, `Student login status should be 403 Forbidden, got ${studentLoginRes.status}`);
    assert(
      studentLoginData.error && studentLoginData.error.includes('Access Denied'),
      'Student login error should contain "Access Denied"'
    );
    assert(
      studentLoginData.error && studentLoginData.error.includes('Student'),
      'Student login error message should state that role is Student'
    );
    console.log('  [PASS] Student-only account rejected from admin portal with 403 Forbidden.');

    // -------------------------------------------------------------
    // Test 4: Authorized Staff Login (Teacher)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Authorized Staff Login (Teacher) ---');
    const teacherLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: teacherEmail, password: teacherPassword }),
    });

    const teacherLoginData = await teacherLoginRes.json();
    assert.strictEqual(teacherLoginRes.status, 200, `Teacher login HTTP status should be 200, got ${teacherLoginRes.status}`);
    assert.strictEqual(teacherLoginData.success, true, 'Teacher login response success should be true');
    assert.strictEqual(typeof teacherLoginData.token, 'string', 'Teacher login should return a token string');
    assert.strictEqual(teacherLoginData.user.email, teacherEmail, 'Teacher email should match');
    assert.strictEqual(teacherLoginData.user.role, 'Teacher', 'Teacher role should be Teacher');
    console.log('  [PASS] Authorized staff (Teacher) login succeeded, token issued.');

    const teacherToken = teacherLoginData.token;

    // -------------------------------------------------------------
    // Test 5: Token Validation & Dashboard Access Verification
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Token Validation & Dashboard Access Verification ---');
    
    // 5a. Validate Admin Token on /api/admin/verify
    const adminVerifyRes = await fetch(`${BASE_URL}/api/admin/verify`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminVerifyData = await adminVerifyRes.json();
    assert.strictEqual(adminVerifyRes.status, 200, `Admin verify HTTP status should be 200, got ${adminVerifyRes.status}`);
    assert.strictEqual(adminVerifyData.authorized, true, 'Admin verify authorized should be true');
    assert.strictEqual(adminVerifyData.uid, adminUid, 'Admin verify UID should match');
    assert.strictEqual(adminVerifyData.role, 'Admin', 'Admin verify role should be Admin');
    console.log('  [PASS] Admin token verified on /api/admin/verify successfully.');

    // 5b. Validate Teacher Token on /api/admin/verify
    const teacherVerifyRes = await fetch(`${BASE_URL}/api/admin/verify`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const teacherVerifyData = await teacherVerifyRes.json();
    assert.strictEqual(teacherVerifyRes.status, 200, `Teacher verify HTTP status should be 200, got ${teacherVerifyRes.status}`);
    assert.strictEqual(teacherVerifyData.authorized, true, 'Teacher verify authorized should be true');
    assert.strictEqual(teacherVerifyData.uid, teacherUid, 'Teacher verify UID should match');
    assert.strictEqual(teacherVerifyData.role, 'Teacher', 'Teacher verify role should be Teacher');
    console.log('  [PASS] Staff (Teacher) token verified on /api/admin/verify successfully.');

    // -------------------------------------------------------------
    // Test 6: Invalid/Tampered Token Rejection
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Invalid/Tampered Token Rejection ---');
    const tamperedToken = adminToken.substring(0, adminToken.length - 10) + 'invalidsig';
    const tamperedVerifyRes = await fetch(`${BASE_URL}/api/admin/verify`, {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });
    assert.strictEqual(tamperedVerifyRes.status, 401, `Tampered token status should be 401, got ${tamperedVerifyRes.status}`);
    console.log('  [PASS] Tampered token correctly rejected with 401 Unauthorized.');

    console.log('\n=== ALL STAFF & ADMIN LOGIN REGRESSION TESTS PASSED SUCCESSFULLY! ===\n');
  } catch (err: any) {
    console.error('\n[TEST FAILURE]', err?.message || err);
    process.exit(1);
  }
}

runStaffAdminLoginRegressionTests();
