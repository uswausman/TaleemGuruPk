import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Play,
  Download,
  Calendar,
  Layers,
  FileText,
  Search,
} from 'lucide-react';
import { COMPETITIVE_EXAMS_DATA } from '../data/mockData';
import { MCQ } from '../types';
import { exportMCQsToWatermarkedPDF } from '../utils/watermark';

interface CompetitiveExamsViewProps {
  onStartExamTest: (examId: string) => void;
  allMCQs: MCQ[];
  studentName: string;
}

export const CompetitiveExamsView: React.FC<CompetitiveExamsViewProps> = ({
  onStartExamTest,
  allMCQs,
  studentName,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(COMPETITIVE_EXAMS_DATA[0].id);

  const activeExam = COMPETITIVE_EXAMS_DATA.find((e) => e.id === selectedExamId) || COMPETITIVE_EXAMS_DATA[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-emerald-300 border border-white/10 mb-3">
            <Award className="w-3.5 h-3.5" /> Federal & Provincial Civil Services
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Competitive Exams & Recruitment Portal
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
            Preparation for FPSC CSS, Provincial PMS, PPSC One-Paper MCQs (Tehsildar, Sub-Inspector, Educators), SPSC, KPPSC, BPSC, NTS, and ETEA.
          </p>
        </div>
      </div>

      {/* Grid: Exam Selector + Selected Exam Syllabus & Mock Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List of Exams (4 cols) */}
        <div className="lg:col-span-4 space-y-2.5">
          {COMPETITIVE_EXAMS_DATA.map((exam) => {
            const isSelected = exam.id === activeExam.id;
            return (
              <div
                key={exam.id}
                onClick={() => setSelectedExamId(exam.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/70 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {exam.agency}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">{exam.totalMarks} Marks</span>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-2">{exam.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{exam.description}</p>
              </div>
            );
          })}
        </div>

        {/* Right Column: Active Exam Deep Dive (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                Conducting Body: {activeExam.agency}
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">{activeExam.name}</h2>
              <p className="text-xs text-slate-500 mt-1">{activeExam.description}</p>
            </div>

            <button
              onClick={() => onStartExamTest(activeExam.id)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start 100 MCQs Mock Test</span>
            </button>
          </div>

          {/* Exam Stages & Pattern */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
            <div className="font-extrabold text-slate-800 uppercase tracking-wide">
              Examination Structure & Selection Stages:
            </div>
            <p className="text-slate-600 font-medium leading-relaxed">{activeExam.stages}</p>
          </div>

          {/* Compulsory & Optional Subjects */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-3">
              High-Yield Subjects & MCQs Screening Syllabus:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeExam.keySubjects.map((sub, sIdx) => (
                <div
                  key={sIdx}
                  className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-slate-800">{sub}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    MCQs Available
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Download Past Paper & Syllabus */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Download complete solved past papers and official FPSC/PPSC syllabus booklets.
            </div>

            <button
              onClick={() =>
                exportMCQsToWatermarkedPDF(
                  `${activeExam.name} Official Solved MCQs`,
                  activeExam.agency,
                  allMCQs.filter((m) => m.exam === 'CSS' || m.subject === 'Pakistan Studies' || m.subject === 'Current Affairs'),
                  { includeAnswers: true, studentName }
                )
              }
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Solved Paper (PDF)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
