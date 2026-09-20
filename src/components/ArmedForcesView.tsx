import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Award,
  Play,
  Download,
  Clock,
  HelpCircle,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { ARMED_FORCES_DATA } from '../data/mockData';
import { MCQ } from '../types';
import { exportMCQsToWatermarkedPDF } from '../utils/watermark';

interface ArmedForcesViewProps {
  onStartForceTest: (forceName: string, testType: string) => void;
  allMCQs: MCQ[];
  studentName: string;
}

export const ArmedForcesView: React.FC<ArmedForcesViewProps> = ({
  onStartForceTest,
  allMCQs,
  studentName,
}) => {
  const [selectedForceId, setSelectedForceId] = useState<string>('army-portal');

  const activeForce = ARMED_FORCES_DATA.find((f) => f.id === selectedForceId) || ARMED_FORCES_DATA[0];

  const intelligenceQuestions = allMCQs.filter((m) => m.subject === 'IQ & Intelligence');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-emerald-300 border border-white/10 mb-3">
            <Shield className="w-3.5 h-3.5" /> Pakistan Armed Forces Recruitment & ISSB Hub
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Army, Navy & Air Force Initial Test Portals
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
            Prepare for PMA Long Course, Technical Cadet (TCC), GD Pilot (PAF), CAE, PN Cadet, and Lady Cadet Course (LCC) with computer-based Verbal, Non-Verbal, and Academic tests.
          </p>
        </div>
      </div>

      {/* Force Selection Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ARMED_FORCES_DATA.map((force) => {
          const isSelected = force.id === activeForce.id;
          return (
            <div
              key={force.id}
              onClick={() => setSelectedForceId(force.id)}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-emerald-600 bg-white shadow-md ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Official Portal</span>
                <span className="text-lg">🎖️</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-2">{force.force}</h3>
              <p className="text-xs text-emerald-800 font-serif italic mt-1">{force.motto}</p>
            </div>
          );
        })}
      </div>

      {/* Selected Force Detailed Testing Center */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">{activeForce.force} Examination Portal</h2>
            <p className="text-xs text-slate-500 mt-1">
              Select an examination module to simulate the computerized e-testing system.
            </p>
          </div>

          <button
            onClick={() =>
              exportMCQsToWatermarkedPDF(
                `${activeForce.force} Initial Test Past Intelligence Questions`,
                'Armed Forces Recruitment',
                intelligenceQuestions.concat(allMCQs.slice(0, 10)),
                { includeAnswers: true, studentName }
              )
            }
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Download Test Paper (PDF)</span>
          </button>
        </div>

        {/* Tests Available for this Force */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeForce.tests.map((t, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  E-Test Module
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-2">{t.name}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                  <span>{t.totalQuestions} Questions</span>
                  <span>•</span>
                  <span>{t.timeLimit}</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => onStartForceTest(activeForce.force, t.name)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Take Computer Test</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Courses Offered */}
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2.5">
            Eligible Commission Courses:
          </h4>
          <div className="flex flex-wrap gap-2">
            {activeForce.courses.map((course, cIdx) => (
              <span
                key={cIdx}
                className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                {course}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
