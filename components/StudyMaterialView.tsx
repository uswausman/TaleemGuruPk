import React, { useState } from 'react';
import {
  BookOpen,
  FileText,
  Download,
  Search,
  CheckCircle,
  Filter,
  ShieldCheck,
  Bookmark,
  Sparkles,
} from 'lucide-react';
import { StudyNote } from '../types';
import { STUDY_NOTES_DATA } from '../data/mockData';
import { documentBrandingService } from '../services/documentBrandingService';

interface StudyMaterialViewProps {
  studentName: string;
  studyNotes?: StudyNote[];
}

export const StudyMaterialView: React.FC<StudyMaterialViewProps> = ({
  studentName,
  studyNotes = STUDY_NOTES_DATA,
}) => {
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const types = ['All', 'Notes', 'Short Questions', 'Long Questions', 'Formulas', 'Definitions', 'Summary'];
  const classes = ['All', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'MDCAT'];
  const subjects = ['All', 'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science'];

  const filteredMaterials = studyNotes.filter((item) => {
    const matchesType = selectedType === 'All' || item.type === selectedType;
    const matchesClass = selectedClass === 'All' || item.classLevel.includes(selectedClass);
    const matchesSubject = selectedSubject === 'All' || item.subject === selectedSubject;
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesClass && matchesSubject && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-emerald-300 border border-white/10 mb-3">
            <BookOpen className="w-3.5 h-3.5" /> High-Yield Study Library
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Study Material & Notes Archive
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base mt-2 leading-relaxed">
            Download chapter revision notes, formula cheat sheets, pairing schemes, and solved conceptual questions. All files are formatted for clean offline reading and printing.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedType === type
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {type === 'All' ? 'All Formats' : type}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Class Level</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 font-semibold text-slate-700"
            >
              {classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 font-semibold text-slate-700"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Search Keyword</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Matrices, Optics, Scheme..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 rounded-lg border border-slate-200 font-semibold text-slate-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMaterials.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {item.type}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {item.readTime}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-2">{item.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {item.classLevel} • {item.subject}
              </p>

              <p className="text-xs text-slate-600 mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                {item.contentSnippet}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Curriculum Study Material
              </span>

              <button
                onClick={() => documentBrandingService.downloadStudyNote(item)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
