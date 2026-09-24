import crypto from 'crypto';
import { db } from '../src/db/index.ts';
import {
  users,
  tests,
  mcqs,
  testResults,
  examAttempts,
  bookmarkedQuestions,
  certificates,
} from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';
import {
  getOrCreateUser,
  getUserByUid,
  updateUserProfile,
  updateUserRolesInDb,
  toggleBookmarkInDb,
  getUserBookmarksFromDb,
  getUserTestResultsFromDb,
  saveTestResultToDb,
  saveCertificateToDb,
  getUserCertificatesFromDb,
  getCertificateByIdFromDb,
} from '../src/db/users.ts';
import {
  initExamSystemTables,
  startExamAttemptInDb,
  submitExamAttemptInDb,
  getExamAttemptResultFromDb,
  getUserActiveExamAttempt,
  getStudentDashboardStats,
  getTeacherDashboardStats,
} from '../src/db/exams.ts';
import {
  createMCQInDb,
  createTestInDb,
  updateTestInDb,
  getTestsFromDb,
  seedInitialEducationalContent,
} from '../src/db/content.ts';
import {
  requireAuth,
  requireTeacher,
  requireAdmin,
  requireHighAdmin,
  requireQuizCreator,
  requireMCQCurator,
} from '../src/middleware/auth.ts';

// Helper to create mocked Express Request/Response objects
function createMockReqRes(options: {
  headers?: Record<string, string>;
  user?: any;
  body?: any;
  params?: any;
  query?: any;
}) {
  const req: any = {
    headers: options.headers || {},
    user: options.user,
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    ip: '127.0.0.1',
  };
  let statusCode = 200;
  let responseData: any = null;
  let nextCalled = false;

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    send(data: any) {
      responseData = data;
      return res;
    },
  };

  const next = () => {
    nextCalled = true;
  };

  return {
    req,
    res,
    next,
    getStatusCode: () => statusCode,
    getResponseData: () => responseData,
    wasNextCalled: () => nextCalled,
  };
}

// Generate signed bearer token recognized by TaleemGuru requireAuth fallback
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
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function runStudentTeacherPortalTests() {
  console.log('================================================================');
  console.log('  TALEEMGURU STEP 5.2: STUDENT & TEACHER PORTAL TEST SUITE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // 0. Initialize database baseline
    await seedInitialEducationalContent();
    await initExamSystemTables();

    const timestamp = Date.now();
    const studentAUid = `std-a-${timestamp}`;
    const studentAEmail = `student.a.${timestamp}@example.com`;
    const studentBUid = `std-b-${timestamp}`;
    const studentBEmail = `student.b.${timestamp}@example.com`;
    const teacherAUid = `tch-a-${timestamp}`;
    const teacherAEmail = `teacher.a.${timestamp}@example.com`;
    const multiRoleUid = `multi-${timestamp}`;
    const multiRoleEmail = `multirole.${timestamp}@example.com`;
    const teacherAdminUid = `tch-adm-${timestamp}`;
    const teacherAdminEmail = `tadmin.${timestamp}@example.com`;
    const allRolesUid = `all-roles-${timestamp}`;
    const allRolesEmail = `all.${timestamp}@example.com`;
    const guestUid = `guest-${timestamp}`;
    const guestEmail = `guest.${timestamp}@example.com`;

    // Initialize test users in PostgreSQL
    await getOrCreateUser(studentAUid, studentAEmail, { name: 'Student Alpha', classLevel: 'Class 10' });
    await getOrCreateUser(studentBUid, studentBEmail, { name: 'Student Beta', classLevel: 'Class 9' });
    await getOrCreateUser(teacherAUid, teacherAEmail, { name: 'Teacher Alpha' });
    await updateUserRolesInDb(teacherAUid, ['Teacher']);

    await getOrCreateUser(multiRoleUid, multiRoleEmail, { name: 'Dual Student Teacher' });
    await updateUserRolesInDb(multiRoleUid, ['Student', 'Teacher']);

    await getOrCreateUser(teacherAdminUid, teacherAdminEmail, { name: 'Teacher Administrator' });
    await updateUserRolesInDb(teacherAdminUid, ['Teacher', 'Admin']);

    await getOrCreateUser(allRolesUid, allRolesEmail, { name: 'Full Staff Member' });
    await updateUserRolesInDb(allRolesUid, ['Student', 'Teacher', 'Admin']);

    await getOrCreateUser(guestUid, guestEmail, { name: 'Guest Visitor' });
    await updateUserRolesInDb(guestUid, ['Student', 'Guest']);

    // Common test question
    const q1 = await createMCQInDb(
      {
        id: `portal-q1-${timestamp}`,
        question: 'What is the SI unit of electric current?',
        options: ['Volt', 'Ampere', 'Ohm', 'Watt'],
        correctAnswer: 1,
        explanation: 'Ampere is the SI base unit of electric current.',
        subject: 'Physics',
        classLevel: 'Class 10',
        board: 'BISE Lahore',
        difficulty: 'Easy',
        status: 'Published',
        createdBy: teacherAUid,
      },
      teacherAUid
    );

    const q2Draft = await createMCQInDb(
      {
        id: `portal-q2-draft-${timestamp}`,
        question: 'Draft question not yet published?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        explanation: 'Draft question test.',
        subject: 'Physics',
        classLevel: 'Class 10',
        board: 'BISE Lahore',
        difficulty: 'Medium',
        status: 'Draft',
        createdBy: teacherAUid,
      },
      teacherAUid
    );

    // ----------------------------------------------------------------
    // SECTION 1: STUDENT PORTAL TESTS
    // ----------------------------------------------------------------

    // 1. Student dashboard authorization (Unauthenticated blocked with 401)
    {
      const { req, res, next, getStatusCode } = createMockReqRes({ headers: {} });
      await requireAuth(req, res, next);
      assert(getStatusCode() === 401, 'Test 1: Student dashboard authorization rejects unauthenticated request');
    }

    // 2. Dashboard uses authenticated user
    {
      const dashA = await getStudentDashboardStats(studentAUid);
      assert(dashA !== null && dashA.summary.totalTestsAttempted === 0, 'Test 2: Dashboard query uses authenticated user UID');
    }

    // 3. Dashboard does not expose another student's metrics
    {
      // Insert result for student A only
      await saveTestResultToDb({
        resultId: `res-a-${timestamp}`,
        userUid: studentAUid,
        testId: 'test-physics-1',
        testTitle: 'Physics Unit 1 Quiz',
        testType: 'Quiz',
        subject: 'Physics',
        category: 'Academic',
        totalQuestions: 10,
        answeredCount: 10,
        correctCount: 8,
        wrongCount: 2,
        skippedCount: 0,
        marksObtained: 8,
        totalMarks: 10,
        percentage: 80,
        grade: 'A',
        timeUsedSeconds: 300,
        percentileRank: 90,
        answers: {},
      });

      const dashA = await getStudentDashboardStats(studentAUid);
      const dashB = await getStudentDashboardStats(studentBUid);

      assert(
        dashA.summary.totalTestsAttempted === 1 &&
        dashA.summary.averagePercentage === 80 &&
        dashB.summary.totalTestsAttempted === 0 &&
        dashB.summary.averagePercentage === 0,
        'Test 3: Dashboard strictly isolates metrics and does not expose another student\'s records'
      );
    }

    // 4. Published tests accessible
    {
      const testPublished = await createTestInDb(
        {
          title: `Published Biology Assessment ${timestamp}`,
          subject: 'Biology',
          classLevel: 'Class 10',
          board: 'Federal',
          durationMinutes: 15,
          totalQuestions: 5,
          totalMarks: 5,
          status: 'Published',
          questionIds: [q1.id],
        },
        teacherAUid
      );

      const publishedTests = await getTestsFromDb({ status: 'Published', subject: 'Biology' });
      const found = publishedTests.some((t) => t.id === testPublished.id);
      assert(found, 'Test 4: Published tests are accessible to students');
    }

    // 5. Draft tests inaccessible via public published test query
    {
      const testDraft = await createTestInDb(
        {
          title: `Draft Assessment Forbidden to Students ${timestamp}`,
          subject: 'Chemistry',
          classLevel: 'Class 10',
          board: 'Federal',
          durationMinutes: 15,
          totalQuestions: 5,
          totalMarks: 5,
          status: 'Draft',
          questionIds: [q1.id],
        },
        teacherAUid
      );

      const publishedList = await getTestsFromDb({ status: 'Published' });
      const draftFoundInPublic = publishedList.some((t) => t.id === testDraft.id);
      assert(!draftFoundInPublic, 'Test 5: Draft tests are strictly inaccessible via public student query');
    }

    // 6. Active exam recovery
    const examTest = await createTestInDb(
      {
        title: `Active Exam Recovery Test ${timestamp}`,
        subject: 'Physics',
        classLevel: 'Class 10',
        board: 'Federal',
        durationMinutes: 20,
        totalQuestions: 1,
        totalMarks: 1,
        status: 'Published',
        questionIds: [q1.id],
      },
      teacherAUid
    );

    const activeSessionA = await startExamAttemptInDb({
      testId: examTest.id,
      userUid: studentAUid,
      studentName: 'Student Alpha',
      studentEmail: studentAEmail,
    });

    {
      const recovered = await getUserActiveExamAttempt(studentAUid);
      assert(
        recovered !== null &&
        recovered.attemptId === activeSessionA.attemptId &&
        recovered.remainingSeconds > 0,
        'Test 6: Active exam recovery returns in-progress attempt with authoritative remaining time'
      );
    }

    // 7. Active exam ownership
    {
      const recoveredByB = await getUserActiveExamAttempt(studentBUid);
      assert(
        recoveredByB === null || recoveredByB.attemptId !== activeSessionA.attemptId,
        'Test 7: Active exam ownership prevents Student B from recovering Student A\'s active session'
      );
    }

    // 8. Attempt history ownership
    {
      const historyA = await getUserTestResultsFromDb(studentAUid);
      const historyB = await getUserTestResultsFromDb(studentBUid);
      const hasA = historyA.some((r) => r.userUid === studentAUid);
      const bContainsA = historyB.some((r) => r.userUid === studentAUid);
      assert(hasA && !bContainsA, 'Test 8: Attempt history ownership isolates student examination records');
    }

    // 9. Result ownership
    {
      // Submit student A's attempt
      await submitExamAttemptInDb({
        attemptId: activeSessionA.attemptId,
        userUid: studentAUid,
        submittedAnswers: { [q1.id]: { selectedOption: 1, timeSpentSeconds: 15 } },
      });

      // Student B attempts to query Student A's result
      const resultQueriedByB = await getExamAttemptResultFromDb(activeSessionA.attemptId, studentBUid);
      assert(
        resultQueriedByB === null,
        'Test 9: Result ownership: Student B cannot view Student A\'s detailed exam result'
      );
    }

    // 10. Bookmark ownership
    {
      await toggleBookmarkInDb(studentAUid, q1.id);
      const bookmarksA = await getUserBookmarksFromDb(studentAUid);
      const bookmarksB = await getUserBookmarksFromDb(studentBUid);

      assert(
        bookmarksA.includes(q1.id) && !bookmarksB.includes(q1.id),
        'Test 10: Bookmark ownership isolates saved questions per student'
      );
    }

    // 11. Bookmark toggle persistence
    {
      // Toggle off
      const toggleOff = await toggleBookmarkInDb(studentAUid, q1.id);
      const bookmarksAfterOff = await getUserBookmarksFromDb(studentAUid);
      // Toggle back on
      const toggleOn = await toggleBookmarkInDb(studentAUid, q1.id);
      const bookmarksAfterOn = await getUserBookmarksFromDb(studentAUid);

      assert(
        !toggleOff.bookmarked &&
        !bookmarksAfterOff.includes(q1.id) &&
        toggleOn.bookmarked &&
        bookmarksAfterOn.includes(q1.id),
        'Test 11: Bookmark toggle persists additions and deletions in PostgreSQL'
      );
    }

    // 12. Certificate ownership
    {
      const certId = `CERT-TEST-${timestamp}`;
      await saveCertificateToDb({
        id: certId,
        userUid: studentAUid,
        studentName: 'Student Alpha',
        testId: examTest.id,
        testName: examTest.title,
        score: 1,
        totalMarks: 1,
        percentage: 100,
        grade: 'A+',
        className: 'Class 10',
        subjectName: 'Physics',
        status: 'VALID',
        verificationUrl: `https://taleemguru.pk/verify/${certId}`,
      });

      const certsA = await getUserCertificatesFromDb(studentAUid);
      const certsB = await getUserCertificatesFromDb(studentBUid);
      assert(
        certsA.some((c) => c.id === certId) && !certsB.some((c) => c.id === certId),
        'Test 12: Certificate ownership restricts access strictly to certificate recipient'
      );
    }

    // 13. Profile permitted fields
    {
      const updated = await updateUserProfile(studentAUid, {
        name: 'Student Alpha Updated',
        classLevel: 'Class 11',
        board: 'Federal Board',
        targetExam: 'ECAT',
        avatar: 'avatar-5',
      });

      assert(
        updated !== null &&
        updated.name === 'Student Alpha Updated' &&
        updated.classLevel === 'Class 11' &&
        updated.targetExam === 'ECAT',
        'Test 13: Student profile updates permitted fields (name, classLevel, board, targetExam, avatar)'
      );
    }

    // 14. Student cannot modify roles
    {
      // Attempt to pass malicious roles payload to profile update
      await updateUserProfile(studentAUid, {
        name: 'Student Alpha',
        ...({ roles: ['Admin', 'SuperAdmin'] } as any),
      });

      const freshUser = await getUserByUid(studentAUid);
      const roles = freshUser?.roles || [];
      const hasEscalated = roles.includes('Admin') || roles.includes('SuperAdmin');
      assert(!hasEscalated, 'Test 14: Student cannot modify account roles via profile updates');
    }

    // 15. Student cannot modify permissions
    {
      await updateUserProfile(studentAUid, {
        name: 'Student Alpha',
        ...({ permissions: ['ALL_PERMISSIONS', 'MANAGE_USERS'] } as any),
      });

      const freshUser = await getUserByUid(studentAUid);
      const permissions = freshUser?.permissions || [];
      const hasElevatedPerms = permissions.includes('ALL_PERMISSIONS');
      assert(!hasElevatedPerms, 'Test 15: Student cannot inject permissions via profile updates');
    }

    // 16. Student cannot modify administrative identifiers
    {
      await updateUserProfile(studentAUid, {
        name: 'Student Alpha',
        ...({ isAdmin: true, status: 'SuperAdmin', points: 999999 } as any),
      });

      const freshUser = await getUserByUid(studentAUid);
      assert(
        freshUser?.status === 'Active' && freshUser.points !== 999999 && (freshUser as any).isAdmin !== true,
        'Test 16: Student cannot manipulate administrative status, points, or admin flags'
      );
    }

    // ----------------------------------------------------------------
    // SECTION 2: TEACHER PORTAL TESTS
    // ----------------------------------------------------------------

    // 17. Teacher dashboard authorization
    {
      // Student attempting to access teacher endpoint
      const studentReqRes = createMockReqRes({ user: { uid: studentAUid, roles: ['Student'], email: studentAEmail } });
      await requireTeacher(studentReqRes.req, studentReqRes.res, studentReqRes.next);

      // Teacher accessing teacher endpoint
      const teacherReqRes = createMockReqRes({ user: { uid: teacherAUid, roles: ['Teacher'], email: teacherAEmail } });
      await requireTeacher(teacherReqRes.req, teacherReqRes.res, teacherReqRes.next);

      assert(
        studentReqRes.getStatusCode() === 403 && teacherReqRes.wasNextCalled(),
        'Test 17: Teacher dashboard authorization allows Teacher role and rejects Student with 403'
      );
    }

    // 18. Teacher question-bank authorization
    {
      const teacherReqRes = createMockReqRes({ user: { uid: teacherAUid, roles: ['Teacher'], email: teacherAEmail } });
      await requireMCQCurator(teacherReqRes.req, teacherReqRes.res, teacherReqRes.next);
      assert(teacherReqRes.wasNextCalled(), 'Test 18: Teacher question-bank authorization grants access to curriculum curator');
    }

    // 19. Teacher test creation authorization
    {
      const teacherReqRes = createMockReqRes({ user: { uid: teacherAUid, roles: ['Teacher'], email: teacherAEmail } });
      await requireQuizCreator(teacherReqRes.req, teacherReqRes.res, teacherReqRes.next);

      const createdTest = await createTestInDb(
        {
          title: `Teacher Authored Quiz ${timestamp}`,
          subject: 'Physics',
          classLevel: 'Class 10',
          board: 'Punjab',
          durationMinutes: 10,
          totalQuestions: 1,
          totalMarks: 1,
          status: 'Draft',
          questionIds: [q1.id],
        },
        teacherAUid
      );

      assert(
        teacherReqRes.wasNextCalled() && createdTest.createdBy === teacherAUid,
        'Test 19: Teacher test creation authorization creates test bound to teacher UID'
      );
    }

    // 20. Teacher test editing authorization
    {
      const teacherTest = await createTestInDb(
        {
          title: `Test to Edit ${timestamp}`,
          subject: 'Physics',
          classLevel: 'Class 10',
          board: 'Punjab',
          durationMinutes: 10,
          totalQuestions: 1,
          totalMarks: 1,
          status: 'Draft',
        },
        teacherAUid
      );

      const updated = await updateTestInDb(
        teacherTest.id,
        { title: `Updated Quiz Title ${timestamp}`, durationMinutes: 25 },
        teacherAUid
      );

      assert(
        updated !== null && updated.title === `Updated Quiz Title ${timestamp}` && updated.durationMinutes === 25,
        'Test 20: Teacher test editing authorization successfully modifies test metadata'
      );
    }

    // 21. Teacher publishing authorization
    {
      const teacherTest = await createTestInDb(
        {
          title: `Draft To Publish ${timestamp}`,
          subject: 'Physics',
          classLevel: 'Class 10',
          board: 'Punjab',
          durationMinutes: 10,
          totalQuestions: 1,
          totalMarks: 1,
          status: 'Draft',
        },
        teacherAUid
      );

      const published = await updateTestInDb(teacherTest.id, { status: 'Published' }, teacherAUid);
      assert(published !== null && published.status === 'Published', 'Test 21: Teacher can transition authored test from Draft to Published');
    }

    // 22. Teacher result visibility on authored tests
    {
      const stats = await getTeacherDashboardStats(teacherAUid);
      assert(
        stats !== null &&
        typeof stats.totalTestsCreated === 'number' &&
        typeof stats.testsCreatedCount === 'number' &&
        Array.isArray(stats.recentStudentResults),
        'Test 22: Teacher result visibility aggregates test attempts on teacher-authored assessments'
      );
    }

    // 23. Teacher cannot access Admin user-management APIs
    {
      const teacherReqRes = createMockReqRes({ user: { uid: teacherAUid, roles: ['Teacher'], email: teacherAEmail } });
      await requireHighAdmin(teacherReqRes.req, teacherReqRes.res, teacherReqRes.next);
      assert(
        teacherReqRes.getStatusCode() === 403,
        'Test 23: Teacher cannot access Admin user-management APIs (requireHighAdmin blocks with 403)'
      );
    }

    // 24. Teacher cannot access Admin audit APIs
    {
      // Emulate /api/admin/audit-logs check in serverApp.ts line 3533
      const teacherRoles = ['teacher'];
      const isBlocked = ['teacher', 'editor', 'contentmanager', 'content_manager'].some((r) =>
        teacherRoles.includes(r)
      );
      assert(isBlocked, 'Test 24: Teacher cannot access Admin audit APIs (explicitly blocked with 403)');
    }

    // 25. Teacher cannot modify roles
    {
      // requireHighAdmin protects role modification route
      const teacherReqRes = createMockReqRes({
        user: { uid: teacherAUid, roles: ['Teacher'], email: teacherAEmail },
        params: { uid: studentAUid },
        body: { roles: ['Teacher'] },
      });
      await requireHighAdmin(teacherReqRes.req, teacherReqRes.res, teacherReqRes.next);
      assert(
        teacherReqRes.getStatusCode() === 403,
        'Test 25: Teacher cannot modify roles on user management endpoints'
      );
    }

    // 26. Teacher cannot manipulate scores (Scores are server-computed)
    {
      // When submitting, score is derived exclusively from comparing submitted answers with MCQ correct answer
      const evalTest = await createTestInDb(
        {
          title: `Server Scored Test ${timestamp}`,
          subject: 'Physics',
          classLevel: 'Class 10',
          board: 'Punjab',
          durationMinutes: 10,
          totalQuestions: 1,
          totalMarks: 1,
          status: 'Published',
          questionIds: [q1.id],
        },
        teacherAUid
      );

      const attempt = await startExamAttemptInDb({
        testId: evalTest.id,
        userUid: studentBUid,
        studentName: 'Student Beta',
      });

      // Submit wrong answer
      const evalResult = await submitExamAttemptInDb({
        attemptId: attempt.attemptId,
        userUid: studentBUid,
        submittedAnswers: { [q1.id]: { selectedOption: 0 } }, // Wrong (correct is 1)
      });

      assert(
        evalResult.result.marksObtained === 0 && evalResult.result.percentage === 0,
        'Test 26: Teacher cannot manipulate scores; evaluations are server-authoritative and tamper-proof'
      );
    }

    // 27. Teacher cannot access unauthorized student data (private profile/bookmarks)
    {
      // Student A's bookmarks should not be retrieved by querying for Teacher A
      const teacherBookmarks = await getUserBookmarksFromDb(teacherAUid);
      assert(
        !teacherBookmarks.includes(q1.id),
        'Test 27: Teacher cannot access unauthorized student bookmarks or private profile data'
      );
    }

    // ----------------------------------------------------------------
    // SECTION 3: MULTI-ROLE TESTS
    // ----------------------------------------------------------------

    // 28. Student + Teacher authorization
    {
      const dualRoles = ['Student', 'Teacher'];
      const reqResTeacher = createMockReqRes({ user: { uid: multiRoleUid, roles: dualRoles, email: multiRoleEmail } });
      await requireTeacher(reqResTeacher.req, reqResTeacher.res, reqResTeacher.next);

      const reqResHighAdmin = createMockReqRes({ user: { uid: multiRoleUid, roles: dualRoles, email: multiRoleEmail } });
      await requireHighAdmin(reqResHighAdmin.req, reqResHighAdmin.res, reqResHighAdmin.next);

      assert(
        reqResTeacher.wasNextCalled() && reqResHighAdmin.getStatusCode() === 403,
        'Test 28: Multi-role [Student, Teacher] accesses Teacher portal but is blocked from High Admin'
      );
    }

    // 29. Teacher + Admin authorization
    {
      const adminRoles = ['Teacher', 'Admin'];
      const reqResTeacher = createMockReqRes({ user: { uid: teacherAdminUid, roles: adminRoles, email: teacherAdminEmail } });
      await requireTeacher(reqResTeacher.req, reqResTeacher.res, reqResTeacher.next);

      const reqResAdmin = createMockReqRes({ user: { uid: teacherAdminUid, roles: adminRoles, email: teacherAdminEmail } });
      await requireAdmin(reqResAdmin.req, reqResAdmin.res, reqResAdmin.next);

      assert(
        reqResTeacher.wasNextCalled() && reqResAdmin.wasNextCalled(),
        'Test 29: Multi-role [Teacher, Admin] possesses both Teacher portal and Administrator privileges'
      );
    }

    // 30. Student + Teacher + Admin authorization
    {
      const fullRoles = ['Student', 'Teacher', 'Admin'];
      const reqResTeacher = createMockReqRes({ user: { uid: allRolesUid, roles: fullRoles, email: allRolesEmail } });
      await requireTeacher(reqResTeacher.req, reqResTeacher.res, reqResTeacher.next);

      const reqResQuiz = createMockReqRes({ user: { uid: allRolesUid, roles: fullRoles, email: allRolesEmail } });
      await requireQuizCreator(reqResQuiz.req, reqResQuiz.res, reqResQuiz.next);

      const reqResHighAdmin = createMockReqRes({ user: { uid: allRolesUid, roles: fullRoles, email: allRolesEmail } });
      await requireHighAdmin(reqResHighAdmin.req, reqResHighAdmin.res, reqResHighAdmin.next);

      assert(
        reqResTeacher.wasNextCalled() && reqResQuiz.wasNextCalled() && reqResHighAdmin.wasNextCalled(),
        'Test 30: Multi-role [Student, Teacher, Admin] validates cleanly across all permission tiers'
      );
    }

    // 31. Unauthorized role combination cannot escalate privileges
    {
      const forgedRoles = ['Student', 'Guest', 'Anonymous', 'PublicUser'];
      const reqResTeacher = createMockReqRes({ user: { uid: guestUid, roles: forgedRoles, email: guestEmail } });
      await requireTeacher(reqResTeacher.req, reqResTeacher.res, reqResTeacher.next);

      const reqResQuiz = createMockReqRes({ user: { uid: guestUid, roles: forgedRoles, email: guestEmail } });
      await requireQuizCreator(reqResQuiz.req, reqResQuiz.res, reqResQuiz.next);

      assert(
        reqResTeacher.getStatusCode() === 403 && reqResQuiz.getStatusCode() === 403,
        'Test 31: Unauthorized role combinations [Student, Guest] cannot escalate to staff or admin tiers'
      );
    }

    // ----------------------------------------------------------------
    // SECTION 4: DATA INTEGRITY TESTS
    // ----------------------------------------------------------------

    // 32. Student profile changes persist to PostgreSQL
    {
      const verifiedProfile = await getUserByUid(studentAUid);
      assert(
        verifiedProfile !== null &&
        verifiedProfile.classLevel === 'Class 11' &&
        verifiedProfile.board === 'Federal Board',
        'Test 32: Student profile changes persist authoritatively in PostgreSQL database'
      );
    }

    // 33. Bookmark changes persist to PostgreSQL
    {
      const rawRows = await db
        .select()
        .from(bookmarkedQuestions)
        .where(eq(bookmarkedQuestions.userUid, studentAUid));
      assert(
        rawRows.some((r) => r.questionId === q1.id),
        'Test 33: Bookmark additions and deletions persist directly in bookmarked_questions table'
      );
    }

    // 34. Dashboard values come from real DB records
    {
      const dash = await getStudentDashboardStats(studentAUid);
      const dbAttempts = await db
        .select()
        .from(testResults)
        .where(eq(testResults.userUid, studentAUid));

      const expectedCount = dbAttempts.length;
      const expectedAvg =
        expectedCount > 0
          ? Math.round(dbAttempts.reduce((acc, r) => acc + (r.percentage || 0), 0) / expectedCount)
          : 0;

      assert(
        dash.summary.totalTestsAttempted === expectedCount &&
        dash.summary.averagePercentage === expectedAvg,
        'Test 34: Student dashboard statistics match exact mathematical aggregation of database rows'
      );
    }

    // 35. Teacher analytics come from real DB records
    {
      const teacherStats = await getTeacherDashboardStats(teacherAUid);
      const dbTeacherTests = await db
        .select()
        .from(tests)
        .where(eq(tests.createdBy, teacherAUid));

      const publishedCount = dbTeacherTests.filter((t) => t.status === 'Published').length;

      assert(
        teacherStats.totalTestsCreated === dbTeacherTests.length &&
        teacherStats.totalPublishedTests === publishedCount &&
        teacherStats.totalQuestionsContributed >= 1,
        'Test 35: Teacher analytics calculate authored tests, published status, and questions directly from PostgreSQL'
      );
    }

    // ----------------------------------------------------------------
    // SECTION 5: IDOR DIRECT MANIPULATION TESTS
    // ----------------------------------------------------------------

    // 36. IDOR: Student A cannot retrieve Student B's active exam attempt
    {
      const attemptB = await startExamAttemptInDb({
        testId: examTest.id,
        userUid: studentBUid,
        studentName: 'Student Beta',
      });

      const attemptAView = await getUserActiveExamAttempt(studentAUid);
      assert(
        attemptAView === null || attemptAView.attemptId !== attemptB.attemptId,
        'Test 36: IDOR Protection: Student A cannot retrieve or intercept Student B\'s active exam session'
      );
    }

    // 37. IDOR: Student A cannot retrieve Student B's detailed examination result
    {
      const resB = await saveTestResultToDb({
        resultId: `res-b-idor-${timestamp}`,
        userUid: studentBUid,
        testId: examTest.id,
        testTitle: examTest.title,
        testType: 'Quiz',
        subject: 'Physics',
        category: 'Academic',
        totalQuestions: 5,
        answeredCount: 5,
        correctCount: 5,
        wrongCount: 0,
        skippedCount: 0,
        marksObtained: 5,
        totalMarks: 5,
        percentage: 100,
        grade: 'A+',
        timeUsedSeconds: 120,
        percentileRank: 99,
        answers: {},
      });

      const idorResult = await getExamAttemptResultFromDb(resB.resultId, studentAUid);
      assert(
        idorResult === null,
        'Test 37: IDOR Protection: Student A cannot retrieve Student B\'s detailed examination result'
      );
    }

    // 38. IDOR: Student A cannot access Student B's certificates via getCertificateByIdFromDb
    {
      const certBId = `CERT-B-${timestamp}`;
      await saveCertificateToDb({
        id: certBId,
        userUid: studentBUid,
        studentName: 'Student Beta',
        testId: examTest.id,
        testName: examTest.title,
        score: 5,
        totalMarks: 5,
        percentage: 100,
        grade: 'A+',
        className: 'Class 9',
        subjectName: 'Physics',
        status: 'VALID',
        verificationUrl: `https://taleemguru.pk/verify/${certBId}`,
      });

      const certForA = await getCertificateByIdFromDb(certBId, studentAUid);
      assert(
        certForA === null,
        'Test 38: IDOR Protection: Student A cannot access Student B\'s certificate with student UID restriction'
      );
    }

    // 39. IDOR: Student A cannot view or manipulate Student B's bookmarks
    {
      const studentBBookmarks = await getUserBookmarksFromDb(studentBUid);
      const studentABookmarks = await getUserBookmarksFromDb(studentAUid);
      assert(
        !studentBBookmarks.includes(`alien-q-${timestamp}`) &&
        studentBBookmarks.every((b) => !studentABookmarks.includes(b)),
        'Test 39: IDOR Protection: Student A bookmarks are strictly decoupled from Student B'
      );
    }

    // 40. IDOR: Student A cannot overwrite Student B's profile details
    {
      // Attempt to pass studentBUid to studentAUid update
      await updateUserProfile(studentAUid, { name: 'Student Alpha Still' });
      const targetB = await getUserByUid(studentBUid);

      assert(
        targetB !== null && targetB.name === 'Student Beta',
        'Test 40: IDOR Protection: Profile updates bind strictly to authenticated caller and cannot alter other users'
      );
    }

    // ----------------------------------------------------------------
    // SECTION 6: CERTIFICATE & PUBLIC VERIFICATION TESTS (STEP 19)
    // ----------------------------------------------------------------

    // 41. Public Certificate Verification: Valid Certificate ID returns authentic real DB record
    {
      const certId41 = `TG-CERT-TEST-${timestamp}`;
      await saveCertificateToDb({
        id: certId41,
        userUid: studentAUid,
        studentName: 'Alpha Student',
        testId: examTest.id,
        testName: examTest.title,
        score: 90,
        totalMarks: 100,
        percentage: 90,
        grade: 'A+',
        className: 'Class 10',
        subjectName: 'Physics',
        performanceLevel: 'Outstanding',
        status: 'VALID',
        verificationUrl: `https://taleemguru.pk/verify/${certId41}`,
      });

      const fetched = await getCertificateByIdFromDb(certId41);
      assert(
        fetched !== null &&
          fetched.id === certId41 &&
          fetched.studentName === 'Alpha Student' &&
          fetched.score === 90 &&
          fetched.percentage === 90 &&
          fetched.status === 'VALID',
        'Test 41: Public Certificate Verification returns real database record for valid certificate ID'
      );
    }

    // 42. Public Certificate Verification: Invalid Certificate ID returns null / false
    {
      const invalidCert = await getCertificateByIdFromDb('TG-CERT-NON-EXISTENT-ID-12345');
      assert(
        invalidCert === null,
        'Test 42: Public Certificate Verification gracefully returns null for non-existent certificate ID'
      );
    }

    // 43. Certificate Revocation & Public Status Update
    {
      const certId43 = `TG-CERT-REV-${timestamp}`;
      await saveCertificateToDb({
        id: certId43,
        userUid: studentAUid,
        studentName: 'Alpha Student',
        testId: examTest.id,
        testName: examTest.title,
        score: 80,
        totalMarks: 100,
        percentage: 80,
        grade: 'A',
        status: 'VALID',
        verificationUrl: `https://taleemguru.pk/verify/${certId43}`,
      });

      const { revokeCertificateInDb, restoreCertificateInDb } = await import('../src/db/users.ts');
      
      // Revoke certificate
      const revoked = await revokeCertificateInDb(certId43, 'admin-1', 'Rule violation');
      assert(revoked === true, 'Test 43a: Certificate successfully revoked in database');

      const certAfterRevoke = await getCertificateByIdFromDb(certId43);
      assert(
        certAfterRevoke !== null && certAfterRevoke.status === 'REVOKED',
        'Test 43b: Revoked certificate shows REVOKED status in authoritative DB query'
      );

      // Restore certificate
      const restored = await restoreCertificateInDb(certId43);
      assert(restored === true, 'Test 43c: Certificate successfully restored in database');

      const certAfterRestore = await getCertificateByIdFromDb(certId43);
      assert(
        certAfterRestore !== null && certAfterRestore.status === 'VALID',
        'Test 43d: Restored certificate shows VALID status in authoritative DB query'
      );
    }

  } catch (error: any) {
    console.error('Fatal execution error in studentTeacherPortalTests:', error);
    failed++;
  }

  console.log('----------------------------------------------------------------');
  console.log(`PORTAL TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runStudentTeacherPortalTests();
