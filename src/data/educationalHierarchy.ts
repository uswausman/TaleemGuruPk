import type {
  BoardInfo,
  AcademicClassInfo,
  AcademicSubjectInfo,
  ChapterInfo,
  TopicInfo,
  StudyNote,
  PastPaper,
} from '../types.ts';

// ==========================================
// 1. BOARDS (Punjab, Federal, Sindh, KPK, Balochistan, AJK)
// ==========================================
export const PAKISTAN_BOARDS: BoardInfo[] = [
  // --- PUNJAB BOARDS (Represented Individually) ---
  {
    id: 'bise-lahore',
    name: 'BISE Lahore',
    code: 'LHR',
    province: 'Punjab',
    city: 'Lahore',
    established: '1954',
    description: 'Board of Intermediate and Secondary Education Lahore conducting SSC and HSSC exams for Lahore, Kasur, Sheikhupura, and Nankana Sahib.',
    totalPastPapers: 340,
    totalTests: 185,
    website: 'https://www.biselahore.com',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-rawalpindi',
    name: 'BISE Rawalpindi',
    code: 'RWP',
    province: 'Punjab',
    city: 'Rawalpindi',
    established: '1977',
    description: 'Serving Rawalpindi, Attock, Chakwal, Jhelum, and Murree districts.',
    totalPastPapers: 290,
    totalTests: 140,
    website: 'https://www.biserawalpindi.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-gujranwala',
    name: 'BISE Gujranwala',
    code: 'GRW',
    province: 'Punjab',
    city: 'Gujranwala',
    established: '1982',
    description: 'Serving Gujranwala, Gujrat, Mandi Bahauddin, Hafizabad, Narowal, and Sialkot.',
    totalPastPapers: 260,
    totalTests: 130,
    website: 'https://www.bisegrw.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-faisalabad',
    name: 'BISE Faisalabad',
    code: 'FSD',
    province: 'Punjab',
    city: 'Faisalabad',
    established: '1988',
    description: 'Serving Faisalabad division including Chiniot, Toba Tek Singh, and Jhang.',
    totalPastPapers: 280,
    totalTests: 145,
    website: 'https://www.bisefsd.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-multan',
    name: 'BISE Multan',
    code: 'MUL',
    province: 'Punjab',
    city: 'Multan',
    established: '1968',
    description: 'Serving Southern Punjab students including Multan, Lodhran, Vehari, and Khanewal.',
    totalPastPapers: 250,
    totalTests: 120,
    website: 'https://www.bisemultan.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-sargodha',
    name: 'BISE Sargodha',
    code: 'SGD',
    province: 'Punjab',
    city: 'Sargodha',
    established: '1968',
    description: 'Conducting annual exams for Sargodha, Khushab, Mianwali, and Bhakkar districts.',
    totalPastPapers: 210,
    totalTests: 110,
    website: 'https://www.bisesargodha.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-bahawalpur',
    name: 'BISE Bahawalpur',
    code: 'BWP',
    province: 'Punjab',
    city: 'Bahawalpur',
    established: '1977',
    description: 'Education board serving Bahawalpur, Bahawalnagar, and Rahim Yar Khan divisions.',
    totalPastPapers: 195,
    totalTests: 95,
    website: 'https://www.bisebwp.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-dgkhan',
    name: 'BISE DG Khan',
    code: 'DGK',
    province: 'Punjab',
    city: 'Dera Ghazi Khan',
    established: '1989',
    description: 'Serving Dera Ghazi Khan, Muzaffargarh, Layyah, Rajanpur, and Kot Addu.',
    totalPastPapers: 180,
    totalTests: 90,
    website: 'https://www.bisedgkhan.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-sahiwal',
    name: 'BISE Sahiwal',
    code: 'SWL',
    province: 'Punjab',
    city: 'Sahiwal',
    established: '2012',
    description: 'Board serving Sahiwal, Okara, and Pakpattan districts with standardized exams.',
    totalPastPapers: 165,
    totalTests: 85,
    website: 'https://www.bisesahiwal.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },

  // --- FEDERAL BOARD ---
  {
    id: 'fbise-islamabad',
    name: 'FBISE Islamabad',
    code: 'FED',
    province: 'Federal',
    city: 'Islamabad',
    established: '1975',
    description: 'Federal Board of Intermediate and Secondary Education Islamabad (National, Overseas & Cantonments).',
    totalPastPapers: 520,
    totalTests: 290,
    website: 'https://www.fbise.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },

  // --- SINDH BOARDS ---
  {
    id: 'bise-karachi',
    name: 'BSEK / BIEK Karachi',
    code: 'KHI',
    province: 'Sindh',
    city: 'Karachi',
    established: '1950',
    description: 'Board of Secondary Education Karachi (BSEK) & Board of Intermediate Education Karachi (BIEK).',
    totalPastPapers: 420,
    totalTests: 220,
    website: 'https://www.biek.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-hyderabad',
    name: 'BISE Hyderabad',
    code: 'HYD',
    province: 'Sindh',
    city: 'Hyderabad',
    established: '1961',
    description: 'Intermediate and Secondary Education Board for Hyderabad, Jamshoro, Matiari, and Dadu.',
    totalPastPapers: 230,
    totalTests: 115,
    website: 'https://www.biseh.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-sukkur',
    name: 'BISE Sukkur',
    code: 'SKR',
    province: 'Sindh',
    city: 'Sukkur',
    established: '1979',
    description: 'Secondary and Intermediate examinations for Upper Sindh including Sukkur, Ghotki, and Khairpur.',
    totalPastPapers: 185,
    totalTests: 90,
    website: 'https://www.bisesuksindh.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-larkana',
    name: 'BISE Larkana',
    code: 'LRK',
    province: 'Sindh',
    city: 'Larkana',
    established: '1995',
    description: 'Serving Larkana division including Shikarpur, Jacobabad, Kashmore, and Qambar Shahdadkot.',
    totalPastPapers: 160,
    totalTests: 80,
    website: 'https://www.biselrk.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-mirpurkhas',
    name: 'BISE Mirpurkhas',
    code: 'MPK',
    province: 'Sindh',
    city: 'Mirpurkhas',
    established: '2014',
    description: 'Serving Mirpurkhas, Umerkot, and Tharparkar districts.',
    totalPastPapers: 140,
    totalTests: 70,
    website: 'https://www.bisempk.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },

  // --- KPK BOARDS ---
  {
    id: 'bise-peshawar',
    name: 'BISE Peshawar',
    code: 'PEW',
    province: 'KPK',
    city: 'Peshawar',
    established: '1961',
    description: 'Khyber Pakhtunkhwa premier board conducting SSC and HSSC exams for Peshawar, Charsadda, and Khyber.',
    totalPastPapers: 310,
    totalTests: 160,
    website: 'https://www.bisep.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-abbottabad',
    name: 'BISE Abbottabad',
    code: 'ATD',
    province: 'KPK',
    city: 'Abbottabad',
    established: '1990',
    description: 'Conducting examinations for Hazara division including Abbottabad, Mansehra, Haripur, Battagram, and Kohistan.',
    totalPastPapers: 210,
    totalTests: 110,
    website: 'https://www.biseatd.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-mardan',
    name: 'BISE Mardan',
    code: 'MDN',
    province: 'KPK',
    city: 'Mardan',
    established: '1990',
    description: 'Serving students of Mardan, Swabi, and Nowshera districts.',
    totalPastPapers: 200,
    totalTests: 105,
    website: 'https://www.bisemdn.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-swat',
    name: 'BISE Swat',
    code: 'SWT',
    province: 'KPK',
    city: 'Saidu Sharif (Swat)',
    established: '1992',
    description: 'Board for Swat, Shangla, and Buner districts.',
    totalPastPapers: 190,
    totalTests: 95,
    website: 'https://www.bisess.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-malakand',
    name: 'BISE Malakand',
    code: 'MLK',
    province: 'KPK',
    city: 'Chakdara',
    established: '2008',
    description: 'Serving students from Dir Lower, Dir Upper, Bajaur, and Malakand Protected Area.',
    totalPastPapers: 150,
    totalTests: 75,
    website: 'https://www.bisemalakand.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-kohat',
    name: 'BISE Kohat',
    code: 'KHT',
    province: 'KPK',
    city: 'Kohat',
    established: '2002',
    description: 'Serving Kohat, Karak, Hangu, Kurram, and Orakzai districts.',
    totalPastPapers: 160,
    totalTests: 80,
    website: 'https://www.bisekt.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-bannu',
    name: 'BISE Bannu',
    code: 'BNU',
    province: 'KPK',
    city: 'Bannu',
    established: '1990',
    description: 'Conducting examinations for Bannu, Lakki Marwat, and North Waziristan.',
    totalPastPapers: 140,
    totalTests: 70,
    website: 'https://www.biseb.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
  {
    id: 'bise-dikhan',
    name: 'BISE DI Khan',
    code: 'DIK',
    province: 'KPK',
    city: 'Dera Ismail Khan',
    established: '2006',
    description: 'Serving Dera Ismail Khan, Tank, and South Waziristan districts.',
    totalPastPapers: 135,
    totalTests: 65,
    website: 'https://www.bisedik.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },

  // --- BALOCHISTAN BOARDS ---
  {
    id: 'bbise-quetta',
    name: 'BBISE Quetta',
    code: 'QTA',
    province: 'Balochistan',
    city: 'Quetta',
    established: '1976',
    description: 'Balochistan Board of Intermediate and Secondary Education Quetta covering all provincial districts.',
    totalPastPapers: 240,
    totalTests: 120,
    website: 'https://www.bbiseqta.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },

  // --- AJK BOARD ---
  {
    id: 'bise-ajk',
    name: 'BISE AJK (Mirpur)',
    code: 'AJK',
    province: 'AJK',
    city: 'Mirpur (Azad Kashmir)',
    established: '1973',
    description: 'Board of Intermediate and Secondary Education Azad Jammu & Kashmir Mirpur (covering Mirpur, Muzaffarabad, Rawalakot, Kotli, Bagh, Bhimber, Neelum, Haveli, Sudhnuti, and Hattian Bala).',
    totalPastPapers: 180,
    totalTests: 95,
    website: 'https://www.ajkbise.edu.pk',
    supportedClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
  },
];

// ==========================================
// 2. CLASSES (9th, 10th, 11th, 12th + Expandable)
// ==========================================
export const ACADEMIC_CLASSES: AcademicClassInfo[] = [
  {
    id: 'class-9',
    name: 'Class 9',
    shortCode: '9th',
    level: 'Matric',
    badge: 'SSC-I',
    description: 'Secondary School Certificate Part 1 (Science, Computer & Arts Groups)',
    availableSubjectIds: [
      'physics',
      'chemistry',
      'biology',
      'mathematics',
      'computer-science',
      'english',
      'urdu',
      'islamiat',
      'tarjuma-tul-quran',
      'pakistan-studies',
      'general-science',
    ],
  },
  {
    id: 'class-10',
    name: 'Class 10',
    shortCode: '10th',
    level: 'Matric',
    badge: 'SSC-II',
    description: 'Secondary School Certificate Part 2 Board Examinations (Science & General)',
    availableSubjectIds: [
      'physics',
      'chemistry',
      'biology',
      'mathematics',
      'computer-science',
      'english',
      'urdu',
      'pakistan-studies',
      'islamiat',
      'tarjuma-tul-quran',
      'general-science',
    ],
  },
  {
    id: 'class-11',
    name: 'Class 11',
    shortCode: '11th',
    level: 'Intermediate',
    badge: 'HSSC-I',
    description: 'Higher Secondary Certificate Part 1 (FSc Pre-Medical, Pre-Engineering, ICS & I.Com)',
    availableSubjectIds: [
      'physics',
      'chemistry',
      'biology',
      'mathematics',
      'computer-science',
      'english',
      'urdu',
      'islamiat',
      'tarjuma-tul-quran',
    ],
  },
  {
    id: 'class-12',
    name: 'Class 12',
    shortCode: '12th',
    level: 'Intermediate',
    badge: 'HSSC-II',
    description: 'Higher Secondary Certificate Part 2 Board Examinations & College Finals',
    availableSubjectIds: [
      'physics',
      'chemistry',
      'biology',
      'mathematics',
      'computer-science',
      'english',
      'urdu',
      'pakistan-studies',
      'tarjuma-tul-quran',
    ],
  },
  // Expandable levels
  {
    id: 'mdcat',
    name: 'MDCAT',
    shortCode: 'MDCAT',
    level: 'Entry Test',
    badge: 'Medical',
    description: 'Medical & Dental College Admission Test (PM&DC & Provincial Universities)',
    availableSubjectIds: ['biology', 'chemistry', 'physics', 'english', 'iq-intelligence'],
  },
  {
    id: 'ecat',
    name: 'ECAT',
    shortCode: 'ECAT',
    level: 'Entry Test',
    badge: 'Engineering',
    description: 'Engineering College Admission Test (UET Lahore, NUST, FAST & GIKI)',
    availableSubjectIds: ['mathematics', 'physics', 'chemistry', 'computer-science', 'english'],
  },
];

// ==========================================
// 3. SUBJECTS (Associated with Classes & Boards)
// ==========================================
export const ACADEMIC_SUBJECTS: AcademicSubjectInfo[] = [
  {
    id: 'physics',
    name: 'Physics',
    category: 'Science',
    icon: '⚡',
    accentColor: 'from-blue-600 to-cyan-500',
    description: 'Mechanics, Electromagnetism, Modern Physics, Thermal Physics, Geometrical Optics & Wave Mechanics.',
    applicableClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'MDCAT', 'ECAT'],
    applicableBoards: ['All'],
    chaptersCount: 9,
    mcqsCount: 420,
    testsCount: 38,
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    category: 'Science',
    icon: '🧪',
    accentColor: 'from-emerald-600 to-teal-500',
    description: 'Organic, Inorganic, Physical Chemistry, Stoichiometry, Chemical Equilibrium & Electrochemistry.',
    applicableClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'MDCAT', 'ECAT'],
    applicableBoards: ['All'],
    chaptersCount: 8,
    mcqsCount: 390,
    testsCount: 35,
  },
  {
    id: 'biology',
    name: 'Biology',
    category: 'Science',
    icon: '🧬',
    accentColor: 'from-teal-600 to-emerald-500',
    description: 'Cell Biology, Genetics, Physiology, Ecology, Human Anatomy, Bioenergetics & Biotechnology.',
    applicableClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'MDCAT'],
    applicableBoards: ['All'],
    chaptersCount: 9,
    mcqsCount: 480,
    testsCount: 42,
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    category: 'Science',
    icon: '📐',
    accentColor: 'from-amber-600 to-orange-500',
    description: 'Algebra, Matrices & Determinants, Trigonometry, Calculus, Coordinate Geometry & Vectors.',
    applicableClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'ECAT'],
    applicableBoards: ['All'],
    chaptersCount: 13,
    mcqsCount: 520,
    testsCount: 50,
  },
  {
    id: 'computer-science',
    name: 'Computer Science',
    category: 'Technology',
    icon: '💻',
    accentColor: 'from-indigo-600 to-blue-500',
    description: 'Programming (C / C++ / Python), Boolean Algebra, Computer Architecture, Databases & Computer Networks.',
    applicableClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'ECAT'],
    applicableBoards: ['All'],
    chaptersCount: 7,
    mcqsCount: 340,
    testsCount: 28,
  },
  {
    id: 'english',
    name: 'English',
    category: 'Compulsory',
    icon: '📖',
    accentColor: 'from-purple-600 to-pink-500',
    description: 'Grammar, Tenses, Active/Passive Voice, Direct/Indirect, Reading Comprehension, Vocabulary & Essay Writing.',
    applicableClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'MDCAT', 'ECAT'],
    applicableBoards: ['All'],
    chaptersCount: 12,
    mcqsCount: 360,
    testsCount: 30,
  },
  {
    id: 'urdu',
    name: 'Urdu',
    category: 'Compulsory',
    icon: '✍️',
    accentColor: 'from-rose-600 to-red-500',
    description: 'Urdu Qawaid-o-Insha, Nasr Asbaaq, Nazmein, Ghazliyat, Tashreehat, Khutoot & Mazameen.',
    applicableClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
    applicableBoards: ['All'],
    chaptersCount: 14,
    mcqsCount: 310,
    testsCount: 26,
  },
  {
    id: 'pakistan-studies',
    name: 'Pakistan Studies',
    category: 'Compulsory',
    icon: '🇵🇰',
    accentColor: 'from-green-700 to-emerald-600',
    description: 'Ideology of Pakistan, Freedom Movement, Constitution, Geography, Climate, Natural Resources & Foreign Relations.',
    applicableClasses: ['Class 9', 'Class 10', 'Class 12'],
    applicableBoards: ['All'],
    chaptersCount: 6,
    mcqsCount: 290,
    testsCount: 24,
  },
  {
    id: 'islamiat',
    name: 'Islamiat',
    category: 'Compulsory',
    icon: '🕌',
    accentColor: 'from-emerald-700 to-teal-600',
    description: 'Quranic Surahs, Ahadees-e-Mubaraka, Arkaan-e-Islam, Seerat-un-Nabi (PBUH) & Islamic Ethics.',
    applicableClasses: ['Class 9', 'Class 10', 'Class 11'],
    applicableBoards: ['All'],
    chaptersCount: 8,
    mcqsCount: 300,
    testsCount: 25,
  },
  {
    id: 'tarjuma-tul-quran',
    name: 'Tarjuma-tul-Quran',
    category: 'Compulsory',
    icon: '📗',
    accentColor: 'from-teal-700 to-emerald-800',
    description: 'New National Curriculum compulsory Quran Translation with word-by-word meaning, context, and exercises.',
    applicableClasses: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
    applicableBoards: ['All'],
    chaptersCount: 10,
    mcqsCount: 220,
    testsCount: 20,
  },
  {
    id: 'general-science',
    name: 'General Science',
    category: 'Arts & Languages',
    icon: '🔬',
    accentColor: 'from-cyan-600 to-blue-600',
    description: 'Everyday Science, Human Body, Food & Nutrition, Diseases, Environment, Energy & Technology for Arts Group.',
    applicableClasses: ['Class 9', 'Class 10'],
    applicableBoards: ['All'],
    chaptersCount: 10,
    mcqsCount: 240,
    testsCount: 20,
  },
  {
    id: 'iq-intelligence',
    name: 'IQ & Intelligence',
    category: 'Technology',
    icon: '🧠',
    accentColor: 'from-violet-600 to-purple-500',
    description: 'Verbal & Non-Verbal Intelligence, Analytical Reasoning, Number Series, Pattern Recognition & Spatial Logic.',
    applicableClasses: ['MDCAT', 'ECAT', 'Class 11', 'Class 12'],
    applicableBoards: ['All'],
    chaptersCount: 8,
    mcqsCount: 380,
    testsCount: 32,
  },
];

// ==========================================
// 4. CHAPTERS & TOPICS (Hierarchical Structure)
// ==========================================
export const ACADEMIC_CHAPTERS: ChapterInfo[] = [
  // --- Class 10 Physics ---
  {
    id: 'chap-phy-10-1',
    subjectId: 'physics',
    subjectName: 'Physics',
    classLevel: 'Class 10',
    chapterNumber: 10,
    name: 'Simple Harmonic Motion and Waves',
    description: 'SHM characteristics, simple pendulum, wave motion, types of waves, and ripple tank.',
    topics: [
      { id: 'top-phy-10-1-1', chapterId: 'chap-phy-10-1', topicNumber: '10.1', title: 'Simple Harmonic Motion (SHM)', keyPoints: ['Restoring force', "Hooke's law", 'Mass attached to spring'] },
      { id: 'top-phy-10-1-2', chapterId: 'chap-phy-10-1', topicNumber: '10.2', title: 'Simple Pendulum & Damped Oscillations', keyPoints: ['Time period T = 2π√(l/g)', 'Energy conservation', 'Damping applications'] },
      { id: 'top-phy-10-1-3', chapterId: 'chap-phy-10-1', topicNumber: '10.3', title: 'Wave Motion & Wave Equation', keyPoints: ['Transverse vs Longitudinal', 'v = fλ formula', 'Wavefronts'] },
      { id: 'top-phy-10-1-4', chapterId: 'chap-phy-10-1', topicNumber: '10.4', title: 'Ripple Tank & Wave Phenomenon', keyPoints: ['Reflection', 'Refraction', 'Diffraction'] },
    ],
  },
  {
    id: 'chap-phy-10-2',
    subjectId: 'physics',
    subjectName: 'Physics',
    classLevel: 'Class 10',
    chapterNumber: 11,
    name: 'Sound',
    description: 'Nature of sound waves, longitudinal characteristics, audible frequency range, and ultrasound.',
    topics: [
      { id: 'top-phy-10-2-1', chapterId: 'chap-phy-10-2', topicNumber: '11.1', title: 'Characteristics of Sound', keyPoints: ['Loudness & Amplitude', 'Pitch & Frequency', 'Quality / Timbre'] },
      { id: 'top-phy-10-2-2', chapterId: 'chap-phy-10-2', topicNumber: '11.2', title: 'Reflection (Echo) of Sound', keyPoints: ['Echo calculation d = vt/2', 'Reverberation', 'Acoustics'] },
      { id: 'top-phy-10-2-3', chapterId: 'chap-phy-10-2', topicNumber: '11.3', title: 'Ultrasound & Medical Applications', keyPoints: ['Frequency > 20 kHz', 'SONAR', 'Echocardiography'] },
    ],
  },
  {
    id: 'chap-phy-10-3',
    subjectId: 'physics',
    subjectName: 'Physics',
    classLevel: 'Class 10',
    chapterNumber: 12,
    name: 'Geometrical Optics',
    description: 'Reflection, spherical mirrors, refraction of light, Snell law, total internal reflection, and optical instruments.',
    topics: [
      { id: 'top-phy-10-3-1', chapterId: 'chap-phy-10-3', topicNumber: '12.1', title: 'Reflection of Light & Spherical Mirrors', keyPoints: ['Concave vs Convex mirrors', 'Focal length f = R/2', 'Sign conventions'] },
      { id: 'top-phy-10-3-2', chapterId: 'chap-phy-10-3', topicNumber: '12.2', title: 'Mirror Formula & Magnification', keyPoints: ['1/f = 1/p + 1/q', 'm = h_i / h_o = -q/p', 'Real vs Virtual images'] },
      { id: 'top-phy-10-3-3', chapterId: 'chap-phy-10-3', topicNumber: '12.3', title: 'Refraction & Snell’s Law', keyPoints: ['n = c/v', 'n1 sin(θ1) = n2 sin(θ2)', 'Apparent depth'] },
      { id: 'top-phy-10-3-4', chapterId: 'chap-phy-10-3', topicNumber: '12.4', title: 'Total Internal Reflection & Optical Fibers', keyPoints: ['Critical angle sin(θc) = 1/n', 'Light pipes', 'Endoscopy'] },
      { id: 'top-phy-10-3-5', chapterId: 'chap-phy-10-3', topicNumber: '12.5', title: 'Compound Microscope & Astronomical Telescope', keyPoints: ['Objective & Eyepiece', 'Magnification power', 'Resolving power'] },
    ],
  },
  {
    id: 'chap-phy-10-4',
    subjectId: 'physics',
    subjectName: 'Physics',
    classLevel: 'Class 10',
    chapterNumber: 13,
    name: 'Electrostatics',
    description: 'Electric charges, Coulomb law, electric field, electric potential, and capacitors.',
    topics: [
      { id: 'top-phy-10-4-1', chapterId: 'chap-phy-10-4', topicNumber: '13.1', title: "Coulomb's Law", keyPoints: ['F = k(q1 q2)/r²', 'k = 9×10⁹ N m²/C²', 'Permittivity of medium'] },
      { id: 'top-phy-10-4-2', chapterId: 'chap-phy-10-4', topicNumber: '13.2', title: 'Electric Field & Field Lines', keyPoints: ['E = F/q₀ (N/C)', 'Vector direction', 'Uniform electric fields'] },
      { id: 'top-phy-10-4-3', chapterId: 'chap-phy-10-4', topicNumber: '13.3', title: 'Capacitors and Capacitance', keyPoints: ['Q = CV', 'Parallel: C_eq = C1 + C2', 'Series: 1/C_eq = 1/C1 + 1/C2'] },
    ],
  },

  // --- Class 10 Chemistry ---
  {
    id: 'chap-chem-10-1',
    subjectId: 'chemistry',
    subjectName: 'Chemistry',
    classLevel: 'Class 10',
    chapterNumber: 9,
    name: 'Chemical Equilibrium',
    description: 'Reversible reactions, dynamic equilibrium, law of mass action, and equilibrium constant Kc.',
    topics: [
      { id: 'top-chem-10-1-1', chapterId: 'chap-chem-10-1', topicNumber: '9.1', title: 'Reversible Reactions & Dynamic Equilibrium', keyPoints: ['Forward vs Reverse rate', 'Macroscopic characteristics'] },
      { id: 'top-chem-10-1-2', chapterId: 'chap-chem-10-1', topicNumber: '9.2', title: 'Law of Mass Action & Equilibrium Constant Kc', keyPoints: ['Kc = [Products]/[Reactants]', 'Units of Kc', 'Reaction quotient Qc'] },
    ],
  },
  {
    id: 'chap-chem-10-2',
    subjectId: 'chemistry',
    subjectName: 'Chemistry',
    classLevel: 'Class 10',
    chapterNumber: 10,
    name: 'Acids, Bases and Salts',
    description: 'Arrhenius, Bronsted-Lowry & Lewis concepts, pH scale, indicators, and preparation of salts.',
    topics: [
      { id: 'top-chem-10-2-1', chapterId: 'chap-chem-10-2', topicNumber: '10.1', title: 'Concepts of Acids and Bases', keyPoints: ['Arrhenius H+/OH-', 'Bronsted proton donor/acceptor', 'Lewis electron pair donor/acceptor'] },
      { id: 'top-chem-10-2-2', chapterId: 'chap-chem-10-2', topicNumber: '10.2', title: 'pH Scale & Auto-Ionization of Water', keyPoints: ['pH = -log[H+]', 'Kw = 1.0×10⁻¹⁴', 'Acidic, Neutral & Basic ranges'] },
      { id: 'top-chem-10-2-3', chapterId: 'chap-chem-10-2', topicNumber: '10.3', title: 'Salts: Preparation and Types', keyPoints: ['Neutralization', 'Acidic, Basic, Normal salts', 'Applications'] },
    ],
  },
  {
    id: 'chap-chem-10-3',
    subjectId: 'chemistry',
    subjectName: 'Chemistry',
    classLevel: 'Class 10',
    chapterNumber: 11,
    name: 'Organic Chemistry & Hydrocarbons',
    description: 'Functional groups, structural formulas, alkanes, alkenes, and alkynes.',
    topics: [
      { id: 'top-chem-10-3-1', chapterId: 'chap-chem-10-3', topicNumber: '11.1', title: 'Classification & Functional Groups', keyPoints: ['Homologous series', 'Isomerism', 'Functional group tests'] },
      { id: 'top-chem-10-3-2', chapterId: 'chap-chem-10-3', topicNumber: '11.2', title: 'Alkanes, Alkenes and Alkynes', keyPoints: ['CnH2n+2, CnH2n, CnH2n-2', 'Halogenation', 'Combustion reactions'] },
    ],
  },

  // --- Class 10 Biology ---
  {
    id: 'chap-bio-10-1',
    subjectId: 'biology',
    subjectName: 'Biology',
    classLevel: 'Class 10',
    chapterNumber: 10,
    name: 'Gaseous Exchange',
    description: 'Gaseous exchange in plants and humans, respiratory system, and respiratory disorders.',
    topics: [
      { id: 'top-bio-10-1-1', chapterId: 'chap-bio-10-1', topicNumber: '10.1', title: 'Gaseous Exchange in Humans', keyPoints: ['Air passageway', 'Lungs & Alveoli', 'Inhalation vs Exhalation'] },
      { id: 'top-bio-10-1-2', chapterId: 'chap-bio-10-1', topicNumber: '10.2', title: 'Respiratory Disorders', keyPoints: ['Bronchitis', 'Emphysema', 'Pneumonia', 'Lung Cancer'] },
    ],
  },
  {
    id: 'chap-bio-10-2',
    subjectId: 'biology',
    subjectName: 'Biology',
    classLevel: 'Class 10',
    chapterNumber: 12,
    name: 'Coordination and Control',
    description: 'Nervous system, neurons, brain structure, endocrine system, and hormones.',
    topics: [
      { id: 'top-bio-10-2-1', chapterId: 'chap-bio-10-2', topicNumber: '12.1', title: 'Human Nervous System', keyPoints: ['Sensory, Motor & Interneurons', 'Central vs Peripheral nervous system'] },
      { id: 'top-bio-10-2-2', chapterId: 'chap-bio-10-2', topicNumber: '12.2', title: 'Human Brain & Reflex Action', keyPoints: ['Forebrain, Midbrain, Hindbrain', 'Reflex arc pathway'] },
      { id: 'top-bio-10-2-3', chapterId: 'chap-bio-10-2', topicNumber: '12.3', title: 'Endocrine System', keyPoints: ['Pituitary, Thyroid, Pancreas, Adrenal glands', 'Insulin & Glucagon'] },
    ],
  },

  // --- Class 10 Mathematics ---
  {
    id: 'chap-math-10-1',
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    classLevel: 'Class 10',
    chapterNumber: 1,
    name: 'Quadratic Equations',
    description: 'Solution of quadratic equations by factorization, completing square, and quadratic formula.',
    topics: [
      { id: 'top-math-10-1-1', chapterId: 'chap-math-10-1', topicNumber: '1.1', title: 'Methods of Solving Quadratic Equations', keyPoints: ['ax² + bx + c = 0', 'Quadratic formula: x = (-b ± √(b² - 4ac)) / (2a)'] },
      { id: 'top-math-10-1-2', chapterId: 'chap-math-10-1', topicNumber: '1.2', title: 'Equations Reducible to Quadratic Form', keyPoints: ['Reciprocal equations', 'Exponential equations', 'Radical equations'] },
    ],
  },
  {
    id: 'chap-math-10-2',
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    classLevel: 'Class 10',
    chapterNumber: 7,
    name: 'Introduction to Trigonometry',
    description: 'Measurement of angles, radian measure, trigonometric ratios, and fundamental identities.',
    topics: [
      { id: 'top-math-10-2-1', chapterId: 'chap-math-10-2', topicNumber: '7.1', title: 'Radians, Degrees and Sector Length', keyPoints: ['l = rθ', 'Area of sector = (1/2)r²θ', '1 rad = 180°/π'] },
      { id: 'top-math-10-2-2', chapterId: 'chap-math-10-2', topicNumber: '7.2', title: 'Fundamental Trigonometric Identities', keyPoints: ['sin²θ + cos²θ = 1', '1 + tan²θ = sec²θ', '1 + cot²θ = csc²θ'] },
    ],
  },

  // --- Class 12 Physics ---
  {
    id: 'chap-phy-12-1',
    subjectId: 'physics',
    subjectName: 'Physics',
    classLevel: 'Class 12',
    chapterNumber: 12,
    name: 'Electrostatics',
    description: "Coulomb's Law, Electric Fields, Gauss's Law, Electric Potential, Capacitors & Energy Storage.",
    topics: [
      { id: 'top-phy-12-1-1', chapterId: 'chap-phy-12-1', topicNumber: '12.1', title: "Gauss's Law & Its Applications", keyPoints: ['Electric flux Φ = E·A', 'Φ = Q/ε₀', 'Charge inside hollow sphere'] },
      { id: 'top-phy-12-1-2', chapterId: 'chap-phy-12-1', topicNumber: '12.2', title: 'Electric Potential & Millikan Oil Drop', keyPoints: ['V = W/q', 'Potential gradient E = -ΔV/Δr', 'Charge of electron e = 1.6×10⁻¹⁹ C'] },
    ],
  },
  {
    id: 'chap-phy-12-2',
    subjectId: 'physics',
    subjectName: 'Physics',
    classLevel: 'Class 12',
    chapterNumber: 14,
    name: 'Electromagnetism',
    description: 'Magnetic field, Ampere law, force on moving charge, torque on current-carrying coil, and galvanometer.',
    topics: [
      { id: 'top-phy-12-2-1', chapterId: 'chap-phy-12-2', topicNumber: '14.1', title: 'Magnetic Force on Charge & Wire', keyPoints: ['F = q(v × B)', 'F = I(L × B)', 'Right hand rule'] },
      { id: 'top-phy-12-2-2', chapterId: 'chap-phy-12-2', topicNumber: '14.2', title: "Ampere's Law & Solenoid Field", keyPoints: ['∮ B·dl = μ₀ I', 'B = μ₀ n I', 'Toroid field'] },
    ],
  },

  // --- Class 12 Mathematics ---
  {
    id: 'chap-math-12-1',
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    classLevel: 'Class 12',
    chapterNumber: 2,
    name: 'Differentiation',
    description: 'Derivatives of algebraic, trigonometric, logarithmic, and inverse functions. Chain, Product, and Quotient rules.',
    topics: [
      { id: 'top-math-12-1-1', chapterId: 'chap-math-12-1', topicNumber: '2.1', title: 'Derivatives from First Principles', keyPoints: ["f'(x) = lim_{h→0} [f(x+h) - f(x)]/h", 'Power rule d/dx(xⁿ) = n·xⁿ⁻¹'] },
      { id: 'top-math-12-1-2', chapterId: 'chap-math-12-1', topicNumber: '2.2', title: 'Chain Rule & Implicit Differentiation', keyPoints: ['dy/dx = (dy/du)·(du/dx)', 'Parametric equations'] },
      { id: 'top-math-12-1-3', chapterId: 'chap-math-12-1', topicNumber: '2.3', title: 'Maxima, Minima & Points of Inflection', keyPoints: ["First derivative test f'(x) = 0", "Second derivative test f''(x) > 0 (Min), < 0 (Max)"] },
    ],
  },
  {
    id: 'chap-math-12-2',
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    classLevel: 'Class 12',
    chapterNumber: 3,
    name: 'Integration',
    description: 'Indefinite & definite integrals, integration by parts, partial fractions, and area under curve.',
    topics: [
      { id: 'top-math-12-2-1', chapterId: 'chap-math-12-2', topicNumber: '3.1', title: 'Standard Integration Techniques', keyPoints: ['∫ xⁿ dx = xⁿ⁺¹/(n+1) + C', '∫ [f(x)]ⁿ f\'(x) dx'] },
      { id: 'top-math-12-2-2', chapterId: 'chap-math-12-2', topicNumber: '3.2', title: 'Integration by Parts', keyPoints: ['∫ u v dx = u ∫ v dx - ∫ [u\' ∫ v dx] dx', 'ILATE rule'] },
    ],
  },

  // --- Class 9 Physics ---
  {
    id: 'chap-phy-9-1',
    subjectId: 'physics',
    subjectName: 'Physics',
    classLevel: 'Class 9',
    chapterNumber: 1,
    name: 'Physical Quantities and Measurement',
    description: 'Introduction to Physics, International System of Units (SI), prefixes, scientific notation, and measuring instruments (Vernier Calipers, Screw Gauge).',
    topics: [
      { id: 'top-phy-9-1-1', chapterId: 'chap-phy-9-1', topicNumber: '1.1', title: 'Base and Derived Quantities', keyPoints: ['7 base SI units', 'Derived units (Newton, Joule, Pascal)', 'Dimensional analysis'] },
      { id: 'top-phy-9-1-2', chapterId: 'chap-phy-9-1', topicNumber: '1.2', title: 'Measuring Instruments & Least Count', keyPoints: ['Vernier Calipers (0.01 cm / 0.1 mm)', 'Micrometer Screw Gauge (0.001 cm / 0.01 mm)', 'Zero error correction'] },
    ],
  },
  {
    id: 'chap-phy-9-2',
    subjectId: 'physics',
    subjectName: 'Physics',
    classLevel: 'Class 9',
    chapterNumber: 2,
    name: 'Kinematics',
    description: 'Rest and motion, types of motion, scalars and vectors, distance and displacement, speed and velocity, acceleration, and equations of motion.',
    topics: [
      { id: 'top-phy-9-2-1', chapterId: 'chap-phy-9-2', topicNumber: '2.1', title: 'Distance, Velocity and Acceleration', keyPoints: ['Scalar vs Vector', 'Average velocity vs Instantaneous', 'Uniform acceleration'] },
      { id: 'top-phy-9-2-2', chapterId: 'chap-phy-9-2', topicNumber: '2.2', title: 'Three Equations of Uniform Motion', keyPoints: ['v_f = v_i + at', 'S = v_i t + (1/2)at²', '2aS = v_f² - v_i²'] },
      { id: 'top-phy-9-2-3', chapterId: 'chap-phy-9-2', topicNumber: '2.3', title: 'Motion under Gravity (Free Fall)', keyPoints: ['g = 9.8 m/s²', 'Equations with free-fall acceleration'] },
    ],
  },
  {
    id: 'chap-phy-9-3',
    subjectId: 'physics',
    subjectName: 'Physics',
    classLevel: 'Class 9',
    chapterNumber: 3,
    name: 'Dynamics',
    description: "Force, inertia, momentum, Newton's three laws of motion, mass and weight, friction, and uniform circular motion.",
    topics: [
      { id: 'top-phy-9-3-1', chapterId: 'chap-phy-9-3', topicNumber: '3.1', title: "Newton's Laws of Motion", keyPoints: ['First law & Inertia', 'Second law F = ma', 'Third law Action & Reaction'] },
      { id: 'top-phy-9-3-2', chapterId: 'chap-phy-9-3', topicNumber: '3.2', title: 'Linear Momentum & Law of Conservation', keyPoints: ['p = mv', 'Isolated system total momentum is conserved', 'Impulse'] },
      { id: 'top-phy-9-3-3', chapterId: 'chap-phy-9-3', topicNumber: '3.3', title: 'Friction and Centripetal Force', keyPoints: ['Static vs Kinetic friction', 'Centripetal force F_c = mv²/r', 'Centrifuge applications'] },
    ],
  },
  {
    id: 'chap-phy-9-5',
    subjectId: 'physics',
    subjectName: 'Physics',
    classLevel: 'Class 9',
    chapterNumber: 5,
    name: 'Gravitation',
    description: "Newton's law of universal gravitation, mass of earth, variation of g with altitude, and artificial satellites.",
    topics: [
      { id: 'top-phy-9-5-1', chapterId: 'chap-phy-9-5', topicNumber: '5.1', title: "Law of Universal Gravitation", keyPoints: ['F = G(m1 m2)/r²', 'G = 6.673 × 10⁻¹¹ N m² kg⁻²', 'Inverse square relationship'] },
      { id: 'top-phy-9-5-2', chapterId: 'chap-phy-9-5', topicNumber: '5.2', title: 'Mass of the Earth & Satellites', keyPoints: ['M_e = 6.0 × 10²⁴ kg', 'Orbital speed v₀ = √(gR)', 'Geostationary satellites'] },
    ],
  },

  // --- Class 9 Chemistry ---
  {
    id: 'chap-chem-9-1',
    subjectId: 'chemistry',
    subjectName: 'Chemistry',
    classLevel: 'Class 9',
    chapterNumber: 1,
    name: 'Fundamentals of Chemistry',
    description: 'Branches of chemistry, basic definitions, elements, compounds, mixtures, atomic number, mass number, Avogadro number, and mole concept.',
    topics: [
      { id: 'top-chem-9-1-1', chapterId: 'chap-chem-9-1', topicNumber: '1.1', title: 'Atomic Number, Mass Number & Valency', keyPoints: ['Z = proton count', 'A = protons + neutrons', 'Variable valency'] },
      { id: 'top-chem-9-1-2', chapterId: 'chap-chem-9-1', topicNumber: '1.2', title: 'Mole and Avogadro’s Number', keyPoints: ['NA = 6.022 × 10²³', 'Mole = Mass / Molar Mass', 'Molar volume at STP = 22.4 dm³'] },
    ],
  },
  {
    id: 'chap-chem-9-3',
    subjectId: 'chemistry',
    subjectName: 'Chemistry',
    classLevel: 'Class 9',
    chapterNumber: 3,
    name: 'Periodic Table & Periodicity',
    description: 'Modern periodic law, groups and periods, periodic trends in physical properties (atomic radius, ionization energy, electron affinity, and electronegativity).',
    topics: [
      { id: 'top-chem-9-3-1', chapterId: 'chap-chem-9-3', topicNumber: '3.1', title: 'Periodic Trends Across Periods and Groups', keyPoints: ['Atomic radius decreases across period, increases down group', 'Shielding effect'] },
      { id: 'top-chem-9-3-2', chapterId: 'chap-chem-9-3', topicNumber: '3.2', title: 'Ionization Energy & Electronegativity', keyPoints: ['Ionization energy trend', 'Fluorine highest electronegativity (4.0)', 'Electron affinity'] },
    ],
  },

  // --- Class 11 Biology (MDCAT Core) ---
  {
    id: 'chap-bio-11-1',
    subjectId: 'biology',
    subjectName: 'Biology',
    classLevel: 'Class 11',
    chapterNumber: 1,
    name: 'Cell Structure and Function',
    description: 'Structure of generalized cell, fluid mosaic model of plasma membrane, organelles (endoplasmic reticulum, ribosomes, Golgi apparatus, mitochondria, chloroplasts, and nucleus).',
    topics: [
      { id: 'top-bio-11-1-1', chapterId: 'chap-bio-11-1', topicNumber: '1.1', title: 'Plasma Membrane & Fluid Mosaic Model', keyPoints: ['Phospholipid bilayer', 'Integral & peripheral proteins', 'Selective permeability'] },
      { id: 'top-bio-11-1-2', chapterId: 'chap-bio-11-1', topicNumber: '1.2', title: 'Mitochondria & Chloroplasts (Energy Transducers)', keyPoints: ['Cristae and matrix', 'Thylakoids and stroma', 'Endosymbiotic theory'] },
      { id: 'top-bio-11-1-3', chapterId: 'chap-bio-11-1', topicNumber: '1.3', title: 'Nucleus & Chromatin Structure', keyPoints: ['Nuclear pore complex', 'Nucleolus (rRNA synthesis)', 'Histone proteins'] },
    ],
  },
  {
    id: 'chap-bio-11-2',
    subjectId: 'biology',
    subjectName: 'Biology',
    classLevel: 'Class 11',
    chapterNumber: 2,
    name: 'Biological Molecules',
    description: 'Importance of water, carbohydrates (monosaccharides, disaccharides, polysaccharides), lipids, proteins (structure and types), nucleic acids (DNA and RNA), and conjugated molecules.',
    topics: [
      { id: 'top-bio-11-2-1', chapterId: 'chap-bio-11-2', topicNumber: '2.1', title: 'Carbohydrates & Glycosidic Bonds', keyPoints: ['Glucose & Fructose isomers', 'Condensation vs Hydrolysis', 'Cellulose, Starch, Glycogen'] },
      { id: 'top-bio-11-2-2', chapterId: 'chap-bio-11-2', topicNumber: '2.2', title: 'Protein Architecture (1°, 2°, 3°, 4° Structures)', keyPoints: ['Peptide bonds', 'Alpha helix & Beta sheets', 'Hemoglobin quaternary structure'] },
      { id: 'top-bio-11-2-3', chapterId: 'chap-bio-11-2', topicNumber: '2.3', title: 'Nucleic Acids (DNA vs RNA)', keyPoints: ['Phosphodiester linkage', 'Watson-Crick double helix', 'Purines (A,G) vs Pyrimidines (C,T,U)'] },
    ],
  },
  {
    id: 'chap-bio-11-14',
    subjectId: 'biology',
    subjectName: 'Biology',
    classLevel: 'Class 11',
    chapterNumber: 14,
    name: 'Circulation & Cardiovascular System',
    description: 'Transport in animals, human blood composition, cardiac cycle, blood pressure, heart diseases, and lymphatic system.',
    topics: [
      { id: 'top-bio-11-14-1', chapterId: 'chap-bio-11-14', topicNumber: '14.1', title: 'Human Heart Anatomy & Cardiac Cycle', keyPoints: ['SA node pacemaker & AV node', 'Systole (0.3s) & Diastole (0.5s)', 'Coronary circulation'] },
      { id: 'top-bio-11-14-2', chapterId: 'chap-bio-11-14', topicNumber: '14.2', title: 'Blood Vessels & Blood Pressure', keyPoints: ['Arteries, Veins, Capillaries', 'Normal BP 120/80 mmHg', 'Atherosclerosis & Arteriosclerosis'] },
    ],
  },

  // --- Class 11 Mathematics (ECAT Core) ---
  {
    id: 'chap-math-11-1',
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    classLevel: 'Class 11',
    chapterNumber: 3,
    name: 'Matrices and Determinants',
    description: 'Types of matrices, operations, determinant of square matrix, adjoint, inverse, Cramer rule, and matrix inversion method.',
    topics: [
      { id: 'top-math-11-3-1', chapterId: 'chap-math-11-1', topicNumber: '3.1', title: 'Determinant Properties & Singular Matrices', keyPoints: ['|AB| = |A||B|', '|kA| = kⁿ|A|', 'A⁻¹ = adj(A) / |A|'] },
      { id: 'top-math-11-3-2', chapterId: 'chap-math-11-1', topicNumber: '3.2', title: 'Solving Linear Systems (Cramer’s Rule)', keyPoints: ['x = |A1|/|A|, y = |A2|/|A|', 'Echelon & Reduced Echelon forms', 'Rank of a matrix'] },
    ],
  },
  {
    id: 'chap-math-11-9',
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    classLevel: 'Class 11',
    chapterNumber: 9,
    name: 'Fundamentals of Trigonometry',
    description: 'Units of angular measurement, radian-degree conversion, fundamental identities, and signs of trigonometric ratios in four quadrants.',
    topics: [
      { id: 'top-math-11-9-1', chapterId: 'chap-math-11-9', topicNumber: '9.1', title: 'Trigonometric Ratios & CAST Rule', keyPoints: ['All-Sin-Tan-Cos quadrant signs', 'General angles θ + 2kπ', 'Domain & Range'] },
      { id: 'top-math-11-9-2', chapterId: 'chap-math-11-9', topicNumber: '9.2', title: 'Fundamental Trigonometric Identities', keyPoints: ['sin²θ + cos²θ = 1', 'sec²θ - tan²θ = 1', 'csc²θ - cot²θ = 1'] },
    ],
  },

  // --- Computer Science (Class 10 & 12) ---
  {
    id: 'chap-cs-10-1',
    subjectId: 'computer-science',
    subjectName: 'Computer Science',
    classLevel: 'Class 10',
    chapterNumber: 1,
    name: 'Problem Solving and Algorithm Design',
    description: 'Problem solving steps, flowcharts, flowchart symbols, algorithms, and algorithm efficiency.',
    topics: [
      { id: 'top-cs-10-1-1', chapterId: 'chap-cs-10-1', topicNumber: '1.1', title: 'Flowcharts and Standard Symbols', keyPoints: ['Terminal, Process, Decision, Input/Output symbols', 'Connector & Flow lines'] },
      { id: 'top-cs-10-1-2', chapterId: 'chap-cs-10-1', topicNumber: '1.2', title: 'Algorithm Efficiency and Complexity', keyPoints: ['Time vs Space complexity', 'Trace table verification'] },
    ],
  },
  {
    id: 'chap-cs-12-1',
    subjectId: 'computer-science',
    subjectName: 'Computer Science',
    classLevel: 'Class 12',
    chapterNumber: 1,
    name: 'Database Management Systems',
    description: 'Data vs Information, File processing system vs DBMS, Database architecture, Relational models, Keys, and Normalization.',
    topics: [
      { id: 'top-cs-12-1-1', chapterId: 'chap-cs-12-1', topicNumber: '1.1', title: 'Relational Database Concepts & Keys', keyPoints: ['Primary Key (Unique + Not Null)', 'Foreign Key (Referential integrity)', 'Candidate & Composite keys'] },
      { id: 'top-cs-12-1-2', chapterId: 'chap-cs-12-1', topicNumber: '1.2', title: 'Database Normalization (1NF, 2NF, 3NF)', keyPoints: ['Eliminating anomalies (Insert, Update, Delete)', 'Functional dependency', 'Transitive dependency'] },
    ],
  },
  {
    id: 'chap-cs-12-2',
    subjectId: 'computer-science',
    subjectName: 'Computer Science',
    classLevel: 'Class 12',
    chapterNumber: 2,
    name: 'Data Structures and Algorithms',
    description: 'Arrays, Stacks (LIFO), Queues (FIFO), Linked Lists, Binary Trees, and Searching/Sorting algorithms.',
    topics: [
      { id: 'top-cs-12-2-1', chapterId: 'chap-cs-12-2', topicNumber: '2.1', title: 'Linear Data Structures (Stack & Queue)', keyPoints: ['Stack: Push/Pop/Peek (LIFO)', 'Queue: Enqueue/Dequeue (FIFO)', 'Circular queue'] },
      { id: 'top-cs-12-2-2', chapterId: 'chap-cs-12-2', topicNumber: '2.2', title: 'Searching & Sorting Algorithms', keyPoints: ['Binary search O(log n)', 'Bubble sort O(n²)', 'Quick sort O(n log n)'] },
    ],
  },

  // --- Pakistan Studies ---
  {
    id: 'chap-pak-10-1',
    subjectId: 'pakistan-studies',
    subjectName: 'Pakistan Studies',
    classLevel: 'Class 10',
    chapterNumber: 1,
    name: 'Pakistan Movement and Political History',
    description: 'Historical background of Pakistan movement, Two-Nation Theory, 1940 Lahore Resolution, Cabinet Mission, and Independence 1947.',
    topics: [
      { id: 'top-pak-10-1-1', chapterId: 'chap-pak-10-1', topicNumber: '1.1', title: 'Lahore Resolution 23rd March 1940', keyPoints: ['Drafted by Sir Zafarullah Khan', 'Presented by A.K. Fazlul Huq', 'Historic turning point for Muslim homeland'] },
      { id: 'top-pak-10-1-2', chapterId: 'chap-pak-10-1', topicNumber: '1.2', title: 'Constitutional History & 1973 Constitution', keyPoints: ['Parliamentary system', 'Senate 6-year term rotation', 'Fundamental human rights'] },
    ],
  },

  // --- Islamiat ---
  {
    id: 'chap-isl-10-1',
    subjectId: 'islamiat',
    subjectName: 'Islamiat',
    classLevel: 'Class 10',
    chapterNumber: 1,
    name: 'Quranic Sciences and Hadith',
    description: 'Surahs study, Makki vs Madani Surahs, Ahadees-e-Mubaraka, and ethical principles of Islam.',
    topics: [
      { id: 'top-isl-10-1-1', chapterId: 'chap-isl-10-1', topicNumber: '1.1', title: 'Makki vs Madani Surahs & Quranic Structure', keyPoints: ['86 Makki Surahs (Beliefs & Oneness)', '28 Madani Surahs (Social & State laws)', '114 Total Surahs'] },
      { id: 'top-isl-10-1-2', chapterId: 'chap-isl-10-1', topicNumber: '1.2', title: 'Seerat-un-Nabi & Treaties', keyPoints: ['Treaty of Hudaibiyyah 6 AH', 'Conquest of Makkah 8 AH', 'Farewell Sermon (Khutba Hajjat-ul-Wida)'] },
    ],
  },
];

// ==========================================
// 5. MASTER STUDY NOTES REPOSITORY
// ==========================================
export const MASTER_STUDY_NOTES: StudyNote[] = [
  {
    id: 'note-class10-phy-ch5',
    title: 'Class 10 Physics Chapter 12: Geometrical Optics Master Revision Notes',
    board: 'All Boards',
    subject: 'Physics',
    classLevel: 'Class 10',
    chapter: 'Geometrical Optics',
    topic: 'Refraction & Total Internal Reflection',
    description: 'Complete board-oriented revision guide covering reflection, refraction, spherical mirrors formula, Snell law, total internal reflection, and optical fiber communications.',
    type: 'Notes',
    contentSnippet: 'Comprehensive conceptual notes on reflection, refraction, spherical mirrors, mirror formula 1/f = 1/p + 1/q, Snell law, total internal reflection, and optical fibers.',
    fullContent: `CHAPTER 12: GEOMETRICAL OPTICS (CLASS 10 COMPLETE REVISION NOTES)
Taleem Guru Official Academic Material

1. REFLECTION OF LIGHT
When light traveling in a certain medium falls on the surface of another medium, a part of it turns back into the same medium. This turning back is called reflection.
- First Law of Reflection: The incident ray, the reflected ray, and the normal at the point of incidence all lie in the same plane.
- Second Law of Reflection: The angle of incidence (∠i) is equal to the angle of reflection (∠r).

2. SPHERICAL MIRRORS
A mirror whose polished, reflecting surface is a part of a hollow sphere of glass or plastic is called a spherical mirror.
- Concave Mirror: Reflecting surface is curved inward. Centers rays (Converging mirror).
- Convex Mirror: Reflecting surface is curved outward. Diverges rays (Diverging mirror).

3. MIRROR FORMULA & SIGN CONVENTIONS
Mirror Equation: 1/f = 1/p + 1/q
Where:
- f = focal length (positive for concave mirror, negative for convex mirror)
- p = object distance (always positive for real objects)
- q = image distance (positive for real image, negative for virtual image)

4. REFRACTION & SNELL'S LAW
The bending of light as it passes obliquely from one transparent medium into another medium of different optical density.
Snell's Law: n₁ sin(θ₁) = n₂ sin(θ₂)
Refractive Index: n = c / v

5. TOTAL INTERNAL REFLECTION
When light travels from an optically denser medium into a rarer medium at an angle of incidence greater than the critical angle (θc), the entire light ray is reflected back into the denser medium.
Conditions:
1. Light must enter from denser to rarer medium.
2. Angle of incidence must exceed critical angle.
Formula: sin(θc) = 1 / n`,
    content: `Comprehensive revision notes for Class 10 Physics Chapter 12 Geometrical Optics with solved formulas, definitions, and board diagrams.`,
    readTime: '12 mins',
    downloadsCount: 0,
    status: 'Published',
    keyPoints: [
      'Mirror Equation: 1/f = 1/p + 1/q',
      "Snell's Law: n₁ sin(θ₁) = n₂ sin(θ₂)",
      'Critical Angle: sin(θc) = 1/n',
      'Optical Fibers utilize continuous total internal reflection',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
    pdfUrl: 'https://taleemguru.pk/pdf/notes/class10-physics-optics.pdf',
    createdAt: '2026-01-10',
  },
  {
    id: 'note-math-differentiation-formulas',
    title: 'Class 12 & ECAT Mathematics: Master Calculus & Derivatives Formula Sheet',
    board: 'All Boards',
    subject: 'Mathematics',
    classLevel: 'Class 12',
    chapter: 'Differentiation',
    topic: 'Derivative Rules & Trig Formulas',
    description: 'Complete handbook of all critical differentiation rules, product/quotient/chain rules, implicit derivatives, logarithmic and trigonometric formulas.',
    type: 'Formulas',
    contentSnippet: 'All critical differentiation formulas, chain rule, product rule, quotient rule, trigonometric, logarithmic and inverse trigonometric derivatives for board and entry tests.',
    fullContent: `MASTER DIFFERENTIATION FORMULA SHEET
Taleem Guru Engineering Test Series (ECAT & Board Class 12)

1. BASIC RULES
• Power Rule: d/dx (xⁿ) = n·xⁿ⁻¹
• Constant Rule: d/dx (c) = 0
• Constant Multiple Rule: d/dx [c·f(x)] = c·f'(x)
• Sum / Difference Rule: d/dx [f(x) ± g(x)] = f'(x) ± g'(x)

2. PRODUCT & QUOTIENT RULES
• Product Rule: d/dx [u·v] = u·(dv/dx) + v·(du/dx)
• Quotient Rule: d/dx [u/v] = [v·(du/dx) - u·(dv/dx)] / v²
• Chain Rule: dy/dx = (dy/du) · (du/dx)

3. TRIGONOMETRIC DERIVATIVES
• d/dx [sin(x)] = cos(x)
• d/dx [cos(x)] = -sin(x)
• d/dx [tan(x)] = sec²(x)
• d/dx [cot(x)] = -csc²(x)
• d/dx [sec(x)] = sec(x)·tan(x)
• d/dx [csc(x)] = -csc(x)·cot(x)

4. EXPONENTIAL & LOGARITHMIC DERIVATIVES
• d/dx [eˣ] = eˣ
• d/dx [aˣ] = aˣ · ln(a)
• d/dx [ln(x)] = 1 / x
• d/dx [logₐ(x)] = 1 / [x · ln(a)]`,
    readTime: '8 mins',
    downloadsCount: 0,
    status: 'Published',
    keyPoints: [
      'Power Rule: d/dx(xⁿ) = n xⁿ⁻¹',
      'Product Rule: (uv)\' = u\'v + uv\'',
      'Quotient Rule: (u/v)\' = (u\'v - uv\') / v²',
      'Chain Rule: dy/dx = (dy/du) * (du/dx)',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80',
    pdfUrl: 'https://taleemguru.pk/pdf/notes/class12-calculus-derivatives.pdf',
    createdAt: '2026-01-18',
  },
  {
    id: 'note-mdcat-bio-cell',
    title: 'MDCAT Biology: High-Yield Cell Structure & Organelles Summary',
    board: 'Federal & Punjab Boards',
    subject: 'Biology',
    classLevel: 'Class 11',
    chapter: 'Cell Structure & Function',
    topic: 'Organelles & Endosymbiotic Theory',
    description: 'High-yield revision summary for MDCAT, UHS & NUMS candidates covering cellular enzymes, prokaryote vs eukaryote differences, and cell membrane transport.',
    type: 'Definitions',
    contentSnippet: 'High-yield points for UHS and NUMS: Endosymbiotic theory, Ribosomes (70S vs 80S), Golgi cisternae, Lysosomes hydrolytic enzymes, and Cytoskeleton fibers.',
    fullContent: `MDCAT HIGH-YIELD CELL BIOLOGY REVISION GUIDE

1. PLASMA MEMBRANE:
- Fluid Mosaic Model proposed by Singer & Nicolson (1972).
- Phospholipid bilayer with hydrophilic phosphate heads outward and hydrophobic fatty acid tails inward.

2. RIBOSOMES & PROTEIN SYNTHESIS:
- Prokaryotic Ribosomes: 70S (50S + 30S).
- Eukaryotic Ribosomes: 80S (60S + 40S).
- Synthesized inside nucleolus and assembled in cytoplasm.

3. MITOCHONDRIA & CHLOROPLASTS:
- Semi-autonomous organelles containing circular 70S DNA and ribosomes.
- Endosymbiotic Theory: evolved from ancestral aerobic bacteria and photosynthetic cyanobacteria.`,
    readTime: '10 mins',
    downloadsCount: 0,
    status: 'Published',
    keyPoints: [
      'Fluid Mosaic Model: Singer & Nicolson 1972',
      'Prokaryotic 70S vs Eukaryotic 80S Ribosomes',
      'Mitochondria: Cristae folds increase surface area for ATP synthase',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80',
    pdfUrl: 'https://taleemguru.pk/pdf/notes/mdcat-cell-biology.pdf',
    createdAt: '2026-02-02',
  },
  {
    id: 'note-chem-equilibrium-10',
    title: 'Class 10 Chemistry Chapter 9: Chemical Equilibrium Solved Short & Long Qs',
    board: 'BISE Lahore',
    subject: 'Chemistry',
    classLevel: 'Class 10',
    chapter: 'Chemical Equilibrium',
    topic: 'Law of Mass Action & Kc Derivations',
    description: 'Complete solved short questions, conceptual explanations, numerical problems on Kc value calculation, and equilibrium shifts.',
    type: 'Short Questions',
    contentSnippet: 'Step-by-step derivation of Law of Mass Action Kc expression with units, dynamic equilibrium condition, and Le Chatelier principle overview.',
    fullContent: `CLASS 10 CHEMISTRY CHAPTER 9: CHEMICAL EQUILIBRIUM
Solved Board Questions & Answers

Q1: What is the difference between static and dynamic equilibrium?
Answer:
- Static Equilibrium: A state where a reaction ceases completely (e.g., a building standing still).
- Dynamic Equilibrium: A state where forward and reverse reactions proceed at equal rates, keeping concentrations constant.

Q2: Derive the equilibrium constant expression for the reaction: aA + bB ⇌ cC + dD.
Answer:
Rate of forward reaction Rf = kf [A]^a [B]^b
Rate of reverse reaction Rr = kr [C]^c [D]^d
At equilibrium: Rf = Rr => kf [A]^a [B]^b = kr [C]^c [D]^d
Kc = kf / kr = [C]^c [D]^d / ([A]^a [B]^b)`,
    readTime: '11 mins',
    downloadsCount: 0,
    status: 'Published',
    keyPoints: [
      'Dynamic Equilibrium occurs in closed systems',
      'Kc = [Products] / [Reactants]',
      'If Qc < Kc, reaction proceeds forward to reach equilibrium',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80',
    pdfUrl: 'https://taleemguru.pk/pdf/notes/class10-chem-equilibrium.pdf',
    createdAt: '2026-02-14',
  },
  {
    id: 'note-css-pak-studies-1940',
    title: 'Pakistan Studies & History: Lahore Resolution 1940 to 1947 Partition Analysis',
    board: 'All Boards',
    subject: 'Pakistan Studies',
    classLevel: 'Class 10',
    chapter: 'Ideology of Pakistan & Freedom Movement',
    topic: '1940 Resolution & 3rd June Plan',
    description: 'Analytical review of the 1940 Lahore Resolution, Cripps Mission 1942, Cabinet Mission Plan 1946, 3rd June Plan, and Boundary Commission awards.',
    type: 'Summary',
    contentSnippet: 'In-depth historical points: Pakistan Resolution text, Quaid-e-Azam presidential address, Cripps proposals rejection reasons, and Radcliffe Award controversies.',
    fullContent: `PAKISTAN STUDIES: HISTORICAL MILESTONES (1940 - 1947)

1. LAHORE RESOLUTION (23RD MARCH 1940):
- Presented by Maulvi A.K. Fazlul Haq (Sher-e-Bengal) at Minto Park (Iqbal Park) Lahore.
- Chaired by Quaid-e-Azam Muhammad Ali Jinnah.
- Declared that geographically contiguous units must be demarcated into regions where Muslims are in majority.

2. CRIPPS MISSION (1942):
- Led by Sir Stafford Cripps to seek Indian support during World War II.
- Rejected by Muslim League because it did not explicitly grant the creation of Pakistan.

3. 3RD JUNE PLAN 1947:
- Announced by Lord Mountbatten dividing British India into Pakistan and India.`,
    readTime: '15 mins',
    downloadsCount: 0,
    status: 'Published',
    keyPoints: [
      'Lahore Resolution 23 March 1940 presented by A.K. Fazlul Haq',
      'Cabinet Mission Plan 1946 had three sections (A, B, C)',
      'Independence achieved on 27th Ramadan 1366 AH (14 August 1947)',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=600&auto=format&fit=crop&q=80',
    pdfUrl: 'https://taleemguru.pk/pdf/notes/pak-studies-1940-1947.pdf',
    createdAt: '2026-02-20',
  },
];

// ==========================================
// 6. MASTER PAST PAPERS REPOSITORY
// ==========================================
export const MASTER_PAST_PAPERS: PastPaper[] = [
  {
    id: 'pp-lhr-10-phy-2024',
    title: 'BISE Lahore Class 10 Physics Annual Paper 2024 (Group 1)',
    board: 'BISE Lahore',
    province: 'Punjab',
    classLevel: 'Class 10',
    subject: 'Physics',
    chapter: 'Full Book',
    year: 2024,
    paperGroup: 'Group 1',
    type: 'Objective (MCQs)',
    paperType: 'First Annual Examination',
    questionsCount: 12,
    downloadUrl: 'https://taleemguru.pk/papers/bise-lhr-10-phy-2024.pdf',
    status: 'Published',
    description: 'Official 2024 Board Annual Question Paper with verified answer keys, detailed explanations, and marking scheme.',
  },
  {
    id: 'pp-lhr-10-phy-2023',
    title: 'BISE Lahore Class 10 Physics Annual Paper 2023 (Group 1)',
    board: 'BISE Lahore',
    province: 'Punjab',
    classLevel: 'Class 10',
    subject: 'Physics',
    chapter: 'Full Book',
    year: 2023,
    paperGroup: 'Group 1',
    type: 'Objective (MCQs)',
    paperType: 'Annual Group 1',
    questionsCount: 12,
    downloadUrl: 'https://taleemguru.pk/papers/bise-lhr-10-phy-2023-g1.pdf',
    status: 'Published',
    description: 'Complete 12 MCQs paper with optical refraction, capacitance, and electrostatics questions.',
  },
  {
    id: 'pp-lhr-10-phy-2022',
    title: 'BISE Lahore Class 10 Physics Annual Paper 2022 (Group 2)',
    board: 'BISE Lahore',
    province: 'Punjab',
    classLevel: 'Class 10',
    subject: 'Physics',
    chapter: 'Full Book',
    year: 2022,
    paperGroup: 'Group 2',
    type: 'Objective (MCQs)',
    paperType: 'Annual Group 2',
    questionsCount: 12,
    downloadUrl: 'https://taleemguru.pk/papers/bise-lhr-10-phy-2022-g2.pdf',
    status: 'Published',
    description: 'Morning and Evening shift solved past paper with authentic solutions.',
  },
  {
    id: 'pp-fbise-10-chem-2024',
    title: 'FBISE Federal Board Class 10 Chemistry Annual Paper 2024',
    board: 'FBISE Islamabad',
    province: 'Federal',
    classLevel: 'Class 10',
    subject: 'Chemistry',
    chapter: 'Full Book',
    year: 2024,
    paperGroup: 'Annual',
    type: 'Objective (MCQs)',
    paperType: 'SLO Based Annual Exam',
    questionsCount: 12,
    downloadUrl: 'https://taleemguru.pk/papers/fbise-10-chem-2024.pdf',
    status: 'Published',
    description: 'Federal Board SLO (Student Learning Outcomes) based conceptual paper with answer keys.',
  },
  {
    id: 'pp-khi-12-math-2023',
    title: 'BIEK Karachi Board Class 12 Mathematics Annual Exam 2023',
    board: 'BSEK / BIEK Karachi',
    province: 'Sindh',
    classLevel: 'Class 12',
    subject: 'Mathematics',
    chapter: 'Full Book',
    year: 2023,
    paperGroup: 'Annual',
    type: 'Objective (MCQs)',
    paperType: 'HSSC-II Science General & Pre-Engineering',
    questionsCount: 20,
    downloadUrl: 'https://taleemguru.pk/papers/biek-12-math-2023.pdf',
    status: 'Published',
    description: 'Karachi Board 20-mark objective MCQ test with calculus and coordinate geometry questions.',
  },
  {
    id: 'pp-pew-10-bio-2023',
    title: 'BISE Peshawar Class 10 Biology Annual Examination 2023',
    board: 'BISE Peshawar',
    province: 'KPK',
    classLevel: 'Class 10',
    subject: 'Biology',
    chapter: 'Full Book',
    year: 2023,
    paperGroup: 'Annual',
    type: 'Objective (MCQs)',
    paperType: 'SSC-II Science Group',
    questionsCount: 12,
    downloadUrl: 'https://taleemguru.pk/papers/bise-pew-10-bio-2023.pdf',
    status: 'Published',
    description: 'Peshawar Board official solved examination paper for Matric Class 10 students.',
  },
  {
    id: 'pp-qta-10-math-2023',
    title: 'BBISE Quetta Board Class 10 Mathematics Annual Paper 2023',
    board: 'BBISE Quetta',
    province: 'Balochistan',
    classLevel: 'Class 10',
    subject: 'Mathematics',
    chapter: 'Full Book',
    year: 2023,
    paperGroup: 'Annual',
    type: 'Objective (MCQs)',
    paperType: 'Matric Annual Exam',
    questionsCount: 15,
    downloadUrl: 'https://taleemguru.pk/papers/bbise-qta-10-math-2023.pdf',
    status: 'Published',
    description: 'Quetta Board official 15 solved MCQs on quadratic equations, sets, matrices, and trigonometry.',
  },
  {
    id: 'pp-ajk-10-phy-2023',
    title: 'BISE AJK Mirpur Board Class 10 Physics Annual Paper 2023',
    board: 'BISE AJK (Mirpur)',
    province: 'AJK',
    classLevel: 'Class 10',
    subject: 'Physics',
    chapter: 'Full Book',
    year: 2023,
    paperGroup: 'Annual',
    type: 'Objective (MCQs)',
    paperType: 'SSC Part 2 Examination',
    questionsCount: 12,
    downloadUrl: 'https://taleemguru.pk/papers/bise-ajk-10-phy-2023.pdf',
    status: 'Published',
    description: 'Azad Jammu & Kashmir Mirpur Board official physics past paper with complete solution key.',
  },
  {
    id: 'pp-mdcat-uhs-2023',
    title: 'MDCAT UHS Official Past Paper 2023 (Full Solution & Keys)',
    board: 'FBISE Islamabad',
    province: 'Punjab',
    classLevel: 'Class 12',
    subject: 'Biology',
    chapter: 'MDCAT Syllabus',
    year: 2023,
    paperGroup: 'Annual',
    type: 'Objective (MCQs)',
    paperType: 'PM&DC National MDCAT',
    questionsCount: 68,
    downloadUrl: 'https://taleemguru.pk/papers/mdcat-uhs-2023.pdf',
    status: 'Published',
    description: 'PM&DC official past paper containing 68 high-yield biology questions with detailed explanations.',
  },
];
