import { db } from './index.ts';
import {
  boards,
  classes,
  classBoards,
  subjects,
  subjectBoards,
  subjectClasses,
  chapters,
  syllabus,
  entryTestCategories,
  entryTestSubcategories,
  mcqs,
  tests,
  pastPapers,
  studyNotes,
} from './schema.ts';
import { eq, sql, and, desc, asc, ilike } from 'drizzle-orm';

// ============================================================================
// BOARDS
// ============================================================================

export async function getAllBoardsFromDb() {
  if (!isHierarchyRepaired) await ensureAndRepairAcademicHierarchy();
  return await db.select().from(boards).orderBy(asc(boards.name));
}

export async function getBoardByIdFromDb(id: number) {
  const [record] = await db.select().from(boards).where(eq(boards.id, id)).limit(1);
  return record || null;
}

export async function checkBoardDependencies(id: number, boardName: string) {
  const normName = boardName.trim().toLowerCase();

  const [classCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(classes)
    .where(eq(classes.boardId, id));
  const [subjCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(subjects)
    .where(eq(subjects.boardId, id));
  const [mcqCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mcqs)
    .where(sql`LOWER(TRIM(${mcqs.board})) = ${normName}`);
  const [testCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tests)
    .where(sql`LOWER(TRIM(${tests.board})) = ${normName}`);
  const [pastPaperCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pastPapers)
    .where(sql`LOWER(TRIM(${pastPapers.board})) = ${normName}`);
  const [noteCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(studyNotes)
    .where(sql`LOWER(TRIM(${studyNotes.board})) = ${normName}`);

  const depCounts = {
    classes: Number(classCountRes?.count || 0),
    subjects: Number(subjCountRes?.count || 0),
    mcqs: Number(mcqCountRes?.count || 0),
    tests: Number(testCountRes?.count || 0),
    pastPapers: Number(pastPaperCountRes?.count || 0),
    studyNotes: Number(noteCountRes?.count || 0),
  };

  const total = Object.values(depCounts).reduce((a, b) => a + b, 0);

  return {
    hasDependencies: total > 0,
    total,
    details: depCounts,
  };
}

export async function createBoardInDb(data: {
  name: string;
  code?: string;
  establishmentYear?: number;
  province?: string;
  city?: string;
  description?: string;
  status?: string;
}) {
  const cleanName = data.name.trim();
  const existing = await db
    .select()
    .from(boards)
    .where(sql`LOWER(TRIM(${boards.name})) = ${cleanName.toLowerCase()}`)
    .limit(1);

  if (existing.length > 0) {
    const err = new Error(`Board with name "${cleanName}" already exists.`);
    (err as any).statusCode = 409;
    throw err;
  }

  const [created] = await db
    .insert(boards)
    .values({
      name: cleanName,
      code: data.code?.trim() || null,
      establishmentYear: data.establishmentYear || null,
      province: data.province?.trim() || null,
      city: data.city?.trim() || null,
      description: data.description?.trim() || null,
      status: data.status || 'Active',
    })
    .returning();

  return created;
}

export async function updateBoardInDb(
  id: number,
  data: {
    name?: string;
    code?: string;
    establishmentYear?: number;
    province?: string;
    city?: string;
    description?: string;
    status?: string;
  }
) {
  const current = await getBoardByIdFromDb(id);
  if (!current) {
    const err = new Error(`Board with ID ${id} not found.`);
    (err as any).statusCode = 404;
    throw err;
  }

  if (data.name && data.name.trim().toLowerCase() !== current.name.toLowerCase()) {
    const cleanName = data.name.trim();
    const duplicate = await db
      .select()
      .from(boards)
      .where(
        and(
          sql`LOWER(TRIM(${boards.name})) = ${cleanName.toLowerCase()}`,
          sql`${boards.id} != ${id}`
        )
      )
      .limit(1);

    if (duplicate.length > 0) {
      const err = new Error(`Another board with name "${cleanName}" already exists.`);
      (err as any).statusCode = 409;
      throw err;
    }
  }

  const [updated] = await db
    .update(boards)
    .set({
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.code !== undefined ? { code: data.code?.trim() || null } : {}),
      ...(data.establishmentYear !== undefined ? { establishmentYear: data.establishmentYear || null } : {}),
      ...(data.province !== undefined ? { province: data.province?.trim() || null } : {}),
      ...(data.city !== undefined ? { city: data.city?.trim() || null } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.status ? { status: data.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(boards.id, id))
    .returning();

  return updated;
}

export async function deleteBoardFromDb(id: number) {
  const current = await getBoardByIdFromDb(id);
  if (!current) {
    const err = new Error(`Board with ID ${id} not found.`);
    (err as any).statusCode = 404;
    throw err;
  }

  const deps = await checkBoardDependencies(id, current.name);
  if (deps.hasDependencies) {
    const err = new Error(
      `Cannot delete board "${current.name}" because it is in use by ${deps.total} academic item(s): ${deps.details.classes} class(es), ${deps.details.subjects} subject(s), ${deps.details.mcqs} MCQ(s), ${deps.details.tests} test(s), ${deps.details.pastPapers} past paper(s), ${deps.details.studyNotes} study note(s).`
    );
    (err as any).statusCode = 409;
    (err as any).dependencies = deps.details;
    throw err;
  }

  await db.delete(boards).where(eq(boards.id, id));
  return { success: true, id, name: current.name };
}

// ============================================================================
// CLASSES
// ============================================================================

export async function getAllClassesFromDb() {
  if (!isHierarchyRepaired) await ensureAndRepairAcademicHierarchy();
  const records = await db
    .select({
      id: classes.id,
      name: classes.name,
      boardId: classes.boardId,
      boardName: boards.name,
      status: classes.status,
      createdAt: classes.createdAt,
      updatedAt: classes.updatedAt,
    })
    .from(classes)
    .leftJoin(boards, eq(classes.boardId, boards.id))
    .orderBy(asc(classes.id));

  let cbRows: any[] = [];
  try {
    cbRows = await db
      .select({
        classId: classBoards.classId,
        boardId: classBoards.boardId,
        boardName: boards.name,
      })
      .from(classBoards)
      .leftJoin(boards, eq(classBoards.boardId, boards.id));
  } catch (e) {}

  const cbMap = new Map<number, { ids: number[]; names: string[] }>();
  for (const r of cbRows) {
    if (!r.classId) continue;
    if (!cbMap.has(r.classId)) {
      cbMap.set(r.classId, { ids: [], names: [] });
    }
    const entry = cbMap.get(r.classId)!;
    if (r.boardId && !entry.ids.includes(r.boardId)) {
      entry.ids.push(r.boardId);
      if (r.boardName) entry.names.push(r.boardName);
    }
  }

  return records.map((c) => {
    const cb = cbMap.get(c.id);
    const boardIds = cb && cb.ids.length > 0 ? cb.ids : c.boardId ? [c.boardId] : [];
    const boardNames = cb && cb.names.length > 0 ? cb.names : c.boardName ? [c.boardName] : [];
    return {
      ...c,
      boardIds,
      boardNames,
    };
  });
}

export async function getClassByIdFromDb(id: number) {
  const [record] = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
  return record || null;
}

export async function checkClassDependencies(id: number, className: string) {
  const normName = className.trim().toLowerCase();

  const [subjCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(subjects)
    .where(eq(subjects.classId, id));
  const [chapCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(chapters)
    .where(eq(chapters.classId, id));
  const [mcqCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mcqs)
    .where(sql`LOWER(TRIM(${mcqs.classLevel})) = ${normName}`);
  const [testCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tests)
    .where(sql`LOWER(TRIM(${tests.classLevel})) = ${normName}`);
  const [pastPaperCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pastPapers)
    .where(sql`LOWER(TRIM(${pastPapers.classLevel})) = ${normName}`);
  const [noteCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(studyNotes)
    .where(sql`LOWER(TRIM(${studyNotes.classLevel})) = ${normName}`);

  const depCounts = {
    subjects: Number(subjCountRes?.count || 0),
    chapters: Number(chapCountRes?.count || 0),
    mcqs: Number(mcqCountRes?.count || 0),
    tests: Number(testCountRes?.count || 0),
    pastPapers: Number(pastPaperCountRes?.count || 0),
    studyNotes: Number(noteCountRes?.count || 0),
  };

  const total = Object.values(depCounts).reduce((a, b) => a + b, 0);

  return {
    hasDependencies: total > 0,
    total,
    details: depCounts,
  };
}

export async function createClassInDb(data: {
  name: string;
  boardId?: number;
  boardIds?: number[];
  status?: string;
}) {
  const cleanName = data.name.trim();

  let targetBoardIds = data.boardIds && data.boardIds.length > 0 ? data.boardIds : [];
  if (targetBoardIds.length === 0 && data.boardId) {
    targetBoardIds = [data.boardId];
  }
  if (targetBoardIds.length === 0) {
    const allB = await db.select().from(boards);
    targetBoardIds = allB.map((b) => b.id);
  }

  const primaryBoardId = targetBoardIds[0] || 1;

  const [created] = await db
    .insert(classes)
    .values({
      name: cleanName,
      boardId: primaryBoardId,
      status: data.status || 'Active',
    })
    .returning();

  for (const bId of targetBoardIds) {
    try {
      await db.insert(classBoards).values({ classId: created.id, boardId: bId });
    } catch (e) {}
  }

  return {
    ...created,
    boardIds: targetBoardIds,
  };
}

export async function updateClassInDb(
  id: number,
  data: {
    name?: string;
    boardId?: number;
    boardIds?: number[];
    status?: string;
  }
) {
  const current = await getClassByIdFromDb(id);
  if (!current) {
    const err = new Error(`Class with ID ${id} not found.`);
    (err as any).statusCode = 404;
    throw err;
  }

  let targetBoardIds = data.boardIds;
  if (!targetBoardIds && data.boardId) {
    targetBoardIds = [data.boardId];
  }

  const [updated] = await db
    .update(classes)
    .set({
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(targetBoardIds && targetBoardIds.length > 0 ? { boardId: targetBoardIds[0] } : data.boardId ? { boardId: data.boardId } : {}),
      ...(data.status ? { status: data.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(classes.id, id))
    .returning();

  if (targetBoardIds && targetBoardIds.length > 0) {
    try {
      await db.delete(classBoards).where(eq(classBoards.classId, id));
      for (const bId of targetBoardIds) {
        await db.insert(classBoards).values({ classId: id, boardId: bId });
      }
    } catch (e) {}
  }

  return {
    ...updated,
    boardIds: targetBoardIds || [updated.boardId],
  };
}

export async function deleteClassFromDb(id: number) {
  const current = await getClassByIdFromDb(id);
  if (!current) {
    const err = new Error(`Class with ID ${id} not found.`);
    (err as any).statusCode = 404;
    throw err;
  }

  const deps = await checkClassDependencies(id, current.name);
  if (deps.hasDependencies) {
    const err = new Error(
      `Cannot delete class "${current.name}" because it is in use by ${deps.total} academic item(s): ${deps.details.subjects} subject(s), ${deps.details.chapters} chapter(s), ${deps.details.mcqs} MCQ(s), ${deps.details.tests} test(s), ${deps.details.pastPapers} past paper(s), ${deps.details.studyNotes} study note(s).`
    );
    (err as any).statusCode = 409;
    (err as any).dependencies = deps.details;
    throw err;
  }

  await db.delete(classes).where(eq(classes.id, id));
  return { success: true, id, name: current.name };
}

// ============================================================================
// SUBJECTS
// ============================================================================

export async function getAllSubjectsFromDb() {
  if (!isHierarchyRepaired) await ensureAndRepairAcademicHierarchy();
  const records = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      classId: subjects.classId,
      className: classes.name,
      boardId: subjects.boardId,
      boardName: boards.name,
      status: subjects.status,
      createdAt: subjects.createdAt,
      updatedAt: subjects.updatedAt,
    })
    .from(subjects)
    .leftJoin(classes, eq(subjects.classId, classes.id))
    .leftJoin(boards, eq(subjects.boardId, boards.id))
    .orderBy(asc(subjects.name));

  let scRows: any[] = [];
  let sbRows: any[] = [];
  try {
    scRows = await db
      .select({
        subjectId: subjectClasses.subjectId,
        classId: subjectClasses.classId,
        className: classes.name,
      })
      .from(subjectClasses)
      .leftJoin(classes, eq(subjectClasses.classId, classes.id));

    sbRows = await db
      .select({
        subjectId: subjectBoards.subjectId,
        boardId: subjectBoards.boardId,
        boardName: boards.name,
      })
      .from(subjectBoards)
      .leftJoin(boards, eq(subjectBoards.boardId, boards.id));
  } catch (e) {}

  const scMap = new Map<number, { ids: number[]; names: string[] }>();
  for (const r of scRows) {
    if (!r.subjectId) continue;
    if (!scMap.has(r.subjectId)) scMap.set(r.subjectId, { ids: [], names: [] });
    const entry = scMap.get(r.subjectId)!;
    if (r.classId && !entry.ids.includes(r.classId)) {
      entry.ids.push(r.classId);
      if (r.className) entry.names.push(r.className);
    }
  }

  const sbMap = new Map<number, { ids: number[]; names: string[] }>();
  for (const r of sbRows) {
    if (!r.subjectId) continue;
    if (!sbMap.has(r.subjectId)) sbMap.set(r.subjectId, { ids: [], names: [] });
    const entry = sbMap.get(r.subjectId)!;
    if (r.boardId && !entry.ids.includes(r.boardId)) {
      entry.ids.push(r.boardId);
      if (r.boardName) entry.names.push(r.boardName);
    }
  }

  return records.map((s) => {
    const sc = scMap.get(s.id);
    const sb = sbMap.get(s.id);
    const classIds = sc && sc.ids.length > 0 ? sc.ids : s.classId ? [s.classId] : [];
    const classNames = sc && sc.names.length > 0 ? sc.names : s.className ? [s.className] : [];
    const boardIds = sb && sb.ids.length > 0 ? sb.ids : s.boardId ? [s.boardId] : [];
    const boardNames = sb && sb.names.length > 0 ? sb.names : s.boardName ? [s.boardName] : [];

    return {
      ...s,
      classIds,
      classNames,
      boardIds,
      boardNames,
    };
  });
}

export async function getSubjectByIdFromDb(id: number) {
  const [record] = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
  return record || null;
}

export async function checkSubjectDependencies(id: number, subjectName: string) {
  const normName = subjectName.trim().toLowerCase();

  const [chapCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(chapters)
    .where(eq(chapters.subjectId, id));
  const [sylCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(syllabus)
    .where(eq(syllabus.subjectId, id));
  const [mcqCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mcqs)
    .where(sql`LOWER(TRIM(${mcqs.subject})) = ${normName}`);
  const [testCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tests)
    .where(sql`LOWER(TRIM(${tests.subject})) = ${normName}`);
  const [pastPaperCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pastPapers)
    .where(sql`LOWER(TRIM(${pastPapers.subject})) = ${normName}`);
  const [noteCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(studyNotes)
    .where(sql`LOWER(TRIM(${studyNotes.subject})) = ${normName}`);

  const depCounts = {
    chapters: Number(chapCountRes?.count || 0),
    syllabus: Number(sylCountRes?.count || 0),
    mcqs: Number(mcqCountRes?.count || 0),
    tests: Number(testCountRes?.count || 0),
    pastPapers: Number(pastPaperCountRes?.count || 0),
    studyNotes: Number(noteCountRes?.count || 0),
  };

  const total = Object.values(depCounts).reduce((a, b) => a + b, 0);

  return {
    hasDependencies: total > 0,
    total,
    details: depCounts,
  };
}

export async function createSubjectInDb(data: {
  name: string;
  classId?: number;
  classIds?: number[];
  boardId?: number;
  boardIds?: number[];
  status?: string;
}) {
  const cleanName = data.name.trim();

  let targetClassIds = data.classIds && data.classIds.length > 0 ? data.classIds : [];
  if (targetClassIds.length === 0 && data.classId) {
    targetClassIds = [data.classId];
  }
  if (targetClassIds.length === 0) {
    const allC = await db.select().from(classes).limit(1);
    targetClassIds = allC.length > 0 ? [allC[0].id] : [1];
  }

  let targetBoardIds = data.boardIds && data.boardIds.length > 0 ? data.boardIds : [];
  if (targetBoardIds.length === 0 && data.boardId) {
    targetBoardIds = [data.boardId];
  }

  const primaryClassId = targetClassIds[0];
  const primaryBoardId = targetBoardIds[0] || null;

  const [created] = await db
    .insert(subjects)
    .values({
      name: cleanName,
      classId: primaryClassId,
      boardId: primaryBoardId,
      status: data.status || 'Active',
    })
    .returning();

  for (const cId of targetClassIds) {
    try {
      await db.insert(subjectClasses).values({ subjectId: created.id, classId: cId });
    } catch (e) {}
  }

  for (const bId of targetBoardIds) {
    try {
      await db.insert(subjectBoards).values({ subjectId: created.id, boardId: bId });
    } catch (e) {}
  }

  return {
    ...created,
    classIds: targetClassIds,
    boardIds: targetBoardIds,
  };
}

export async function updateSubjectInDb(
  id: number,
  data: {
    name?: string;
    classId?: number;
    classIds?: number[];
    boardId?: number;
    boardIds?: number[];
    status?: string;
  }
) {
  const current = await getSubjectByIdFromDb(id);
  if (!current) {
    const err = new Error(`Subject with ID ${id} not found.`);
    (err as any).statusCode = 404;
    throw err;
  }

  let targetClassIds = data.classIds;
  if (!targetClassIds && data.classId) targetClassIds = [data.classId];

  let targetBoardIds = data.boardIds;
  if (!targetBoardIds && data.boardId) targetBoardIds = [data.boardId];

  const [updated] = await db
    .update(subjects)
    .set({
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(targetClassIds && targetClassIds.length > 0 ? { classId: targetClassIds[0] } : data.classId ? { classId: data.classId } : {}),
      ...(targetBoardIds && targetBoardIds.length > 0 ? { boardId: targetBoardIds[0] } : data.boardId !== undefined ? { boardId: data.boardId } : {}),
      ...(data.status ? { status: data.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(subjects.id, id))
    .returning();

  if (targetClassIds && targetClassIds.length > 0) {
    try {
      await db.delete(subjectClasses).where(eq(subjectClasses.subjectId, id));
      for (const cId of targetClassIds) {
        await db.insert(subjectClasses).values({ subjectId: id, classId: cId });
      }
    } catch (e) {}
  }

  if (targetBoardIds && targetBoardIds.length > 0) {
    try {
      await db.delete(subjectBoards).where(eq(subjectBoards.subjectId, id));
      for (const bId of targetBoardIds) {
        await db.insert(subjectBoards).values({ subjectId: id, boardId: bId });
      }
    } catch (e) {}
  }

  return {
    ...updated,
    classIds: targetClassIds || [updated.classId],
    boardIds: targetBoardIds || (updated.boardId ? [updated.boardId] : []),
  };
}

export async function deleteSubjectFromDb(id: number) {
  const current = await getSubjectByIdFromDb(id);
  if (!current) {
    const err = new Error(`Subject with ID ${id} not found.`);
    (err as any).statusCode = 404;
    throw err;
  }

  const deps = await checkSubjectDependencies(id, current.name);
  if (deps.hasDependencies) {
    const err = new Error(
      `Cannot delete subject "${current.name}" because it is in use by ${deps.total} academic item(s): ${deps.details.chapters} chapter(s), ${deps.details.syllabus} syllabus item(s), ${deps.details.mcqs} MCQ(s), ${deps.details.tests} test(s), ${deps.details.pastPapers} past paper(s), ${deps.details.studyNotes} study note(s).`
    );
    (err as any).statusCode = 409;
    (err as any).dependencies = deps.details;
    throw err;
  }

  await db.delete(subjects).where(eq(subjects.id, id));
  return { success: true, id, name: current.name };
}

// ============================================================================
// CHAPTERS
// ============================================================================

export async function getAllChaptersFromDb() {
  if (!isHierarchyRepaired) await ensureAndRepairAcademicHierarchy();
  try {
    const records = await db
      .select({
        id: chapters.id,
        name: chapters.name,
        subjectId: chapters.subjectId,
        subjectName: subjects.name,
        classId: chapters.classId,
        className: classes.name,
        status: chapters.status,
        draftStatus: chapters.draftStatus,
        createdAt: chapters.createdAt,
        updatedAt: chapters.updatedAt,
      })
      .from(chapters)
      .leftJoin(subjects, eq(chapters.subjectId, subjects.id))
      .leftJoin(classes, eq(chapters.classId, classes.id))
      .orderBy(asc(chapters.name));

    return records;
  } catch (err) {
    try {
      const records = await db
        .select({
          id: chapters.id,
          name: chapters.name,
          subjectId: chapters.subjectId,
          subjectName: subjects.name,
          status: chapters.status,
        })
        .from(chapters)
        .leftJoin(subjects, eq(chapters.subjectId, subjects.id))
        .orderBy(asc(chapters.name));

      return records;
    } catch (e2) {
      const raw = await db.execute(sql`SELECT id, name, subject_id as "subjectId", 'Active' as status FROM chapters ORDER BY name ASC`);
      return (raw.rows || raw) as any[];
    }
  }
}

export async function getChapterByIdFromDb(id: number) {
  try {
    const [record] = await db
      .select({
        id: chapters.id,
        name: chapters.name,
        subjectId: chapters.subjectId,
        classId: chapters.classId,
        status: chapters.status,
        draftStatus: chapters.draftStatus,
        createdAt: chapters.createdAt,
        updatedAt: chapters.updatedAt,
      })
      .from(chapters)
      .where(eq(chapters.id, id))
      .limit(1);
    return record || null;
  } catch (err) {
    try {
      const [record] = await db
        .select({
          id: chapters.id,
          name: chapters.name,
          subjectId: chapters.subjectId,
          status: chapters.status,
        })
        .from(chapters)
        .where(eq(chapters.id, id))
        .limit(1);
      return record || null;
    } catch (e2) {
      const raw = await db.execute(sql`SELECT id, name, subject_id as "subjectId", 'Active' as status FROM chapters WHERE id = ${id} LIMIT 1`);
      const rows = (raw.rows || raw) as any[];
      return rows[0] || null;
    }
  }
}

export async function checkChapterDependencies(id: number, chapterName: string) {
  const normName = chapterName.trim().toLowerCase();

  const [mcqCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mcqs)
    .where(sql`LOWER(TRIM(${mcqs.chapter})) = ${normName}`);
  const [testCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tests)
    .where(sql`LOWER(TRIM(${tests.chapter})) = ${normName}`);
  const [pastPaperCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pastPapers)
    .where(sql`LOWER(TRIM(${pastPapers.chapter})) = ${normName}`);
  const [noteCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(studyNotes)
    .where(sql`LOWER(TRIM(${studyNotes.chapter})) = ${normName}`);

  const depCounts = {
    mcqs: Number(mcqCountRes?.count || 0),
    tests: Number(testCountRes?.count || 0),
    pastPapers: Number(pastPaperCountRes?.count || 0),
    studyNotes: Number(noteCountRes?.count || 0),
  };

  const total = Object.values(depCounts).reduce((a, b) => a + b, 0);

  return {
    hasDependencies: total > 0,
    total,
    details: depCounts,
  };
}

export async function createChapterInDb(data: {
  name: string;
  subjectId: number;
  classId?: number;
  boardId?: number;
  status?: string;
  draftStatus?: string;
}) {
  const cleanName = data.name.trim();

  // Validate subject exists
  const sub = await getSubjectByIdFromDb(data.subjectId);
  if (!sub) {
    const err = new Error(`Associated subject with ID ${data.subjectId} not found.`);
    (err as any).statusCode = 400;
    throw err;
  }

  // Server-side validation: if classId provided, verify it matches subject's classId
  if (data.classId && Number(data.classId) !== Number(sub.classId)) {
    const targetClass = await getClassByIdFromDb(data.classId);
    const err = new Error(
      `Selected subject "${sub.name}" does not belong to class "${targetClass?.name || 'Class ' + data.classId}".`
    );
    (err as any).statusCode = 400;
    throw err;
  }

  // Prevent duplicate chapter for the same subject
  const existing = await db
    .select()
    .from(chapters)
    .where(
      and(
        sql`LOWER(TRIM(${chapters.name})) = ${cleanName.toLowerCase()}`,
        eq(chapters.subjectId, data.subjectId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const err = new Error(`Chapter "${cleanName}" already exists for this subject.`);
    (err as any).statusCode = 409;
    throw err;
  }

  const [created] = await db
    .insert(chapters)
    .values({
      name: cleanName,
      subjectId: data.subjectId,
      classId: data.classId || sub.classId,
      status: data.status || 'Active',
      draftStatus: data.draftStatus || 'Published',
    })
    .returning();

  return {
    ...created,
    boardId: data.boardId || sub.boardId || null,
  };
}

export async function updateChapterInDb(
  id: number,
  data: {
    name?: string;
    subjectId?: number;
    classId?: number;
    boardId?: number;
    status?: string;
    draftStatus?: string;
  }
) {
  const current = await getChapterByIdFromDb(id);
  if (!current) {
    const err = new Error(`Chapter with ID ${id} not found.`);
    (err as any).statusCode = 404;
    throw err;
  }

  const targetSubjectId = data.subjectId !== undefined ? data.subjectId : current.subjectId;
  const targetClassId = data.classId !== undefined ? data.classId : current.classId;
  const targetBoardId = data.boardId !== undefined ? data.boardId : current.boardId;
  const targetName = data.name ? data.name.trim() : current.name;

  const sub = await getSubjectByIdFromDb(targetSubjectId);
  if (!sub) {
    const err = new Error(`Associated subject with ID ${targetSubjectId} not found.`);
    (err as any).statusCode = 400;
    throw err;
  }

  if (targetClassId && Number(targetClassId) !== Number(sub.classId)) {
    const targetClass = await getClassByIdFromDb(targetClassId);
    const err = new Error(
      `Selected subject "${sub.name}" does not belong to class "${targetClass?.name || 'Class ' + targetClassId}".`
    );
    (err as any).statusCode = 400;
    throw err;
  }

  if (
    data.name &&
    (targetName.toLowerCase() !== current.name.toLowerCase() || targetSubjectId !== current.subjectId)
  ) {
    const duplicate = await db
      .select()
      .from(chapters)
      .where(
        and(
          sql`LOWER(TRIM(${chapters.name})) = ${targetName.toLowerCase()}`,
          eq(chapters.subjectId, targetSubjectId),
          sql`${chapters.id} != ${id}`
        )
      )
      .limit(1);

    if (duplicate.length > 0) {
      const err = new Error(`Another chapter with name "${targetName}" already exists for this subject.`);
      (err as any).statusCode = 409;
      throw err;
    }
  }

  const [updated] = await db
    .update(chapters)
    .set({
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.subjectId ? { subjectId: data.subjectId } : {}),
      ...(data.classId !== undefined ? { classId: data.classId } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.draftStatus ? { draftStatus: data.draftStatus } : {}),
      updatedAt: new Date(),
    })
    .where(eq(chapters.id, id))
    .returning();

  return {
    ...updated,
    boardId: targetBoardId || sub.boardId || null,
  };
}

export async function deleteChapterFromDb(id: number) {
  const current = await getChapterByIdFromDb(id);
  if (!current) {
    const err = new Error(`Chapter with ID ${id} not found.`);
    (err as any).statusCode = 404;
    throw err;
  }

  const deps = await checkChapterDependencies(id, current.name);
  if (deps.hasDependencies) {
    const err = new Error(
      `Cannot delete chapter "${current.name}" because it is in use by ${deps.total} academic item(s): ${deps.details.mcqs} MCQ(s), ${deps.details.tests} test(s), ${deps.details.pastPapers} past paper(s), ${deps.details.studyNotes} study note(s).`
    );
    (err as any).statusCode = 409;
    (err as any).dependencies = deps.details;
    throw err;
  }

  await db.delete(chapters).where(eq(chapters.id, id));
  return { success: true, id, name: current.name };
}

// ============================================================================
// ENTRY TEST CATEGORIES & SUBCATEGORIES
// ============================================================================

export async function getAllEntryTestCategoriesFromDb() {
  if (!isHierarchyRepaired) await ensureAndRepairAcademicHierarchy();
  const cats = await db.select().from(entryTestCategories).orderBy(asc(entryTestCategories.name));
  const subcats = await db.select().from(entryTestSubcategories).orderBy(asc(entryTestSubcategories.name));

  return cats.map((cat) => ({
    ...cat,
    subcategories: subcats.filter((sub) => sub.categoryId === cat.id),
  }));
}

export async function getEntryTestCategoryByIdFromDb(id: number) {
  const [record] = await db
    .select()
    .from(entryTestCategories)
    .where(eq(entryTestCategories.id, id))
    .limit(1);
  return record || null;
}

export async function checkEntryTestCategoryDependencies(id: number, catName?: string) {
  let normName = catName ? catName.trim().toLowerCase() : '';
  if (!normName) {
    const cat = await getEntryTestCategoryByIdFromDb(id);
    if (cat) normName = cat.name.trim().toLowerCase();
  }

  const [subCatCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(entryTestSubcategories)
    .where(eq(entryTestSubcategories.categoryId, id));
  const [mcqCountRes] = normName
    ? await db
        .select({ count: sql<number>`count(*)` })
        .from(mcqs)
        .where(sql`LOWER(TRIM(${mcqs.exam})) = ${normName} OR ${mcqs.tags}::text ILIKE ${'%' + normName + '%'}`)
    : [{ count: 0 }];
  const [testCountRes] = normName
    ? await db
        .select({ count: sql<number>`count(*)` })
        .from(tests)
        .where(
          sql`LOWER(TRIM(${tests.exam})) = ${normName} OR LOWER(TRIM(${tests.category})) = ${normName} OR LOWER(TRIM(${tests.testType})) = ${normName}`
        )
    : [{ count: 0 }];
  const [pastPaperCountRes] = normName
    ? await db
        .select({ count: sql<number>`count(*)` })
        .from(pastPapers)
        .where(sql`LOWER(TRIM(${pastPapers.exam})) = ${normName}`)
    : [{ count: 0 }];

  const depCounts = {
    subcategories: Number(subCatCountRes?.count || 0),
    mcqs: Number(mcqCountRes?.count || 0),
    tests: Number(testCountRes?.count || 0),
    pastPapers: Number(pastPaperCountRes?.count || 0),
  };

  const total = Object.values(depCounts).reduce((a, b) => a + b, 0);

  return {
    hasDependencies: total > 0,
    total,
    details: depCounts,
  };
}

export async function createEntryTestCategoryInDb(data: {
  name: string;
  type?: string;
  description?: string;
  organizer?: string;
  totalMarks?: number;
  duration?: string;
  status?: string;
}) {
  const cleanName = data.name.trim();

  const existing = await db
    .select()
    .from(entryTestCategories)
    .where(sql`LOWER(TRIM(${entryTestCategories.name})) = ${cleanName.toLowerCase()}`)
    .limit(1);

  if (existing.length > 0) {
    const err = new Error(`Entry test parent category "${cleanName}" already exists.`);
    (err as any).statusCode = 409;
    throw err;
  }

  const [created] = await db
    .insert(entryTestCategories)
    .values({
      name: cleanName,
      type: data.type?.trim() || 'General',
      description: data.description?.trim() || null,
      organizer: data.organizer?.trim() || null,
      totalMarks: data.totalMarks || null,
      duration: data.duration?.trim() || null,
      status: data.status || 'Active',
    })
    .returning();

  return created;
}

export async function updateEntryTestCategoryInDb(
  id: number,
  data: {
    name?: string;
    type?: string;
    description?: string;
    organizer?: string;
    totalMarks?: number;
    duration?: string;
    status?: string;
  }
) {
  const current = await getEntryTestCategoryByIdFromDb(id);
  if (!current) {
    const err = new Error(`Entry test category with ID ${id} not found.`);
    (err as any).statusCode = 404;
    throw err;
  }

  if (data.name && data.name.trim().toLowerCase() !== current.name.toLowerCase()) {
    const cleanName = data.name.trim();
    const duplicate = await db
      .select()
      .from(entryTestCategories)
      .where(
        and(
          sql`LOWER(TRIM(${entryTestCategories.name})) = ${cleanName.toLowerCase()}`,
          sql`${entryTestCategories.id} != ${id}`
        )
      )
      .limit(1);

    if (duplicate.length > 0) {
      const err = new Error(`Another entry test parent category with name "${cleanName}" already exists.`);
      (err as any).statusCode = 409;
      throw err;
    }
  }

  const [updated] = await db
    .update(entryTestCategories)
    .set({
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.type !== undefined ? { type: data.type?.trim() || null } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.organizer !== undefined ? { organizer: data.organizer?.trim() || null } : {}),
      ...(data.totalMarks !== undefined ? { totalMarks: data.totalMarks } : {}),
      ...(data.duration !== undefined ? { duration: data.duration?.trim() || null } : {}),
      ...(data.status ? { status: data.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(entryTestCategories.id, id))
    .returning();

  return updated;
}

export async function deleteEntryTestCategoryFromDb(id: number) {
  const current = await getEntryTestCategoryByIdFromDb(id);
  if (!current) {
    const err = new Error(`Entry test category with ID ${id} not found.`);
    (err as any).statusCode = 404;
    throw err;
  }

  const deps = await checkEntryTestCategoryDependencies(id, current.name);
  if (deps.hasDependencies) {
    const parts = [];
    if (deps.details.subcategories > 0) parts.push(`${deps.details.subcategories} subcategory(ies)`);
    if (deps.details.mcqs > 0) parts.push(`${deps.details.mcqs} MCQ(s)`);
    if (deps.details.tests > 0) parts.push(`${deps.details.tests} test(s)`);
    if (deps.details.pastPapers > 0) parts.push(`${deps.details.pastPapers} past paper(s)`);

    const err = new Error(
      `Cannot delete parent category "${current.name}" because it is associated with ${deps.total} item(s): ${parts.join(', ')}.`
    );
    (err as any).statusCode = 409;
    (err as any).dependencies = deps.details;
    throw err;
  }

  await db.delete(entryTestCategories).where(eq(entryTestCategories.id, id));
  return { success: true, id, name: current.name };
}

// ----------------------------------------------------------------------------
// ENTRY TEST SUBCATEGORIES
// ----------------------------------------------------------------------------

export async function getAllEntryTestSubcategoriesFromDb(categoryId?: number) {
  if (categoryId) {
    return await db
      .select()
      .from(entryTestSubcategories)
      .where(eq(entryTestSubcategories.categoryId, categoryId))
      .orderBy(asc(entryTestSubcategories.name));
  }
  return await db.select().from(entryTestSubcategories).orderBy(asc(entryTestSubcategories.name));
}

export async function getEntryTestSubcategoryByIdFromDb(id: number) {
  const [record] = await db
    .select()
    .from(entryTestSubcategories)
    .where(eq(entryTestSubcategories.id, id))
    .limit(1);
  return record || null;
}

export async function checkEntryTestSubcategoryDependencies(id: number, subCatName?: string) {
  let normName = subCatName ? subCatName.trim().toLowerCase() : '';
  if (!normName) {
    const sub = await getEntryTestSubcategoryByIdFromDb(id);
    if (sub) normName = sub.name.trim().toLowerCase();
  }

  const [mcqCountRes] = normName
    ? await db
        .select({ count: sql<number>`count(*)` })
        .from(mcqs)
        .where(sql`LOWER(TRIM(${mcqs.exam})) = ${normName} OR ${mcqs.tags}::text ILIKE ${'%' + normName + '%'}`)
    : [{ count: 0 }];
  const [testCountRes] = normName
    ? await db
        .select({ count: sql<number>`count(*)` })
        .from(tests)
        .where(
          sql`LOWER(TRIM(${tests.exam})) = ${normName} OR LOWER(TRIM(${tests.category})) = ${normName} OR LOWER(TRIM(${tests.subject})) = ${normName}`
        )
    : [{ count: 0 }];

  const depCounts = {
    mcqs: Number(mcqCountRes?.count || 0),
    tests: Number(testCountRes?.count || 0),
  };

  const total = Object.values(depCounts).reduce((a, b) => a + b, 0);

  return {
    hasDependencies: total > 0,
    total,
    details: depCounts,
  };
}

export async function createEntryTestSubcategoryInDb(data: {
  categoryId: number;
  name: string;
  description?: string;
  status?: string;
}) {
  const cleanName = data.name.trim();

  // Verify parent category exists
  const parent = await getEntryTestCategoryByIdFromDb(data.categoryId);
  if (!parent) {
    const err = new Error(`Parent category with ID ${data.categoryId} not found.`);
    (err as any).statusCode = 400;
    throw err;
  }

  // Prevent duplicate subcategory under same parent category
  const existing = await db
    .select()
    .from(entryTestSubcategories)
    .where(
      and(
        eq(entryTestSubcategories.categoryId, data.categoryId),
        sql`LOWER(TRIM(${entryTestSubcategories.name})) = ${cleanName.toLowerCase()}`
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const err = new Error(`Subcategory "${cleanName}" already exists under parent category "${parent.name}".`);
    (err as any).statusCode = 409;
    throw err;
  }

  const [created] = await db
    .insert(entryTestSubcategories)
    .values({
      categoryId: data.categoryId,
      name: cleanName,
      description: data.description?.trim() || null,
      status: data.status || 'Active',
    })
    .returning();

  return created;
}

export async function updateEntryTestSubcategoryInDb(
  id: number,
  data: {
    categoryId?: number;
    name?: string;
    description?: string;
    status?: string;
  }
) {
  const current = await getEntryTestSubcategoryByIdFromDb(id);
  if (!current) {
    const err = new Error(`Subcategory with ID ${id} not found.`);
    (err as any).statusCode = 404;
    throw err;
  }

  const targetCatId = data.categoryId !== undefined ? data.categoryId : current.categoryId;
  const targetName = data.name ? data.name.trim() : current.name;

  if (
    (data.name && targetName.toLowerCase() !== current.name.toLowerCase()) ||
    targetCatId !== current.categoryId
  ) {
    const duplicate = await db
      .select()
      .from(entryTestSubcategories)
      .where(
        and(
          eq(entryTestSubcategories.categoryId, targetCatId),
          sql`LOWER(TRIM(${entryTestSubcategories.name})) = ${targetName.toLowerCase()}`,
          sql`${entryTestSubcategories.id} != ${id}`
        )
      )
      .limit(1);

    if (duplicate.length > 0) {
      const err = new Error(`Another subcategory with name "${targetName}" already exists under this parent category.`);
      (err as any).statusCode = 409;
      throw err;
    }
  }

  const [updated] = await db
    .update(entryTestSubcategories)
    .set({
      ...(data.categoryId ? { categoryId: data.categoryId } : {}),
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.status ? { status: data.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(entryTestSubcategories.id, id))
    .returning();

  return updated;
}

export async function deleteEntryTestSubcategoryFromDb(id: number) {
  const current = await getEntryTestSubcategoryByIdFromDb(id);
  if (!current) {
    const err = new Error(`Subcategory with ID ${id} not found.`);
    (err as any).statusCode = 404;
    throw err;
  }

  const deps = await checkEntryTestSubcategoryDependencies(id, current.name);
  if (deps.hasDependencies) {
    const err = new Error(
      `Cannot delete subcategory "${current.name}" because it is associated with ${deps.total} item(s): ${deps.details.mcqs} MCQ(s), ${deps.details.tests} test(s).`
    );
    (err as any).statusCode = 409;
    (err as any).dependencies = deps.details;
    throw err;
  }

  await db.delete(entryTestSubcategories).where(eq(entryTestSubcategories.id, id));
  return { success: true, id, name: current.name };
}

// ============================================================================
// AUTHORITATIVE HIERARCHY AUTO-REPAIR & SEEDER
// ============================================================================

let isHierarchyRepaired = false;
let repairPromise: Promise<void> | null = null;

export function _resetAcademicHierarchyStateForTesting() {
  isHierarchyRepaired = false;
  repairPromise = null;
}

async function ensureSchemaTablesAndColumns() {
  // Execute each statement in an isolated try/catch so permission warnings on one query do not abort others
  try {
    // Schema repair logic
  } catch (e) {}

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS boards (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT,
        establishment_year INTEGER,
        province TEXT,
        city TEXT,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (e) {}

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        board_id INTEGER REFERENCES boards(id),
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (e) {}

  try {
    await db.execute(sql`
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS board_id INTEGER REFERENCES boards(id);
    `);
  } catch (e) {}

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS class_boards (
        id SERIAL PRIMARY KEY,
        class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE
      );
    `);
  } catch (e) {}

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        class_id INTEGER NOT NULL REFERENCES classes(id),
        board_id INTEGER REFERENCES boards(id),
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (e) {}

  try {
    await db.execute(sql`
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS board_id INTEGER REFERENCES boards(id);
    `);
  } catch (e) {}

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS subject_boards (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE
      );
    `);
  } catch (e) {}

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS subject_classes (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE
      );
    `);
  } catch (e) {}

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS chapters (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER NOT NULL REFERENCES subjects(id),
        class_id INTEGER REFERENCES classes(id),
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        draft_status TEXT NOT NULL DEFAULT 'Draft',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (e) {}

  try {
    await db.execute(sql`
      ALTER TABLE chapters ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(id);
    `);
  } catch (e) {}

  try {
    await db.execute(sql`
      ALTER TABLE chapters ADD COLUMN IF NOT EXISTS draft_status TEXT NOT NULL DEFAULT 'Draft';
    `);
  } catch (e) {}

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS entry_test_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        description TEXT,
        organizer TEXT,
        total_marks INTEGER,
        duration TEXT,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (e) {}

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS entry_test_subcategories (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES entry_test_categories(id),
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (e) {}

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS syllabus (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER NOT NULL REFERENCES subjects(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (e) {}
}

export async function ensureAndRepairAcademicHierarchy() {
  if (isHierarchyRepaired) return;
  if (!db) {
    throw new Error('Database client (db) is not initialized');
  }

  if (!repairPromise) {
    const currentRef = (async () => {
      try {
        // 0. Ensure schema tables & missing columns exist in PostgreSQL database
        await ensureSchemaTablesAndColumns();

        // 1. Ensure Pakistani Boards in boards table
        const existingBoards = await db.select().from(boards);
        const existingBoardNames = new Set(existingBoards.map((b) => b.name.trim().toLowerCase()));

        const standardBoards = [
          { name: 'FBISE Islamabad', code: 'FBISE', establishmentYear: 1975, province: 'Federal', city: 'Islamabad', description: 'Federal Board of Intermediate and Secondary Education Islamabad' },
          { name: 'BISE Lahore', code: 'LHR', establishmentYear: 1954, province: 'Punjab', city: 'Lahore', description: 'Board of Intermediate and Secondary Education Lahore' },
          { name: 'BISE Rawalpindi', code: 'RWP', establishmentYear: 1977, province: 'Punjab', city: 'Rawalpindi', description: 'Board of Intermediate and Secondary Education Rawalpindi' },
          { name: 'BISE Gujranwala', code: 'GRW', establishmentYear: 1982, province: 'Punjab', city: 'Gujranwala', description: 'Board of Intermediate and Secondary Education Gujranwala' },
          { name: 'BISE Faisalabad', code: 'FSD', establishmentYear: 1988, province: 'Punjab', city: 'Faisalabad', description: 'Board of Intermediate and Secondary Education Faisalabad' },
          { name: 'BISE Multan', code: 'MUL', establishmentYear: 1968, province: 'Punjab', city: 'Multan', description: 'Board of Intermediate and Secondary Education Multan' },
          { name: 'BSEK / BIEK Karachi', code: 'KHI', establishmentYear: 1950, province: 'Sindh', city: 'Karachi', description: 'Secondary & Intermediate Education Boards Karachi' },
          { name: 'BISE Peshawar', code: 'PEW', establishmentYear: 1961, province: 'KPK', city: 'Peshawar', description: 'Board of Intermediate and Secondary Education Peshawar' },
          { name: 'BISE Quetta', code: 'QTA', establishmentYear: 1976, province: 'Balochistan', city: 'Quetta', description: 'Board of Intermediate and Secondary Education Quetta' },
        ];

        for (const sb of standardBoards) {
          if (!existingBoardNames.has(sb.name.toLowerCase())) {
            await db.insert(boards).values({
              name: sb.name,
              code: sb.code,
              establishmentYear: sb.establishmentYear,
              province: sb.province,
              city: sb.city,
              description: sb.description,
              status: 'Active',
            });
          }
        }

        const allBoards = await db.select().from(boards);
        const defaultBoardId = allBoards[0]?.id || 1;

        // 2. Ensure Classes in classes table
        const existingClasses = await db.select().from(classes);
        const existingClassNames = new Set(existingClasses.map((c) => c.name.trim().toLowerCase()));

        const standardClasses = [
          'Class 9',
          'Class 10',
          'Class 11',
          'Class 12',
          'BA / Associate Degree',
          'BSc / Associate Degree',
          'BS (4 Years Honors)',
          'Masters & Postgraduate',
        ];

        for (const cName of standardClasses) {
          if (!existingClassNames.has(cName.toLowerCase())) {
            await db.insert(classes).values({
              boardId: defaultBoardId,
              name: cName,
              status: 'Active',
            });
          }
        }

        const allClasses = await db.select().from(classes);
        const classMap = new Map<string, number>();
        for (const c of allClasses) {
          const lower = c.name.trim().toLowerCase();
          classMap.set(lower, c.id);
          if (lower.includes('9')) classMap.set('class 9', c.id);
          if (lower.includes('10')) classMap.set('class 10', c.id);
          if (lower.includes('11')) classMap.set('class 11', c.id);
          if (lower.includes('12')) classMap.set('class 12', c.id);
        }

        const class9Id = classMap.get('class 9') || allClasses[0]?.id || 1;
        const class10Id = classMap.get('class 10') || allClasses[1]?.id || 2;
        const class11Id = classMap.get('class 11') || allClasses[2]?.id || 3;
        const class12Id = classMap.get('class 12') || allClasses[3]?.id || 4;

        // 3. Ensure Subjects per Class (Class 9, Class 10, Class 11, Class 12)
        const classSubjectRequirements: { classId: number; subjects: string[] }[] = [
          {
            classId: class9Id,
            subjects: ['Biology', 'Physics', 'Chemistry', 'Mathematics', 'Computer Science', 'English', 'Urdu', 'Islamiyat', 'Pakistan Studies'],
          },
          {
            classId: class10Id,
            subjects: ['Biology', 'Physics', 'Chemistry', 'Mathematics', 'Computer Science', 'English', 'Urdu', 'Pakistan Studies'],
          },
          {
            classId: class11Id,
            subjects: ['Biology', 'Physics', 'Chemistry', 'Mathematics', 'Computer Science', 'English', 'Urdu', 'Islamic Education'],
          },
          {
            classId: class12Id,
            subjects: ['Biology', 'Physics', 'Chemistry', 'Mathematics', 'Computer Science', 'English', 'Urdu', 'Pakistan Studies'],
          },
        ];

        const allSubjects = await db.select().from(subjects);

        for (const req of classSubjectRequirements) {
          const existingSubjectsInClass = allSubjects.filter((s) => s.classId === req.classId);
          const existingSubjectNames = new Set(existingSubjectsInClass.map((s) => s.name.trim().toLowerCase()));

          for (const subjName of req.subjects) {
            if (!existingSubjectNames.has(subjName.toLowerCase())) {
              await db.insert(subjects).values({
                classId: req.classId,
                boardId: defaultBoardId,
                name: subjName,
                status: 'Active',
              });
            }
          }
        }

        // Refresh subjects after insertion
        const updatedSubjects = await db.select().from(subjects);

        // 4. Ensure Chapters for each Subject in Class 9, Class 10, Class 11, Class 12
        let allChapters: any[] = [];
        try {
          allChapters = await db
            .select({
              id: chapters.id,
              subjectId: chapters.subjectId,
              classId: chapters.classId,
              name: chapters.name,
              status: chapters.status,
              draftStatus: chapters.draftStatus,
            })
            .from(chapters);
        } catch (chErr) {
          try {
            const res = await db.execute(sql`SELECT id, subject_id as "subjectId", name FROM chapters`);
            allChapters = (res.rows || res) as any[];
          } catch (e) {
            allChapters = [];
          }
        }

        const standardChaptersMap: Record<string, string[]> = {
          biology: [
            'Introduction to Biology & Gaseous Exchange',
            'Cell Biology & Homeostasis',
            'Coordination and Control',
            'Support and Movement',
            'Reproduction & Genetics',
            'Inheritance & Biotechnology',
            'Ecology & Pharmacology',
          ],
          physics: [
            'Physical Quantities & Measurement',
            'Kinematics & Dynamics',
            'Simple Harmonic Motion and Waves',
            'Sound & Geometrical Optics',
            'Electrostatics & Current Electricity',
            'Electromagnetism & Basic Electronics',
            'Atomic and Nuclear Physics',
          ],
          chemistry: [
            'Fundamentals of Chemistry',
            'Chemical Equilibrium',
            'Acids, Bases and Salts',
            'Organic Chemistry & Hydrocarbons',
            'Biochemistry & Atmosphere',
            'Water & Chemical Industries',
          ],
          mathematics: [
            'Real and Complex Numbers',
            'Quadratic Equations',
            'Partial Fractions',
            'Sets, Functions and Groups',
            'Matrices and Determinants',
            'Basic Statistics & Trigonometry',
          ],
          'computer science': [
            'Basics of Information Technology',
            'Programming Fundamentals & C Concepts',
            'Data Types, Input/Output & Operators',
            'Control Structures & Logic',
            'Database Management & Web Development',
          ],
          english: [
            'Reading Comprehension & Passages',
            'Grammar & Parts of Speech',
            'Vocabulary & Idioms',
            'Essay Writing & Summaries',
          ],
          urdu: [
            'نثر (Essays and Stories)',
            'غزلیات (Ghazals)',
            'منظومات (Poems)',
            'قواعد و انشا (Grammar and Composition)',
          ],
        };

        for (const sub of updatedSubjects) {
          const existingChaps = allChapters.filter((ch) => ch.subjectId === sub.id);
          if (existingChaps.length === 0) {
            const subNameLower = sub.name.trim().toLowerCase();
            let chList: string[] = [];

            for (const [key, list] of Object.entries(standardChaptersMap)) {
              if (subNameLower.includes(key)) {
                chList = list;
                break;
              }
            }

            if (chList.length === 0) {
              chList = [
                `Chapter 1: Fundamentals of ${sub.name}`,
                `Chapter 2: Core Concepts & Principles`,
                `Chapter 3: Advanced Applications`,
                `Chapter 4: Summary & Revision Topics`,
              ];
            }

            for (const cTitle of chList) {
              try {
                await db.insert(chapters).values({
                  subjectId: sub.id,
                  classId: sub.classId,
                  name: cTitle,
                  status: 'Active',
                  draftStatus: 'Published',
                });
              } catch (insErr) {
                try {
                  await db.insert(chapters).values({
                    subjectId: sub.id,
                    name: cTitle,
                    status: 'Active',
                  });
                } catch (e2) {}
              }
            }
          } else {
            // Safe Repair: Ensure classId on chapter matches subject.classId if column exists
            for (const ch of existingChaps) {
              if (!ch.classId || ch.classId !== sub.classId) {
                try {
                  await db.update(chapters).set({ classId: sub.classId }).where(eq(chapters.id, ch.id));
                } catch (updErr) {}
              }
            }
          }
        }

        // 5. Ensure Entry Test Categories & Subcategories
        const allEntryCats = await db.select().from(entryTestCategories);
        const catMap = new Map<string, number>();
        for (const c of allEntryCats) {
          catMap.set(c.name.trim().toLowerCase(), c.id);
        }

        const defaultCategories = [
          { name: 'Armed Forces', type: 'Defense Services', organizer: 'ISSB / Pak Forces', description: 'Pak Army, Navy & PAF Officer Commission Cadet Tests' },
          { name: 'Medical', type: 'Entrance Exam', organizer: 'PMDC / UHS / NUMS', description: 'MDCAT & NUMS Medical Entrance Exams for MBBS & BDS' },
          { name: 'Engineering', type: 'Entrance Exam', organizer: 'UET / NUST / GIKI', description: 'ECAT, NUST NET & GIKI Engineering Admission Tests' },
          { name: 'Civil Services & CSS', type: 'Competitive Exam', organizer: 'FPSC / PPSC / SPSC', description: 'Federal & Provincial Public Service Officer Exams' },
        ];

        for (const dc of defaultCategories) {
          if (!catMap.has(dc.name.toLowerCase())) {
            const [inserted] = await db.insert(entryTestCategories).values({
              name: dc.name,
              type: dc.type,
              organizer: dc.organizer,
              description: dc.description,
              status: 'Active',
            }).returning();
            if (inserted) catMap.set(dc.name.toLowerCase(), inserted.id);
          }
        }

        const armedForcesCatId = catMap.get('armed forces');
        if (armedForcesCatId) {
          const existingSubcats = await db.select().from(entryTestSubcategories).where(eq(entryTestSubcategories.categoryId, armedForcesCatId));
          const existingSubNames = new Set(existingSubcats.map((s) => s.name.trim().toLowerCase()));

          const forceSubs = [
            { name: 'Army', description: 'PMA Long Course, Technical Cadet Scheme, Lady Cadet Course' },
            { name: 'Navy', description: 'PN Cadet, Short Service Commission, Marine' },
            { name: 'Air Force', description: 'GDP - General Duty Pilot, Aeronautical Engineering, Air Defence' },
          ];

          for (const fs of forceSubs) {
            if (!existingSubNames.has(fs.name.toLowerCase())) {
              await db.insert(entryTestSubcategories).values({
                categoryId: armedForcesCatId,
                name: fs.name,
                description: fs.description,
                status: 'Active',
              });
            }
          }
        }

        const medicalCatId = catMap.get('medical');
        if (medicalCatId) {
          const existingSubcats = await db.select().from(entryTestSubcategories).where(eq(entryTestSubcategories.categoryId, medicalCatId));
          const existingSubNames = new Set(existingSubcats.map((s) => s.name.trim().toLowerCase()));

          const medSubs = [
            { name: 'MDCAT', description: 'National Medical & Dental College Admission Test' },
            { name: 'NUMS', description: 'National University of Medical Sciences Admission Test' },
          ];

          for (const ms of medSubs) {
            if (!existingSubNames.has(ms.name.toLowerCase())) {
              await db.insert(entryTestSubcategories).values({
                categoryId: medicalCatId,
                name: ms.name,
                description: ms.description,
                status: 'Active',
              });
            }
          }
        }

        const engCatId = catMap.get('engineering');
        if (engCatId) {
          const existingSubcats = await db.select().from(entryTestSubcategories).where(eq(entryTestSubcategories.categoryId, engCatId));
          const existingSubNames = new Set(existingSubcats.map((s) => s.name.trim().toLowerCase()));

          const engSubs = [
            { name: 'ECAT', description: 'UET Engineering College Admission Test' },
            { name: 'NUST NET', description: 'National University of Sciences & Technology Entry Test' },
          ];

          for (const es of engSubs) {
            if (!existingSubNames.has(es.name.toLowerCase())) {
              await db.insert(entryTestSubcategories).values({
                categoryId: engCatId,
                name: es.name,
                description: es.description,
                status: 'Active',
              });
            }
          }
        }

        isHierarchyRepaired = true;
      } catch (error) {
        console.error('Error during ensureAndRepairAcademicHierarchy:', error);
        if (repairPromise === currentRef) {
          repairPromise = null;
        }
        throw error;
      }
    })();

    repairPromise = currentRef;
  }

  return repairPromise;
}
