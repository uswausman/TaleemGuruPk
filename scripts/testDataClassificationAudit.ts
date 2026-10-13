import { db } from '../src/db/index';
import { mcqs, tests, testResults, studyNotes, users } from '../src/db/schema';
import { sql } from 'drizzle-orm';

async function runTestDataClassificationAudit() {
  console.log('================================================================');
  console.log('  TALEEMGURU.PK — READ-ONLY TEST DATA CLASSIFICATION AUDIT');
  console.log('================================================================\n');

  if (!db) {
    console.error('Error: Database connection not available.');
    process.exit(1);
  }

  try {
    // 1. Users Audit & Classification
    const allUsers = await db.select().from(users);
    const totalUsers = allUsers.length;
    const testUsers = allUsers.filter(u => 
      u.email?.includes('test') || 
      u.email?.includes('qa') || 
      u.email?.includes('automation') ||
      u.name?.toLowerCase().includes('test') ||
      u.roles?.some(r => r.toLowerCase().includes('test'))
    );
    const unclassifiedUsers = allUsers.filter(u => 
      !testUsers.includes(u) && (!u.lastLoginAt && !u.createdAt)
    );
    const verifiedUsers = totalUsers - testUsers.length - unclassifiedUsers.length;

    console.log('--- USERS CLASSIFICATION ---');
    console.log(`  Total Rows:          ${totalUsers}`);
    console.log(`  Verified Production: ${verifiedUsers}`);
    console.log(`  Identified Test:     ${testUsers.length}`);
    console.log(`  Unclassified:        ${unclassifiedUsers.length}\n`);

    // 2. MCQs Audit & Classification
    const allMcqs = await db.select().from(mcqs);
    const totalMcqs = allMcqs.length;
    const testMcqs = allMcqs.filter(m => 
      m.question?.toLowerCase().includes('sample') ||
      m.question?.toLowerCase().includes('mock') ||
      m.question?.toLowerCase().includes('test question') ||
      m.explanation?.toLowerCase().includes('test')
    );
    const verifiedMcqs = totalMcqs - testMcqs.length;

    console.log('--- MCQS CLASSIFICATION ---');
    console.log(`  Total Rows:          ${totalMcqs}`);
    console.log(`  Verified Production: ${verifiedMcqs}`);
    console.log(`  Identified Test:     ${testMcqs.length}`);
    console.log(`  Unclassified:        0\n`);

    // 3. Tests / Practice Tests Audit & Classification
    const allTests = await db.select().from(tests);
    const totalTests = allTests.length;
    const testTemplates = allTests.filter(t => 
      t.title?.toLowerCase().includes('mock') ||
      t.title?.toLowerCase().includes('sample') ||
      t.title?.toLowerCase().includes('test template') ||
      t.description?.toLowerCase().includes('test')
    );
    const verifiedTests = totalTests - testTemplates.length;

    console.log('--- PRACTICE TESTS CLASSIFICATION ---');
    console.log(`  Total Rows:          ${totalTests}`);
    console.log(`  Verified Production: ${verifiedTests}`);
    console.log(`  Identified Test:     ${testTemplates.length}`);
    console.log(`  Unclassified:        0\n`);

    // 4. Submissions / Test Results Audit & Classification
    const allResults = await db.select().from(testResults);
    const totalResults = allResults.length;
    // Test submissions identified by test score patterns, test user IDs, or automated run flags
    const testSubmissions = allResults.filter(r => 
      r.score === 0 || 
      r.score === 100 && r.totalQuestions === 0 ||
      testUsers.some(u => u.id === r.userId)
    );
    const verifiedResults = totalResults - testSubmissions.length;

    console.log('--- SUBMISSIONS CLASSIFICATION ---');
    console.log(`  Total Rows:          ${totalResults}`);
    console.log(`  Verified Production: ${verifiedResults}`);
    console.log(`  Identified Test:     ${testSubmissions.length}`);
    console.log(`  Unclassified:        0\n`);

    // 5. Study Notes Audit & Classification
    const allNotes = await db.select().from(studyNotes);
    const totalNotes = allNotes.length;
    const fixtureNotes = allNotes.filter(n => 
      n.title?.toLowerCase().includes('mock') ||
      n.title?.toLowerCase().includes('sample') ||
      n.title?.toLowerCase().includes('test note')
    );
    const verifiedNotes = totalNotes - fixtureNotes.length;

    console.log('--- STUDY NOTES CLASSIFICATION ---');
    console.log(`  Total Rows:          ${totalNotes}`);
    console.log(`  Verified Production: ${verifiedNotes}`);
    console.log(`  Identified Test:     ${fixtureNotes.length}`);
    console.log(`  Unclassified:        0\n`);

    console.log('================================================================');
    console.log('  AUDIT SUMMARY: Read-only classification completed successfully.');
    console.log('  No database modifications or deletions were performed.');
    console.log('================================================================');
  } catch (error) {
    console.error('Error during test data classification audit:', error);
    process.exit(1);
  }
}

runTestDataClassificationAudit();
