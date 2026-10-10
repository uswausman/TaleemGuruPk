import crypto from 'crypto';
import { db } from '../src/db/index.ts';
import { users, mcqs, contentChangeRequests, chapters } from '../src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { getOrCreateUser } from '../src/db/users.ts';

function createSignedToken(uid: string, email: string): string {
  const secret = process.env.SUPABASE_ANON_KEY || process.env.SQL_ADMIN_PASSWORD || 'taleemguru-admin-auth-key';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: uid,
      email: email,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

const BASE_URL = 'http://localhost:3000';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failCount++;
  }
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('  TALEEMGURU SERVER-SIDE APPROVAL ENFORCEMENT VERIFICATION');
  console.log('=============================================================\n');

  if (!db) {
    throw new Error('Database not connected');
  }

  // 1. Prepare identities
  const teacherUid = 'test-teacher-staff-001';
  const teacherEmail = 'teacher.staff@taleemguru.pk';
  await getOrCreateUser(teacherUid, teacherEmail, {
    name: 'Staff Teacher',
  });
  const { updateUserRolesInDb } = await import('../src/db/users.ts');
  await updateUserRolesInDb(teacherUid, ['Teacher', 'ContentManager']);

  const studentUid = 'test-student-001';
  const studentEmail = 'student.unauth@taleemguru.pk';
  await getOrCreateUser(studentUid, studentEmail, {
    name: 'Normal Student',
  });

  const adminUid = 'admin-bootstrap-001';
  const adminEmail = 'admin@taleemguru.pk';
  await getOrCreateUser(adminUid, adminEmail, {
    name: 'Super Admin',
  });

  const teacherToken = createSignedToken(teacherUid, teacherEmail);
  const studentToken = createSignedToken(studentUid, studentEmail);
  const adminToken = createSignedToken(adminUid, adminEmail);

  // -------------------------------------------------------------
  // Test Scenario 1: Staff CREATE MCQ (/api/mcqs)
  // -------------------------------------------------------------
  console.log('\n--- Scenario 1: Staff CREATE MCQ ---');
  const createMcqPayload = {
    question: `Staff Test Question ${Date.now()}: What is photosynthesis?`,
    options: ['Process of plants making food', 'Process of digestion', 'Combustion', 'Respiration'],
    correctAnswer: 0,
    subject: 'Biology',
    classLevel: 'Class 9',
    board: 'Federal Board',
    explanation: 'Plants synthesize foods with the aid of chlorophyll and sunlight.',
  };

  const createRes = await fetch(`${BASE_URL}/api/mcqs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherToken}`,
    },
    body: JSON.stringify(createMcqPayload),
  });

  const createData: any = await createRes.json();
  assert(createRes.status === 202, 'Staff CREATE returns HTTP 202 Submitted for Approval', `Got ${createRes.status}`);
  assert(createData.status === 'PENDING', 'Staff CREATE response status is PENDING', `Got ${createData.status}`);
  assert(typeof createData.approvalRequestId === 'number', 'Staff CREATE returns approvalRequestId', `Got ${createData.approvalRequestId}`);

  // Confirm NO live MCQ was created in mcqs table
  const liveMcqMatches = await db
    .select()
    .from(mcqs)
    .where(eq(mcqs.question, createMcqPayload.question));
  assert(liveMcqMatches.length === 0, 'Live mcqs table was NOT modified (0 records found in live table)');

  // Confirm pending record in content_change_requests
  const crRecord = await db
    .select()
    .from(contentChangeRequests)
    .where(eq(contentChangeRequests.id, createData.approvalRequestId));
  assert(crRecord.length === 1, 'Record created in content_change_requests');
  assert(crRecord[0]?.action === 'CREATE', 'Change request action is CREATE');
  assert(crRecord[0]?.status === 'PENDING', 'Change request status is PENDING');
  assert(crRecord[0]?.submittedBy === teacherUid, 'Change request submittedBy matches Staff UID');

  // -------------------------------------------------------------
  // Test Scenario 2: Staff UPDATE MCQ (/api/mcqs/:id)
  // -------------------------------------------------------------
  console.log('\n--- Scenario 2: Staff UPDATE MCQ ---');
  // First, create a live MCQ directly as Admin to have a target for update
  const adminDirectMcq = await fetch(`${BASE_URL}/api/mcqs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      question: `Initial Admin MCQ ${Date.now()}: What is H2O?`,
      options: ['Water', 'Helium', 'Hydrogen', 'Oxygen'],
      correctAnswer: 0,
      subject: 'Chemistry',
      classLevel: 'Class 9',
      board: 'Federal Board',
    }),
  });
  const adminDirectData: any = await adminDirectMcq.json();
  const targetMcqId = adminDirectData.mcq?.id;
  assert(adminDirectMcq.status === 201 && targetMcqId, 'Admin direct create succeeded (HTTP 201) to prepare test target');

  // Staff attempts to UPDATE target MCQ
  const updatePayload = {
    question: `UPDATED BY STAFF ATTEMPT ${Date.now()}: What is H2O chemical formula?`,
  };
  const updateRes = await fetch(`${BASE_URL}/api/mcqs/${targetMcqId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherToken}`,
    },
    body: JSON.stringify(updatePayload),
  });

  const updateData: any = await updateRes.json();
  assert(updateRes.status === 202, 'Staff UPDATE returns HTTP 202 Submitted for Approval', `Got ${updateRes.status}`);
  assert(updateData.status === 'PENDING', 'Staff UPDATE response status is PENDING', `Got ${updateData.status}`);

  // Confirm LIVE MCQ remains UNCHANGED
  const mcqInDb = await db
    .select()
    .from(mcqs)
    .where(eq(mcqs.id, targetMcqId));
  assert(mcqInDb[0]?.question.startsWith('Initial Admin MCQ'), 'Live MCQ question remains unchanged in production table', `Current: ${mcqInDb[0]?.question}`);

  // -------------------------------------------------------------
  // Test Scenario 3: Staff DELETE MCQ (/api/mcqs/:id)
  // -------------------------------------------------------------
  console.log('\n--- Scenario 3: Staff DELETE MCQ ---');
  const deleteRes = await fetch(`${BASE_URL}/api/mcqs/${targetMcqId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${teacherToken}`,
    },
  });

  const deleteData: any = await deleteRes.json();
  assert(deleteRes.status === 202, 'Staff DELETE returns HTTP 202 Submitted for Approval', `Got ${deleteRes.status}`);
  assert(deleteData.status === 'PENDING', 'Staff DELETE response status is PENDING', `Got ${deleteData.status}`);

  // Confirm LIVE MCQ is STILL PRESENT in production database
  const mcqStillThere = await db
    .select()
    .from(mcqs)
    .where(eq(mcqs.id, targetMcqId));
  assert(mcqStillThere.length === 1, 'Live MCQ still exists in database (was NOT deleted directly)');

  // -------------------------------------------------------------
  // Test Scenario 4: Admin Direct Mutations Still Work
  // -------------------------------------------------------------
  console.log('\n--- Scenario 4: Admin Direct Mutations Still Work ---');
  // Admin direct create
  const adminMcqPayload = {
    question: `Admin Live Direct Question ${Date.now()}`,
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 1,
    subject: 'Physics',
    classLevel: 'Class 10',
    board: 'Punjab Board',
  };
  const adminCreateRes = await fetch(`${BASE_URL}/api/mcqs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify(adminMcqPayload),
  });
  const adminCreateData: any = await adminCreateRes.json();
  assert(adminCreateRes.status === 201, 'Admin CREATE returns HTTP 201 Created directly', `Got ${adminCreateRes.status}`);
  assert(adminCreateData.mcq?.id, 'Admin CREATE returned created live MCQ object');

  // Verify live in database
  const liveAdminMcq = await db
    .select()
    .from(mcqs)
    .where(eq(mcqs.id, adminCreateData.mcq.id));
  assert(liveAdminMcq.length === 1, 'Admin MCQ is immediately live in database');

  // Admin direct delete
  const adminDeleteRes = await fetch(`${BASE_URL}/api/mcqs/${adminCreateData.mcq.id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  assert(adminDeleteRes.status === 200, 'Admin DELETE returns HTTP 200 OK directly', `Got ${adminDeleteRes.status}`);

  const liveAdminMcqAfterDelete = await db
    .select()
    .from(mcqs)
    .where(eq(mcqs.id, adminCreateData.mcq.id));
  assert(liveAdminMcqAfterDelete.length === 0, 'Admin MCQ was immediately deleted from live database');

  // Also clean up targetMcqId with Admin direct delete
  await fetch(`${BASE_URL}/api/mcqs/${targetMcqId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });

  // -------------------------------------------------------------
  // Test Scenario 5: Unauthorized Direct API Attempts Blocked
  // -------------------------------------------------------------
  console.log('\n--- Scenario 5: Unauthorized Direct API Attempts Blocked ---');
  // 5a. Anonymous user cannot create MCQ
  const anonRes = await fetch(`${BASE_URL}/api/mcqs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'Anon question', subject: 'Math' }),
  });
  assert(anonRes.status === 401, 'Anonymous request rejected with HTTP 401 Unauthorized', `Got ${anonRes.status}`);

  // 5b. Student cannot create MCQ
  const studentRes = await fetch(`${BASE_URL}/api/mcqs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ question: 'Student question', subject: 'Math' }),
  });
  assert(studentRes.status === 403, 'Student request rejected with HTTP 403 Forbidden', `Got ${studentRes.status}`);

  // 5c. Student cannot call /academic/boards
  const studentHierarchyRes = await fetch(`${BASE_URL}/api/academic/boards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ name: 'Student Direct Board' }),
  });
  assert(studentHierarchyRes.status === 403, 'Student cannot call /api/academic/boards (HTTP 403 Forbidden)', `Got ${studentHierarchyRes.status}`);

  // 5d. Staff calling /academic/boards directly cannot bypass approval (intercepted as 202 PENDING)
  const testBoardName = `Staff Direct Board Attempt ${Date.now()}`;
  const staffHierarchyRes = await fetch(`${BASE_URL}/api/academic/boards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ name: testBoardName }),
  });
  const staffHierarchyData: any = await staffHierarchyRes.json();
  assert(staffHierarchyRes.status === 202, 'Staff calling /api/academic/boards directly returns HTTP 202 (Intercepted)', `Got ${staffHierarchyRes.status}`);
  assert(staffHierarchyData.status === 'PENDING', 'Staff /api/academic/boards change status is PENDING');

  // Verify that board was NOT created live in boards table
  const { boards } = await import('../src/db/schema.ts');
  const liveBoardMatches = await db
    .select()
    .from(boards)
    .where(eq(boards.name, testBoardName));
  assert(liveBoardMatches.length === 0, 'Live boards table was NOT modified by staff direct API attempt');

  // -------------------------------------------------------------
  // Test Scenario 6: Staff Content Hierarchy via /api/content/chapters
  // -------------------------------------------------------------
  console.log('\n--- Scenario 6: Staff Mutation via /api/content/* ---');
  const staffChapterRes = await fetch(`${BASE_URL}/api/content/chapters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ subjectId: 1, name: `Pending Staff Chapter ${Date.now()}` }),
  });
  const staffChapterData: any = await staffChapterRes.json();
  assert(staffChapterRes.status === 202, 'Staff /api/content/chapters POST returns HTTP 202', `Got ${staffChapterRes.status}`);
  assert(staffChapterData.status === 'PENDING', 'Staff chapter creation status is PENDING', `Got ${staffChapterData.status}`);

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`  VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('=============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
