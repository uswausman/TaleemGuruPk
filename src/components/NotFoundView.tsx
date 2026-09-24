import React from 'react';
import {
  FileQuestion,
  Home,
  BookOpen,
  FileText,
  Search,
  Sparkles,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { ViewMode } from '../types';

interface NotFoundViewProps {
  onNavigate: (view: ViewMode) => void;
  onOpenSearch: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onNavigate, onOpenSearch }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-8 animate-in fade-in duration-300">
      {/* 404 Visual Indicator */}
      <div className="relative inline-flex items-center justify-center">
        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-cyan-400 shadow-xl">
          <FileQuestion className="w-14 h-14 sm:w-18 sm:h-18 stroke-1" />
        </div>
        <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-black tracking-widest uppercase shadow-md">
          404
        </div>
      </div>

      {/* Main Error Message & Heading */}
      <div className="space-y-3 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
          <span>Error 404 • Resource Not Found</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Page Not Found
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          The educational page, test, or document you are looking for may have been moved, updated, or is no longer available.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Return to Homepage</span>
        </button>
        <button
          onClick={onOpenSearch}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm shadow-sm transition-all cursor-pointer"
        >
          <Search className="w-4 h-4 text-cyan-500" />
          <span>Search Educational Content</span>
        </button>
      </div>

      {/* Helpful Quick Links */}
      <div className="pt-8 border-t border-slate-200 dark:border-slate-800 max-w-2xl mx-auto text-left">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 text-center">
          Popular Educational Portals
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div
            onClick={() => onNavigate('tests')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Online Chapter Tests</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">Class 9, 10, 11 & 12 Practice</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>

          <div
            onClick={() => onNavigate('past-papers')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-emerald-500" />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Solved Past Papers</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">All Pakistan BISE Boards</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>

          <div
            onClick={() => onNavigate('mcqs')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500 transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-purple-500" />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Central MCQ Bank</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">Chapter-wise MCQs with answers</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>

          <div
            onClick={() => onNavigate('notes')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-amber-500" />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Study Notes & Formulas</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">High-yield revision sheets</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Brand Tagline */}
      <p className="text-xs text-slate-400 dark:text-slate-500 italic">
        Taleem Guru — Learn. Practice. Test. Improve.
      </p>
    </div>
  );
};
