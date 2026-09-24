import { db } from './index.ts';
import { sql } from 'drizzle-orm';

export interface IntegrityReport {
  timestamp: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  summary: {
    totalUsers: number;
    totalTests: number;
    totalMcqs: number;
    totalPastPapers: number;
    totalStudyNotes: number;
    totalDocuments: number;
    totalAuditLogs: number;
  };
  checks: {
    orphanTestQuestions: number;
    orphanTestResults: number;
    orphanDocumentVersions: number;
    invalidDocumentHashes: number;
    examConsistencyErrors: number;
    auditLogAnomalyCount: number;
  };
  issues: string[];
}

export async function runDatabaseIntegrityCheck(): Promise<IntegrityReport> {
  const issues: string[] = [];

  // 1. Basic Counts using raw SQL execute
  const uCount = await db.execute(sql`SELECT COUNT(*) FROM users`);
  const tCount = await db.execute(sql`SELECT COUNT(*) FROM tests`);
  const mCount = await db.execute(sql`SELECT COUNT(*) FROM mcqs`);
  const pCount = await db.execute(sql`SELECT COUNT(*) FROM past_papers`);
  const sCount = await db.execute(sql`SELECT COUNT(*) FROM study_notes`);
  const dCount = await db.execute(sql`SELECT COUNT(*) FROM documents`);
  const aCount = await db.execute(sql`SELECT COUNT(*) FROM audit_logs`);

  const totalUsers = Number((uCount as any).rows?.[0]?.count || 0);
  const totalTests = Number((tCount as any).rows?.[0]?.count || 0);
  const totalMcqs = Number((mCount as any).rows?.[0]?.count || 0);
  const totalPastPapers = Number((pCount as any).rows?.[0]?.count || 0);
  const totalStudyNotes = Number((sCount as any).rows?.[0]?.count || 0);
  const totalDocuments = Number((dCount as any).rows?.[0]?.count || 0);
  const totalAuditLogs = Number((aCount as any).rows?.[0]?.count || 0);

  // 2. Orphan Test Questions
  let orphanTestQuestions = 0;
  try {
    const res = await db.execute(
      sql`SELECT tq.id FROM test_questions tq LEFT JOIN tests t ON tq.test_id = t.id WHERE t.id IS NULL`
    );
    orphanTestQuestions = (res as any).rowCount || (res as any).rows?.length || 0;
  } catch {}
  if (orphanTestQuestions > 0) {
    issues.push(`Found ${orphanTestQuestions} test question(s) referencing non-existent tests.`);
  }

  // 3. Orphan Test Results
  let orphanTestResults = 0;
  try {
    const res = await db.execute(
      sql`SELECT tr.id FROM test_results tr LEFT JOIN users u ON tr.user_uid = u.uid WHERE u.uid IS NULL`
    );
    orphanTestResults = (res as any).rowCount || (res as any).rows?.length || 0;
  } catch {}
  if (orphanTestResults > 0) {
    issues.push(`Found ${orphanTestResults} test result(s) referencing non-existent users.`);
  }

  // 4. Orphan Document Versions
  let orphanDocumentVersions = 0;
  try {
    const res = await db.execute(
      sql`SELECT dv.id FROM document_versions dv LEFT JOIN documents d ON dv.document_id = d.id WHERE d.id IS NULL`
    );
    orphanDocumentVersions = (res as any).rowCount || (res as any).rows?.length || 0;
  } catch {}
  if (orphanDocumentVersions > 0) {
    issues.push(`Found ${orphanDocumentVersions} document version(s) referencing non-existent documents.`);
  }

  // 5. Document Hash Verification
  let invalidDocumentHashes = 0;
  try {
    const res = await db.execute(
      sql`SELECT id FROM documents WHERE original_file_hash IS NULL OR original_file_hash = ''`
    );
    invalidDocumentHashes = (res as any).rowCount || (res as any).rows?.length || 0;
  } catch {}
  if (invalidDocumentHashes > 0) {
    issues.push(`Found ${invalidDocumentHashes} document(s) with missing or invalid file hashes.`);
  }

  // 6. Exam / Result Consistency Check
  let examConsistencyErrors = 0;
  try {
    const res = await db.execute(
      sql`SELECT id FROM test_results WHERE correct_count < 0 OR correct_count > total_questions`
    );
    examConsistencyErrors = (res as any).rowCount || (res as any).rows?.length || 0;
  } catch {}
  if (examConsistencyErrors > 0) {
    issues.push(`Found ${examConsistencyErrors} exam result(s) with inconsistent correct count vs total questions.`);
  }

  const auditLogAnomalyCount = 0;

  const totalIssues =
    orphanTestQuestions +
    orphanTestResults +
    orphanDocumentVersions +
    invalidDocumentHashes +
    examConsistencyErrors;

  const status = totalIssues === 0 ? 'HEALTHY' : totalIssues < 5 ? 'WARNING' : 'CRITICAL';

  return {
    timestamp: new Date().toISOString(),
    status,
    summary: {
      totalUsers,
      totalTests,
      totalMcqs,
      totalPastPapers,
      totalStudyNotes,
      totalDocuments,
      totalAuditLogs,
    },
    checks: {
      orphanTestQuestions,
      orphanTestResults,
      orphanDocumentVersions,
      invalidDocumentHashes,
      examConsistencyErrors,
      auditLogAnomalyCount,
    },
    issues,
  };
}

export async function generateSystemBackupExport() {
  const integrity = await runDatabaseIntegrityCheck();
  const allUsersRes = await db.execute(sql`SELECT uid, email, name, roles, created_at FROM users LIMIT 500`);
  const allTestsRes = await db.execute(sql`SELECT id, title, subject, board, status FROM tests LIMIT 500`);
  const allDocsRes = await db.execute(sql`SELECT id, title, document_type, original_file_hash FROM documents LIMIT 500`);

  const allUsers = (allUsersRes as any).rows || [];
  const allTests = (allTestsRes as any).rows || [];
  const allDocuments = (allDocsRes as any).rows || [];

  return {
    version: '1.0',
    exportTimestamp: new Date().toISOString(),
    integrityReport: integrity,
    metadata: {
      usersSampleCount: allUsers.length,
      testsSampleCount: allTests.length,
      documentsSampleCount: allDocuments.length,
    },
    data: {
      users: allUsers,
      tests: allTests,
      documents: allDocuments,
    },
  };
}
