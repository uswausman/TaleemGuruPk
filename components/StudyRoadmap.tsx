import React from 'react';
import { StudyRoadmapView } from './StudyRoadmapView';
import { StudyRoadmapTrendsChart } from './StudyRoadmapTrendsChart';
import { StudentProfile, TestResult, MCQ, TestConfig } from '../types';

export { StudyRoadmapTrendsChart };

export interface StudyRoadmapProps {
  student: StudentProfile | null;
  historyResults?: TestResult[];
  allMCQs?: MCQ[];
  onStartQuiz?: () => void;
  onStartTestConfig?: (config: TestConfig) => void;
  onNavigateNotes?: () => void;
  onNavigatePastPapers?: () => void;
  onPracticeWrongQuestions?: (mcqs: MCQ[]) => void;
  showTrendsChart?: boolean;
}

/**
 * StudyRoadmap Component
 * Visualizes the student's progress through chapters, subjects, and topics
 * using interactive progress bars, step-by-step checklists, mastery milestones,
 * and a Recharts cumulative progress & accuracy trends visualization
 * based on their MCQ practice history and completed tests.
 */
export const StudyRoadmap: React.FC<StudyRoadmapProps> = ({
  student,
  historyResults = [],
  allMCQs = [],
  onStartQuiz,
  onStartTestConfig,
  onNavigateNotes,
  onNavigatePastPapers,
  onPracticeWrongQuestions,
}) => {
  return (
    <StudyRoadmapView
      student={student}
      historyResults={historyResults}
      allMCQs={allMCQs}
      onStartQuiz={onStartQuiz}
      onStartTestConfig={onStartTestConfig}
      onNavigateNotes={onNavigateNotes}
      onNavigatePastPapers={onNavigatePastPapers}
      onPracticeWrongQuestions={onPracticeWrongQuestions}
    />
  );
};

export default StudyRoadmap;

