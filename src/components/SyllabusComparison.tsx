import React, { useState } from 'react';
import { Card } from './ui/Card';
import { BookOpen, ArrowRight, Sparkles, Landmark, Layers, FileText, GraduationCap } from 'lucide-react';
import { PAKISTAN_BOARDS, ACADEMIC_CLASSES, ACADEMIC_CHAPTERS } from '../data/educationalHierarchy';
import { ChapterInfo, BoardInfo, AcademicClassInfo } from '../types';
import { NavigationContext } from '../utils/navigationContext';

interface SyllabusComparisonProps {
  initialBoard?: string;
  onNavigateSubject?: (ctx: NavigationContext) => void;
  onNavigateMCQBank?: (ctx: NavigationContext) => void;
  onNavigatePastPapers?: (ctx: NavigationContext) => void;
  onNavigateNotes?: (ctx: NavigationContext) => void;
  onNavigateBoards?: () => void;
}

export const SyllabusComparison: React.FC<SyllabusComparisonProps> = ({
  initialBoard,
  onNavigateSubject,
  onNavigateMCQBank,
  onNavigatePastPapers,
  onNavigateNotes,
  onNavigateBoards,
}) => {
  const initialBoardObj = initialBoard 
    ? PAKISTAN_BOARDS.find(b => b.name.toLowerCase().includes(initialBoard.toLowerCase()) || b.code.toLowerCase().includes(initialBoard.toLowerCase()))
    : PAKISTAN_BOARDS[0];

  const defaultBoard1: BoardInfo = initialBoardObj || PAKISTAN_BOARDS[0];
  const defaultBoard2: BoardInfo = PAKISTAN_BOARDS[1] || PAKISTAN_BOARDS[0];
  const defaultClass: AcademicClassInfo = ACADEMIC_CLASSES.find(c => c.name === 'Class 12') || ACADEMIC_CLASSES[3] || ACADEMIC_CLASSES[0];

  const [selectedClass, setSelectedClass] = useState<AcademicClassInfo>(defaultClass);
  const [board1, setBoard1] = useState<BoardInfo>(defaultBoard1);
  const [board2, setBoard2] = useState<BoardInfo>(defaultBoard2);

  const getChaptersForBoardAndClassAndSubject = (boardName: string, className: string, subjectName: string): ChapterInfo[] => {
    return ACADEMIC_CHAPTERS.filter(ch => {
      const matchClass = ch.classLevel.toLowerCase() === className.toLowerCase() || ch.classLevel.toLowerCase().includes(className.toLowerCase());
      const matchSub = ch.subjectName.toLowerCase() === subjectName.toLowerCase();
      return matchClass && matchSub;
    });
  };

  const subjectsForClass = React.useMemo(() => {
    const chapters = ACADEMIC_CHAPTERS.filter(ch => 
      ch.classLevel.toLowerCase() === selectedClass.name.toLowerCase() || 
      ch.classLevel.toLowerCase().includes(selectedClass.shortCode.toLowerCase()) ||
      ch.classLevel.toLowerCase().includes(selectedClass.name.toLowerCase())
    );
    const set = new Set(chapters.map(ch => ch.subjectName));
    if (set.size === 0) {
      return ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science'];
    }
    return Array.from(set);
  }, [selectedClass]);

  return (
    <div className="space-y-6">
      {initialBoard && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-slate-800/80 rounded-2xl border border-blue-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Active Board Syllabus: {initialBoard}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click any action button below to access interactive MCQs, Past Papers, Study Notes, and Curriculum linked exactly to {selectedClass.name} across all {PAKISTAN_BOARDS.length} Pakistan Boards.
              </p>
            </div>
          </div>
          {onNavigateBoards && (
            <button
              onClick={onNavigateBoards}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              ← Back to Boards
            </button>
          )}
        </div>
      )}

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Master Board & Class Syllabus Comparison ({PAKISTAN_BOARDS.length} Boards × {ACADEMIC_CLASSES.length} Classes)
          </h3>
          <span className="text-xs text-slate-500">
            Select Class and compare curricula across all Pakistan Education Boards with exact context linking
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Select Class / Grade
            </label>
            <select
              value={selectedClass.id}
              onChange={(e) => {
                const found = ACADEMIC_CLASSES.find(c => c.id === e.target.value);
                if (found) setSelectedClass(found);
              }}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
            >
              {ACADEMIC_CLASSES.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name} ({cls.badge})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5 text-blue-500" />
              Primary Board ({board1.name})
            </label>
            <select
              value={board1.id}
              onChange={(e) => {
                const found = PAKISTAN_BOARDS.find(b => b.id === e.target.value);
                if (found) setBoard1(found);
              }}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
            >
              {PAKISTAN_BOARDS.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.province})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5 text-purple-500" />
              Comparison Board ({board2.name})
            </label>
            <select
              value={board2.id}
              onChange={(e) => {
                const found = PAKISTAN_BOARDS.find(b => b.id === e.target.value);
                if (found) setBoard2(found);
              }}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
            >
              {PAKISTAN_BOARDS.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.province})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3">Subject ({selectedClass.name})</th>
                <th className="px-4 py-3">{board1.name} Syllabus</th>
                <th className="px-4 py-3">{board2.name} Syllabus</th>
              </tr>
            </thead>
            <tbody>
              {subjectsForClass.map(sub => {
                const chapters1 = getChaptersForBoardAndClassAndSubject(board1.name, selectedClass.name, sub);
                const chapters2 = getChaptersForBoardAndClassAndSubject(board2.name, selectedClass.name, sub);
                const recordCtx: NavigationContext = {
                  subject: sub,
                  classLevel: selectedClass.name,
                  board: board1.name,
                };

                return (
                  <tr key={sub} className="border-b dark:border-slate-700/80 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-4 font-bold text-slate-900 dark:text-white align-top">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => onNavigateSubject?.({ subject: sub, classLevel: selectedClass.name, board: board1.name })}
                            className="inline-flex items-center gap-1.5 text-blue-600 dark:text-cyan-400 font-extrabold hover:underline cursor-pointer text-sm"
                            title={`Open ${sub} Study Center for ${selectedClass.name}`}
                          >
                            <span>{sub}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md font-mono inline-block">
                          Record: {selectedClass.name} • {sub}
                        </div>

                        {/* Common Actions */}
                        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Common Actions ({selectedClass.name} • {sub}):</div>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => onNavigateSubject?.({ subject: sub, classLevel: selectedClass.name, board: board1.name })}
                              className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-[10px] font-extrabold rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer transition-colors flex items-center gap-1"
                              title={`Study ${sub} for ${selectedClass.name}`}
                            >
                              <GraduationCap className="w-3 h-3" />
                              Study
                            </button>
                            <button
                              onClick={() => onNavigateMCQBank?.({ subject: sub, classLevel: selectedClass.name, board: board1.name })}
                              className="px-2 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-300 text-[10px] font-bold rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer transition-colors flex items-center gap-1"
                              title={`Practice MCQs for ${selectedClass.name} ${sub}`}
                            >
                              <Sparkles className="w-3 h-3" />
                              Practice MCQs
                            </button>
                            <button
                              onClick={() => onNavigateNotes?.({ subject: sub, classLevel: selectedClass.name, board: board1.name })}
                              className="px-2 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 text-[10px] font-bold rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer transition-colors flex items-center gap-1"
                              title={`View Study Notes for ${selectedClass.name} ${sub}`}
                            >
                              <FileText className="w-3 h-3" />
                              Study Notes
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Board 1 Cell */}
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300 align-top">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800">
                          <span>{board1.name}</span>
                          <button
                            onClick={() => onNavigatePastPapers?.({ subject: sub, classLevel: selectedClass.name, board: board1.name })}
                            className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 text-[10px] font-extrabold rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer flex items-center gap-1"
                            title={`View Past Papers for ${board1.name} • ${selectedClass.name} • ${sub}`}
                          >
                            <FileText className="w-2.5 h-2.5" />
                            Past Papers ({board1.code || 'Board'})
                          </button>
                        </div>

                        {chapters1.length === 0 ? (
                          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                            <span className="text-xs text-slate-400 italic">No data available</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {chapters1.map((chap, idx) => (
                              <button
                                key={idx}
                                onClick={() => onNavigateMCQBank?.({ subject: sub, classLevel: selectedClass.name, board: board1.name })}
                                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-cyan-400 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                title={`Practice MCQs for ${chap.name} (${board1.name}, ${selectedClass.name})`}
                              >
                                <span>Ch {chap.chapterNumber}: {chap.name}</span>
                                <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Board 2 Cell */}
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300 align-top">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800">
                          <span>{board2.name}</span>
                          <button
                            onClick={() => onNavigatePastPapers?.({ subject: sub, classLevel: selectedClass.name, board: board2.name })}
                            className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 text-[10px] font-extrabold rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer flex items-center gap-1"
                            title={`View Past Papers for ${board2.name} • ${selectedClass.name} • ${sub}`}
                          >
                            <FileText className="w-2.5 h-2.5" />
                            Past Papers ({board2.code || 'Board'})
                          </button>
                        </div>

                        {chapters2.length === 0 ? (
                          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                            <span className="text-xs text-slate-400 italic">No data available</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {chapters2.map((chap, idx) => (
                              <button
                                key={idx}
                                onClick={() => onNavigateMCQBank?.({ subject: sub, classLevel: selectedClass.name, board: board2.name })}
                                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-cyan-400 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                title={`Practice MCQs for ${chap.name} (${board2.name}, ${selectedClass.name})`}
                              >
                                <span>Ch {chap.chapterNumber}: {chap.name}</span>
                                <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
