import {
  getUserByUid,
  getOrCreateUser,
  updateUserProfile,
} from '../src/db/users.ts';
import { db } from '../src/db/index.ts';
import { users } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function runProfileAccountTestSuite() {
  console.log('==================================================');
  console.log('  TALEEMGURU PROFESSIONAL PROFILE & ACCOUNT TESTS');
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

  const testUid = `test-profile-user-${Date.now()}`;

  try {
    // 0. Setup test user
    await getOrCreateUser(testUid, 'profile-test@taleemguru.pk', {
      name: 'Initial Name',
      targetExam: 'MDCAT',
      classLevel: 'Class 11',
      board: 'Punjab',
    });

    // TEST 1: Profile update (permitted fields)
    const updated = await updateUserProfile(testUid, {
      name: 'Updated Student Name',
      targetExam: 'ECAT',
      classLevel: 'Class 12',
      board: 'Federal',
    });

    assert(
      updated &&
        updated.name === 'Updated Student Name' &&
        updated.targetExam === 'ECAT' &&
        updated.classLevel === 'Class 12' &&
        updated.board === 'Federal',
      'Test 1: Profile update successfully persists allowed fields (name, targetExam, classLevel, board)'
    );

    // TEST 2: Field validation & sanitization (trimming whitespace)
    const sanitized = await updateUserProfile(testUid, {
      name: '   Padded Name   ',
      board: '  Sindh  ',
    });
    assert(
      sanitized && sanitized.name === 'Padded Name' && sanitized.board === 'Sindh',
      'Test 2: Field validation trims and sanitizes text inputs accurately'
    );

    // TEST 3: Role and Permission Immutability (privilege escalation prevention)
    // Attempting to pass malicious payload containing roles / permissions / status
    const maliciousAttempt: any = {
      name: 'Hacker Attempt',
      roles: ['Admin', 'SuperAdmin'],
      permissions: ['all_access'],
      status: 'Suspended',
    };

    await updateUserProfile(testUid, maliciousAttempt);
    const profileAfterMalicious = await getUserByUid(testUid);

    assert(
      profileAfterMalicious &&
        Array.isArray(profileAfterMalicious.roles) &&
        profileAfterMalicious.roles.includes('Student') &&
        !profileAfterMalicious.roles.includes('Admin') &&
        profileAfterMalicious.status === 'Active',
      'Test 3: Role and permission immutability - privilege escalation payloads are strictly ignored'
    );

    // TEST 4: Own-profile isolation & retrieval
    const fetched = await getUserByUid(testUid);
    assert(
      fetched && fetched.uid === testUid && fetched.email === 'profile-test@taleemguru.pk',
      'Test 4: Own-profile retrieval fetches correct user record without exposing secrets'
    );

    // TEST 5: Password hash / sensitive data check
    assert(
      !((fetched as any).password || (fetched as any).passwordHash || (fetched as any).secret),
      'Test 5: Profile object never exposes plain passwords or sensitive auth secrets'
    );

  } catch (error: any) {
    console.error('Unexpected error during profile tests:', error);
    assert(false, `Unexpected profile test failure: ${error.message}`);
  } finally {
    // Cleanup
    try {
      await db.delete(users).where(eq(users.uid, testUid));
    } catch {}
  }

  console.log('==================================================');
  console.log(`PROFILE & ACCOUNT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runProfileAccountTestSuite();
