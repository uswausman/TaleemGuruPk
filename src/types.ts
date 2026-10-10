export type UserRole = 'student' | 'admin' | 'teacher' | 'editor' | 'staff';

export type ViewMode =
  | 'home'
  | 'boards'
  | 'classes'
  | 'subjects'
  | 'mcqs'
  | 'tests'
  | 'test-session'
  | 'quizzes'
  | 'quiz-session'
  | 'past-papers'
  | 'notes'
  | 'study-material'
  | 'syllabus'
  | 'entry-tests'
  | 'competitive-exams'
  | 'armed-forces'
  | 'results'
  | 'leaderboard'
  | 'student-dashboard'
  | 'daily-challenge'
  | 'video-learning'
  | 'current-affairs'
  | 'english-learning'
  | 'iq-intelligence'
  | 'certificates'
  | 'verify-certificate'
  | 'admin-panel'
  | 'teacher-panel'
  | 'access-denied'
  | 'privacy-policy'
  | 'terms-of-service'
  | 'auth-callback'
  | 'search'
  | 'not-found';

export type SearchContentType =
  | 'all'
  | 'mcqs'
  | 'tests'
  | 'past_papers'
  | 'study_notes'
  | 'documents'
  | 'boards'
  | 'classes'
  | 'subjects'
  | 'chapters'
  | 'curriculum';

export interface UnifiedSearchResultItem {
  id: string;
  type: 'mcq' | 'test' | 'past_paper' | 'study_note' | 'document' | 'board' | 'class' | 'subject' | 'chapter';
  title: string;
  subtitle?: string;
  description?: string;
  subject?: string;
  classLevel?: string;
  board?: string;
  chapter?: string;
  topic?: string;
  year?: number;
  status: ContentStatus;
  url?: string;
  badge?: string;
  difficulty?: string;
  score?: number;
  meta?: Record<string, any>;
}

export interface UnifiedSearchFilters {
  query?: string;
  type?: SearchContentType;
  board?: string;
  classLevel?: string;
  subject?: string;
  chapter?: string;
  year?: number;
  status?: string;
  page?: number;
  limit?: number;
}

export interface UnifiedSearchResponse {
  results: UnifiedSearchResultItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  countsByCategory: Record<string, number>;
  suggestions?: string[];
  query: string;
  appliedFilters: {
    type?: string;
    board?: string;
    classLevel?: string;
    subject?: string;
    chapter?: string;
    year?: number;
    status?: string;
  };
}

export interface RouteAuthResult {
  isAllowed: boolean;
  status: 'AUTHORIZED' | 'UNAUTHENTICATED' | 'FORBIDDEN';
  path: string;
  requiredRoles: UserRole[];
  currentRole: UserRole | null;
  message?: string;
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type ContentStatus = 'Draft' | 'Pending Review' | 'Approved' | 'Published' | 'Rejected' | 'Archived';

export interface MCQ {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // 0-3 index
  explanation: string;
  subject: string;
  chapter?: string;
  topic?: string;
  difficulty: Difficulty;
  classLevel?: string;
  board?: string;
  exam?: string;
  year?: number;
  tags: string[];
  language?: 'English' | 'Urdu';
  status?: ContentStatus;
  submittedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  changeNotes?: string;
  version?: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
}

export type TestType =
  | 'Chapter Test'
  | 'Subject Test'
  | 'Full Book Test'
  | 'Full Syllabus Test'
  | 'Board Test'
  | 'Mock Test'
  | 'Entry Test'
  | 'Competitive Exam Test'
  | 'Daily Test'
  | 'Practice Test';

export interface TestConfig {
  id: string;
  title: string;
  description: string;
  testType: TestType;
  category: string;
  subject: string;
  chapter?: string;
  classLevel?: string;
  board?: string;
  exam?: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  negativeMarking: boolean; // e.g., -0.25 per wrong answer
  negativeMarkValue?: number;
  passPercentage: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  allowRetake?: boolean;
  maxAttempts?: number;
  reviewPolicy?: 'immediate' | 'after_submission' | 'none';
  questions: MCQ[];
  questionIds?: string[];
  isPremium?: boolean;
  status?: ContentStatus;
  submittedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  changeNotes?: string;
  version?: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
}

export interface ExamAttempt {
  attemptId: string;
  testId: string;
  testTitle: string;
  userUid: string;
  studentName?: string;
  studentEmail?: string;
  startedAt: string;
  expiresAt: string;
  submittedAt?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'ABANDONED';
  questionOrder: string[];
  answers: Record<string, { selectedOption: number | null; markedForReview?: boolean; timeSpentSeconds?: number; savedAt?: string }>;
  score?: number;
  totalMarks?: number;
  percentage?: number;
  passed?: boolean;
  grade?: string;
  correctCount?: number;
  wrongCount?: number;
  unansweredCount?: number;
  timeSpentSeconds?: number;
  reviewPolicy?: string;
}

export interface SafeExamQuestion {
  id: string;
  question: string;
  options: string[];
  subject: string;
  chapter?: string;
  topic?: string;
  difficulty: Difficulty;
  classLevel?: string;
  board?: string;
  year?: number;
}

export interface ExamStartResponse {
  success: boolean;
  attemptId: string;
  candidateSessionId?: string;
  test: {
    id: string;
    title: string;
    description: string;
    testType: TestType;
    category: string;
    subject: string;
    chapter?: string;
    classLevel?: string;
    board?: string;
    durationMinutes: number;
    totalQuestions: number;
    totalMarks: number;
    negativeMarking: boolean;
    negativeMarkValue?: number;
    passPercentage: number;
    reviewPolicy: string;
    questions: SafeExamQuestion[];
  };
  startedAt: string;
  expiresAt: string;
  timeRemainingSeconds: number;
  existingAnswers?: Record<string, { selectedOption: number | null; markedForReview?: boolean; timeSpentSeconds?: number }>;
}

export interface UserAnswer {
  questionId: string;
  selectedOption: number | null; // index 0-3, or null
  markedForReview: boolean;
  timeSpentSeconds: number;
}

export interface TestResult {
  id: string;
  testId: string;
  testTitle: string;
  testType: TestType;
  subject: string;
  category: string;
  timestamp: string;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  timeUsedSeconds: number;
  totalDurationSeconds: number;
  percentileRank: number;
  answers: UserAnswer[];
  questions: MCQ[];
  userId?: string;
  userEmail?: string;
}

export interface BoardInfo {
  id: string;
  name: string;
  code: string;
  province: 'Punjab' | 'Sindh' | 'KPK' | 'Balochistan' | 'Federal' | 'AJK';
  city: string;
  established: string;
  description: string;
  totalPastPapers: number;
  totalTests: number;
  website?: string;
  supportedClasses?: string[];
}

export interface AcademicClassInfo {
  id: string;
  name: string;
  shortCode: string; // '9th', '10th', '11th', '12th', 'MDCAT', 'ECAT'
  level: 'Matric' | 'Intermediate' | 'Entry Test' | 'Higher Education';
  description: string;
  badge: string;
  availableSubjectIds: string[];
}

export interface AcademicSubjectInfo {
  id: string;
  name: string;
  category: 'Science' | 'Arts & Languages' | 'Compulsory' | 'Technology';
  icon: string;
  accentColor: string;
  description: string;
  applicableClasses: string[];
  applicableBoards: string[]; // Board IDs or ['All']
  chaptersCount?: number;
  mcqsCount?: number;
  testsCount?: number;
}

export interface TopicInfo {
  id: string;
  chapterId: string;
  topicNumber: string;
  title: string;
  description?: string;
  keyPoints?: string[];
  important?: boolean;
}

export interface ChapterInfo {
  id: string;
  subjectId: string;
  subjectName: string;
  classLevel: string;
  boardId?: string; // 'all' or specific board ID
  chapterNumber: number;
  name: string;
  description?: string;
  topics: TopicInfo[];
}

export type StaffRole = 'Student' | 'Teacher' | 'Staff' | 'Admin' | 'Editor' | 'ContentManager' | 'Moderator' | 'SuperAdmin';

export interface StaffAssignment {
  id?: number;
  userUid: string;
  role: string;
  board: string;
  classLevel: string;
  subject: string;
  contentTypes?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUser {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role?: StaffRole | string;
  roles: StaffRole[];
  classLevel?: string;
  board?: string;
  subject?: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  testsCompleted: number;
  points: number;
  joinedDate: string;
  permissions?: string[];
  assignments?: StaffAssignment[];
  lastLogin?: string;
  createdAt?: string;
  targetExam?: string;
  testsTaken?: number;
  streakDays?: number;
}

export interface PastPaper {
  id: string;
  title: string;
  board: string;
  province?: string;
  classLevel: string;
  subject: string;
  chapter?: string;
  topic?: string;
  exam?: string;
  year: number;
  paperGroup?: 'Group 1' | 'Group 2' | 'Annual' | 'Supply' | 'First Annual' | 'Second Annual';
  type: 'Objective (MCQs)' | 'Subjective' | 'Combined';
  paperType?: string; // e.g., 'Annual Group 1', 'Supplementary', 'Model Paper'
  language?: string;
  totalQuestions?: number;
  totalMarks?: number;
  durationMinutes?: number;
  questionsCount: number;
  downloadUrl?: string;
  fileUrl?: string;
  pdfUrl?: string;
  thumbnail?: string;
  status?: ContentStatus;
  submittedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  changeNotes?: string;
  version?: number;
  brandingStatus?: 'Branded' | 'Pending' | 'Not Applicable';
  brandedFileUrl?: string;
  brandingVersion?: string;
  originalFileHash?: string;
  brandedFileHash?: string;
  brandedAt?: string;
  downloadsCount?: number;
  description?: string;
  questions?: MCQ[];
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudyNote {
  id: string;
  title: string;
  board?: string; // Board association (e.g. 'All Boards', 'BISE Lahore', 'FBISE Islamabad')
  subject: string;
  classLevel: string;
  chapter: string;
  topic?: string;
  description?: string;
  type?: 'Notes' | 'Short Questions' | 'Long Questions' | 'Formulas' | 'Definitions' | 'Summary' | 'Chapter Summary';
  contentSnippet?: string;
  fullContent?: string;
  content?: string;
  language?: string;
  pdfUrl?: string;
  fileUrl?: string;
  thumbnail?: string;
  status?: ContentStatus;
  submittedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  changeNotes?: string;
  version?: number;
  brandingStatus?: 'Branded' | 'Pending' | 'Not Applicable';
  brandedFileUrl?: string;
  brandingVersion?: string;
  originalFileHash?: string;
  brandedFileHash?: string;
  brandedAt?: string;
  keyPoints?: string[];
  readTime?: string;
  downloadsCount: number;
  isPremium?: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  originalFilename: string;
  sanitizedFilename: string;
  mimeType: string;
  fileSize: number;
  storageRef: string;
  originalFileHash: string;
  brandedStorageRef?: string;
  brandedFileHash?: string;
  documentType: string;
  contentType: string;
  board?: string;
  classLevel?: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  year?: number;
  language?: string;
  status: ContentStatus;
  submittedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  changeNotes?: string;
  version: number;
  brandingStatus: 'Completed' | 'Pending' | 'Failed' | 'Not Applicable';
  brandingVersion?: string;
  brandedAt?: string;
  downloadsCount: number;
  associatedEntityId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentVersion {
  id: number;
  documentId: string;
  versionNumber: number;
  originalFilename: string;
  storageRef: string;
  originalFileHash: string;
  brandedStorageRef?: string;
  brandedFileHash?: string;
  fileSize: number;
  changeNotes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface DocumentDownloadEvent {
  id: number;
  documentId: string;
  documentType: string;
  userUid?: string;
  anonymousSessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  version: number;
  downloadedAt: string;
}

export interface VideoLecture {
  id: string;
  title: string;
  instructor: string;
  subject: string;
  classLevel: string;
  chapter: string;
  duration: string;
  thumbnail: string;
  youtubeId?: string;
  views: number;
  summary: string;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  city: string;
  institution: string;
  score: number;
  testsCompleted: number;
  accuracy: number;
  streakDays: number;
  avatar: string;
  badge: string;
}

export interface Certificate {
  id?: string;
  certificateId: string; // Unpredictable unique ID (e.g., TG-CERT-...)
  certificateNumber?: string;
  studentId: string;
  studentName: string;
  studentPhoto?: string;
  testId: string;
  testName: string;
  className: string;
  subject: string;
  chapter?: string;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  performanceLevel: string;
  issueDate: string;
  issueTime: string;
  verificationUrl: string;
  qrCodeUrl: string;
  status: 'VALID' | 'REVOKED';
  templateId: string;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
  revokedBy?: string;
}

export interface CertificateSettings {
  organizationName: string;
  logoUrl?: string;
  certificateTitle: string;
  footerText: string;
  signatories: {
    name: string;
    title: string;
    signatureUrl?: string;
  }[];
  gradingSystem: {
    grade: string;
    minPercentage: number;
  }[];
  performanceLabels: {
    label: string;
    minPercentage: number;
  }[];
  templates: {
    id: string;
    name: string;
  }[];
  eligibilityCriteria: {
    minScore: number;
  };
}

export interface LearningPathStep {
  id: string;
  title: string;
  description: string;
  type: 'Study' | 'Quiz' | 'PastPaper' | 'Review';
  status: 'Completed' | 'InProgress' | 'Locked';
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  steps: LearningPathStep[];
  currentStepId: string;
}

export interface WeeklyStudyGoal {
  id: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  subject: string;
  completed: boolean;
}

export interface StudentProfile {
  uid?: string;
  id?: string;
  name: string;
  email: string;
  role?: string;
  roles?: StaffRole[];
  targetExam: string;
  classLevel: string;
  board: string;
  points: number;
  streak?: number;
  streakDays: number;
  testsTaken: number;
  savedQuestionIds: string[];
  wrongQuestionIds: string[];
  certificates: Certificate[];
  avatar: string;
  weeklyGoals?: WeeklyStudyGoal[];
}
