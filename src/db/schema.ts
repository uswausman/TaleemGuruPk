import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

// Users table storing student and admin profiles linked to Auth UID (Supabase user ID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Supabase Auth User ID
  email: text('email').notNull(),
  name: text('name'),
  roles: jsonb('roles').$type<string[]>().default(['Student']).notNull(), // Multiple roles
  targetExam: text('target_exam'),
  classLevel: text('class_level'),
  board: text('board'),
  points: integer('points').default(0).notNull(),
  streakDays: integer('streak_days').default(0).notNull(),
  testsTaken: integer('tests_taken').default(0).notNull(),
  avatar: text('avatar'),
  status: text('status').default('Active').notNull(), // 'Active' | 'Inactive' | 'Suspended'
  permissions: jsonb('permissions').$type<string[]>(), // Granular permission overrides
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Test Results table tracking completed tests and mock exams
export const testResults = pgTable('test_results', {
  id: serial('id').primaryKey(),
  resultId: text('result_id').notNull().unique(),
  userUid: text('user_uid').references(() => users.uid).notNull(),
  testId: text('test_id').notNull(),
  testTitle: text('test_title').notNull(),
  testType: text('test_type').notNull(),
  subject: text('subject').notNull(),
  category: text('category').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  answeredCount: integer('answered_count').notNull(),
  correctCount: integer('correct_count').notNull(),
  wrongCount: integer('wrong_count').notNull(),
  skippedCount: integer('skipped_count').notNull(),
  marksObtained: integer('marks_obtained').notNull(),
  totalMarks: integer('total_marks').notNull(),
  percentage: integer('percentage').notNull(),
  grade: text('grade').notNull(),
  timeUsedSeconds: integer('time_used_seconds').notNull(),
  percentileRank: integer('percentile_rank').default(85).notNull(),
  answers: jsonb('answers'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Bookmarked questions for students
export const bookmarkedQuestions = pgTable('bookmarked_questions', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').references(() => users.uid).notNull(),
  questionId: text('question_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Certificates issued to students
export const certificates = pgTable('certificates', {
  id: text('id').primaryKey(),
  userUid: text('user_uid').references(() => users.uid).notNull(),
  studentName: text('student_name').notNull(),
  testId: text('test_id').notNull(),
  testName: text('test_name').notNull(),
  score: integer('score').notNull(),
  totalMarks: integer('total_marks').notNull(),
  percentage: integer('percentage').notNull(),
  grade: text('grade').notNull(),
  className: text('class_name'),
  subjectName: text('subject_name'),
  chapterName: text('chapter_name'),
  performanceLevel: text('performance_level'),
  status: text('status').default('VALID').notNull(), // 'VALID' | 'REVOKED'
  revokedAt: timestamp('revoked_at'),
  verificationUrl: text('verification_url').notNull(),
  issueDate: timestamp('issue_date').defaultNow().notNull(),
});

// Content / Question Error Reports submitted by students or reviewed by admins
export const contentReports = pgTable('content_reports', {
  id: serial('id').primaryKey(),
  reportId: text('report_id').notNull().unique(),
  category: text('category').notNull(),
  questionId: text('question_id'),
  subject: text('subject'),
  description: text('description').notNull(),
  userEmail: text('user_email'),
  userUid: text('user_uid'),
  status: text('status').default('OPEN').notNull(),
  adminNotes: text('admin_notes'),
  resolvedBy: text('resolved_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Admin Audit Logs for tracking administrative actions authoritatively
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  adminUid: text('admin_uid').notNull(),
  adminEmail: text('admin_email').notNull(),
  adminName: text('admin_name'),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id'),
  details: text('details'),
  board: text('board'),
  classLevel: text('class_level'),
  subject: text('subject'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Staff Assignments for Teachers, Editors, and ContentManagers
export const staffAssignments = pgTable('staff_assignments', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(), // User UID of the staff member
  role: text('role').notNull(), // 'Teacher' | 'Editor' | 'ContentManager' | 'Moderator'
  board: text('board').default('All').notNull(), // e.g. 'Punjab', 'Federal', 'Sindh', 'KPK', 'Balochistan', 'All'
  classLevel: text('class_level').default('All').notNull(), // e.g. 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'MDCAT', 'ECAT', 'All'
  subject: text('subject').default('All').notNull(), // e.g. 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'All'
  contentTypes: jsonb('content_types').$type<string[]>().default([]), // ['Notes', 'Syllabus', 'Past Papers', 'MCQs', 'Articles', 'Study Material']
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Boards
export const boards = pgTable('boards', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code'),
  establishmentYear: integer('establishment_year'),
  province: text('province'),
  city: text('city'),
  description: text('description'),
  status: text('status').default('Active').notNull(), // 'Active' | 'Inactive'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Classes
export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  boardId: integer('board_id').references(() => boards.id).notNull(),
  name: text('name').notNull(),
  status: text('status').default('Active').notNull(), // 'Active' | 'Inactive'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Junction table for Many-to-Many Classes <-> Boards
export const classBoards = pgTable('class_boards', {
  id: serial('id').primaryKey(),
  classId: integer('class_id').references(() => classes.id, { onDelete: 'cascade' }).notNull(),
  boardId: integer('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
});

// Subjects
export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  classId: integer('class_id').references(() => classes.id).notNull(),
  boardId: integer('board_id').references(() => boards.id),
  name: text('name').notNull(),
  status: text('status').default('Active').notNull(), // 'Active' | 'Inactive'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Junction table for Many-to-Many Subjects <-> Boards
export const subjectBoards = pgTable('subject_boards', {
  id: serial('id').primaryKey(),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  boardId: integer('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
});

// Junction table for Many-to-Many Subjects <-> Classes
export const subjectClasses = pgTable('subject_classes', {
  id: serial('id').primaryKey(),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  classId: integer('class_id').references(() => classes.id, { onDelete: 'cascade' }).notNull(),
});

// Chapters / Topics
export const chapters = pgTable('chapters', {
  id: serial('id').primaryKey(),
  subjectId: integer('subject_id').references(() => subjects.id).notNull(),
  classId: integer('class_id').references(() => classes.id),
  name: text('name').notNull(),
  status: text('status').default('Active').notNull(), // 'Active' | 'Inactive'
  draftStatus: text('draft_status').default('Draft').notNull(), // 'Draft' | 'Published'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Entry Test Categories (Parent Categories e.g. Armed Forces, Medical, Engineering, Civil Services)
export const entryTestCategories = pgTable('entry_test_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type'), // Optional legacy field
  description: text('description'),
  organizer: text('organizer'),
  totalMarks: integer('total_marks'),
  duration: text('duration'),
  status: text('status').default('Active').notNull(), // 'Active' | 'Inactive'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Entry Test Subcategories (Subcategories under Parent Categories e.g. Armed Forces -> Army, Navy, Air Force)
export const entryTestSubcategories = pgTable('entry_test_subcategories', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => entryTestCategories.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').default('Active').notNull(), // 'Active' | 'Inactive'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Syllabus
export const syllabus = pgTable('syllabus', {
  id: serial('id').primaryKey(),
  subjectId: integer('subject_id').references(() => subjects.id).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// EDUCATIONAL CONTENT TABLES: MCQs, Tests, Past Papers, Study Notes
// ============================================================================

// 1. MCQs Question Bank
export const mcqs = pgTable('mcqs', {
  id: text('id').primaryKey(),
  question: text('question').notNull(),
  options: jsonb('options').$type<string[]>().notNull(),
  correctAnswer: integer('correct_answer').notNull(), // 0-indexed
  explanation: text('explanation'),
  subject: text('subject').notNull(),
  chapter: text('chapter'),
  topic: text('topic'),
  difficulty: text('difficulty').default('Medium').notNull(), // 'Easy' | 'Medium' | 'Hard'
  classLevel: text('class_level'),
  board: text('board'),
  exam: text('exam'),
  year: integer('year'),
  tags: jsonb('tags').$type<string[]>().default([]),
  language: text('language').default('English').notNull(), // 'English' | 'Urdu'
  status: text('status').default('Published').notNull(), // 'Draft' | 'Pending Review' | 'Approved' | 'Published' | 'Rejected' | 'Archived'
  submittedBy: text('submitted_by'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  changeNotes: text('change_notes'),
  version: integer('version').default(1).notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Tests & Quizzes Configurations
export const tests = pgTable('tests', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  testType: text('test_type').default('Chapter Test').notNull(),
  category: text('category').default('Academic').notNull(),
  subject: text('subject').notNull(),
  chapter: text('chapter'),
  classLevel: text('class_level'),
  board: text('board'),
  exam: text('exam'),
  durationMinutes: integer('duration_minutes').default(15).notNull(),
  totalQuestions: integer('total_questions').default(10).notNull(),
  totalMarks: integer('total_marks').default(10).notNull(),
  negativeMarking: boolean('negative_marking').default(false).notNull(),
  negativeMarkValue: text('negative_mark_value').default('0.25'),
  passPercentage: integer('pass_percentage').default(50).notNull(),
  randomizeQuestions: boolean('randomize_questions').default(false).notNull(),
  randomizeOptions: boolean('randomize_options').default(false).notNull(),
  allowRetake: boolean('allow_retake').default(true).notNull(),
  maxAttempts: integer('max_attempts').default(0).notNull(), // 0 = unlimited
  reviewPolicy: text('review_policy').default('immediate').notNull(), // 'immediate' | 'after_submission' | 'none'
  isPremium: boolean('is_premium').default(false).notNull(),
  status: text('status').default('Published').notNull(), // 'Draft' | 'Pending Review' | 'Approved' | 'Published' | 'Rejected' | 'Archived'
  submittedBy: text('submitted_by'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  changeNotes: text('change_notes'),
  version: integer('version').default(1).notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2.1 Exam Attempts for Server-Authoritative Examination Execution
export const examAttempts = pgTable('exam_attempts', {
  id: serial('id').primaryKey(),
  attemptId: text('attempt_id').notNull().unique(),
  testId: text('test_id').notNull(),
  testTitle: text('test_title').notNull(),
  userUid: text('user_uid').notNull(),
  studentName: text('student_name'),
  studentEmail: text('student_email'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  submittedAt: timestamp('submitted_at'),
  status: text('status').default('IN_PROGRESS').notNull(), // 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'ABANDONED'
  questionOrder: jsonb('question_order').$type<string[]>().notNull(), // MCQ IDs in attempt order
  answers: jsonb('answers').$type<Record<string, { selectedOption: number | null; markedForReview?: boolean; timeSpentSeconds?: number; savedAt?: string }>>().default({}).notNull(),
  score: integer('score'),
  totalMarks: integer('total_marks'),
  percentage: integer('percentage'),
  passed: boolean('passed'),
  grade: text('grade'),
  correctCount: integer('correct_count'),
  wrongCount: integer('wrong_count'),
  unansweredCount: integer('unanswered_count'),
  timeSpentSeconds: integer('time_spent_seconds'),
  reviewPolicy: text('review_policy').default('immediate').notNull(),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Test Questions Junction (relates tests to MCQs with specific ordering)
export const testQuestions = pgTable('test_questions', {
  id: serial('id').primaryKey(),
  testId: text('test_id').references(() => tests.id, { onDelete: 'cascade' }).notNull(),
  mcqId: text('mcq_id').references(() => mcqs.id, { onDelete: 'cascade' }).notNull(),
  ordering: integer('ordering').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Past Papers Archive
export const pastPapers = pgTable('past_papers', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  board: text('board').notNull(),
  province: text('province'),
  classLevel: text('class_level').notNull(),
  subject: text('subject').notNull(),
  chapter: text('chapter'),
  topic: text('topic'),
  exam: text('exam'),
  year: integer('year').notNull(),
  paperGroup: text('paper_group'),
  type: text('type').default('Objective (MCQs)').notNull(), // 'Objective (MCQs)' | 'Subjective' | 'Combined'
  paperType: text('paper_type'),
  language: text('language').default('English').notNull(),
  totalQuestions: integer('total_questions').default(0).notNull(),
  totalMarks: integer('total_marks').default(0).notNull(),
  durationMinutes: integer('duration_minutes'),
  questionsCount: integer('questions_count').default(0).notNull(),
  downloadUrl: text('download_url'),
  fileUrl: text('file_url'),
  pdfUrl: text('pdf_url'),
  thumbnail: text('thumbnail'),
  description: text('description'),
  status: text('status').default('Published').notNull(), // 'Published' | 'Draft' | 'Archived'
  version: integer('version').default(1).notNull(),
  brandingStatus: text('branding_status').default('Not Applicable'),
  brandedFileUrl: text('branded_file_url'),
  brandingVersion: text('branding_version'),
  originalFileHash: text('original_file_hash'),
  brandedFileHash: text('branded_file_hash'),
  brandedAt: timestamp('branded_at'),
  downloadsCount: integer('downloads_count').default(0).notNull(),
  questions: jsonb('questions').$type<any[]>(), // Optional embedded questions
  submittedBy: text('submitted_by'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  changeNotes: text('change_notes'),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Study Notes & Subject Material
export const studyNotes = pgTable('study_notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  board: text('board'),
  subject: text('subject').notNull(),
  classLevel: text('class_level').notNull(),
  chapter: text('chapter').notNull(),
  topic: text('topic'),
  description: text('description'),
  type: text('type').default('Notes').notNull(),
  contentSnippet: text('content_snippet'),
  fullContent: text('full_content'),
  content: text('content'),
  language: text('language').default('English').notNull(),
  pdfUrl: text('pdf_url'),
  fileUrl: text('file_url'),
  thumbnail: text('thumbnail'),
  status: text('status').default('Published').notNull(), // 'Draft' | 'Pending Review' | 'Approved' | 'Published' | 'Rejected' | 'Archived'
  version: integer('version').default(1).notNull(),
  brandingStatus: text('branding_status').default('Not Applicable'),
  brandedFileUrl: text('branded_file_url'),
  brandingVersion: text('branding_version'),
  originalFileHash: text('original_file_hash'),
  brandedFileHash: text('branded_file_hash'),
  brandedAt: timestamp('branded_at'),
  keyPoints: jsonb('key_points').$type<string[]>().default([]),
  readTime: text('read_time'),
  downloadsCount: integer('downloads_count').default(0).notNull(),
  isPremium: boolean('is_premium').default(false).notNull(),
  submittedBy: text('submitted_by'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  changeNotes: text('change_notes'),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 6. Centralized Document Library
export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  originalFilename: text('original_filename').notNull(),
  sanitizedFilename: text('sanitized_filename').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  storageRef: text('storage_ref').notNull(), // Path to immutable original
  originalFileHash: text('original_file_hash').notNull(), // SHA-256
  brandedStorageRef: text('branded_storage_ref'), // Path to branded/distribution copy
  brandedFileHash: text('branded_file_hash'), // SHA-256 of branded copy
  documentType: text('document_type').default('Document').notNull(), // 'Past Paper' | 'Study Note' | 'Syllabus' | 'Reference' | 'Book' | 'Document'
  contentType: text('content_type').default('PDF').notNull(),
  board: text('board'),
  classLevel: text('class_level'),
  subject: text('subject'),
  chapter: text('chapter'),
  topic: text('topic'),
  year: integer('year'),
  language: text('language').default('English'),
  status: text('status').default('Published').notNull(), // 'Draft' | 'Pending Review' | 'Approved' | 'Published' | 'Rejected' | 'Archived'
  version: integer('version').default(1).notNull(),
  brandingStatus: text('branding_status').default('Completed').notNull(), // 'Completed' | 'Pending' | 'Failed' | 'Not Applicable'
  brandingVersion: text('branding_version').default('2.0'),
  brandedAt: timestamp('branded_at'),
  downloadsCount: integer('downloads_count').default(0).notNull(),
  associatedEntityId: text('associated_entity_id'),
  submittedBy: text('submitted_by'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  changeNotes: text('change_notes'),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Content Version History for MCQs, Tests, Past Papers, Study Notes, and Documents
export const contentVersions = pgTable('content_versions', {
  id: serial('id').primaryKey(),
  contentType: text('content_type').notNull(), // 'MCQ' | 'Test' | 'PastPaper' | 'StudyNote' | 'Document'
  contentId: text('content_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  status: text('status').notNull(),
  snapshot: jsonb('snapshot').notNull(),
  changeNotes: text('change_notes'),
  rejectionReason: text('rejection_reason'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6.1 Document Historical Versions
export const documentVersions = pgTable('document_versions', {
  id: serial('id').primaryKey(),
  documentId: text('document_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  originalFilename: text('original_filename').notNull(),
  storageRef: text('storage_ref').notNull(),
  originalFileHash: text('original_file_hash').notNull(),
  brandedStorageRef: text('branded_storage_ref'),
  brandedFileHash: text('branded_file_hash'),
  fileSize: integer('file_size').notNull(),
  changeNotes: text('change_notes'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6.2 Real Document Download Events
export const documentDownloadEvents = pgTable('document_download_events', {
  id: serial('id').primaryKey(),
  documentId: text('document_id').notNull(),
  documentType: text('document_type').default('Document').notNull(),
  userUid: text('user_uid'),
  anonymousSessionId: text('anonymous_session_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  version: integer('version').default(1),
  downloadedAt: timestamp('downloaded_at').defaultNow().notNull(),
});

// 7. Notifications Table for In-App Notification Center
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  notificationId: text('notification_id').notNull().unique(),
  recipientUid: text('recipient_uid').notNull(), // User UID or 'ALL' for broadcast
  title: text('title').notNull(),
  message: text('message').notNull(),
  category: text('category').default('System').notNull(), // 'System' | 'Test' | 'Result' | 'Certificate' | 'PastPaper' | 'StudyNote' | 'Announcement'
  isRead: boolean('is_read').default(false).notNull(),
  actionUrl: text('action_url'),
  senderUid: text('sender_uid'),
  senderName: text('sender_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. Site Settings Table for Centralized Administrative Platform Configuration
export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  category: text('category').notNull(),
  value: text('value'),
  isPublic: boolean('is_public').default(true).notNull(),
  updatedBy: text('updated_by'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Newsletter Subscribers
export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  status: text('status').default('active').notNull(), // 'active' | 'inactive'
  subscribedAt: timestamp('subscribed_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Newsletter Campaigns/Tips
export const newsletterCampaigns = pgTable('newsletter_campaigns', {
  id: serial('id').primaryKey(),
  subject: text('subject').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  ctaText: text('cta_text'),
  ctaUrl: text('cta_url'),
  status: text('status').default('draft').notNull(), // 'draft' | 'published' | 'scheduled'
  scheduledAt: timestamp('scheduled_at'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Newsletter Logs
export const newsletterLogs = pgTable('newsletter_logs', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').references(() => newsletterCampaigns.id),
  subscriberId: integer('subscriber_id').references(() => newsletterSubscribers.id),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  status: text('status').notNull(), // 'sent' | 'failed'
  providerMessageId: text('provider_message_id'),
  error: text('error'),
});

// Content Change Requests for Approval Workflow
export const contentChangeRequests = pgTable('content_change_requests', {
  id: serial('id').primaryKey(),
  entityType: text('entity_type').notNull(), // 'mcqs' | 'tests' | 'past_papers' | 'study_notes' | 'boards' | 'classes' | 'subjects' | 'chapters' | 'syllabus'
  entityId: text('entity_id'), // null for CREATE actions
  action: text('action').notNull(), // 'CREATE' | 'UPDATE' | 'DELETE'
  submittedBy: text('submitted_by').notNull(), // User UID
  status: text('status').default('PENDING').notNull(), // 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  proposedData: jsonb('proposed_data'), // JSON blob of changes
  previousData: jsonb('previous_data'), // JSON blob of state before change
  reviewComment: text('review_comment'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Website Error Incidents for Persistent Control Center Monitoring
export const websiteErrorIncidents = pgTable('website_error_incidents', {
  id: text('id').primaryKey(), // unique identifier
  severity: text('severity').notNull(), // 'CRITICAL' | 'ERROR' | 'WARN' | 'INFO'
  category: text('category').notNull(), // 'API' | 'Database' | 'Authentication' | 'SEO' | '4xx' | '5xx' | 'Runtime'
  route: text('route').notNull(),
  method: text('method').default('GET').notNull(),
  statusCode: integer('status_code').notNull(),
  errorMessage: text('error_message').notNull(),
  occurrenceCount: integer('occurrence_count').default(1).notNull(),
  firstSeen: timestamp('first_seen').defaultNow().notNull(),
  lastSeen: timestamp('last_seen').defaultNow().notNull(),
  incidentStatus: text('incident_status').default('Open').notNull(), // 'Open' | 'Investigating' | 'Resolved'
  fingerprint: text('fingerprint').notNull().unique(), // unique hash signature to prevent duplicates
  investigationStartedAt: timestamp('investigation_started_at'),
  investigationCompletedAt: timestamp('investigation_completed_at'),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: text('resolved_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  testResults: many(testResults),
  bookmarks: many(bookmarkedQuestions),
  certificates: many(certificates),
  staffAssignments: many(staffAssignments),
}));

export const staffAssignmentsRelations = relations(staffAssignments, ({ one }) => ({
  user: one(users, {
    fields: [staffAssignments.userUid],
    references: [users.uid],
  }),
}));

export const testResultsRelations = relations(testResults, ({ one }) => ({
  user: one(users, {
    fields: [testResults.userUid],
    references: [users.uid],
  }),
}));

export const bookmarksRelations = relations(bookmarkedQuestions, ({ one }) => ({
  user: one(users, {
    fields: [bookmarkedQuestions.userUid],
    references: [users.uid],
  }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  user: one(users, {
    fields: [certificates.userUid],
    references: [users.uid],
  }),
}));

export const testsRelations = relations(tests, ({ many }) => ({
  testQuestions: many(testQuestions),
}));

export const mcqsRelations = relations(mcqs, ({ many }) => ({
  testQuestions: many(testQuestions),
}));

export const testQuestionsRelations = relations(testQuestions, ({ one }) => ({
  test: one(tests, {
    fields: [testQuestions.testId],
    references: [tests.id],
  }),
  mcq: one(mcqs, {
    fields: [testQuestions.mcqId],
    references: [mcqs.id],
  }),
}));
