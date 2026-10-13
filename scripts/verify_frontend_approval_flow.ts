import crypto from 'crypto';
import { db } from '../src/db/index.ts';
import { users, mcqs, contentChangeRequests } from '../src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { getOrCreateUser, updateUserRolesInDb } from '../src/db/users.ts';

if (!process.env.SERVER_JWT_SECRET) {
  process.env.SERVER_JWT_SECRET = 'taleemguru-dev-server-jwt-secret-key-32bytes';
}

function createSignedToken(uid: string, email: string): string {
  const secret = process.env.SERVER_JWT_SECRET!;
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: uid,
      email: email,
      iss: 'taleemguru-backend',
      aud: 'taleemguru-admin',
      exp: Math.floor(Date.now() / 1000) + 3600,
      nbf: Math.floor(Date.now() / 1000) - 10,
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function main() {
  console.log('=============================================================');
  console.log('  TALEEMGURU END-TO-END FRONTEND APPROVAL WORKFLOW VERIFICATION');
  console.log('=============================================================');

  const teacherUid = 'test-teacher-staff-001';
  const teacherEmail = 'teacher.staff@taleemguru.pk';
  await getOrCreateUser(teacherUid, teacherEmail, { name: 'E2E Teacher' });
  await updateUserRolesInDb(teacherUid, ['Teacher', 'ContentManager']);

  const adminUid = 'admin-bootstrap-001';
  const adminEmail = 'admin@taleemguru.pk';
  await getOrCreateUser(adminUid, adminEmail, { name: 'Super Administrator' });
  await updateUserRolesInDb(adminUid, ['SuperAdmin', 'Admin']);

  const studentUid = 'test-student-001';
  const studentEmail = 'student@taleemguru.pk';
  await getOrCreateUser(studentUid, studentEmail, { name: 'E2E Student' });
  await updateUserRolesInDb(studentUid, ['Student']);

  const teacherToken = createSignedToken(teacherUid, teacherEmail);
  const adminToken = createSignedToken(adminUid, adminEmail);
  const studentToken = createSignedToken(studentUid, studentEmail);

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

  // --- Step 1: Teacher creates an MCQ ---
  console.log('\n--- Step 1: Teacher creates an MCQ ---');
  const newMCQ = {
    id: `mcq-e2e-test-${Date.now()}`,
    question: `Which fundamental force mediates radioactive beta decay? (${Date.now()})`,
    options: ['Strong Nuclear Force', 'Weak Nuclear Force', 'Electromagnetic Force', 'Gravitational Force'],
    correctAnswer: 1,
    explanation: 'Beta decay is mediated by the weak nuclear force via W and Z bosons.',
    board: 'Federal Board',
    classLevel: 'Class 12 (HSSC Pt 2)',
    subject: 'Physics',
    chapter: 'Nuclear Physics',
    topic: 'Radioactivity',
    difficulty: 'Hard',
    status: 'Published',
  };

  const createRes = await fetch('http://localhost:3000/api/mcqs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify(newMCQ),
  });

  const createJson = await createRes.json();
  assert(createRes.status === 202, 'Teacher CREATE returns HTTP 202 Accepted', { status: createRes.status, body: createJson });
  assert(createJson.status === 'PENDING', 'Teacher CREATE response status is PENDING');
  const approvalId = createJson.approvalRequestId;
  assert(typeof approvalId === 'number', `Teacher CREATE returns approvalRequestId: ${approvalId}`);

  // --- Step 2: PENDING appears in My Submissions ---
  console.log('\n--- Step 2: PENDING appears in Teacher "My Submissions" ---');
  const mySubsRes = await fetch('http://localhost:3000/api/approvals/my', {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const mySubsJson = await mySubsRes.json();
  assert(mySubsRes.status === 200, 'Teacher can fetch /api/approvals/my');
  const foundInMySubs = mySubsJson.submissions?.find((s: any) => s.id === approvalId);
  assert(!!foundInMySubs, 'Created item found in Teacher submissions list');
  assert(foundInMySubs?.status === 'PENDING', 'Submission status in My Submissions is PENDING');
  assert(foundInMySubs?.action === 'CREATE', 'Submission action is CREATE');
  assert(foundInMySubs?.entityType === 'mcq' || foundInMySubs?.entityType === 'mcqs', 'Submission entityType is mcq/mcqs');

  // --- Step 3: MCQ is NOT live on the Student site ---
  console.log('\n--- Step 3: Verify MCQ is NOT live on Student site ---');
  const studentListRes = await fetch(`http://localhost:3000/api/mcqs?subject=Physics&classLevel=${encodeURIComponent('Class 12 (HSSC Pt 2)')}`);
  const studentListJson = await studentListRes.json();
  const liveMatch = (studentListJson.mcqs || []).find((m: any) => m.question === newMCQ.question);
  assert(!liveMatch, 'MCQ is NOT visible to students on the live website before approval');

  // --- Step 4: Admin sees it in Content Approvals queue ---
  console.log('\n--- Step 4: Admin views request in Content Approvals ---');
  const adminQueueRes = await fetch('http://localhost:3000/api/approvals?status=PENDING', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminQueueJson = await adminQueueRes.json();
  assert(adminQueueRes.status === 200, 'Admin can fetch /api/approvals');
  const foundInAdminQueue = (adminQueueJson.items || []).find((i: any) => i.id === approvalId);
  assert(!!foundInAdminQueue, 'Admin sees pending request in Content Approvals queue');
  assert(!!foundInAdminQueue?.submitterName, 'Admin sees submitter name correctly');

  // Verify Admin filter by entityType and action works
  const filteredRes = await fetch(`http://localhost:3000/api/approvals?entityType=mcq&status=PENDING`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const filteredJson = await filteredRes.json();
  assert((filteredJson.items || []).some((i: any) => i.id === approvalId), 'Admin filter by entityType includes request');

  // --- Step 5: Self-Approval Prevention Check ---
  console.log('\n--- Step 5: Self-Approval Prevention Check ---');
  const selfApproveRes = await fetch(`http://localhost:3000/api/approvals/${approvalId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ comment: 'Self approving attempt' }),
  });
  assert(selfApproveRes.status === 403, 'Staff cannot approve their own submission (HTTP 403 Forbidden)');

  // --- Step 6: Admin Reviews and Approves ---
  console.log('\n--- Step 6: Admin Approves & Publishes ---');
  const approveRes = await fetch(`http://localhost:3000/api/approvals/${approvalId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ comment: 'Verified against Federal Board 2026 Curriculum.' }),
  });
  const approveJson = await approveRes.json();
  assert(approveRes.status === 200, 'Admin APPROVE returns HTTP 200 OK');
  assert(approveJson.success === true, 'Admin APPROVE response success is true');

  // --- Step 7: MCQ is now LIVE on student site ---
  console.log('\n--- Step 7: MCQ is now Live on Student site ---');
  const studentLiveRes = await fetch(`http://localhost:3000/api/mcqs?subject=Physics&classLevel=${encodeURIComponent('Class 12 (HSSC Pt 2)')}`);
  const studentLiveJson = await studentLiveRes.json();
  const liveMatchAfterApproval = (studentLiveJson.mcqs || []).find((m: any) => m.question === newMCQ.question);
  assert(!!liveMatchAfterApproval, 'MCQ is now LIVE and accessible on the student platform');
  assert(liveMatchAfterApproval?.options?.[1] === 'Weak Nuclear Force', 'Live MCQ options match approved content');
  const liveMcqId = liveMatchAfterApproval?.id;

  // --- Step 8: Teacher sees APPROVED in My Submissions ---
  console.log('\n--- Step 8: Teacher sees APPROVED in My Submissions ---');
  const mySubsAfterApprove = await fetch('http://localhost:3000/api/approvals/my', {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const mySubsAfterApproveJson = await mySubsAfterApprove.json();
  const approvedItem = mySubsAfterApproveJson.submissions?.find((s: any) => s.id === approvalId);
  assert(approvedItem?.status === 'APPROVED', 'Teacher sees APPROVED status in My Submissions');
  assert(!!approvedItem?.publishedAt || !!approvedItem?.reviewedAt, 'Approval date is populated for Teacher');
  assert(approvedItem?.reviewComment === 'Verified against Federal Board 2026 Curriculum.', 'Teacher sees Admin approval note');

  // --- Step 9: Rejection Flow Test ---
  console.log('\n--- Step 9: Rejection Flow with Required Reason ---');
  const rejectedMCQ = {
    id: `mcq-rejected-${Date.now()}`,
    question: `Incorrect MCQ that should be rejected (${Date.now()})`,
    options: ['Opt A', 'Opt B', 'Opt C', 'Opt D'],
    correctAnswer: 0,
    board: 'Federal Board',
    classLevel: 'Class 10 (Matric Pt 2)',
    subject: 'Physics',
    status: 'Published',
  };

  const createForReject = await fetch('http://localhost:3000/api/mcqs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify(rejectedMCQ),
  });
  const rejectJson = await createForReject.json();
  const rejectReqId = rejectJson.approvalRequestId;

  // Reject without reason fails
  const rejectNoReason = await fetch(`http://localhost:3000/api/approvals/${rejectReqId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ reason: '' }),
  });
  assert(rejectNoReason.status === 400, 'Rejection without reason is rejected with HTTP 400 Bad Request');

  // Reject with required reason
  const rejectionReason = 'Question phrasing is ambiguous and missing textbook citation.';
  const rejectWithReason = await fetch(`http://localhost:3000/api/approvals/${rejectReqId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ reason: rejectionReason }),
  });
  assert(rejectWithReason.status === 200, 'Rejection with reason succeeds (HTTP 200)');

  // Teacher sees rejection reason
  const mySubsAfterReject = await fetch('http://localhost:3000/api/approvals/my', {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const mySubsAfterRejectJson = await mySubsAfterReject.json();
  const rejectedSubItem = mySubsAfterRejectJson.submissions?.find((s: any) => s.id === rejectReqId);
  assert(rejectedSubItem?.status === 'REJECTED', 'Staff sees REJECTED status in My Submissions');
  assert(rejectedSubItem?.reviewComment === rejectionReason, 'Staff sees exact rejection reason from Admin');

  // --- Step 10: UPDATE Approval Flow ---
  console.log('\n--- Step 10: UPDATE Approval Flow ---');
  if (liveMcqId) {
    const updateRes = await fetch(`http://localhost:3000/api/mcqs/${encodeURIComponent(liveMcqId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        question: `UPDATED QUESTION: Which fundamental force mediates beta decay? (${Date.now()})`,
      }),
    });
    const updateJson = await updateRes.json();
    assert(updateRes.status === 202, 'Teacher UPDATE returns HTTP 202 Accepted');
    const updateReqId = updateJson.approvalRequestId;

    // Approve update
    const approveUpdate = await fetch(`http://localhost:3000/api/approvals/${updateReqId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ comment: 'Approved question title update.' }),
    });
    assert(approveUpdate.status === 200, 'Admin approves UPDATE successfully');
  }

  // --- Step 11: DELETE Approval Flow ---
  console.log('\n--- Step 11: DELETE Approval Flow ---');
  if (liveMcqId) {
    const deleteRes = await fetch(`http://localhost:3000/api/mcqs/${encodeURIComponent(liveMcqId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${teacherToken}`,
      },
    });
    const deleteJson = await deleteRes.json();
    assert(deleteRes.status === 202, 'Teacher DELETE returns HTTP 202 Accepted');
    const deleteReqId = deleteJson.approvalRequestId;

    // Approve deletion
    const approveDelete = await fetch(`http://localhost:3000/api/approvals/${deleteReqId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ comment: 'Confirmed deletion.' }),
    });
    assert(approveDelete.status === 200, 'Admin approves DELETE successfully');

    // Confirm MCQ was deleted from live database
    const verifyDeleted = await fetch(`http://localhost:3000/api/mcqs?subject=Physics&classLevel=${encodeURIComponent('Class 12 (HSSC Pt 2)')}`);
    const verifyDeletedJson = await verifyDeleted.json();
    const liveFound = (verifyDeletedJson.mcqs || []).find((m: any) => m.id === liveMcqId);
    assert(!liveFound, 'MCQ is completely removed from live website after DELETE approval');
  }

  // --- Step 12: Admin Direct Editing Still Works ---
  console.log('\n--- Step 12: Admin Direct Editing Still Works ---');
  const directMCQ = {
    id: `mcq-direct-admin-${Date.now()}`,
    question: `Admin Direct Question: What is Planck constant value? (${Date.now()})`,
    options: ['6.626 x 10^-34 J s', '3.00 x 10^8 m/s', '1.602 x 10^-19 C', '9.109 x 10^-31 kg'],
    correctAnswer: 0,
    board: 'Federal Board',
    classLevel: 'Class 11 (HSSC Pt 1)',
    subject: 'Physics',
    chapter: 'Measurements',
    difficulty: 'Medium',
    status: 'Published',
  };

  const adminDirectCreate = await fetch('http://localhost:3000/api/mcqs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(directMCQ),
  });
  const adminDirectJson = await adminDirectCreate.json();
  assert(adminDirectCreate.status === 201, 'Admin CREATE returns HTTP 201 Created directly');
  assert(adminDirectJson.mcq?.question === directMCQ.question, 'Admin MCQ is created live immediately');

  if (adminDirectJson.mcq?.id) {
    const adminDirectDelete = await fetch(`http://localhost:3000/api/mcqs/${encodeURIComponent(adminDirectJson.mcq.id)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert(adminDirectDelete.status === 200, 'Admin DELETE returns HTTP 200 OK directly');
  }

  console.log('=============================================================');
  console.log(`  E2E VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================');

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error in E2E tests:', err);
  process.exit(1);
});
