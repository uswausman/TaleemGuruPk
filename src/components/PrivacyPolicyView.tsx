import React from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  Database,
  UserCheck,
  FileText,
  Mail,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  HelpCircle,
  Award,
  BookOpen,
} from 'lucide-react';
import { ViewMode } from '../types';

interface PrivacyPolicyViewProps {
  onNavigateHome: () => void;
  onNavigateTerms?: () => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({
  onNavigateHome,
  onNavigateTerms,
}) => {
  const lastUpdated = 'September 13, 2026';

  const sections = [
    { id: 'introduction', label: '1. Introduction & Overview' },
    { id: 'data-we-collect', label: '2. Information We Collect' },
    { id: 'how-we-use-data', label: '3. How We Use Your Data' },
    { id: 'authentication-storage', label: '4. Authentication & Security' },
    { id: 'cookies-local-storage', label: '5. Cookies & Local Storage' },
    { id: 'third-party-sharing', label: '6. Third-Party Sharing' },
    { id: 'student-rights', label: '7. Student Data Rights' },
    { id: 'minor-protection', label: '8. Minors & Student Safety' },
    { id: 'contact-us', label: '9. Contact & Inquiries' },
  ];

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div id="privacy-policy-view" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb & Top Bar */}
      <div id="privacy-policy-header" className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <button
          id="privacy-back-button"
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
        id="privacy-policy-hero-card"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 p-8 sm:p-10 text-white shadow-xl border border-blue-800/30"
      >
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Academic Data Protection Standard</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Privacy Policy
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            At <strong className="text-cyan-300 font-semibold">Taleem Guru Pakistan</strong>, we are committed to protecting the privacy and personal data of every student, teacher, and candidate preparing for BISE Board examinations, MDCAT, ECAT, CSS, PMS, and Armed Forces recruitment tests across Pakistan.
          </p>
        </div>

        {/* Ambient accent circle */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick Navigation Pills */}
      <div id="privacy-quick-nav" className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          <span>Table of Contents</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {sections.map((sec) => (
            <button
              key={sec.id}
              id={`quick-nav-${sec.id}`}
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
        <section id="introduction" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center justify-center">
              1
            </span>
            <span>Introduction & Scope</span>
          </h2>
          <p>
            Taleem Guru (<span className="font-semibold text-slate-900 dark:text-white">taleemguru.pk</span>) operates an online educational assessment and exam preparation platform designed for students across all provinces and administrative areas of Pakistan (Punjab, Sindh, Khyber Pakhtunkhwa, Balochistan, Islamabad Federal Capital, Azad Jammu & Kashmir, and Gilgit-Baltistan).
          </p>
          <p>
            This Privacy Policy describes how we collect, store, process, and protect your information when you access our web application, practice chapter-wise computerized tests, download solved past papers, attempt full-length timed mock exams, bookmark questions, and obtain verifiable merit certificates.
          </p>
        </section>

        {/* Section 2 */}
        <section id="data-we-collect" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center">
              2
            </span>
            <span>Information We Collect</span>
          </h2>
          <p>
            We adhere to strict data minimization principles. We only collect the information necessary to provide an authentic, personalized online testing and learning experience:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-500" />
                <span>Account & Profile Credentials</span>
              </div>
              <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400 list-disc list-inside">
                <li>Candidate name and email address</li>
                <li>Chosen education board (e.g., BISE Lahore, Federal Board, BISE Karachi)</li>
                <li>Target grade or exam (Class 9, 10, 11, 12, MDCAT, ECAT, CSS)</li>
                <li>Student avatar representation</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                <span>Academic & Testing Performance Data</span>
              </div>
              <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400 list-disc list-inside">
                <li>Selected test answers and elapsed completion time</li>
                <li>Scores obtained, percentages, and calculated letter grades</li>
                <li>Bookmarked questions and revision lists</li>
                <li>Generated digital merit certificates and verification tokens</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section id="how-we-use-data" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 font-bold text-sm flex items-center justify-center">
              3
            </span>
            <span>How We Use Your Data</span>
          </h2>
          <p>
            Your information is used exclusively to facilitate academic self-assessment and exam readiness:
          </p>
          <ul className="space-y-2.5 pt-1">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
              <span>
                <strong>Instant Scoring & Analytics:</strong> To compute marks, enforce negative marking rules, determine strengths/weaknesses across chapters, and calculate percentages.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
              <span>
                <strong>Merit Certification:</strong> To generate verified PDF completion certificates for test scores meeting the merit threshold (60%+), complete with secure verification URLs.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
              <span>
                <strong>Privacy-Preserving Leaderboards:</strong> Public leaderboards display candidate display names, avatars, and test points. Your personal email address and private identifiers are never exposed.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
              <span>
                <strong>Cross-Device Synchronization:</strong> Allowing you to practice on mobile, review answers on tablet, and take mock tests on desktop seamlessly.
              </span>
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section id="authentication-storage" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center justify-center">
              4
            </span>
            <span>Authentication, Storage & Infrastructure Security</span>
          </h2>
          <p>
            Taleem Guru employs defense-in-depth architectural security to safeguard your data:
          </p>
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
              <Lock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-white block">Cryptographic Authentication Tokens</strong>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Authentication is managed via industry-standard Supabase Auth (JWT). We never store raw or plaintext passwords. Passwords undergo irreversible salted bcrypt hashing.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
              <Database className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-white block">PostgreSQL Row-Level Access Controls (IDOR Protection)</strong>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  All personal records (test scores, bookmarks, certificates) are strictly isolated by your authenticated UID. No candidate can view, edit, or delete another student’s private attempts.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-white block">Transport Layer Security (TLS 1.3 / HTTPS)</strong>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  All transmissions between your browser and our server are encrypted with modern TLS with strict HSTS enforcement.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section id="cookies-local-storage" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center justify-center">
              5
            </span>
            <span>Cookies & Client-Side Local Storage</span>
          </h2>
          <p>
            Taleem Guru does not use intrusive tracking cookies or cross-site behavioral advertising cookies. We use browser storage strictly for essential functional operations:
          </p>
          <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-400 list-disc list-inside">
            <li><strong>Theme Preference:</strong> Storing your preference for Light Mode or Dark Mode.</li>
            <li><strong>Session Resilience:</strong> Retaining in-progress test timer state locally in the event of an accidental browser refresh.</li>
            <li><strong>Offline Question Cache:</strong> Temporarily caching offline MCQs to minimize mobile data usage across Pakistan.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section id="third-party-sharing" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 font-bold text-sm flex items-center justify-center">
              6
            </span>
            <span>Third-Party Disclosures & Commercial Policy</span>
          </h2>
          <p className="font-semibold text-slate-900 dark:text-white">
            We do NOT sell, rent, monetize, or trade student personal records with commercial third parties or data brokers under any circumstances.
          </p>
          <p>
            Data is processed solely by trusted infrastructure providers supporting our application operations (e.g., Supabase, Vercel, and Cloud SQL) bound by strict confidentiality and security commitments.
          </p>
        </section>

        {/* Section 7 */}
        <section id="student-rights" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 font-bold text-sm flex items-center justify-center">
              7
            </span>
            <span>Student Data Rights & Account Deletion</span>
          </h2>
          <p>
            As a candidate or registered student, you maintain full control over your academic data:
          </p>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside">
            <li><strong>Access & Review:</strong> You may review all past test attempts, answers, and scores on your Student Dashboard at any time.</li>
            <li><strong>Profile Modification:</strong> You can edit your name, board, and target exam directly from your Profile settings.</li>
            <li><strong>Account Deletion:</strong> You may request full permanent deletion of your account and associated score histories by emailing <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">support@taleemguru.pk</code>. Upon verification, your records will be irreversibly expunged.</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section id="minor-protection" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 font-bold text-sm flex items-center justify-center">
              8
            </span>
            <span>Minors & Student Safety</span>
          </h2>
          <p>
            Many of our users are school and college students under the age of 18 preparing for Matric (9th/10th) and Intermediate (11th/12th) board exams. We do not solicit sensitive personal information, credit card numbers, or physical home addresses from students. Parents and legal guardians are welcome to contact our administration if they have any inquiries regarding a student’s account.
          </p>
        </section>

        {/* Section 9 */}
        <section id="contact-us" className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center justify-center">
              9
            </span>
            <span>Contact Information & Privacy Inquiries</span>
          </h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our student data practices, please contact our academic support team:
          </p>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <Mail className="w-4 h-4 text-blue-500" />
              <span>Email: support@taleemguru.pk</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Platform: <strong>TALEEM GURU Pakistan</strong> (Online Examination & Testing Portal)
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Domain: <a href="https://taleemguru.pk" className="text-blue-600 dark:text-blue-400 underline">https://taleemguru.pk</a>
            </p>
          </div>
        </section>
      </div>

      {/* Bottom Cross Navigation */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>Need to review our terms?</span>
          {onNavigateTerms && (
            <button
              id="privacy-to-terms-link"
              onClick={onNavigateTerms}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
            >
              Read Terms of Service →
            </button>
          )}
        </div>

        <button
          id="privacy-bottom-back"
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
