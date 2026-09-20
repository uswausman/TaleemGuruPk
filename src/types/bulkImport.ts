import { MCQ, PastPaper, StudyNote, TestConfig, Difficulty, TestType } from '../types';

export type EducationalProvince =
  | 'All Pakistan'
  | 'Punjab'
  | 'Sindh'
  | 'Khyber Pakhtunkhwa'
  | 'Balochistan'
  | 'AJK'
  | 'Gilgit-Baltistan'
  | 'Federal Capital';

export type EducationalMedium = 'English' | 'Urdu' | 'Both / Bilingual';

export type EducationalExamType =
  | 'Annual Exam'
  | 'Supplementary Exam'
  | 'Model Paper'
  | 'Chapter-wise Practice'
  | 'Full Book Test'
  | 'Entry Test'
  | 'Board Exam'
  | 'General';

export type EducationalDataType =
  | 'mcqs'
  | 'past-papers'
  | 'tests'
  | 'study-notes'
  | 'bundle';

export interface EducationalScope {
  board: string;
  boardId?: string;
  province: EducationalProvince;
  classLevel: string;
  classId?: string;
  subject: string;
  subjectId?: string;
  chapter: string;
  chapterId?: string;
  topic?: string;
  topicId?: string;
  medium: EducationalMedium;
  academicYear: number;
  examType: EducationalExamType;
  dataType: EducationalDataType;
}

export type ImportMode =
  | 'single-scope'      // Everything inherits chosen scope
  | 'multiple-scopes'   // File columns dictate, scope is fallback
  | 'smart-detect'      // Auto-inspect file/headers/text
  | 'template-based';   // Custom generated template download & upload

export type DuplicateStrategy =
  | 'skip'        // Skip duplicate records
  | 'update'      // Overwrite/update existing record
  | 'create_new'; // Keep both / create new with fresh ID

export type ScopeOverridePolicy =
  | 'override_all'    // Force scope values on all records
  | 'fallback_only';  // Only fill in blank/missing fields from scope

export type ValidationStatus = 'valid' | 'warning' | 'error' | 'duplicate';

export interface ParsedItemWrapper<T = any> {
  rawIndex: number;
  item: T;
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
  duplicateReason?: string;
  matchedExistingId?: string;
  hierarchy: {
    board: string;
    classLevel: string;
    subject: string;
    chapter?: string;
    topic?: string;
    medium?: string;
    year?: number;
    examType?: string;
  };
}

export interface HierarchicalParseResult<T = any> {
  success: boolean;
  items: ParsedItemWrapper<T>[];
  totalParsed: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  duplicateCount: number;
  globalErrors: string[];
  inferredScope?: Partial<EducationalScope>;
  bundleResult?: {
    mcqs: ParsedItemWrapper<MCQ>[];
    tests: ParsedItemWrapper<TestConfig>[];
    pastPapers: ParsedItemWrapper<PastPaper>[];
    studyNotes: ParsedItemWrapper<StudyNote>[];
  };
}

export interface ImportExecutionReport {
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  category: EducationalDataType;
  timestamp: string;
}
