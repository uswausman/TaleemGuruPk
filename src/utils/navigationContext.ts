export interface NavigationContext {
  subject: string;
  classLevel: string;
  board: string;
}

// Canonical list of standard classes
export const STANDARD_CLASSES = [
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
  'MDCAT',
  'ECAT',
  'CSS',
  'PMS',
];

// Helper to normalize class level string
export function normalizeClassLevel(val?: string): string {
  if (!val || val === 'All' || val === 'all') return 'All';
  const clean = val.trim().toLowerCase();
  
  if (
    clean === '9' ||
    clean === 'class-9' ||
    clean === 'class 9' ||
    clean === 'class9' ||
    clean === 'grade-9' ||
    clean === 'grade 9' ||
    clean === 'grade9' ||
    clean === '9th' ||
    clean.includes('9th') ||
    clean.includes('matric pt 1') ||
    clean.includes('matric-pt-1') ||
    clean === 'ssc-1' ||
    clean === 'ssc-i' ||
    clean === 'ssc 1' ||
    clean === 'ssc i' ||
    clean.startsWith('class 9') ||
    clean.startsWith('class-9') ||
    clean.startsWith('grade 9') ||
    clean.startsWith('grade-9')
  ) {
    return 'Class 9';
  }
  if (
    clean === '10' ||
    clean === 'class-10' ||
    clean === 'class 10' ||
    clean === 'class10' ||
    clean === 'grade-10' ||
    clean === 'grade 10' ||
    clean === 'grade10' ||
    clean === '10th' ||
    clean.includes('10th') ||
    clean.includes('matric pt 2') ||
    clean.includes('matric-pt-2') ||
    clean === 'ssc-2' ||
    clean === 'ssc-ii' ||
    clean === 'ssc 2' ||
    clean === 'ssc ii' ||
    clean.startsWith('class 10') ||
    clean.startsWith('class-10') ||
    clean.startsWith('grade 10') ||
    clean.startsWith('grade-10')
  ) {
    return 'Class 10';
  }
  if (
    clean === '11' ||
    clean === 'class-11' ||
    clean === 'class 11' ||
    clean === 'class11' ||
    clean === 'grade-11' ||
    clean === 'grade 11' ||
    clean === 'grade11' ||
    clean === '11th' ||
    clean.includes('11th') ||
    clean.includes('hssc-1') ||
    clean.includes('hssc-i') ||
    clean.includes('hssc 1') ||
    clean.includes('hssc i') ||
    clean.includes('fsc-1') ||
    clean.includes('fsc 1') ||
    clean.startsWith('class 11') ||
    clean.startsWith('class-11') ||
    clean.startsWith('grade 11') ||
    clean.startsWith('grade-11')
  ) {
    return 'Class 11';
  }
  if (
    clean === '12' ||
    clean === 'class-12' ||
    clean === 'class 12' ||
    clean === 'class12' ||
    clean === 'grade-12' ||
    clean === 'grade 12' ||
    clean === 'grade12' ||
    clean === '12th' ||
    clean.includes('12th') ||
    clean.includes('hssc-2') ||
    clean.includes('hssc-ii') ||
    clean.includes('hssc 2') ||
    clean.includes('hssc ii') ||
    clean.includes('fsc-2') ||
    clean.includes('fsc 2') ||
    clean.startsWith('class 12') ||
    clean.startsWith('class-12') ||
    clean.startsWith('grade 12') ||
    clean.startsWith('grade-12')
  ) {
    return 'Class 12';
  }
  if (clean.includes('mdcat')) return 'MDCAT';
  if (clean.includes('ecat')) return 'ECAT';
  if (clean.includes('css')) return 'CSS';
  if (clean.includes('pms')) return 'PMS';

  return val.trim();
}

// Helper to normalize subject name to canonical title case
export function normalizeSubjectName(val?: string): string {
  if (!val || val === 'All' || val === 'all') return 'All';
  const clean = val.trim().toLowerCase().replace(/-/g, ' ');
  
  const subjectsMap: Record<string, string> = {
    physics: 'Physics',
    chemistry: 'Chemistry',
    biology: 'Biology',
    mathematics: 'Mathematics',
    math: 'Mathematics',
    maths: 'Mathematics',
    'computer science': 'Computer Science',
    computerscience: 'Computer Science',
    cs: 'Computer Science',
    english: 'English',
    urdu: 'Urdu',
    'pakistan studies': 'Pakistan Studies',
    'pak studies': 'Pakistan Studies',
    pakstudies: 'Pakistan Studies',
    islamiat: 'Islamiat',
    islamiyat: 'Islamiat',
    'islamic studies': 'Islamiat',
    'tarjuma tul quran': 'Tarjuma-tul-Quran',
    'tarjuma-tul-quran': 'Tarjuma-tul-Quran',
    'general science': 'General Science',
  };

  if (subjectsMap[clean]) {
    return subjectsMap[clean];
  }

  // Title case words
  return clean
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Check if string is indicative of a class or grade
export function isClassString(str: string): boolean {
  if (!str) return false;
  const norm = str.trim().toLowerCase();
  if (['9', '10', '11', '12'].includes(norm)) return true;
  if (/^(class|grade)[- ]?(9|10|11|12)$/i.test(norm)) return true;
  return (
    norm.startsWith('class') ||
    norm.startsWith('grade') ||
    norm.includes('matric') ||
    norm.includes('hssc') ||
    norm.includes('ssc') ||
    norm.includes('fsc') ||
    ['9th', '10th', '11th', '12th', 'mdcat', 'ecat', 'css', 'pms'].some(k => norm.includes(k))
  );
}

// Match class grade robustly
export function matchesClassGrade(itemClass?: string, targetClass?: string): boolean {
  if (!targetClass || targetClass === 'All' || targetClass === 'all') return true;
  if (!itemClass) return false;
  
  const normTarget = normalizeClassLevel(targetClass);
  const normItem = normalizeClassLevel(itemClass);
  
  if (normTarget === 'All') return true;
  if (normItem === 'All') return false;
  if (normTarget.toLowerCase() === normItem.toLowerCase()) return true;

  // Compare grade numbers (e.g. 9, 10, 11, 12)
  const tNum = normTarget.match(/\b(9|10|11|12)\b/);
  const iNum = normItem.match(/\b(9|10|11|12)\b/);
  if (tNum && iNum) {
    return tNum[1] === iNum[1];
  }

  const specialExams = ['mdcat', 'ecat', 'css', 'pms'];
  for (const exam of specialExams) {
    if (normTarget.toLowerCase().includes(exam) || normItem.toLowerCase().includes(exam)) {
      return normTarget.toLowerCase().includes(exam) && normItem.toLowerCase().includes(exam);
    }
  }

  return normItem.toLowerCase().includes(normTarget.toLowerCase()) || normTarget.toLowerCase().includes(normItem.toLowerCase());
}

// Build serialized navigation context string
export function buildNavContextString(subject?: string, classLevel?: string, board?: string): string {
  const normSub = subject && subject !== 'All' ? normalizeSubjectName(subject) : 'All';
  const normCls = classLevel && classLevel !== 'All' ? normalizeClassLevel(classLevel) : 'All';
  const normBrd = board && board !== 'All' ? board.trim() : 'All';

  if (normSub === 'All' && normCls === 'All' && normBrd === 'All') {
    return 'All';
  }

  return JSON.stringify({
    subject: normSub,
    classLevel: normCls,
    board: normBrd,
  });
}

export function parseNavContext(rawStr?: string): NavigationContext {
  if (!rawStr) return { subject: 'All', classLevel: 'All', board: 'All' };
  
  let str = rawStr.trim();
  // Safe decode if URI encoded
  if (str.includes('%')) {
    try {
      str = decodeURIComponent(str).trim();
    } catch (e) {}
  }

  // 1. JSON Payload check
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      const sub = parsed.subject || parsed.Subject;
      const cls = parsed.classLevel || parsed.classlevel || parsed.class || parsed.Class || parsed.grade || parsed.Grade;
      const brd = parsed.board || parsed.Board;
      return {
        subject: sub ? normalizeSubjectName(sub) : 'All',
        classLevel: cls ? normalizeClassLevel(cls) : 'All',
        board: brd && brd !== 'All' ? brd.trim() : 'All',
      };
    } catch (e) {}
  }

  // 2. Delimited string check (:: or | or :)
  const delim = str.includes('::') ? '::' : (str.includes('|') ? '|' : (str.includes(':') && !str.startsWith('http') ? ':' : null));
  if (delim) {
    const parts = str.split(delim).map(p => p.trim());
    let sub = 'All';
    let cls = 'All';
    let brd = 'All';
    
    for (const p of parts) {
      if (!p || p === 'All' || p === 'all') continue;
      if (isClassString(p)) {
        cls = normalizeClassLevel(p);
      } else if (p.toLowerCase().includes('bise') || p.toLowerCase().includes('board') || ['punjab', 'federal', 'sindh', 'kpk', 'balochistan', 'ajk'].includes(p.toLowerCase())) {
        brd = p;
      } else {
        sub = normalizeSubjectName(p);
      }
    }
    return { subject: sub, classLevel: cls, board: brd };
  }

  // 3. Slash delimited path check (e.g. "class-10/physics" or "physics/class-10")
  if (str.includes('/')) {
    const segments = str.split('/').map(s => s.trim()).filter(Boolean);
    let sub = 'All';
    let cls = 'All';
    let brd = 'All';

    for (const seg of segments) {
      if (!seg || seg === 'All' || seg === 'all') continue;
      if (isClassString(seg)) {
        cls = normalizeClassLevel(seg);
      } else if (seg.toLowerCase().includes('bise') || seg.toLowerCase().includes('board') || ['punjab', 'federal', 'sindh', 'kpk', 'balochistan', 'ajk'].includes(seg.toLowerCase())) {
        brd = seg;
      } else {
        sub = normalizeSubjectName(seg);
      }
    }
    return { subject: sub, classLevel: cls, board: brd };
  }

  // 4. Single parameter check
  if (isClassString(str)) {
    return { subject: 'All', classLevel: normalizeClassLevel(str), board: 'All' };
  }

  return { subject: normalizeSubjectName(str), classLevel: 'All', board: 'All' };
}
