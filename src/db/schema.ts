import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

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

// Subjects
export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  classId: integer('class_id').references(() => classes.id).notNull(),
  name: text('name').notNull(),
  status: text('status').default('Active').notNull(), // 'Active' | 'Inactive'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Chapters / Topics
export const chapters = pgTable('chapters', {
  id: serial('id').primaryKey(),
  subjectId: integer('subject_id').references(() => subjects.id).notNull(),
  name: text('name').notNull(),
  status: text('status').default('Active').notNull(), // 'Active' | 'Inactive'
  draftStatus: text('draft_status').default('Draft').notNull(), // 'Draft' | 'Published'
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
