import React from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Award,
  BookOpen,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Lock,
  Mail,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { ViewMode } from '../types';

interface TermsOfServiceViewProps {
  onNavigateHome: () => void;
  onNavigatePrivacy?: () => void;
}

export const TermsOfServiceView: React.FC<TermsOfServiceViewProps> = ({
  onNavigateHome,
  onNavigatePrivacy,
}) => {
  const lastUpdated = 'September 13, 2026';

  const sections = [
    { id: 'acceptance', label: '1. Acceptance of Terms' },
    { id: 'educational-purpose', label: '2. Educational Purpose & License' },
    { id: 'account-responsibilities', label: '3. Accounts & Security' },
    { id: 'academic-integrity', label: '4. Integrity & Anti-Cheating' },
    { id: 'certificates-and-scores', label: '5. Certificates & Verification' },
    { id: 'intellectual-property', label: '6. Intellectual Property' },
    { id: 'disclaimers', label: '7. Disclaimers & Independent Portal' },
    { id: 'limitation-liability', label: '8. Limitation of Liability' },
    { id: 'governing-law', label: '9. Governing Law' },
    { id: 'contact', label: '10. Contact & Inquiries' },
  ];

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div id="terms-of-service-view" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb & Top Bar */}
      <div id="terms-header" className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <button
          id="terms-back-button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-blue-500" />
          <span>Effective Date: {lastUpdated}</span>
        </div>
      </div>

      {/* Hero Banner Card */}
      <div
        id="terms-hero-card"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-8 sm:p-10 text-white shadow-xl border border-indigo-800/30"
      >
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
            <span>Academic Platform Agreement</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Terms of Service
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Please read these Terms of Service carefully before utilizing the tests, quizzes, past papers, notes, or verification features of <strong className="text-cyan-300 font-semibold">Taleem Guru</strong> (<span className="text-slate-200">taleemguru.pk</span>). By accessing or using the platform, you agree to be bound by these terms.
          </p>
        </div>

        {/* Ambient accent circle */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick Navigation Pills */}
      <div id="terms-quick-nav" className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          <span>Table of Contents</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {sections.map((sec) => (
            <button
              key={sec.id}
              id={`quick-nav-terms-${sec.id}`}
              onClick={() => scrollToSection(sec.id)}
              className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-3 py-1.5 rounded-xl transition-all border border-slate-200/60 dark:border-slate-700/60 cursor-pointer"
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Container */}
      <div className="space-y-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
        {/* Section 1 */}
        <section id="acceptance" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center justify-center">
              1
            </span>
            <span>Acceptance of Terms</span>
          </h2>
          <p>
            By accessing or creating an account on Taleem Guru Pakistan (<span className="font-semibold text-slate-900 dark:text-white">https://taleemguru.pk</span>), you confirm that you have read, understood, and agreed to be legally bound by these Terms of Service, along with our <button onClick={onNavigatePrivacy} className="text-blue-600 dark:text-blue-400 underline font-medium cursor-pointer">Privacy Policy</button>.
          </p>
          <p>
            If you do not agree with any portion of these Terms, you must discontinue using the platform immediately.
          </p>
        </section>

        {/* Section 2 */}
        <section id="educational-purpose" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center">
              2
            </span>
            <span>Educational Purpose & Limited License</span>
          </h2>
          <p>
            Taleem Guru grants you a personal, non-exclusive, non-transferable, and revocable license to access our platform for educational, non-commercial self-study and test preparation purposes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
              <div className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Permitted Activities</span>
              </div>
              <ul className="text-xs space-y-1.5 text-emerald-800 dark:text-emerald-400 list-disc list-inside">
                <li>Attempting practice MCQs and chapter assessments</li>
                <li>Taking timed simulated entry and board tests</li>
                <li>Saving bookmarks for personal exam revision</li>
                <li>Downloading verified merit certificates earned through tests</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 space-y-2">
              <div className="font-semibold text-rose-900 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Strictly Prohibited</span>
              </div>
              <ul className="text-xs space-y-1.5 text-rose-800 dark:text-rose-400 list-disc list-inside">
                <li>Bulk scraping or harvesting questions using automated bots</li>
                <li>Reselling, bundling, or commercially republishing our content</li>
                <li>Circumventing timers, test engines, or security checks</li>
                <li>Injecting malicious scripts or attempting unauthorized access</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section id="account-responsibilities" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 font-bold text-sm flex items-center justify-center">
              3
            </span>
            <span>Accounts, Credentials & Security</span>
          </h2>
          <p>
            When registering on Taleem Guru, you agree to:
          </p>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside">
            <li>Provide accurate, current, and truthful registration details (name, email, educational board).</li>
            <li>Maintain the confidentiality of your account credentials and immediately notify us of any suspected unauthorized access.</li>
            <li>Accept full responsibility for all activities conducted under your registered account.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section id="academic-integrity" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center justify-center">
              4
            </span>
            <span>Academic Integrity & Fair Testing Standard</span>
          </h2>
          <p>
            Taleem Guru is built to encourage genuine academic self-improvement. We strictly enforce server-authoritative score calculation and validation:
          </p>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Zero-Tolerance Policy on Score Tampering</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Any attempt to manipulate client-side JavaScript, tamper with HTTP request payloads to forge marks, bypass timers, or falsely inflate leaderboard standings will result in automatic invalidation of the test results and immediate suspension of the candidate account.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section id="certificates-and-scores" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center justify-center">
              5
            </span>
            <span>Merit Certificates & Public Verification</span>
          </h2>
          <p>
            Candidates who attain a passing score of <strong>60% or above</strong> on designated qualifying tests are issued a unique Taleem Guru Merit Certificate.
          </p>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside">
            <li><strong>Digital Verification:</strong> Each certificate contains a unique alphanumeric identifier verifiable at <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">/verify/:id</code>.</li>
            <li><strong>Non-Government Status:</strong> Certificates issued by Taleem Guru certify performance on our simulated online practice assessments. They do not constitute official board certificates issued by the Ministry of Federal Education or provincial BISE boards.</li>
            <li><strong>Revocation:</strong> We reserve the right to revoke certificates found to be obtained through unfair means or unauthorized software assistance.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section id="intellectual-property" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 font-bold text-sm flex items-center justify-center">
              6
            </span>
            <span>Intellectual Property & Curriculum Alignment</span>
          </h2>
          <p>
            The software, testing engine algorithms, question banks, study summaries, visual brand assets, and platform design of Taleem Guru are the intellectual property of Taleem Guru Pakistan.
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Past paper questions and curriculum outlines reference public examination standards established by Pakistan’s textbook boards and examination bodies for educational fair-use preparatory practice.
          </p>
        </section>

        {/* Section 7 */}
        <section id="disclaimers" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 font-bold text-sm flex items-center justify-center">
              7
            </span>
            <span>Disclaimers & Independent Portal</span>
          </h2>
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-300 space-y-2">
            <div className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Independent Educational Service</span>
            </div>
            <p className="leading-relaxed">
              Taleem Guru is an independent ed-tech preparation portal. We are not officially affiliated with, endorsed by, or representing any government examination authority, including BISE boards, PMC (Pakistan Medical Commission), NUMS, FPSC, PPSC, or armed forces recruitment directorates. All names, marks, and syllabi referenced are used solely to identify academic exam preparation categories.
            </p>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            While we strive for 100% accuracy in our question bank, solutions, and explanations, the materials are provided "as is" without warranty of any kind.
          </p>
        </section>

        {/* Section 8 */}
        <section id="limitation-liability" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center">
              8
            </span>
            <span>Limitation of Liability</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            To the fullest extent permitted by applicable law, Taleem Guru and its administrators shall not be held liable for any direct, indirect, incidental, or consequential damages resulting from your use or inability to use the platform, including test timer interruptions, network failures, or examination results obtained in official board or competitive exams.
          </p>
        </section>

        {/* Section 9 */}
        <section id="governing-law" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center justify-center">
              9
            </span>
            <span>Governing Law & Dispute Resolution</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            These Terms of Service shall be governed by and construed in accordance with the substantive laws of the <strong>Islamic Republic of Pakistan</strong>. Any legal dispute or claim arising out of these Terms shall be subject to the exclusive jurisdiction of the competent courts in Pakistan.
          </p>
        </section>

        {/* Section 10 */}
        <section id="contact" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center justify-center">
              10
            </span>
            <span>Contact & Support</span>
          </h2>
          <p>
            If you have questions regarding these Terms of Service or wish to report academic content corrections:
          </p>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <Mail className="w-4 h-4 text-blue-500" />
              <span>Email: support@taleemguru.pk</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Platform: <strong>TALEEM GURU Pakistan</strong>
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Web Portal: <a href="https://taleemguru.pk" className="text-blue-600 dark:text-blue-400 underline">https://taleemguru.pk</a>
            </p>
          </div>
        </section>
      </div>

      {/* Bottom Cross Navigation */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>Looking for data practices?</span>
          {onNavigatePrivacy && (
            <button
              id="terms-to-privacy-link"
              onClick={onNavigatePrivacy}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
            >
              Read Privacy Policy →
            </button>
          )}
        </div>

        <button
          id="terms-bottom-back"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Homepage</span>
        </button>
      </div>
    </div>
  );
};
