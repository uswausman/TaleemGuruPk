import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Play,
  HelpCircle,
  Award,
  BookOpen,
  Landmark,
  Shield,
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  Flame,
  GraduationCap,
  Briefcase,
  Layers,
  Star,
  ChevronRight,
  Calculator,
  Atom,
  FlaskConical,
  Dna,
  Code2,
  Languages,
  BookMarked,
  Compass,
  Globe2,
  BrainCircuit,
  Check,
  X,
  RefreshCw,
  Download,
  CheckCircle,
  FileQuestion,
  Trophy,
  Medal,
  Crown,
  BellRing,
  ExternalLink,
  Target,
} from 'lucide-react';
import { TestConfig, MCQ, PastPaper, StudyNote, TestResult } from '../types';
import {
  POPULAR_TESTS,
  PAST_PAPERS_DATA,
  STUDY_NOTES_DATA,
  MCQS_DATABASE,
} from '../data/mockData';
import { fetchLeaderboardApi, fetchPublicStatsApi } from '../lib/api';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { SuccessStories } from './SuccessStories';
import { documentBrandingService } from '../services/documentBrandingService';

interface HomepageProps {
  onStartTest: (config: TestConfig) => void;
  onNavigateTab: (tab: string) => void;
  onOpenSearch: () => void;
  allTests: TestConfig[];
  historyResults: TestResult[];
}

export const Homepage: React.FC<HomepageProps> = ({
  onStartTest,
  onNavigateTab,
  onOpenSearch,
  allTests,
  historyResults,
}) => {
  // Announcement banner dismiss state
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  // Dynamic database statistics and leaderboard
  const [platformStats, setPlatformStats] = useState<{
    registeredStudents: number;
    testSubmissions: number;
    certificatesIssued: number;
  } | null>(null);
  const [leaderboardList, setLeaderboardList] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetchPublicStatsApi().then((data) => {
      if (isMounted && data) setPlatformStats(data);
    });
    fetchLeaderboardApi().then((users) => {
      if (isMounted && Array.isArray(users)) setLeaderboardList(users);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Province selection state for BISE Boards section
  const [selectedProvince, setSelectedProvince] = useState<'punjab' | 'sindh' | 'kpk' | 'federal' | 'balochistan'>('punjab');

  // Interactive Live MCQ sample state on Hero
  const [sampleMcqIndex, setSampleMcqIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  // Featured MCQ Bank interactive practice tab state
  const [activeMcqSubject, setActiveMcqSubject] = useState<string>('Physics');
  const [featuredMcqSelection, setFeaturedMcqSelection] = useState<{ [id: string]: number }>({});
  const [featuredMcqAnswered, setFeaturedMcqAnswered] = useState<{ [id: string]: boolean }>({});

  const sampleMcqs = [
    {
      question: 'What is the SI unit of electric current?',
      options: ['Volt (V)', 'Ampere (A)', 'Ohm (Ω)', 'Watt (W)'],
      correctIndex: 1,
      subject: 'Physics • Class 10 & 12',
      explanation: 'The SI base unit of electric current is the Ampere (A), named after André-Marie Ampère.',
    },
    {
      question: 'Which organelle is known as the powerhouse of the eukaryotic cell?',
      options: ['Ribosome', 'Golgi Apparatus', 'Mitochondria', 'Endoplasmic Reticulum'],
      correctIndex: 2,
      subject: 'Biology • MDCAT Prep',
      explanation: 'Mitochondria generate most of the chemical energy needed to power the cell’s biochemical reactions in the form of ATP.',
    },
    {
      question: 'The Objectives Resolution was passed by the Constituent Assembly of Pakistan in which year?',
      options: ['1947', '1948', '1949', '1956'],
      correctIndex: 2,
      subject: 'Pakistan Studies • CSS / PMS',
      explanation: 'The Objectives Resolution was passed by the first Constituent Assembly of Pakistan on March 12, 1949.',
    },
    {
      question: 'Which functional group characterizes carboxylic acids in organic chemistry?',
      options: ['-OH (Hydroxyl)', '-CHO (Aldehyde)', '-COOH (Carboxyl)', '-CO- (Ketone)'],
      correctIndex: 2,
      subject: 'Chemistry • Class 10 & 12',
      explanation: 'Carboxylic acids contain the carboxyl group (-COOH), consisting of a carbonyl group (C=O) and a hydroxyl group (-OH).',
    },
    {
      question: 'If log₁₀(x) = 3, what is the value of x in basic logarithms?',
      options: ['30', '100', '1,000', '10,000'],
      correctIndex: 2,
      subject: 'Mathematics • Class 9 & ECAT',
      explanation: 'By the definition of logarithms, log_b(x) = y implies x = b^y. Thus, x = 10^3 = 1,000.',
    },
  ];

  const currentSample = sampleMcqs[sampleMcqIndex];

  const handleSelectOption = (idx: number) => {
    if (hasAnswered) return;
    setSelectedOption(idx);
    setHasAnswered(true);
  };

  const handleNextSample = () => {
    setSelectedOption(null);
    setHasAnswered(false);
    setSampleMcqIndex((prev) => (prev + 1) % sampleMcqs.length);
  };

  // Subjects data
  const subjects = [
    { id: 'physics', name: 'Physics', icon: <Atom className="w-5 h-5 text-sky-500" />, desc: 'Optics, Waves, Electromagnetism & Modern Physics' },
    { id: 'chemistry', name: 'Chemistry', icon: <FlaskConical className="w-5 h-5 text-emerald-500" />, desc: 'Organic, Inorganic & Physical Chemistry Formulas' },
    { id: 'biology', name: 'Biology', icon: <Dna className="w-5 h-5 text-rose-500" />, desc: 'Cell Biology, Genetics, Circulation & Physiology' },
    { id: 'mathematics', name: 'Mathematics', icon: <Calculator className="w-5 h-5 text-amber-500" />, desc: 'Algebra, Trigonometry, Calculus & Matrices' },
    { id: 'computer', name: 'Computer Science', icon: <Code2 className="w-5 h-5 text-indigo-500" />, desc: 'C++, Python, Database, Logic Gates & OS' },
    { id: 'english', name: 'English Grammar', icon: <Languages className="w-5 h-5 text-cyan-500" />, desc: 'Vocabulary, Prepositions, Tenses & Comprehension' },
    { id: 'pak-studies', name: 'Pakistan Studies', icon: <Landmark className="w-5 h-5 text-emerald-600" />, desc: 'Pakistan Movement, Constitution, History & Geography' },
    { id: 'islamiat', name: 'Islamic Studies', icon: <BookMarked className="w-5 h-5 text-teal-500" />, desc: 'Quranic Ayats, Hadith, Seerat-un-Nabi & Fiqh' },
    { id: 'general-knowledge', name: 'General Knowledge', icon: <Globe2 className="w-5 h-5 text-blue-500" />, desc: 'World Geography, Capitals, International Treaties' },
    { id: 'iq-intelligence', name: 'IQ & Intelligence', icon: <BrainCircuit className="w-5 h-5 text-purple-500" />, desc: 'Verbal, Non-Verbal Analogies & Series Completion' },
  ];

  // Classes list with academic focus
  const academicClasses = [
    {
      title: 'Class 9 (Matric Pt 1)',
      subtitle: 'SSC Part 1 Board Syllabus',
      tag: 'Matric',
      subjects: ['Physics', 'Chemistry', 'Biology', 'Math', 'English', 'Islamiat'],
      focus: 'Board Pattern MCQs & Notes',
      badge: 'BISE Punjab / Federal / Sindh',
      icon: '🎒',
    },
    {
      title: 'Class 10 (Matric Pt 2)',
      subtitle: 'SSC Part 2 Final Board Exams',
      tag: 'Matric',
      subjects: ['Physics', 'Chemistry', 'Biology', 'Math', 'Pak Studies', 'English'],
      focus: 'Solved Past Papers & Model Mocks',
      badge: 'Board Exam Preparation',
      icon: '📐',
    },
    {
      title: 'Class 11 (FSc / ICS Pt 1)',
      subtitle: 'HSSC Part 1 Intermediate',
      tag: 'Intermediate',
      subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer', 'English'],
      focus: 'Pre-Medical & Pre-Engineering',
      badge: 'FSc / ICS Syllabus',
      icon: '🔬',
    },
    {
      title: 'Class 12 (FSc / ICS Pt 2)',
      subtitle: 'HSSC Part 2 Pre-University Exams',
      tag: 'Intermediate',
      subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer', 'Pak Studies'],
      focus: 'Board Exam Series & Notes',
      badge: 'Inter Part 2 Syllabus',
      icon: '🎓',
    },
    {
      title: 'MDCAT & NUMS',
      subtitle: 'Medical & Dental Colleges Admission',
      tag: 'Medical Entry',
      subjects: ['Biology', 'Chemistry', 'Physics', 'English', 'Logic'],
      focus: 'High-Yield Medical Entry MCQs',
      badge: 'PM&DC Syllabus Format',
      icon: '🩺',
    },
    {
      title: 'ECAT & NUST NET',
      subtitle: 'Engineering & Computing Entrance',
      tag: 'Engineering Entry',
      subjects: ['Mathematics', 'Physics', 'Chemistry', 'Computer', 'English'],
      focus: 'Engineering Entrance Mock Papers',
      badge: 'UET & NUST Pattern',
      icon: '⚡',
    },
    {
      title: 'CSS & PMS Screening',
      subtitle: 'Central Superior Services & Provincial Civil Service',
      tag: 'Competitive Exam',
      subjects: ['General Science', 'Current Affairs', 'Pakistan Affairs', 'Islamic Studies', 'Math', 'IQ'],
      focus: 'MPT Screening MCQs & Solved Papers',
      badge: 'FPSC MPT Pattern',
      icon: '⚖️',
    },
    {
      title: 'Armed Forces Initial',
      subtitle: 'Army PMA, PAF GDP & Navy Cadets',
      tag: 'Defense Forces',
      subjects: ['Physics', 'Mathematics', 'English', 'Intelligence'],
      focus: 'Intelligence & Academic Tests',
      badge: 'ASRC Format Guide',
      icon: '🎖️',
    },
  ];

  const allClassSubjects = React.useMemo(() => {
    const subs = new Set<string>();
    academicClasses.forEach(cls => cls.subjects.forEach(s => subs.add(s)));
    return ['All', ...Array.from(subs).sort()];
  }, [academicClasses]);

  const [selectedClassSubject, setSelectedClassSubject] = useState<string>('All');
  const filteredAcademicClasses = React.useMemo(() => {
    if (selectedClassSubject === 'All') return academicClasses;
    return academicClasses.filter(cls => cls.subjects.includes(selectedClassSubject));
  }, [selectedClassSubject, academicClasses]);

  // Pakistan BISE Boards data
  const boardsData = {
    punjab: [
      { name: 'BISE Lahore', desc: 'Lahore, Kasur, Nankana Sahib, Sheikhupura', coverage: 'Past Papers & Tests' },
      { name: 'BISE Rawalpindi', desc: 'Rawalpindi, Attock, Chakwal, Jhelum', coverage: 'Past Papers & Tests' },
      { name: 'BISE Gujranwala', desc: 'Gujranwala, Gujrat, Sialkot, Narowal, Hafizabad, Mandi Bahauddin', coverage: 'Past Papers & Tests' },
      { name: 'BISE Faisalabad', desc: 'Faisalabad, Chiniot, Jhang, Toba Tek Singh', coverage: 'Past Papers & Tests' },
      { name: 'BISE Multan', desc: 'Multan, Khanewal, Lodhran, Vehari', coverage: 'Past Papers & Tests' },
      { name: 'BISE Sargodha', desc: 'Sargodha, Bhakkar, Khushab, Mianwali', coverage: 'Past Papers & Tests' },
      { name: 'BISE Bahawalpur', desc: 'Bahawalpur, Bahawalnagar, Rahim Yar Khan', coverage: 'Past Papers & Tests' },
      { name: 'BISE Sahiwal', desc: 'Sahiwal, Okara, Pakpattan', coverage: 'Past Papers & Tests' },
      { name: 'BISE DG Khan', desc: 'DG Khan, Layyah, Muzaffargarh, Rajanpur', coverage: 'Past Papers & Tests' },
    ],
    sindh: [
      { name: 'BISE Karachi (BSEK & BIEK)', desc: 'Matric (BSEK) & Intermediate (BIEK) Boards Karachi', coverage: 'Past Papers & Tests' },
      { name: 'BISE Hyderabad', desc: 'Hyderabad, Jamshoro, Matiari, Tando Allahyar, Dadu, Badin', coverage: 'Past Papers & Tests' },
      { name: 'BISE Sukkur', desc: 'Sukkur, Ghotki, Khairpur', coverage: 'Past Papers & Tests' },
      { name: 'BISE Larkana', desc: 'Larkana, Kambar Shahdadkot, Shikarpur, Jacobabad, Kashmore', coverage: 'Past Papers & Tests' },
      { name: 'BISE Mirpurkhas', desc: 'Mirpurkhas, Umerkot, Tharparkar', coverage: 'Past Papers & Tests' },
      { name: 'BISE Shaheed Benazirabad', desc: 'Nawabshah, Sanghar, Naushahro Feroze', coverage: 'Past Papers & Tests' },
    ],
    kpk: [
      { name: 'BISE Peshawar', desc: 'Peshawar, Charsadda, Nowshera, Khyber, Mohmand', coverage: 'Past Papers & Tests' },
      { name: 'BISE Mardan', desc: 'Mardan, Swabi', coverage: 'Past Papers & Tests' },
      { name: 'BISE Swat', desc: 'Swat, Buner, Shangla', coverage: 'Past Papers & Tests' },
      { name: 'BISE Abbottabad', desc: 'Abbottabad, Haripur, Mansehra, Battagram, Kohistan, Torghar', coverage: 'Past Papers & Tests' },
      { name: 'BISE Malakand', desc: 'Malakand, Dir Lower, Dir Upper, Chitral, Bajaur', coverage: 'Past Papers & Tests' },
      { name: 'BISE Kohat', desc: 'Kohat, Hangu, Karak, Kurram, Orakzai', coverage: 'Past Papers & Tests' },
      { name: 'BISE Bannu', desc: 'Bannu, Lakki Marwat, North Waziristan', coverage: 'Past Papers & Tests' },
      { name: 'BISE DI Khan', desc: 'Dera Ismail Khan, Tank, South Waziristan', coverage: 'Past Papers & Tests' },
    ],
    federal: [
      { name: 'FBISE Islamabad', desc: 'Federal Board Islamabad, Cantonment, Army Public Schools & Institutes', coverage: 'Past Papers & Tests' },
      { name: 'AJK BISE Mirpur', desc: 'Azad Jammu & Kashmir Board of Intermediate and Secondary Education', coverage: 'Past Papers & Tests' },
      { name: 'Karakoram Board (GB)', desc: 'Gilgit-Baltistan Education Board covering Gilgit, Skardu, Diamer, Hunza', coverage: 'Past Papers & Tests' },
    ],
    balochistan: [
      { name: 'BBISE Quetta', desc: 'Balochistan Board Quetta, Pshin, Qilla Abdullah, Chaman, Mastung, Ziarat', coverage: 'Past Papers & Tests' },
      { name: 'BISE Turbat (Makran)', desc: 'Kech, Gwadar, Panjgur', coverage: 'Past Papers & Tests' },
      { name: 'BISE Loralai (Zhob)', desc: 'Loralai, Barkhan, Musakhel, Zhob, Sherani, Dukki', coverage: 'Past Papers & Tests' },
      { name: 'BISE Khuzdar (Kalat)', desc: 'Khuzdar, Kalat, Awaran, Kharan, Washuk, Lasbela', coverage: 'Past Papers & Tests' },
    ],
  };

  // Filtered MCQs for the featured MCQ Bank section
  const featuredMCQsList = MCQS_DATABASE.filter(
    (m) => m.subject.toLowerCase() === activeMcqSubject.toLowerCase()
  ).slice(0, 3);

  const filteredBoards = React.useMemo(() => boardsData[selectedProvince], [selectedProvince]);

  const handleSelectFeaturedMcq = (mcqId: string, optionIdx: number) => {
    if (featuredMcqAnswered[mcqId]) return;
    setFeaturedMcqSelection((prev) => ({ ...prev, [mcqId]: optionIdx }));
    setFeaturedMcqAnswered((prev) => ({ ...prev, [mcqId]: true }));
  };

  return (
    <div className="space-y-12 sm:space-y-16 pb-20 overflow-x-hidden">
      {/* 1. ANNOUNCEMENT BAR */}
      {showAnnouncement && (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white text-xs px-4 py-2.5 sm:py-3 shadow-md relative z-30 animate-in fade-in duration-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              <span className="font-extrabold tracking-wide uppercase text-[10px] bg-white/20 px-2 py-0.5 rounded-md shrink-0">
                2026 Session Live
              </span>
              <p className="truncate text-blue-50 font-medium">
                Annual Board Exam Model Papers, MDCAT & ECAT Mock Practice are now available. Learn. Practice. Test. Improve.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => onNavigateTab('tests')}
                className="hidden sm:inline-flex items-center gap-1 font-bold text-cyan-300 hover:text-white underline underline-offset-2 cursor-pointer"
              >
                <span>Take a Free Mock Test</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowAnnouncement(false)}
                className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/80 hover:text-white cursor-pointer"
                title="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white pt-8 pb-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/15 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Brand, Headline, Value Props & CTAs */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            {/* Top Brand Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-blue-500/15 text-cyan-300 border border-blue-400/30 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>TALEEM GURU • Pakistan's Smart Online Test Platform</span>
            </div>

            {/* Display Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white">
              Learn. Practice.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-300">
                Test. Improve.
              </span>
            </h1>

            {/* Explanatory Value Proposition */}
            <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed mx-auto lg:mx-0">
              Taleem Guru supports Pakistani students with <strong>chapter-wise MCQs</strong>, <strong>timed mock quizzes</strong>, comprehensive <strong>study notes</strong>, <strong>board syllabi</strong>, solved <strong>past papers</strong>, and structured preparation for BISE Boards, MDCAT, ECAT, CSS, and Armed Forces.
            </p>

            {/* Value Highlights Chips */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300 font-medium flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Chapter-Wise MCQs
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300 font-medium flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-cyan-400" /> Timed Online Quizzes
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300 font-medium flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-amber-400" /> Chapter Revision Notes
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300 font-medium flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-blue-400" /> Solved Past Papers
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300 font-medium flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-purple-400" /> Pakistan BISE Boards
              </span>
            </div>

            {/* Instant Search Bar */}
            <div className="pt-2 max-w-xl mx-auto lg:mx-0">
              <div
                onClick={onOpenSearch}
                className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/90 hover:border-cyan-500/50 p-3 sm:p-3.5 rounded-2xl flex items-center justify-between text-left text-slate-400 shadow-xl transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <Search className="w-5 h-5 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-xs sm:text-sm font-medium truncate">
                    Search MCQs, mock tests, boards, past papers, notes...
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="hidden sm:inline-block text-[11px] font-mono bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg text-cyan-300 font-bold">
                    ⌘K
                  </span>
                </div>
              </div>
            </div>

            {/* 4. MAIN CTA BUTTONS */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-3">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Play className="w-4 h-4 fill-current" />}
                onClick={() => onNavigateTab('quizzes')}
              >
                Start Quiz
              </Button>

              <Button
                variant="secondary"
                size="md"
                leftIcon={<Landmark className="w-4 h-4 text-emerald-400" />}
                onClick={() => onNavigateTab('boards')}
              >
                Explore Boards
              </Button>

              <Button
                variant="secondary"
                size="md"
                leftIcon={<BookOpen className="w-4 h-4 text-cyan-400" />}
                onClick={() => onNavigateTab('study-material')}
              >
                Browse Notes
              </Button>

              <Button
                variant="secondary"
                size="md"
                leftIcon={<FileText className="w-4 h-4 text-amber-400" />}
                onClick={() => onNavigateTab('past-papers')}
              >
                Past Papers
              </Button>
            </div>
          </div>

          {/* Right Column: Live Interactive Assessment Widget Preview */}
          <div className="lg:col-span-5 relative mt-4 lg:mt-0">
            {/* Live MCQ Interactive Card */}
            <div className="bg-slate-800/90 border border-slate-700/90 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl relative z-10 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-xs font-bold text-slate-200">Live Interactive Question</span>
                </div>
                <Badge variant="cyan" size="xs">
                  {currentSample.subject}
                </Badge>
              </div>

              {/* Question */}
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Sample #{sampleMcqIndex + 1} of {sampleMcqs.length}</div>
                <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                  {currentSample.question}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {currentSample.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === currentSample.correctIndex;
                  let btnStyle = 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:bg-slate-700/80 hover:text-white';

                  if (hasAnswered) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-950/90 border-emerald-500 text-emerald-200 font-bold ring-1 ring-emerald-500';
                    } else if (isSelected && !isCorrect) {
                      btnStyle = 'bg-rose-950/90 border-rose-500 text-rose-200 font-bold';
                    } else {
                      btnStyle = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={hasAnswered}
                      className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-2 cursor-pointer ${btnStyle}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-1">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0 border border-slate-700">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="truncate">{opt}</span>
                      </div>
                      {hasAnswered && isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {hasAnswered && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Feedback & Next Button */}
              {hasAnswered ? (
                <div className="pt-2 space-y-3 animate-in fade-in duration-200">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300 space-y-1">
                    <div className="font-bold text-cyan-400 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5" /> Explanation & Solution:
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{currentSample.explanation}</p>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="secondary"
                      size="xs"
                      fullWidth
                      leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                      onClick={handleNextSample}
                    >
                      Next Sample
                    </Button>

                    <Button
                      variant="primary"
                      size="xs"
                      fullWidth
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                      onClick={() => onStartTest(POPULAR_TESTS[0])}
                    >
                      Full 50-MCQ Test
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Click an option to test your knowledge instantly!</span>
                  <span className="font-semibold text-cyan-400">+10 XP</span>
                </div>
              )}
            </div>

            {/* Subtle Floating Highlights */}
            <div className="hidden sm:flex absolute -bottom-4 -left-4 bg-slate-900/95 border border-slate-700/80 p-2.5 rounded-2xl shadow-xl items-center gap-3 z-20 backdrop-blur-md">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
                🔥
              </div>
              <div className="text-left pr-1">
                <div className="text-xs font-bold text-white">Daily Streak Active</div>
                <div className="text-[10px] text-slate-400">Personal study momentum</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BOARDS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="emerald" size="xs">
                BISE Boards Directory
              </Badge>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Pakistan Educational Boards Hub
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Model mock tests and solved past papers for education boards across Punjab, Sindh, KPK, Federal, AJK, and Balochistan.
            </p>
          </div>

          <Button
            variant="ghost"
            size="xs"
            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab('boards')}
          >
            View All 30+ Boards
          </Button>
        </div>

        {/* Province Selection Dropdown */}
        <div className="sm:w-64">
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value as any)}
            className="w-full px-3 py-2.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white"
          >
            {[
              { id: 'punjab', label: 'Punjab Boards (9)' },
              { id: 'sindh', label: 'Sindh Boards (6)' },
              { id: 'kpk', label: 'KPK Boards (8)' },
              { id: 'federal', label: 'Federal & AJK (3)' },
              { id: 'balochistan', label: 'Balochistan Boards (4)' },
            ].map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>

        {/* Board Cards Grid */}
        <motion.div
          key={selectedProvince}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredBoards.map((b, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                hoverLift
                className="p-5 flex flex-col justify-between"
              >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="blue" size="xs">
                    {b.coverage}
                  </Badge>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Class 9–12</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{b.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{b.desc}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => onNavigateTab('past-papers')}
                  className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 cursor-pointer"
                >
                  Past Papers (PDF)
                </button>
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => onNavigateTab('tests')}
                >
                  Solve Online Test
                </Button>
              </div>
            </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 7. CLASSES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="purple" size="xs">
                Classes & Programs
              </Badge>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Preparation by Class & Degree
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Structured preparation pathways for Matric, Intermediate, Medical/Engineering Entry Tests, and Competitive Exams.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedClassSubject}
              onChange={(e) => setSelectedClassSubject(e.target.value)}
              className="px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-slate-900 dark:text-white"
            >
              {allClassSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="xs"
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              onClick={() => onNavigateTab('classes')}
            >
              Explore All
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredAcademicClasses.map((cls, idx) => (
            <Card
              key={idx}
              hoverLift
              interactive
              onClick={() => onNavigateTab('classes')}
              className="p-5 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{cls.icon}</span>
                  <Badge variant="blue" size="xs">
                    {cls.tag}
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                  {cls.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cls.subtitle}</p>

                <div className="mt-3 flex flex-wrap gap-1">
                  {cls.subjects.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300"
                    >
                      {s}
                    </span>
                  ))}
                  {cls.subjects.length > 4 && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-400">
                      +{cls.subjects.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">{cls.focus}</span>
                <span className="text-blue-600 dark:text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform">
                  Start →
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 8. SUBJECTS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="blue" size="xs">
                Subject Hub
              </Badge>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Practice by Subject
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chapter-wise MCQs, conceptual assessments, and formulas for all secondary and higher secondary subjects.
            </p>
          </div>

          <Button
            variant="ghost"
            size="xs"
            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab('subjects')}
          >
            Explore All Subjects
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {subjects.map((sub) => (
            <Card
              key={sub.id}
              hoverLift
              interactive
              onClick={() => onNavigateTab('mcqs')}
              className="p-4 flex flex-col justify-between group"
            >
              <div>
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit mb-3 group-hover:scale-110 transition-transform">
                  {sub.icon}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                  {sub.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{sub.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">MCQs & Tests</span>
                <span className="text-blue-600 dark:text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform">
                  Practice →
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 9. FEATURED QUIZZES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="amber" size="xs">
                Featured Quizzes
              </Badge>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Live Timed Online Quizzes
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Attempt high-yield mock quizzes with official timer countdown, question palette, and immediate result analysis.
            </p>
          </div>

          <Button
            variant="ghost"
            size="xs"
            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab('quizzes')}
          >
            Browse All Quizzes
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {POPULAR_TESTS.map((test) => (
            <Card
              key={test.id}
              hoverLift
              className="p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="blue" size="xs">
                    {test.testType}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{test.durationMinutes} mins</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{test.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {test.classLevel} • {test.board || 'All Boards'} • {test.totalQuestions} Questions
                </p>

                {test.negativeMarking && (
                  <div className="mt-3">
                    <Badge variant="amber" size="xs">
                      Negative marking: -0.25
                    </Badge>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  {test.totalMarks} Total Marks
                </span>

                <Button
                  variant="primary"
                  size="xs"
                  leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                  onClick={() => onStartTest(test)}
                >
                  Start Quiz
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 10. MCQS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="cyan" size="xs">
                Question Bank
              </Badge>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Featured MCQs with Instant Explanations
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Solve chapter-wise high-yield questions, check instant verified answers, and review textbook rationales.
            </p>
          </div>

          <Button
            variant="primary"
            size="xs"
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab('mcqs')}
          >
            Explore Question Bank
          </Button>
        </div>

        {/* Subject Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Pakistan Studies', 'IQ & Intelligence'].map((sub) => (
            <button
              key={sub}
              onClick={() => setActiveMcqSubject(sub)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeMcqSubject === sub
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* MCQs List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featuredMCQsList.map((mcq, mIdx) => {
            const isAnswered = featuredMcqAnswered[mcq.id];
            const userChoice = featuredMcqSelection[mcq.id];

            return (
              <Card key={mcq.id} className="p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="blue" size="xs">
                      {mcq.chapter || mcq.subject}
                    </Badge>
                    <span className="text-[11px] font-bold text-slate-400">{mcq.difficulty}</span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {mcq.question}
                  </h3>

                  <div className="space-y-1.5">
                    {mcq.options.map((opt, optIdx) => {
                      const isSelected = userChoice === optIdx;
                      const isCorrect = optIdx === mcq.correctAnswer;

                      let optClass = 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40';

                      if (isAnswered) {
                        if (isCorrect) {
                          optClass = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-500 font-bold';
                        } else if (isSelected && !isCorrect) {
                          optClass = 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-500 font-bold';
                        } else {
                          optClass = 'opacity-50 bg-slate-50 dark:bg-slate-800/40 text-slate-400 border-transparent';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectFeaturedMcq(mcq.id, optIdx)}
                          disabled={isAnswered}
                          className={`w-full text-left p-2 rounded-lg border text-xs flex items-center justify-between transition-all cursor-pointer ${optClass}`}
                        >
                          <span className="truncate">{opt}</span>
                          {isAnswered && isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          {isAnswered && isSelected && !isCorrect && <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isAnswered && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                    <strong className="text-blue-600 dark:text-cyan-400">Solution: </strong>
                    {mcq.explanation}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* 11. NOTES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="blue" size="xs">
                Revision Material
              </Badge>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Chapter-Wise Study Notes & Formula Sheets
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Concise summaries, conceptual key points, definitions, and formulas formatted cleanly for exam revision.
            </p>
          </div>

          <Button
            variant="ghost"
            size="xs"
            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab('study-material')}
          >
            View All Notes & Guides
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {STUDY_NOTES_DATA.slice(0, 3).map((note) => (
            <Card
              key={note.id}
              hoverLift
              className="p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="blue" size="xs">
                    {note.subject}
                  </Badge>
                  <span className="text-xs text-slate-400 font-semibold">{note.readTime}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{note.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {note.contentSnippet}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                  <span>{note.type || 'Study Guide'}</span>
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => documentBrandingService.downloadStudyNote(note)}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    PDF
                  </Button>
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => onNavigateTab('study-material')}
                  >
                    Read Note
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 12. PAST PAPERS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="amber" size="xs">
                Past Exam Papers
              </Badge>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Solved 10-Year Board & Entry Test Past Papers
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Practice authentic previous years' questions with board-certified answer keys, solution methods, and downloadable A4 PDFs.
            </p>
          </div>

          <Button
            variant="ghost"
            size="xs"
            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab('past-papers')}
          >
            Browse Past Papers Archive
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PAST_PAPERS_DATA.slice(0, 4).map((paper) => (
            <Card
              key={paper.id}
              hoverLift
              className="p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="amber" size="xs">
                    {paper.year} Exam
                  </Badge>
                  <span className="text-[11px] font-bold text-slate-400">{paper.board}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{paper.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {paper.classLevel} • {paper.questionsCount} Questions
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() =>
                    documentBrandingService.downloadPastPaper(paper)
                  }
                  className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>

                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => onNavigateTab('past-papers')}
                >
                  Solve Online
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 13. HOW TALEEM GURU WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="blue" size="sm">
            Proven Study Methodology
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            How Taleem Guru Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            A four-step cycle engineered to help Pakistani students turn weak areas into top board merit scores.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <Card className="p-6 text-center space-y-3 relative">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-cyan-400 font-black text-lg flex items-center justify-center mx-auto">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Choose Exam & Board</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Select your targeted class (9th, 10th, 11th, 12th), entry test (MDCAT, ECAT), or civil service exam and choose your specific education board.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-3 relative">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-900 text-cyan-600 dark:text-cyan-300 font-black text-lg flex items-center justify-center mx-auto">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Practice MCQs & Notes</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Revise chapter concepts using high-yield summary sheets and solve topic-wise practice questions with step-by-step verified explanations.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-3 relative">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 font-black text-lg flex items-center justify-center mx-auto">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Take Timed Mock Tests</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Experience real exam conditions with full-screen timed assessment simulations, negative marking options, and question status navigators.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-3 relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 font-black text-lg flex items-center justify-center mx-auto">
              4
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Track & Master Mistakes</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Receive immediate performance scorecards. Questions answered incorrectly automatically save into your Mistake Notebook for re-practice.
            </p>
          </Card>
        </div>
      </section>

      {/* 14. STUDENT BENEFITS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="emerald" size="sm">
            Why Students Choose Taleem Guru
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Engineered for Academic Excellence
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Everything you need to study effectively, eliminate exam anxiety, and achieve top grades in Pakistan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Card hoverLift className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-cyan-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">100% Board-Aligned Curriculum</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              All question banks and mock tests adhere strictly to official textbook boards (Punjab Textbook Board, Sindh Textbook Board, KPK, and National Book Foundation).
            </p>
          </Card>

          <Card hoverLift className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Instant Analytic Scorecards</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Get comprehensive scores instantly with accuracy rates, chapter breakdown, time-per-question metrics, and Pakistan percentile rankings.
            </p>
          </Card>

          <Card hoverLift className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Auto Mistake Notebook</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Never repeat a mistake. Any question you answer incorrectly during a quiz is automatically archived in your personalized mistake notebook for targeted re-testing.
            </p>
          </Card>

          <Card hoverLift className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Pakistan Merit Leaderboard</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Compete with fellow scholars across Lahore, Karachi, Islamabad, Peshawar, Quetta, and Multan. Maintain daily streaks and earn verified merit certificates.
            </p>
          </Card>

          <Card hoverLift className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Watermarked A4 Printables</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Export high-resolution PDF question papers, result cards, and formula cheat sheets formatted cleanly with official Taleem Guru academic watermarks for print.
            </p>
          </Card>

          <Card hoverLift className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">100% Free Open Access</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Quality educational materials accessible for every student in Pakistan without paywalls or restrictive access barriers.
            </p>
          </Card>
        </div>
      </section>

      {/* 15. LEADERBOARD PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="amber" size="xs">
                National Merit Ranks
              </Badge>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Pakistan Student Leaderboard Preview
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Top performing students from all education boards competing on mock exam accuracy and consistency.
            </p>
          </div>

          <Button
            variant="ghost"
            size="xs"
            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab('leaderboard')}
          >
            View Full Leaderboard
          </Button>
        </div>

        {/* Top 3 Podium Cards or Active Status */}
        {leaderboardList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leaderboardList.slice(0, 3).map((user, idx) => {
              const isTopper = idx === 0;
              return (
                <Card
                  key={user.rank || idx}
                  hoverLift
                  className={`p-5 text-center relative ${
                    isTopper
                      ? 'border-2 border-amber-400 dark:border-amber-500/60 bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900'
                      : ''
                  }`}
                >
                  {isTopper && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <Crown className="w-3 h-3 fill-current" /> National Topper
                    </span>
                  )}

                  <div className="text-3xl mx-auto mb-2 mt-1">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </div>
                  <span className="text-xs font-black uppercase text-slate-400">Rank #{user.rank || idx + 1}</span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{user.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.city || 'Pakistan'} {user.institution ? `• ${user.institution}` : ''}</p>

                  <div className="mt-4 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Score</span>
                    <span className="font-black text-blue-600 dark:text-cyan-400 text-sm">
                      {Number(user.score || 0).toLocaleString()} pts
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl mx-auto space-y-3">
            <Trophy className="w-8 h-8 text-amber-500 mx-auto" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Active Examination Series</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Merit rankings are generated automatically when registered students submit completed mock tests. Attempt a practice test to appear on the national leaderboard.
            </p>
            <Button
              variant="primary"
              size="xs"
              onClick={() => onNavigateTab('quizzes')}
            >
              Start Practice Test
            </Button>
          </div>
        )}
      </section>

      {/* 16. CALL-TO-ACTION SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 rounded-3xl p-8 sm:p-12 text-white text-center relative overflow-hidden border border-blue-500/20 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <Badge variant="cyan" size="sm" icon={<Zap className="w-3.5 h-3.5 fill-current" />}>
              Free Online Study Portal for Pakistani Students
            </Badge>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Start Your Board & Entry Test Preparation Right Now
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Taleem Guru is free, fast, and mobile-friendly. Take a timed mock quiz, download solved past papers, and start tracking your academic progress today.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="amber"
                size="lg"
                leftIcon={<Play className="w-4 h-4 fill-current" />}
                onClick={() => onNavigateTab('quizzes')}
              >
                Start Practice Quiz
              </Button>

              <Button
                variant="secondary"
                size="lg"
                leftIcon={<FileText className="w-4 h-4 text-cyan-400" />}
                onClick={() => onNavigateTab('past-papers')}
              >
                Browse Past Papers
              </Button>
            </div>
          </div>
        </div>
      </section>
      <SuccessStories />
    </div>
  );
};
