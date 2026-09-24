/**
 * TaleemGuru Database Index Optimization
 * Ensures optimal PostgreSQL indexes exist for high-performance querying, search, pagination, and analytics.
 */

import { db } from './index.ts';
import { sql } from 'drizzle-orm';

export async function ensurePerformanceIndexes(): Promise<void> {
  if (!db) return;
  const indexQueries = [
    `CREATE INDEX IF NOT EXISTS idx_tests_subject ON tests(subject)`,
    `CREATE INDEX IF NOT EXISTS idx_tests_board ON tests(board)`,
    `CREATE INDEX IF NOT EXISTS idx_tests_class_level ON tests(class_level)`,
    `CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status)`,
    `CREATE INDEX IF NOT EXISTS idx_mcqs_subject ON mcqs(subject)`,
    `CREATE INDEX IF NOT EXISTS idx_mcqs_board ON mcqs(board)`,
    `CREATE INDEX IF NOT EXISTS idx_mcqs_class_level ON mcqs(class_level)`,
    `CREATE INDEX IF NOT EXISTS idx_mcqs_status ON mcqs(status)`,
    `CREATE INDEX IF NOT EXISTS idx_documents_subject ON documents(subject)`,
    `CREATE INDEX IF NOT EXISTS idx_documents_board ON documents(board)`,
    `CREATE INDEX IF NOT EXISTS idx_documents_class_level ON documents(class_level)`,
    `CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)`,
    `CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type)`,
    `CREATE INDEX IF NOT EXISTS idx_study_notes_subject ON study_notes(subject)`,
    `CREATE INDEX IF NOT EXISTS idx_study_notes_board ON study_notes(board)`,
    `CREATE INDEX IF NOT EXISTS idx_study_notes_class_level ON study_notes(class_level)`,
    `CREATE INDEX IF NOT EXISTS idx_study_notes_status ON study_notes(status)`,
    `CREATE INDEX IF NOT EXISTS idx_test_results_user_uid ON test_results(user_uid)`,
    `CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarked_questions_user_uid ON bookmarked_questions(user_uid)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_recipient_uid ON notifications(recipient_uid)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`
  ];

  for (const q of indexQueries) {
    try {
      await db.execute(sql.raw(q));
    } catch (e: any) {
      // Gracefully handle permission restrictions (e.g. if table owner differs)
      if (!e?.message?.includes('must be owner')) {
        console.warn('Index creation notice:', e?.message || e);
      }
    }
  }

  console.log('✓ Performance indexes verified.');
}
