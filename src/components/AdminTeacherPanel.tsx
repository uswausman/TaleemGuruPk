import React, { useState, useEffect } from 'react';
import { MCQ, TestConfig, PastPaper, StudyNote, AdminUser, TestResult } from '../types';
import { AdminLoginPortal } from './AdminLoginPortal';
import { AdminSidebar, AdminTabType } from './admin/AdminSidebar';
import { AdminHeader } from './admin/AdminHeader';
import { AdminDashboardTab } from './admin/AdminDashboardTab';
import { AdminQuestionsTab } from './admin/AdminQuestionsTab';
import { AdminQuizzesTab } from './admin/AdminQuizzesTab';
import { AdminStudentsTab } from './admin/AdminStudentsTab';
import { AdminStaffTab } from './admin/AdminStaffTab';
import { AdminAcademicTabs } from './admin/AdminAcademicTabs';
import { AdminContentTabs } from './admin/AdminContentTabs';
import { AdminResultsAndReportsTabs } from './admin/AdminResultsAndReportsTabs';
import { AdminReportsTab } from './admin/AdminReportsTab';
import { AdminAuditLogsTab } from './admin/AdminAuditLogsTab';
import { AdminCertificatesTab } from './AdminCertificatesTab';
import { AdminSettingsTab } from './admin/AdminSettingsTab';
import { BulkImportSection } from './BulkImportSection';
import { exportMCQsToWatermarkedPDF } from '../utils/watermark';
import {
  fetchAdminUsersApi,
  fetchAdminTestResultsApi,
  recordAdminAuditLogApi,
} from '../lib/api';
import { useToast } from './ui/Toast';
import { checkDuplicateMCQ, checkDuplicateTest } from '../utils/duplicateDetector';

export type AdminTab = AdminTabType;

interface AdminTeacherPanelProps {
  allMCQs: MCQ[];
  allTests?: TestConfig[];
  allPastPapers?: PastPaper[];
  allStudyNotes?: StudyNote[];
  historyResults?: TestResult[];
  adminUser?: AdminUser | null;
  onAdminLogin?: (admin: AdminUser) => void;
  onAdminLogout?: () => void;
  onBackToHome?: () => void;
  onAddMCQ: (newMCQ: MCQ) => void;
  onUpdateMCQ?: (updatedMCQ: MCQ) => void;
  onDeleteMCQ: (id: string) => void;
  onCreateCustomTest: (test: TestConfig) => void;
  onUpdateCustomTest?: (test: TestConfig) => void;
  onDeleteCustomTest?: (id: string) => void;
  onBulkImportMCQs?: (mcqs: MCQ[], replace?: boolean) => void;
  onBulkImportTests?: (tests: TestConfig[], replace?: boolean) => void;
  onBulkImportPastPapers?: (papers: PastPaper[], replace?: boolean) => void;
  onBulkImportStudyNotes?: (notes: StudyNote[], replace?: boolean) => void;
  onBulkImportBundle?: (
    bundle: { mcqs?: MCQ[]; tests?: TestConfig[]; pastPapers?: PastPaper[]; studyNotes?: StudyNote[] },
    replace?: boolean
  ) => void;
  onNavigateTab?: (tab: string) => void;
  initialTab?: AdminTab;
}

export const AdminTeacherPanel: React.FC<AdminTeacherPanelProps> = ({
  allMCQs,
  allTests = [],
  allPastPapers = [],
  allStudyNotes = [],
  historyResults: propHistoryResults = [],
  adminUser = null,
  onAdminLogin = () => {},
  onAdminLogout = () => {},
  onBackToHome,
  onAddMCQ,
  onUpdateMCQ,
  onDeleteMCQ,
  onCreateCustomTest,
  onUpdateCustomTest,
  onDeleteCustomTest,
  onBulkImportMCQs = (_mcqs: MCQ[], _replace?: boolean) => {},
  onBulkImportTests = (_tests: TestConfig[], _replace?: boolean) => {},
  onBulkImportPastPapers = (_papers: PastPaper[], _replace?: boolean) => {},
  onBulkImportStudyNotes = (_notes: StudyNote[], _replace?: boolean) => {},
  onBulkImportBundle = (_bundle: any, _replace?: boolean) => {},
  onNavigateTab,
  initialTab = 'dashboard',
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabType>(initialTab || 'dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { showToast } = useToast();

  // State for registered students & users loaded authoritatively from database (No mock users)
  const [studentsList, setStudentsList] = useState<AdminUser[]>([]);
  const [submissionsList, setSubmissionsList] = useState<TestResult[]>(propHistoryResults);

  // Authoritatively load registered users & test submissions from Cloud SQL backend
  const loadDatabaseUsersAndResults = () => {
    if (!adminUser) return;
    fetchAdminUsersApi()
      .then((dbUsers) => {
        if (Array.isArray(dbUsers)) {
          const mappedUsers: AdminUser[] = dbUsers.map((u: any) => ({
            id: u.uid || String(u.id),
            name: u.name || 'Learner',
            email: u.email,
            roles: (u.roles || []).length > 0 ? u.roles : ['Student'],
            classLevel: u.classLevel || 'Class 10',
            board: u.board || 'BISE Lahore',
            status: 'Active',
            testsCompleted: u.testsTaken || 0,
            points: u.points || 0,
            joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : 'Recent',
          }));
          setStudentsList(mappedUsers);
        }
      })
      .catch((err) => {
        console.warn('Notice: Unable to load registered database users:', err);
      });

    fetchAdminTestResultsApi()
      .then((dbResults) => {
        if (Array.isArray(dbResults) && dbResults.length > 0) {
          const mappedResults: TestResult[] = dbResults.map((r: any) => ({
            id: r.submissionId || String(r.id),
            testId: r.testId || 'test-1',
            testTitle: r.testTitle || 'Board Practice Exam',
            testType: 'Practice Test',
            category: 'Board Practice',
            subject: r.subject || 'General Science',
            totalQuestions: r.totalQuestions || 10,
            answeredCount: (r.correctAnswers || 0) + (r.wrongAnswers || 0),
            marksObtained: r.score || 0,
            totalMarks: r.totalMarks || 10,
            percentage: r.percentage || 0,
            correctCount: r.correctAnswers || 0,
            wrongCount: r.wrongAnswers || 0,
            skippedCount: 0,
            timeUsedSeconds: r.timeSpentSeconds || 600,
            totalDurationSeconds: 900,
            percentileRank: 85,
            answers: [],
            questions: [],
            timestamp: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
            userEmail: r.userEmail || 'Anonymous Student',
            grade: r.percentage >= 80 ? 'A+' : r.percentage >= 70 ? 'A' : r.percentage >= 60 ? 'B' : r.percentage >= 50 ? 'C' : 'F',
          }));
          setSubmissionsList(mappedResults);
        }
      })
      .catch((err) => {
        console.warn('Notice: Unable to load database test submissions:', err);
      });
  };

  useEffect(() => {
    loadDatabaseUsersAndResults();
  }, [adminUser?.id, adminUser?.role]);

  const [quizzesList, setQuizzesList] = useState<TestConfig[]>(allTests);
  const [questionsList, setQuestionsList] = useState<MCQ[]>(allMCQs);
  const [pastPapersList, setPastPapersList] = useState<PastPaper[]>(allPastPapers);
  const [studyNotesList, setStudyNotesList] = useState<StudyNote[]>(allStudyNotes);

  // Sync with prop updates
  useEffect(() => {
    setQuestionsList(allMCQs);
  }, [allMCQs]);

  useEffect(() => {
    setQuizzesList(allTests);
  }, [allTests]);

  useEffect(() => {
    setPastPapersList(allPastPapers);
  }, [allPastPapers]);

  useEffect(() => {
    setStudyNotesList(allStudyNotes);
  }, [allStudyNotes]);

  useEffect(() => {
    if (propHistoryResults.length > 0 && submissionsList.length === 0) {
      setSubmissionsList(propHistoryResults);
    }
  }, [propHistoryResults, submissionsList.length]);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, activeTab]);

  // Tab navigation handler
  const handleTabChange = (tab: AdminTabType) => {
    setActiveTab(tab);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Questions Handlers
  const handleAddQuestion = (newQ: MCQ) => {
    const dup = checkDuplicateMCQ(
      newQ.question,
      newQ.subject,
      newQ.classLevel,
      newQ.board,
      undefined,
      questionsList
    );
    if (dup.isDuplicate) {
      showToast({
        type: 'error',
        title: 'Submission Blocked: Duplicate MCQ',
        message: dup.reason,
        duration: 5000,
      });
      return;
    }

    setQuestionsList((prev) => [newQ, ...prev]);
    onAddMCQ(newQ);
    recordAdminAuditLogApi({
      action: 'CREATE_MCQ',
      targetType: 'mcq',
      targetId: newQ.id,
      details: `${newQ.subject} (${newQ.classLevel}): ${newQ.question.slice(0, 80)}`,
    }).catch(() => {});
  };

  const handleUpdateQuestion = (updatedQ: MCQ) => {
    setQuestionsList((prev) =>
      prev.map((q) => (q.id === updatedQ.id ? updatedQ : q))
    );
    if (onUpdateMCQ) {
      onUpdateMCQ(updatedQ);
    }
    recordAdminAuditLogApi({
      action: 'UPDATE_MCQ',
      targetType: 'mcq',
      targetId: updatedQ.id,
      details: `Updated MCQ in ${updatedQ.subject}`,
    }).catch(() => {});
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestionsList((prev) => prev.filter((q) => q.id !== id));
    onDeleteMCQ(id);
    recordAdminAuditLogApi({
      action: 'DELETE_MCQ',
      targetType: 'mcq',
      targetId: id,
      details: 'Deleted question from question bank',
    }).catch(() => {});
  };

  // Quizzes Handlers
  const handleCreateQuiz = (newQuiz: TestConfig) => {
    const dup = checkDuplicateTest(
      newQuiz.title,
      newQuiz.subject,
      newQuiz.classLevel,
      newQuiz.board,
      undefined,
      quizzesList
    );
    if (dup.isDuplicate) {
      showToast({
        type: 'error',
        title: 'Submission Blocked: Duplicate Quiz Title',
        message: dup.reason,
        duration: 5000,
      });
      return;
    }

    setQuizzesList((prev) => [newQuiz, ...prev]);
    onCreateCustomTest(newQuiz);
    recordAdminAuditLogApi({
      action: 'CREATE_QUIZ',
      targetType: 'quiz',
      targetId: newQuiz.id,
      details: `Created assessment: ${newQuiz.title} (${newQuiz.subject})`,
    }).catch(() => {});
  };

  const handleUpdateQuiz = (updatedQuiz: TestConfig) => {
    setQuizzesList((prev) =>
      prev.map((q) => (q.id === updatedQuiz.id ? updatedQuiz : q))
    );
    if (onUpdateCustomTest) {
      onUpdateCustomTest(updatedQuiz);
    }
    recordAdminAuditLogApi({
      action: 'UPDATE_QUIZ',
      targetType: 'quiz',
      targetId: updatedQuiz.id,
      details: `Updated quiz: ${updatedQuiz.title}`,
    }).catch(() => {});
  };

  const handleDeleteQuiz = (id: string) => {
    setQuizzesList((prev) => prev.filter((q) => q.id !== id));
    if (onDeleteCustomTest) {
      onDeleteCustomTest(id);
    }
    recordAdminAuditLogApi({
      action: 'DELETE_QUIZ',
      targetType: 'quiz',
      targetId: id,
      details: 'Deleted test configuration',
    }).catch(() => {});
  };

  // Students Handlers
  const handleUpdateStudent = (updatedStudent: AdminUser) => {
    setStudentsList((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
    recordAdminAuditLogApi({
      action: 'UPDATE_USER_STATUS',
      targetType: 'user',
      targetId: updatedStudent.id,
      details: `Set status to ${updatedStudent.status} for ${updatedStudent.email}`,
    }).catch(() => {});
  };

  // Past Papers Handlers
  const handleAddPastPaper = (paper: PastPaper) => {
    setPastPapersList((prev) => [paper, ...prev]);
    if (onBulkImportPastPapers) {
      onBulkImportPastPapers([paper]);
    }
    recordAdminAuditLogApi({
      action: 'CREATE_PAST_PAPER',
      targetType: 'past_paper',
      targetId: paper.id,
      details: `Added past paper: ${paper.title} (${paper.board} ${paper.year})`,
    }).catch(() => {});
  };

  const handleUpdatePastPaper = (updatedPaper: PastPaper) => {
    setPastPapersList((prev) =>
      prev.map((p) => (p.id === updatedPaper.id ? updatedPaper : p))
    );
  };

  const handleDeletePastPaper = (id: string) => {
    setPastPapersList((prev) => prev.filter((p) => p.id !== id));
    recordAdminAuditLogApi({
      action: 'DELETE_PAST_PAPER',
      targetType: 'past_paper',
      targetId: id,
      details: 'Deleted past paper record',
    }).catch(() => {});
  };

  // Study Notes Handlers
  const handleAddNote = (note: StudyNote) => {
    setStudyNotesList((prev) => [note, ...prev]);
    if (onBulkImportStudyNotes) {
      onBulkImportStudyNotes([note]);
    }
    recordAdminAuditLogApi({
      action: 'CREATE_NOTE',
      targetType: 'note',
      targetId: note.id,
      details: `Added revision note: ${note.title} (${note.subject})`,
    }).catch(() => {});
  };

  const handleUpdateNote = (updatedNote: StudyNote) => {
    setStudyNotesList((prev) =>
      prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
    );
  };

  const handleDeleteNote = (id: string) => {
    setStudyNotesList((prev) => prev.filter((n) => n.id !== id));
    recordAdminAuditLogApi({
      action: 'DELETE_NOTE',
      targetType: 'note',
      targetId: id,
      details: 'Deleted study note record',
    }).catch(() => {});
  };

  // Bulk Import Handlers (Wrapped)
  const handleBulkImportMCQsAction = (imported: MCQ[], replace?: boolean) => {
    setQuestionsList((prev) => (replace ? imported : [...imported, ...prev]));
    onBulkImportMCQs?.(imported, replace);
  };
  const handleBulkImportTestsAction = (imported: TestConfig[], replace?: boolean) => {
    setQuizzesList((prev) => (replace ? imported : [...imported, ...prev]));
    onBulkImportTests?.(imported, replace);
  };
  const handleBulkImportPastPapersAction = (imported: PastPaper[], replace?: boolean) => {
    setPastPapersList((prev) => (replace ? imported : [...imported, ...prev]));
    onBulkImportPastPapers?.(imported, replace);
  };
  const handleBulkImportStudyNotesAction = (imported: StudyNote[], replace?: boolean) => {
    setStudyNotesList((prev) => (replace ? imported : [...imported, ...prev]));
    onBulkImportStudyNotes?.(imported, replace);
  };
  const handleBulkImportBundleAction = (bundle: any, replace?: boolean) => {
    if (bundle.mcqs) setQuestionsList((prev) => (replace ? bundle.mcqs : [...bundle.mcqs, ...prev]));
    if (bundle.tests) setQuizzesList((prev) => (replace ? bundle.tests : [...bundle.tests, ...prev]));
    if (bundle.pastPapers) setPastPapersList((prev) => (replace ? bundle.pastPapers : [...bundle.pastPapers, ...prev]));
    if (bundle.studyNotes) setStudyNotesList((prev) => (replace ? bundle.studyNotes : [...bundle.studyNotes, ...prev]));
    onBulkImportBundle?.(bundle, replace);
  };

  // Watermark PDF Export
  const handleExportPDF = (filteredQuestions?: MCQ[]) => {
    const listToExport = filteredQuestions && filteredQuestions.length > 0 ? filteredQuestions : questionsList;
    exportMCQsToWatermarkedPDF(
      'Taleem Guru - Question Bank Export',
      'Class 9-12 / MDCAT / ECAT Board Exam Material',
      listToExport
    );
  };

  // Counts for sidebar badges
  const staffMembersCount = studentsList.filter((u) =>
    ['Admin', 'Teacher', 'Editor', 'ContentManager', 'Moderator', 'SuperAdmin'].includes(u.role)
  ).length;

  const counts = {
    staff: staffMembersCount,
    students: studentsList.length,
    boards: 30,
    classes: 6,
    subjects: 12,
    chapters: 54,
    questions: questionsList.length,
    quizzes: quizzesList.length,
    notes: studyNotesList.length,
    pastPapers: pastPapersList.length,
    results: submissionsList.length,
    leaderboard: 50,
    reports: 0,
  };

  // If not logged in as Admin, show login portal
  if (!adminUser) {
    return (
      <AdminLoginPortal
        onLoginSuccess={onAdminLogin}
        onBackToHome={onBackToHome}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 flex flex-col">
      {/* Top Header */}
      <AdminHeader
        activeTabTitle={activeTab}
        adminUser={adminUser}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onQuickAction={(action) => {
          if (action === 'add-question') handleTabChange('questions');
          else if (action === 'create-quiz') handleTabChange('quizzes');
          else if (action === 'add-note') handleTabChange('notes');
        }}
        onLogout={onAdminLogout}
        onBackToHome={onBackToHome}
      />

      {/* Main Admin Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Responsive Sidebar */}
        <AdminSidebar
          activeTab={activeTab}
          onSelectTab={handleTabChange}
          counts={counts}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Content View Container */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <AdminDashboardTab
              adminUser={adminUser}
              allQuestions={questionsList}
              allQuizzes={quizzesList}
              allStudents={studentsList}
              allPastPapers={pastPapersList}
              allStudyNotes={studyNotesList}
              historyResults={submissionsList}
              onNavigateTab={handleTabChange}
            />
          )}

          {activeTab === 'questions' && (
            <AdminQuestionsTab
              questions={questionsList}
              onAddQuestion={handleAddQuestion}
              onUpdateQuestion={handleUpdateQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onExportPDF={handleExportPDF}
            />
          )}

          {activeTab === 'quizzes' && (
            <AdminQuizzesTab
              quizzes={quizzesList}
              allQuestions={questionsList}
              onCreateQuiz={handleCreateQuiz}
              onUpdateQuiz={handleUpdateQuiz}
              onDeleteQuiz={handleDeleteQuiz}
              onPreviewQuiz={(q) => onCreateCustomTest(q)}
            />
          )}

          {activeTab === 'staff' && (
            <AdminStaffTab
              students={studentsList}
              adminUser={adminUser}
              onUpdateStudent={handleUpdateStudent}
              onAddStudent={(newStaff) => setStudentsList((prev) => [newStaff, ...prev])}
              onRefresh={loadDatabaseUsersAndResults}
            />
          )}

          {activeTab === 'students' && (
            <AdminStudentsTab
              students={studentsList}
              historyResults={submissionsList}
              onUpdateStudent={handleUpdateStudent}
              onRefresh={loadDatabaseUsersAndResults}
            />
          )}

          {activeTab === 'boards' && (
            <AdminAcademicTabs
              type="boards"
              allMCQs={questionsList}
              allTests={quizzesList}
            />
          )}

          {activeTab === 'classes' && (
            <AdminAcademicTabs
              type="classes"
              allMCQs={questionsList}
              allTests={quizzesList}
            />
          )}

          {activeTab === 'subjects' && (
            <AdminAcademicTabs
              type="subjects"
              allMCQs={questionsList}
              allTests={quizzesList}
            />
          )}

          {activeTab === 'chapters' && (
            <AdminAcademicTabs
              type="chapters"
              allMCQs={questionsList}
              allTests={quizzesList}
            />
          )}

          {activeTab === 'notes' && (
            <AdminContentTabs
              type="notes"
              notes={studyNotesList}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
            />
          )}

          {activeTab === 'past-papers' && (
            <AdminContentTabs
              type="past-papers"
              pastPapers={pastPapersList}
              onAddPastPaper={handleAddPastPaper}
              onUpdatePastPaper={handleUpdatePastPaper}
              onDeletePastPaper={handleDeletePastPaper}
            />
          )}

          {activeTab === 'results' && (
            <AdminResultsAndReportsTabs
              type="results"
              results={submissionsList}
              allQuestions={questionsList}
            />
          )}

          {activeTab === 'leaderboard' && (
            <AdminResultsAndReportsTabs
              type="leaderboard"
              results={submissionsList}
              allQuestions={questionsList}
            />
          )}

          {activeTab === 'reports' && (
            <AdminReportsTab
              onNavigateToQuestion={() => handleTabChange('questions')}
              onNavigateToTest={() => handleTabChange('quizzes')}
            />
          )}
          
          {activeTab === 'certificates' && <AdminCertificatesTab />}

          {activeTab === 'bulk-import' && (
            <BulkImportSection
              allMCQs={questionsList}
              allTests={quizzesList}
              allPastPapers={pastPapersList}
              allStudyNotes={studyNotesList}
              onBulkImportMCQs={handleBulkImportMCQsAction}
              onBulkImportTests={handleBulkImportTestsAction}
              onBulkImportPastPapers={handleBulkImportPastPapersAction}
              onBulkImportStudyNotes={handleBulkImportStudyNotesAction}
              onBulkImportBundle={handleBulkImportBundleAction}
              onNavigateTab={handleTabChange}
            />
          )}

          {activeTab === 'audit-logs' && (
            <AdminAuditLogsTab />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsTab
              allMCQs={questionsList}
              allTests={quizzesList}
              adminUser={adminUser}
            />
          )}
        </main>
      </div>
    </div>
  );
};
