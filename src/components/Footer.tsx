import React, { useState } from 'react';
import {
  ShieldCheck,
  BookOpen,
  FileText,
  AlertTriangle,
  ArrowRight,
  Send,
} from 'lucide-react';
import { ViewMode } from '../types';
import { ReportIssueModal } from './ReportIssueModal';

interface FooterProps {
  onNavigate: (view: ViewMode) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [email, setEmail] = useState('');

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800/80 pt-16 pb-12 relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-blue-600/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Col 1: Brand & Purpose */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden">
                <img src="/favicon.svg" alt="Taleem Guru Logo" className="w-7 h-7 object-contain" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                  TALEEM <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">GURU</span>
                </span>
                <span className="block text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                  Learn. Practice. Test. Improve.
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              TaleemGuru is an educational test preparation platform designed for Pakistani students preparing for Matric, Intermediate, MDCAT, ECAT, and competitive exams. We offer chapter-wise interactive MCQs, timed mock examinations, and solved past papers.
            </p>

            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Aligned with Pakistan National Curricula & BISE Board Syllabi</span>
            </div>
            
            {/* Newsletter */}
            <div className="pt-4">
              <h4 className="font-extrabold text-white uppercase tracking-wider text-[11px] mb-3">
                Get Weekly Exam Tips
              </h4>
              <form className="relative max-w-xs" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-3 pr-10 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-white"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Col 2: Core Portals */}
          <div className="space-y-3 text-xs">
            <h4 className="font-extrabold text-white uppercase tracking-wider text-[11px] text-slate-200">
              Core Portals
            </h4>
            <ul className="space-y-2.5 text-slate-400">
              <li>
                <button onClick={() => onNavigate('tests')} className="hover:text-cyan-300 transition-colors cursor-pointer text-left">
                  Online Testing Engine
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('quizzes')} className="hover:text-cyan-300 transition-colors cursor-pointer text-left">
                  Interactive Quiz Arena
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('mcqs')} className="hover:text-cyan-300 transition-colors cursor-pointer text-left">
                  Central MCQ Question Bank
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('past-papers')} className="hover:text-cyan-300 transition-colors cursor-pointer text-left">
                  Solved Past Papers
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('boards')} className="hover:text-cyan-300 transition-colors cursor-pointer text-left">
                  Pakistan Education Boards
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('notes')} className="hover:text-cyan-300 transition-colors cursor-pointer text-left">
                  Chapter Revision Notes
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Entrance & Competitive Exams */}
          <div className="space-y-3 text-xs">
            <h4 className="font-extrabold text-white uppercase tracking-wider text-[11px] text-slate-200">
              National Exams
            </h4>
            <ul className="space-y-2.5 text-slate-400">
              <li>
                <button onClick={() => onNavigate('entry-tests')} className="hover:text-cyan-300 transition-colors cursor-pointer text-left">
                  MDCAT & NUMS Medical
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('entry-tests')} className="hover:text-cyan-300 transition-colors cursor-pointer text-left">
                  ECAT & NUST Engineering
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('competitive-exams')} className="hover:text-cyan-300 transition-colors cursor-pointer text-left">
                  CSS & Provincial PMS
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('armed-forces')} className="hover:text-cyan-300 transition-colors cursor-pointer text-left">
                  Army PMA Long Course
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('armed-forces')} className="hover:text-cyan-300 transition-colors cursor-pointer text-left">
                  PAF GD Pilot & Navy Cadet
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Quality & Integrity */}
          <div className="space-y-3 text-xs">
            <h4 className="font-extrabold text-white uppercase tracking-wider text-[11px] text-slate-200">
              Academic Standards
            </h4>
            <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2">
              <div className="text-cyan-400 font-bold flex items-center gap-1.5 text-xs">
                <BookOpen className="w-3.5 h-3.5" /> Curriculum-Aligned Content
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Practice tests and notes are curated to match current textbook curricula and previous examination patterns.
              </p>
            </div>
            
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer pt-1"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Found an error? Report a question or typo</span>
            </button>

            <button
              onClick={() => onNavigate('admin-panel')}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>Teacher & Admin Management Portal</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <div className="pt-2 flex flex-col gap-1.5 border-t border-slate-800/60">
              <button
                id="footer-col4-privacy"
                onClick={() => onNavigate('privacy-policy')}
                className="text-[11px] text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer text-left flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span>Student Privacy Policy</span>
              </button>
              <button
                id="footer-col4-terms"
                onClick={() => onNavigate('terms-of-service')}
                className="text-[11px] text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer text-left flex items-center gap-1.5"
              >
                <FileText className="w-3 h-3 text-cyan-400" />
                <span>Terms of Service & Integrity</span>
              </button>
            </div>
          </div>
        </div>

        {/* Transparency Disclaimer Notice */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
          <p>
            <strong className="text-slate-300 font-semibold">Educational Platform Notice:</strong> TaleemGuru is an independent student study and exam preparation platform. Board names (e.g. BISE Lahore, FBISE Islamabad, BISE Karachi), university names, and public examination references are utilized solely for contextual identification and syllabus-mapping purposes. TaleemGuru is not affiliated with, endorsed by, or operated by any official examination board or government testing agency.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <p>© {new Date().getFullYear()} TALEEM GURU Pakistan. Learn. Practice. Test. Improve.</p>
            <div className="hidden sm:block text-slate-700">•</div>
            <div className="flex items-center gap-3 text-slate-400">
              <button
                id="footer-privacy-link"
                onClick={() => onNavigate('privacy-policy')}
                className="hover:text-cyan-300 transition-colors cursor-pointer text-left"
              >
                Privacy Policy
              </button>
              <span>•</span>
              <button
                id="footer-terms-link"
                onClick={() => onNavigate('terms-of-service')}
                className="hover:text-cyan-300 transition-colors cursor-pointer text-left"
              >
                Terms of Service
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Punjab • Sindh • KPK • Balochistan • Islamabad • AJK</span>
          </div>
        </div>
      </div>

      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultCategory="General Content Audit"
      />
    </footer>
  );
};
