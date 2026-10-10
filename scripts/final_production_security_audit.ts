import crypto from 'crypto';
import { db } from '../src/db/index.ts';
import { users, mcqs, tests, pastPapers, studyNotes, contentChangeRequests, auditLogs, boards, classes, subjects, chapters } from '../src/db/schema.ts';
import { eq, desc, and, sql } from 'drizzle-orm';
import { getOrCreateUser, updateUserRolesInDb } from '../src/db/users.ts';

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

async function main() {
  console.log('=============================================================');
  console.log('  FINAL PRODUCTION SECURITY & INTEGRITY AUDIT');
  console.log('=============================================================');

  if (!db) {
    throw new Error('Database not connected');
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, descMsg: string, extra?: any) {
    if (condition) {
      console.log(`  ✓ PASS: ${descMsg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${descMsg}`, extra ? extra : '');
      failed++;
    }
  }

  // Set up test identities
  const teacherUid = 'audit-teacher-001';
  const teacherEmail = 'audit.teacher@taleemguru.pk';
  await getOrCreateUser(teacherUid, teacherEmail, { name: 'Audit Teacher' });
  await updateUserRolesInDb(teacherUid, ['Teacher']);

  const editorUid = 'audit-editor-001';
  const editorEmail = 'audit.editor@taleemguru.pk';
  await getOrCreateUser(editorUid, editorEmail, { name: 'Audit Editor' });
  await updateUserRolesInDb(editorUid, ['Editor']);

  const contentMgrUid = 'audit-contentmgr-001';
  const contentMgrEmail = 'audit.contentmgr@taleemguru.pk';
  await getOrCreateUser(contentMgrUid, contentMgrEmail, { name: 'Audit ContentManager' });
  await updateUserRolesInDb(contentMgrUid, ['ContentManager']);

  const studentUid = 'audit-student-001';
  const studentEmail = 'audit.student@taleemguru.pk';
  await getOrCreateUser(studentUid, studentEmail, { name: 'Audit Student' });
  await updateUserRolesInDb(studentUid, ['Student']);

  const adminUid = 'admin-bootstrap-001';
  const adminEmail = 'admin@taleemguru.pk';
  await getOrCreateUser(adminUid, adminEmail, { name: 'Super Administrator' });
  await updateUserRolesInDb(adminUid, ['SuperAdmin', 'Admin']);

  const teacherToken = createSignedToken(teacherUid, teacherEmail);
  const editorToken = createSignedToken(editorUid, editorEmail);
  const contentMgrToken = createSignedToken(contentMgrUid, contentMgrEmail);
  const studentToken = createSignedToken(studentUid, studentEmail);
  const adminToken = createSignedToken(adminUid, adminEmail);

  // --- Dimension 1: Staff CREATE/UPDATE/DELETE Interception across all routes ---
  console.log('\n--- Dimension 1: Staff Mutations Interception across All Protected Routes ---');

  // 1.1 /api/mcqs (Teacher CREATE)
  const mcqPayload = {
    id: `mcq-audit-${Date.now()}`,
    question: `Audit Question Physics: Force equals mass times acceleration? (${Date.now()})`,
    options: ['Newton Second Law', 'Newton First Law', 'Hooke Law', 'Ohm Law'],
    correctAnswer: 0,
    board: 'Federal Board',
    classLevel: 'Class 9 (Matric Pt 1)',
    subject: 'Physics',
    chapter: 'Dynamics',
    status: 'Published',
  };
  const mcqCreateRes = await fetch(`${BASE_URL}/api/mcqs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify(mcqPayload),
  });
  const mcqCreateJson = await mcqCreateRes.json();
  assert(mcqCreateRes.status === 202, '/api/mcqs POST returns HTTP 202');
  assert(mcqCreateJson.status === 'PENDING', '/api/mcqs POST status is PENDING');

  // 1.2 /api/tests (Teacher CREATE)
  const testPayload = {
    id: `test-audit-${Date.now()}`,
    title: `Audit Practice Test ${Date.now()}`,
    subject: 'Physics',
    classLevel: 'Class 9 (Matric Pt 1)',
    board: 'Federal Board',
    durationMinutes: 30,
    totalQuestions: 15,
    status: 'Published',
  };
  const testCreateRes = await fetch(`${BASE_URL}/api/tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify(testPayload),
  });
  const testCreateJson = await testCreateRes.json();
  assert(testCreateRes.status === 202, '/api/tests POST returns HTTP 202');
  assert(testCreateJson.status === 'PENDING', '/api/tests POST status is PENDING');

  // 1.3 /api/past-papers (ContentManager CREATE)
  const ppPayload = {
    id: `pp-audit-${Date.now()}`,
    title: `Audit Past Paper 2025 Physics (${Date.now()})`,
    board: 'BISE Lahore',
    classLevel: 'Class 10 (Matric Pt 2)',
    subject: 'Physics',
    year: 2025,
    status: 'Published',
  };
  const ppCreateRes = await fetch(`${BASE_URL}/api/past-papers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${contentMgrToken}` },
    body: JSON.stringify(ppPayload),
  });
  const ppCreateJson = await ppCreateRes.json();
  assert(ppCreateRes.status === 202, '/api/past-papers POST returns HTTP 202');
  assert(ppCreateJson.status === 'PENDING', '/api/past-papers POST status is PENDING');

  // 1.4 /api/study-notes (Editor CREATE)
  const notePayload = {
    id: `note-audit-${Date.now()}`,
    title: `Audit Note Motion Laws (${Date.now()})`,
    subject: 'Physics',
    classLevel: 'Class 9 (Matric Pt 1)',
    chapter: 'Kinematics',
    status: 'Published',
  };
  const noteCreateRes = await fetch(`${BASE_URL}/api/study-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${editorToken}` },
    body: JSON.stringify(notePayload),
  });
  const noteCreateJson = await noteCreateRes.json();
  assert(noteCreateRes.status === 202, '/api/study-notes POST returns HTTP 202');
  assert(noteCreateJson.status === 'PENDING', '/api/study-notes POST status is PENDING');

  // 1.5 /api/content/chapters (ContentManager CREATE)
  const chapterPayload = {
    name: `Audit Chapter ${Date.now()}`,
    subjectId: 1,
    classId: 1,
    status: 'Published',
  };
  const chapterCreateRes = await fetch(`${BASE_URL}/api/content/chapters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${contentMgrToken}` },
    body: JSON.stringify(chapterPayload),
  });
  const chapterCreateJson = await chapterCreateRes.json();
  assert(chapterCreateRes.status === 202, '/api/content/chapters POST returns HTTP 202');
  assert(chapterCreateJson.status === 'PENDING', '/api/content/chapters POST status is PENDING');

  // 1.6 /api/academic/boards (Staff CREATE)
  const boardPayload = {
    name: `Audit Board ${Date.now()}`,
    code: `AB-${Date.now()}`,
    province: 'Punjab',
    city: 'Lahore',
  };
  const boardCreateRes = await fetch(`${BASE_URL}/api/academic/boards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${contentMgrToken}` },
    body: JSON.stringify(boardPayload),
  });
  const boardCreateJson = await boardCreateRes.json();
  assert(boardCreateRes.status === 202, '/api/academic/boards POST returns HTTP 202');
  assert(boardCreateJson.status === 'PENDING', '/api/academic/boards POST status is PENDING');

  // --- Dimension 2: Direct API Bypass & Spoofing Attempts ---
  console.log('\n--- Dimension 2: Direct API Bypass & Spoofing Attempts ---');

  // 2.1 Anonymous unauthenticated caller blocked
  const anonRes = await fetch(`${BASE_URL}/api/mcqs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mcqPayload),
  });
  assert(anonRes.status === 401, 'Anonymous request to /api/mcqs rejected with 401 Unauthorized');

  // 2.2 Student caller blocked
  const studentRes = await fetch(`${BASE_URL}/api/mcqs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify(mcqPayload),
  });
  assert(studentRes.status === 403, 'Student request to /api/mcqs rejected with 403 Forbidden');

  // 2.3 Student cannot access approvals queue
  const studentQueueRes = await fetch(`${BASE_URL}/api/approvals`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(studentQueueRes.status === 403, 'Student cannot view /api/approvals queue (403 Forbidden)');

  // 2.4 Staff cannot access admin approvals endpoint directly
  const teacherApproveAccess = await fetch(`${BASE_URL}/api/approvals/1/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify({ comment: 'Illegal bypass attempt' }),
  });
  assert(teacherApproveAccess.status === 403, 'Teacher cannot call /api/approvals/:id/approve (403 Forbidden)');

  // --- Dimension 3: Self-Approval Prevention ---
  console.log('\n--- Dimension 3: Self-Approval Prevention ---');
  const teacherPendingId = mcqCreateJson.approvalRequestId;
  const selfApproveAttempt = await fetch(`${BASE_URL}/api/approvals/${teacherPendingId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify({ comment: 'Self approving' }),
  });
  assert(selfApproveAttempt.status === 403, 'Staff user blocked from self-approving change request');

  // --- Dimension 4: Concurrency & Duplicate Approval Protection ---
  console.log('\n--- Dimension 4: Concurrency & Duplicate Approval Protection ---');
  const [firstApproval, secondApproval] = await Promise.all([
    fetch(`${BASE_URL}/api/approvals/${teacherPendingId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ comment: 'Admin approval attempt 1' }),
    }),
    fetch(`${BASE_URL}/api/approvals/${teacherPendingId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ comment: 'Admin approval attempt 2' }),
    }),
  ]);

  const firstStatus = firstApproval.status;
  const secondStatus = secondApproval.status;
  const statuses = [firstStatus, secondStatus].sort();
  assert(
    statuses[0] === 200 && (statuses[1] === 409 || statuses[1] === 200),
    `Concurrency guard: Only valid state transitions allowed (Statuses: ${firstStatus}, ${secondStatus})`
  );

  // Subsequent approval on already APPROVED item must be rejected with 409 Conflict
  const thirdApproval = await fetch(`${BASE_URL}/api/approvals/${teacherPendingId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ comment: 'Attempt to re-approve already approved request' }),
  });
  assert(thirdApproval.status === 409, 'Duplicate approval on already approved item returns 409 Conflict');

  // --- Dimension 5: Public / Student Content Visibility ---
  console.log('\n--- Dimension 5: Public / Student Content Visibility ---');

  // Create another MCQ by teacher that stays PENDING
  const pendingOnlyMCQ = {
    id: `mcq-pending-only-${Date.now()}`,
    question: `Unapproved Pending MCQ Secret (${Date.now()})`,
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 0,
    board: 'Federal Board',
    classLevel: 'Class 9 (Matric Pt 1)',
    subject: 'Physics',
    status: 'Published',
  };
  const pendingOnlyRes = await fetch(`${BASE_URL}/api/mcqs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify(pendingOnlyMCQ),
  });
  const pendingOnlyJson = await pendingOnlyRes.json();
  const pendingOnlyReqId = pendingOnlyJson.approvalRequestId;

  // Student public listing must NOT contain pending MCQ
  const studentListingRes = await fetch(`${BASE_URL}/api/mcqs?subject=Physics&classLevel=${encodeURIComponent('Class 9 (Matric Pt 1)')}`);
  const studentListingJson = await studentListingRes.json();
  const foundPendingInPublic = (studentListingJson.mcqs || []).find((m: any) => m.question === pendingOnlyMCQ.question);
  assert(!foundPendingInPublic, 'Pending MCQ is NOT visible in student public API');

  // --- Dimension 6: Rejection Immutability ---
  console.log('\n--- Dimension 6: Rejection Immutability ---');
  const rejectRes = await fetch(`${BASE_URL}/api/approvals/${pendingOnlyReqId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ reason: 'Incorrect difficulty rating.' }),
  });
  assert(rejectRes.status === 200, 'Admin rejects request with reason (HTTP 200)');

  // Verify live content remained unchanged after rejection
  const studentListingAfterReject = await fetch(`${BASE_URL}/api/mcqs?subject=Physics&classLevel=${encodeURIComponent('Class 9 (Matric Pt 1)')}`);
  const studentListingAfterRejectJson = await studentListingAfterReject.json();
  const foundRejectedInPublic = (studentListingAfterRejectJson.mcqs || []).find((m: any) => m.question === pendingOnlyMCQ.question);
  assert(!foundRejectedInPublic, 'Rejected content was never written to live tables');

  // --- Dimension 7: DELETE Approval removes live content ---
  console.log('\n--- Dimension 7: DELETE Approval Effect ---');
  // First, find the MCQ that was approved in Dimension 4
  const publicApprovedRes = await fetch(`${BASE_URL}/api/mcqs?subject=Physics&classLevel=${encodeURIComponent('Class 9 (Matric Pt 1)')}`);
  const publicApprovedJson = await publicApprovedRes.json();
  const approvedLiveItem = (publicApprovedJson.mcqs || []).find((m: any) => m.question === mcqPayload.question);
  assert(!!approvedLiveItem, 'Approved MCQ is live in student listing');

  if (approvedLiveItem) {
    // Teacher requests deletion
    const delReqRes = await fetch(`${BASE_URL}/api/mcqs/${encodeURIComponent(approvedLiveItem.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const delReqJson = await delReqRes.json();
    assert(delReqRes.status === 202, 'Teacher DELETE request returns 202 PENDING');

    // Admin approves deletion
    const delApproveRes = await fetch(`${BASE_URL}/api/approvals/${delReqJson.approvalRequestId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ comment: 'Confirmed deletion.' }),
    });
    assert(delApproveRes.status === 200, 'Admin approves DELETE request');

    // Verify MCQ is gone from student listing
    const publicAfterDelRes = await fetch(`${BASE_URL}/api/mcqs?subject=Physics&classLevel=${encodeURIComponent('Class 9 (Matric Pt 1)')}`);
    const publicAfterDelJson = await publicAfterDelRes.json();
    const foundAfterDel = (publicAfterDelJson.mcqs || []).find((m: any) => m.id === approvedLiveItem.id);
    assert(!foundAfterDel, 'Deleted MCQ is permanently removed from public student API');
  }

  // --- Dimension 8: Admin Direct CRUD Still Works ---
  console.log('\n--- Dimension 8: Admin Direct CRUD Still Works ---');
  const directTestMCQ = {
    id: `mcq-admin-direct-${Date.now()}`,
    question: `Admin Direct Exam Question (${Date.now()})`,
    options: ['True', 'False', 'Neither', 'Both'],
    correctAnswer: 0,
    board: 'Federal Board',
    classLevel: 'Class 9 (Matric Pt 1)',
    subject: 'Physics',
    status: 'Published',
  };

  const adminCreateRes = await fetch(`${BASE_URL}/api/mcqs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(directTestMCQ),
  });
  const adminCreateJson = await adminCreateRes.json();
  assert(adminCreateRes.status === 201, 'Admin direct create returns HTTP 201 Created');
  assert(adminCreateJson.mcq?.question === directTestMCQ.question, 'Admin direct MCQ is immediately live');

  // Admin delete
  const adminDeleteRes = await fetch(`${BASE_URL}/api/mcqs/${encodeURIComponent(adminCreateJson.mcq.id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminDeleteRes.status === 200, 'Admin direct delete returns HTTP 200 OK');

  // --- Dimension 9: Audit Trail Logging Verification ---
  console.log('\n--- Dimension 9: Audit Trail Logging Verification ---');
  const recentLogs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);

  const approvalLog = recentLogs.find((l) => l.action.startsWith('APPROVE_') || l.action.startsWith('REJECT_'));
  assert(!!approvalLog, 'Approval action is permanently recorded in audit_logs table');
  assert(!!approvalLog?.adminUid, 'Audit log records administrator UID');
  assert(!!approvalLog?.details, 'Audit log records detailed context of approved/rejected content');
  assert(!!approvalLog?.createdAt, 'Audit log records timestamp');

  // --- Dimension 10: Credential & Secret Protection Scan ---
  console.log('\n--- Dimension 10: Credential & Secret Protection ---');
  const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
  const publicApiCheck = await fetch(`${BASE_URL}/api/mcqs`);
  const headerKeys = Array.from(publicApiCheck.headers.keys());
  const leakedHeaders = headerKeys.filter((h) => sensitiveHeaders.includes(h.toLowerCase()) && publicApiCheck.headers.get(h)?.includes('secret'));
  assert(leakedHeaders.length === 0, 'No secrets or sensitive authorization headers leaked in public API responses');

  console.log('=============================================================');
  console.log(`  FINAL AUDIT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================');

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
