import React, { useState } from 'react';
import { Card } from './ui/Card';
import { BookOpen, ChevronDown } from 'lucide-react';

interface SyllabusData {
  name: string;
  subjects: Record<string, string[]>;
}

const SYLLABI: SyllabusData[] = [
  {
    name: 'MDCAT 2026',
    subjects: {
      'Physics': ['Measurements', 'Vectors', 'Motion & Force', 'Work & Energy'],
      'Biology': ['Cell Biology', 'Biological Molecules', 'Genetics'],
      'Chemistry': ['Atomic Structure', 'Chemical Bonding', 'States of Matter'],
    },
  },
  {
    name: 'BISE Lahore Class 12',
    subjects: {
      'Physics': ['Electrostatics', 'Current Electricity', 'Electromagnetism', 'Work & Energy'],
      'Biology': ['Homeostasis', 'Support and Movement', 'Genetics'],
      'Chemistry': ['S and P Block Elements', 'Chemical Bonding', 'Hydrocarbons'],
    },
  },
];

export const SyllabusComparison: React.FC = () => {
  const [exam1, setExam1] = useState<SyllabusData>(SYLLABI[0]);
  const [exam2, setExam2] = useState<SyllabusData>(SYLLABI[1]);

  const allSubjects = Array.from(new Set([...Object.keys(exam1.subjects), ...Object.keys(exam2.subjects)]));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
        <BookOpen className="w-5 h-5 text-indigo-500" />
        Compare Exam Syllabi
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <select value={exam1.name} onChange={(e) => setExam1(SYLLABI.find(s => s.name === e.target.value) || SYLLABI[0])} className="p-2 border rounded-xl text-sm">
          {SYLLABI.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <select value={exam2.name} onChange={(e) => setExam2(SYLLABI.find(s => s.name === e.target.value) || SYLLABI[1])} className="p-2 border rounded-xl text-sm">
          {SYLLABI.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">{exam1.name}</th>
              <th className="px-4 py-3">{exam2.name}</th>
            </tr>
          </thead>
          <tbody>
            {allSubjects.map(sub => (
              <tr key={sub} className="border-b dark:border-slate-700">
                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{sub}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{(exam1.subjects[sub] || []).join(', ')}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{(exam2.subjects[sub] || []).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
