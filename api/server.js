var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server.ts
import fs6 from "fs";
import path5 from "path";
import express2 from "express";
import { createServer as createViteServer } from "vite";

// src/serverApp.ts
import express from "express";
import fs4 from "fs";

// src/server/documentBranding.ts
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
var TALEEM_TAGLINE = "Learn. Practice. Test. Improve.";
var TALEEM_BRAND_FOOTER = "\xA9 TaleemGuru.pk | Learn. Practice. Test. Improve. | https://taleemguru.pk";
var TALEEM_WEBSITE_URL = "https://taleemguru.pk";
var TALEEM_BRAND_KEYWORD = "TaleemGuru.pk-Branded";
var TALEEM_PRODUCER_STRING = "TaleemGuru.pk Document Branding Engine v2.0";
var memoryCache = /* @__PURE__ */ new Map();
var CACHE_DIR = path.join(process.cwd(), ".cache", "branded_docs");
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch {
}
function computeHash(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}
function isPdfDocumentAlreadyBranded(pdfDoc) {
  try {
    const keywords = pdfDoc.getKeywords();
    if (keywords && keywords.toLowerCase().includes("taleemguru")) {
      return true;
    }
    const producer = pdfDoc.getProducer();
    if (producer && producer.toLowerCase().includes("taleemguru")) {
      return true;
    }
    const creator = pdfDoc.getCreator();
    if (creator && creator.toLowerCase().includes("taleemguru")) {
      return true;
    }
    const title = pdfDoc.getTitle();
    if (title && title.toLowerCase().includes("taleemguru branded")) {
      return true;
    }
  } catch (err) {
    console.warn("[Branding] Error reading PDF metadata:", err);
  }
  return false;
}
async function brandPdfBuffer(inputBuffer, options) {
  const hash = computeHash(inputBuffer);
  const cached = memoryCache.get(hash);
  if (cached && !options?.forceRebrand) {
    return { buffer: cached.buffer, wasAlreadyBranded: true, pageCount: 0 };
  }
  const diskPath = path.join(CACHE_DIR, `${hash}.pdf`);
  if (fs.existsSync(diskPath) && !options?.forceRebrand) {
    try {
      const diskBuffer = fs.readFileSync(diskPath);
      memoryCache.set(hash, { buffer: diskBuffer, mimeType: "application/pdf", timestamp: Date.now() });
      return { buffer: diskBuffer, wasAlreadyBranded: true, pageCount: 0 };
    } catch {
    }
  }
  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  } catch (loadErr) {
    throw new Error(`Failed to parse PDF document: ${loadErr.message || "Invalid PDF structure"}`);
  }
  if (!options?.forceRebrand && isPdfDocumentAlreadyBranded(pdfDoc)) {
    memoryCache.set(hash, { buffer: inputBuffer, mimeType: "application/pdf", timestamp: Date.now() });
    return { buffer: inputBuffer, wasAlreadyBranded: true, pageCount: pdfDoc.getPageCount() };
  }
  const pages = pdfDoc.getPages();
  const pageCount = pages.length;
  let helveticaFont;
  let helveticaBoldFont;
  try {
    helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  } catch {
  }
  let stampedPagesCount = 0;
  for (let i = 0; i < pageCount; i++) {
    const page = pages[i];
    try {
      const { width, height } = page.getSize();
      const rotation = page.getRotation().angle;
      if (helveticaFont && helveticaBoldFont) {
        const fontSize = 7.5;
        const brandText = TALEEM_BRAND_FOOTER;
        const urlText = TALEEM_WEBSITE_URL;
        const brandColor = rgb(0.06, 0.43, 0.27);
        const urlColor = rgb(0.4, 0.45, 0.52);
        const lineColor = rgb(0.86, 0.89, 0.92);
        if (rotation === 0) {
          const margin = 32;
          const yBaseline = 12;
          const yLine = 21;
          page.drawLine({
            start: { x: margin, y: yLine },
            end: { x: width - margin, y: yLine },
            thickness: 0.5,
            color: lineColor
          });
          page.drawText(brandText, {
            x: margin,
            y: yBaseline,
            size: fontSize,
            font: helveticaBoldFont,
            color: brandColor
          });
          const urlWidth = helveticaFont.widthOfTextAtSize(urlText, fontSize);
          page.drawText(urlText, {
            x: width - margin - urlWidth,
            y: yBaseline,
            size: fontSize,
            font: helveticaFont,
            color: urlColor
          });
        } else if (rotation === 90) {
          const margin = 32;
          const xBaseline = width - 12;
          const xLine = width - 21;
          page.drawLine({
            start: { x: xLine, y: margin },
            end: { x: xLine, y: height - margin },
            thickness: 0.5,
            color: lineColor
          });
          page.drawText(brandText, {
            x: xBaseline,
            y: margin,
            size: fontSize,
            font: helveticaBoldFont,
            color: brandColor,
            rotate: degrees(90)
          });
        } else {
          page.drawText(brandText, {
            x: 32,
            y: 12,
            size: fontSize,
            font: helveticaBoldFont,
            color: brandColor
          });
        }
        stampedPagesCount++;
      }
    } catch (pageErr) {
      console.warn(`[Branding] Failed to stamp page ${i + 1}:`, pageErr);
    }
  }
  if (stampedPagesCount === 0) {
    try {
      const creditPage = pdfDoc.addPage([595.28, 841.89]);
      const { width, height } = creditPage.getSize();
      creditPage.drawRectangle({
        x: 20,
        y: 20,
        width: width - 40,
        height: height - 40,
        borderColor: rgb(0.06, 0.43, 0.27),
        borderWidth: 1.5,
        color: rgb(0.98, 0.99, 0.98)
      });
      if (helveticaBoldFont && helveticaFont) {
        creditPage.drawText("TALEEM GURU PAKISTAN", {
          x: width / 2 - 120,
          y: height - 100,
          size: 20,
          font: helveticaBoldFont,
          color: rgb(0.06, 0.43, 0.27)
        });
        creditPage.drawText("Learn. Practice. Test. Improve.", {
          x: width / 2 - 100,
          y: height - 125,
          size: 12,
          font: helveticaBoldFont,
          color: rgb(0.3, 0.35, 0.4)
        });
        creditPage.drawText(TALEEM_BRAND_FOOTER, {
          x: width / 2 - 150,
          y: height - 200,
          size: 11,
          font: helveticaBoldFont,
          color: rgb(0.1, 0.15, 0.2)
        });
        creditPage.drawText(`Visit ${TALEEM_WEBSITE_URL} for past papers, practice tests, and study notes.`, {
          x: width / 2 - 165,
          y: height - 230,
          size: 10,
          font: helveticaFont,
          color: rgb(0.4, 0.45, 0.5)
        });
      }
    } catch (creditPageErr) {
      console.warn("[Branding] Failed to append credit page:", creditPageErr);
    }
  }
  try {
    pdfDoc.setAuthor("TaleemGuru.pk");
    pdfDoc.setSubject("Downloaded from TaleemGuru.pk");
    pdfDoc.setProducer(TALEEM_PRODUCER_STRING);
    pdfDoc.setCreator(`${TALEEM_BRAND_FOOTER} \u2022 ${TALEEM_WEBSITE_URL}`);
    const currentKeywords = pdfDoc.getKeywords() || "";
    pdfDoc.setKeywords([TALEEM_BRAND_KEYWORD, "TaleemGuru.pk", "Academic Study Material", currentKeywords].filter(Boolean));
    pdfDoc.setModificationDate(/* @__PURE__ */ new Date());
  } catch (metaErr) {
    console.warn("[Branding] Could not update PDF metadata:", metaErr);
  }
  const brandedBytes = await pdfDoc.save();
  const outputBuffer = Buffer.from(brandedBytes);
  memoryCache.set(hash, { buffer: outputBuffer, mimeType: "application/pdf", timestamp: Date.now() });
  try {
    fs.writeFileSync(diskPath, outputBuffer);
  } catch {
  }
  return {
    buffer: outputBuffer,
    wasAlreadyBranded: false,
    pageCount
  };
}
function brandTextContent(content, title) {
  if (content.includes("TaleemGuru.pk") && content.includes(TALEEM_TAGLINE)) {
    return content;
  }
  const header = `================================================================================
                    \u2605 TALEEM GURU PAKISTAN \u2605
                 Learn. Practice. Test. Improve.
                      ${TALEEM_WEBSITE_URL}
================================================================================
DOCUMENT: ${title || "Academic Study Material"}
SOURCE: ${TALEEM_BRAND_FOOTER}
WEBSITE: ${TALEEM_WEBSITE_URL}
COPYRIGHT: \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} TaleemGuru.pk. All rights reserved.
================================================================================

`;
  const footer = `

================================================================================
${TALEEM_BRAND_FOOTER}
Online testing, past papers, notes & exam preparation: ${TALEEM_WEBSITE_URL}
================================================================================`;
  return `${header}${content.trim()}${footer}`;
}

// src/server/documentSecurity.ts
import dns from "dns";
import path2 from "path";
import fs2 from "fs";
var MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024;
var FETCH_TIMEOUT_MS = 8e3;
var MAX_REDIRECT_HOPS = 3;
function isPrivateOrReservedIPv4(ip) {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true;
  }
  const [a, b, c, d] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0 && c === 0) return true;
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 192 && b === 88 && c === 99) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224 && a <= 239) return true;
  if (a >= 240) return true;
  if (a === 255 && b === 255 && c === 255 && d === 255) return true;
  return false;
}
function isPrivateOrReservedIPv6(ip) {
  const cleanIp = ip.toLowerCase().trim();
  if (cleanIp === "::1" || cleanIp === "0:0:0:0:0:0:0:1") return true;
  if (cleanIp === "::" || cleanIp === "0:0:0:0:0:0:0:0") return true;
  if (cleanIp.startsWith("::ffff:")) {
    const mappedIpv4 = cleanIp.replace("::ffff:", "");
    if (mappedIpv4.includes(".")) {
      return isPrivateOrReservedIPv4(mappedIpv4);
    }
  }
  if (cleanIp.startsWith("fc") || cleanIp.startsWith("fd")) return true;
  if (cleanIp.startsWith("fe8") || cleanIp.startsWith("fe9") || cleanIp.startsWith("fea") || cleanIp.startsWith("feb")) {
    return true;
  }
  if (cleanIp.startsWith("ff")) return true;
  return false;
}
function isDisallowedIp(ip) {
  if (ip.includes(":")) {
    return isPrivateOrReservedIPv6(ip);
  }
  return isPrivateOrReservedIPv4(ip);
}
async function validateRemoteUrl(rawUrl) {
  try {
    if (!rawUrl || typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
      return { valid: false, error: "URL is required" };
    }
    if (rawUrl.length > 2048) {
      return { valid: false, error: "URL exceeds maximum permitted length" };
    }
    if (/[\x00-\x1F\x7F]/.test(rawUrl)) {
      return { valid: false, error: "URL contains illegal control characters" };
    }
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return { valid: false, error: "Malformed URL" };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, error: "Disallowed URL scheme. Only HTTP and HTTPS are permitted." };
    }
    const hostname = parsed.hostname.toLowerCase().trim();
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".lan") || hostname.endsWith(".home") || hostname.endsWith(".corp") || hostname.endsWith(".test") || hostname.endsWith(".invalid")) {
      return { valid: false, error: "Access to internal hostnames is prohibited." };
    }
    const cleanHost = hostname.replace(/^\[/, "").replace(/\]$/, "");
    if (cleanHost.split(".").length === 4 && cleanHost.split(".").every((p) => !isNaN(Number(p)))) {
      if (isDisallowedIp(cleanHost)) {
        return { valid: false, error: "Access to private or loopback IP ranges is prohibited." };
      }
    } else if (cleanHost.includes(":")) {
      if (isDisallowedIp(cleanHost)) {
        return { valid: false, error: "Access to private or loopback IPv6 ranges is prohibited." };
      }
    }
    try {
      const records = await dns.promises.lookup(hostname, { all: true });
      if (!records || records.length === 0) {
        return { valid: false, error: "Could not resolve domain name" };
      }
      for (const record of records) {
        if (isDisallowedIp(record.address)) {
          return {
            valid: false,
            error: "Domain resolves to a prohibited internal or private network address."
          };
        }
      }
    } catch (dnsErr) {
      return { valid: false, error: "Domain resolution failed" };
    }
    return { valid: true, url: parsed };
  } catch (err) {
    return { valid: false, error: "URL validation error" };
  }
}
async function safeFetchRemoteDocument(targetUrl, options = {}) {
  const maxBytes = options.maxBytes || MAX_DOCUMENT_SIZE_BYTES;
  const timeoutMs = options.timeoutMs || FETCH_TIMEOUT_MS;
  let currentUrl = targetUrl;
  let hops = 0;
  while (hops <= MAX_REDIRECT_HOPS) {
    const validation = await validateRemoteUrl(currentUrl);
    if (!validation.valid || !validation.url) {
      throw new Error(validation.error || "Invalid or prohibited destination URL");
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        headers: {
          "User-Agent": "TaleemGuru-DocumentBranding/2.0 (+https://taleemguru.pk)",
          "Accept": "application/pdf, text/plain, text/markdown, application/octet-stream"
        },
        redirect: "manual",
        // Manual redirect inspection to prevent redirect-to-private SSRF
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const locationHeader = response.headers.get("location");
        if (!locationHeader) {
          throw new Error("Redirect response missing Location header");
        }
        const nextUrl = new URL(locationHeader, currentUrl).toString();
        currentUrl = nextUrl;
        hops++;
        continue;
      }
      if (!response.ok) {
        throw new Error(`Remote server responded with status HTTP ${response.status}`);
      }
      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader) {
        const contentLength = parseInt(contentLengthHeader, 10);
        if (!isNaN(contentLength) && contentLength > maxBytes) {
          throw new Error(`Document exceeds maximum size limit of ${Math.round(maxBytes / (1024 * 1024))}MB`);
        }
      }
      const contentType = response.headers.get("content-type") || "application/pdf";
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > maxBytes) {
        throw new Error(`Downloaded document exceeds maximum size limit of ${Math.round(maxBytes / (1024 * 1024))}MB`);
      }
      return {
        buffer: Buffer.from(arrayBuffer),
        contentType
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error("Remote document fetch timed out");
      }
      throw err;
    }
  }
  throw new Error("Too many redirects while retrieving remote document");
}
function resolveSafeLocalFilePath(relativePath, baseDir) {
  try {
    if (!relativePath || typeof relativePath !== "string") {
      return { valid: false, error: "Path parameter is required" };
    }
    if (relativePath.includes("\0") || /%00/i.test(relativePath)) {
      return { valid: false, error: "Invalid path: null byte detected" };
    }
    if (/%2e%2e/i.test(relativePath) || /%252e%252e/i.test(relativePath) || /%2f/i.test(relativePath)) {
      return { valid: false, error: "Invalid path: encoded traversal detected" };
    }
    const cleanRelative = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
    if (cleanRelative.includes("..")) {
      return { valid: false, error: "Invalid path: directory traversal prohibited" };
    }
    const publicRoot = path2.resolve(baseDir || path2.join(process.cwd(), "public"));
    const resolvedPath = path2.resolve(publicRoot, cleanRelative);
    if (!resolvedPath.startsWith(publicRoot + path2.sep) && resolvedPath !== publicRoot) {
      return { valid: false, error: "Access denied: path escapes designated directory" };
    }
    const normalizedTarget = resolvedPath.toLowerCase();
    if (normalizedTarget.includes(".env") || normalizedTarget.includes(".git") || normalizedTarget.includes("node_modules") || normalizedTarget.includes("server.ts") || normalizedTarget.includes("src" + path2.sep)) {
      return { valid: false, error: "Access denied: sensitive system file requested" };
    }
    if (!fs2.existsSync(resolvedPath)) {
      return { valid: false, error: "File not found" };
    }
    const stat = fs2.statSync(resolvedPath);
    if (!stat.isFile()) {
      return { valid: false, error: "Target path is not a file" };
    }
    if (stat.size > MAX_DOCUMENT_SIZE_BYTES) {
      return { valid: false, error: "File exceeds maximum permitted size" };
    }
    return { valid: true, absolutePath: resolvedPath };
  } catch (err) {
    return { valid: false, error: "Path resolution error" };
  }
}
function sanitizeDownloadFilename(rawFilename, fallback = "TaleemGuru_Document.pdf") {
  if (!rawFilename || typeof rawFilename !== "string") return fallback;
  let clean = rawFilename.replace(/[/\\?%*:|"<>]/g, "_").replace(/[\x00-\x1F\x7F]/g, "");
  clean = clean.replace(/\.{2,}/g, ".");
  clean = clean.replace(/_+/g, "_").trim();
  clean = clean.replace(/^\.+/, "");
  if (clean.length === 0 || clean === "." || clean === "..") {
    return fallback;
  }
  if (clean.length > 120) {
    const ext = path2.extname(clean);
    clean = clean.substring(0, 110) + (ext || ".pdf");
  }
  return clean;
}

// src/server/documentStorage.ts
import fs3 from "fs";
import path3 from "path";
import crypto2 from "crypto";

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  auditLogs: () => auditLogs,
  boards: () => boards,
  bookmarkedQuestions: () => bookmarkedQuestions,
  bookmarksRelations: () => bookmarksRelations,
  certificates: () => certificates,
  certificatesRelations: () => certificatesRelations,
  chapters: () => chapters,
  classes: () => classes,
  contentReports: () => contentReports,
  contentVersions: () => contentVersions,
  documentDownloadEvents: () => documentDownloadEvents,
  documentVersions: () => documentVersions,
  documents: () => documents,
  examAttempts: () => examAttempts,
  mcqs: () => mcqs,
  mcqsRelations: () => mcqsRelations,
  notifications: () => notifications,
  pastPapers: () => pastPapers,
  staffAssignments: () => staffAssignments,
  staffAssignmentsRelations: () => staffAssignmentsRelations,
  studyNotes: () => studyNotes,
  subjects: () => subjects,
  syllabus: () => syllabus,
  testQuestions: () => testQuestions,
  testQuestionsRelations: () => testQuestionsRelations,
  testResults: () => testResults,
  testResultsRelations: () => testResultsRelations,
  tests: () => tests,
  testsRelations: () => testsRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  // Supabase Auth User ID
  email: text("email").notNull(),
  name: text("name"),
  roles: jsonb("roles").$type().default(["Student"]).notNull(),
  // Multiple roles
  targetExam: text("target_exam"),
  classLevel: text("class_level"),
  board: text("board"),
  points: integer("points").default(0).notNull(),
  streakDays: integer("streak_days").default(0).notNull(),
  testsTaken: integer("tests_taken").default(0).notNull(),
  avatar: text("avatar"),
  status: text("status").default("Active").notNull(),
  // 'Active' | 'Inactive' | 'Suspended'
  permissions: jsonb("permissions").$type(),
  // Granular permission overrides
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var testResults = pgTable("test_results", {
  id: serial("id").primaryKey(),
  resultId: text("result_id").notNull().unique(),
  userUid: text("user_uid").references(() => users.uid).notNull(),
  testId: text("test_id").notNull(),
  testTitle: text("test_title").notNull(),
  testType: text("test_type").notNull(),
  subject: text("subject").notNull(),
  category: text("category").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  answeredCount: integer("answered_count").notNull(),
  correctCount: integer("correct_count").notNull(),
  wrongCount: integer("wrong_count").notNull(),
  skippedCount: integer("skipped_count").notNull(),
  marksObtained: integer("marks_obtained").notNull(),
  totalMarks: integer("total_marks").notNull(),
  percentage: integer("percentage").notNull(),
  grade: text("grade").notNull(),
  timeUsedSeconds: integer("time_used_seconds").notNull(),
  percentileRank: integer("percentile_rank").default(85).notNull(),
  answers: jsonb("answers"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var bookmarkedQuestions = pgTable("bookmarked_questions", {
  id: serial("id").primaryKey(),
  userUid: text("user_uid").references(() => users.uid).notNull(),
  questionId: text("question_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var certificates = pgTable("certificates", {
  id: text("id").primaryKey(),
  userUid: text("user_uid").references(() => users.uid).notNull(),
  studentName: text("student_name").notNull(),
  testId: text("test_id").notNull(),
  testName: text("test_name").notNull(),
  score: integer("score").notNull(),
  totalMarks: integer("total_marks").notNull(),
  percentage: integer("percentage").notNull(),
  grade: text("grade").notNull(),
  className: text("class_name"),
  subjectName: text("subject_name"),
  chapterName: text("chapter_name"),
  performanceLevel: text("performance_level"),
  status: text("status").default("VALID").notNull(),
  // 'VALID' | 'REVOKED'
  revokedAt: timestamp("revoked_at"),
  verificationUrl: text("verification_url").notNull(),
  issueDate: timestamp("issue_date").defaultNow().notNull()
});
var contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  reportId: text("report_id").notNull().unique(),
  category: text("category").notNull(),
  questionId: text("question_id"),
  subject: text("subject"),
  description: text("description").notNull(),
  userEmail: text("user_email"),
  userUid: text("user_uid"),
  status: text("status").default("OPEN").notNull(),
  adminNotes: text("admin_notes"),
  resolvedBy: text("resolved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminUid: text("admin_uid").notNull(),
  adminEmail: text("admin_email").notNull(),
  adminName: text("admin_name"),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  details: text("details"),
  board: text("board"),
  classLevel: text("class_level"),
  subject: text("subject"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var staffAssignments = pgTable("staff_assignments", {
  id: serial("id").primaryKey(),
  userUid: text("user_uid").notNull(),
  // User UID of the staff member
  role: text("role").notNull(),
  // 'Teacher' | 'Editor' | 'ContentManager' | 'Moderator'
  board: text("board").default("All").notNull(),
  // e.g. 'Punjab', 'Federal', 'Sindh', 'KPK', 'Balochistan', 'All'
  classLevel: text("class_level").default("All").notNull(),
  // e.g. 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'MDCAT', 'ECAT', 'All'
  subject: text("subject").default("All").notNull(),
  // e.g. 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'All'
  contentTypes: jsonb("content_types").$type().default([]),
  // ['Notes', 'Syllabus', 'Past Papers', 'MCQs', 'Articles', 'Study Material']
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").default("Active").notNull(),
  // 'Active' | 'Inactive'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").references(() => boards.id).notNull(),
  name: text("name").notNull(),
  status: text("status").default("Active").notNull(),
  // 'Active' | 'Inactive'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  name: text("name").notNull(),
  status: text("status").default("Active").notNull(),
  // 'Active' | 'Inactive'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  name: text("name").notNull(),
  status: text("status").default("Active").notNull(),
  // 'Active' | 'Inactive'
  draftStatus: text("draft_status").default("Draft").notNull(),
  // 'Draft' | 'Published'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var syllabus = pgTable("syllabus", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var mcqs = pgTable("mcqs", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  options: jsonb("options").$type().notNull(),
  correctAnswer: integer("correct_answer").notNull(),
  // 0-indexed
  explanation: text("explanation"),
  subject: text("subject").notNull(),
  chapter: text("chapter"),
  topic: text("topic"),
  difficulty: text("difficulty").default("Medium").notNull(),
  // 'Easy' | 'Medium' | 'Hard'
  classLevel: text("class_level"),
  board: text("board"),
  exam: text("exam"),
  year: integer("year"),
  tags: jsonb("tags").$type().default([]),
  language: text("language").default("English").notNull(),
  // 'English' | 'Urdu'
  status: text("status").default("Published").notNull(),
  // 'Draft' | 'Pending Review' | 'Approved' | 'Published' | 'Rejected' | 'Archived'
  submittedBy: text("submitted_by"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  changeNotes: text("change_notes"),
  version: integer("version").default(1).notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var tests = pgTable("tests", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  testType: text("test_type").default("Chapter Test").notNull(),
  category: text("category").default("Academic").notNull(),
  subject: text("subject").notNull(),
  chapter: text("chapter"),
  classLevel: text("class_level"),
  board: text("board"),
  exam: text("exam"),
  durationMinutes: integer("duration_minutes").default(15).notNull(),
  totalQuestions: integer("total_questions").default(10).notNull(),
  totalMarks: integer("total_marks").default(10).notNull(),
  negativeMarking: boolean("negative_marking").default(false).notNull(),
  negativeMarkValue: text("negative_mark_value").default("0.25"),
  passPercentage: integer("pass_percentage").default(50).notNull(),
  randomizeQuestions: boolean("randomize_questions").default(false).notNull(),
  randomizeOptions: boolean("randomize_options").default(false).notNull(),
  allowRetake: boolean("allow_retake").default(true).notNull(),
  maxAttempts: integer("max_attempts").default(0).notNull(),
  // 0 = unlimited
  reviewPolicy: text("review_policy").default("immediate").notNull(),
  // 'immediate' | 'after_submission' | 'none'
  isPremium: boolean("is_premium").default(false).notNull(),
  status: text("status").default("Published").notNull(),
  // 'Draft' | 'Pending Review' | 'Approved' | 'Published' | 'Rejected' | 'Archived'
  submittedBy: text("submitted_by"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  changeNotes: text("change_notes"),
  version: integer("version").default(1).notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var examAttempts = pgTable("exam_attempts", {
  id: serial("id").primaryKey(),
  attemptId: text("attempt_id").notNull().unique(),
  testId: text("test_id").notNull(),
  testTitle: text("test_title").notNull(),
  userUid: text("user_uid").notNull(),
  studentName: text("student_name"),
  studentEmail: text("student_email"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  submittedAt: timestamp("submitted_at"),
  status: text("status").default("IN_PROGRESS").notNull(),
  // 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'ABANDONED'
  questionOrder: jsonb("question_order").$type().notNull(),
  // MCQ IDs in attempt order
  answers: jsonb("answers").$type().default({}).notNull(),
  score: integer("score"),
  totalMarks: integer("total_marks"),
  percentage: integer("percentage"),
  passed: boolean("passed"),
  grade: text("grade"),
  correctCount: integer("correct_count"),
  wrongCount: integer("wrong_count"),
  unansweredCount: integer("unanswered_count"),
  timeSpentSeconds: integer("time_spent_seconds"),
  reviewPolicy: text("review_policy").default("immediate").notNull(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var testQuestions = pgTable("test_questions", {
  id: serial("id").primaryKey(),
  testId: text("test_id").references(() => tests.id, { onDelete: "cascade" }).notNull(),
  mcqId: text("mcq_id").references(() => mcqs.id, { onDelete: "cascade" }).notNull(),
  ordering: integer("ordering").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var pastPapers = pgTable("past_papers", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  board: text("board").notNull(),
  province: text("province"),
  classLevel: text("class_level").notNull(),
  subject: text("subject").notNull(),
  chapter: text("chapter"),
  topic: text("topic"),
  exam: text("exam"),
  year: integer("year").notNull(),
  paperGroup: text("paper_group"),
  type: text("type").default("Objective (MCQs)").notNull(),
  // 'Objective (MCQs)' | 'Subjective' | 'Combined'
  paperType: text("paper_type"),
  language: text("language").default("English").notNull(),
  totalQuestions: integer("total_questions").default(0).notNull(),
  totalMarks: integer("total_marks").default(0).notNull(),
  durationMinutes: integer("duration_minutes"),
  questionsCount: integer("questions_count").default(0).notNull(),
  downloadUrl: text("download_url"),
  fileUrl: text("file_url"),
  pdfUrl: text("pdf_url"),
  thumbnail: text("thumbnail"),
  description: text("description"),
  status: text("status").default("Published").notNull(),
  // 'Published' | 'Draft' | 'Archived'
  version: integer("version").default(1).notNull(),
  brandingStatus: text("branding_status").default("Not Applicable"),
  brandedFileUrl: text("branded_file_url"),
  brandingVersion: text("branding_version"),
  originalFileHash: text("original_file_hash"),
  brandedFileHash: text("branded_file_hash"),
  brandedAt: timestamp("branded_at"),
  downloadsCount: integer("downloads_count").default(0).notNull(),
  questions: jsonb("questions").$type(),
  // Optional embedded questions
  submittedBy: text("submitted_by"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  changeNotes: text("change_notes"),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var studyNotes = pgTable("study_notes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  board: text("board"),
  subject: text("subject").notNull(),
  classLevel: text("class_level").notNull(),
  chapter: text("chapter").notNull(),
  topic: text("topic"),
  description: text("description"),
  type: text("type").default("Notes").notNull(),
  contentSnippet: text("content_snippet"),
  fullContent: text("full_content"),
  content: text("content"),
  language: text("language").default("English").notNull(),
  pdfUrl: text("pdf_url"),
  fileUrl: text("file_url"),
  thumbnail: text("thumbnail"),
  status: text("status").default("Published").notNull(),
  // 'Draft' | 'Pending Review' | 'Approved' | 'Published' | 'Rejected' | 'Archived'
  version: integer("version").default(1).notNull(),
  brandingStatus: text("branding_status").default("Not Applicable"),
  brandedFileUrl: text("branded_file_url"),
  brandingVersion: text("branding_version"),
  originalFileHash: text("original_file_hash"),
  brandedFileHash: text("branded_file_hash"),
  brandedAt: timestamp("branded_at"),
  keyPoints: jsonb("key_points").$type().default([]),
  readTime: text("read_time"),
  downloadsCount: integer("downloads_count").default(0).notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  submittedBy: text("submitted_by"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  changeNotes: text("change_notes"),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var documents = pgTable("documents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  originalFilename: text("original_filename").notNull(),
  sanitizedFilename: text("sanitized_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storageRef: text("storage_ref").notNull(),
  // Path to immutable original
  originalFileHash: text("original_file_hash").notNull(),
  // SHA-256
  brandedStorageRef: text("branded_storage_ref"),
  // Path to branded/distribution copy
  brandedFileHash: text("branded_file_hash"),
  // SHA-256 of branded copy
  documentType: text("document_type").default("Document").notNull(),
  // 'Past Paper' | 'Study Note' | 'Syllabus' | 'Reference' | 'Book' | 'Document'
  contentType: text("content_type").default("PDF").notNull(),
  board: text("board"),
  classLevel: text("class_level"),
  subject: text("subject"),
  chapter: text("chapter"),
  topic: text("topic"),
  year: integer("year"),
  language: text("language").default("English"),
  status: text("status").default("Published").notNull(),
  // 'Draft' | 'Pending Review' | 'Approved' | 'Published' | 'Rejected' | 'Archived'
  version: integer("version").default(1).notNull(),
  brandingStatus: text("branding_status").default("Completed").notNull(),
  // 'Completed' | 'Pending' | 'Failed' | 'Not Applicable'
  brandingVersion: text("branding_version").default("2.0"),
  brandedAt: timestamp("branded_at"),
  downloadsCount: integer("downloads_count").default(0).notNull(),
  associatedEntityId: text("associated_entity_id"),
  submittedBy: text("submitted_by"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  changeNotes: text("change_notes"),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var contentVersions = pgTable("content_versions", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(),
  // 'MCQ' | 'Test' | 'PastPaper' | 'StudyNote' | 'Document'
  contentId: text("content_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  status: text("status").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  changeNotes: text("change_notes"),
  rejectionReason: text("rejection_reason"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: text("document_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  originalFilename: text("original_filename").notNull(),
  storageRef: text("storage_ref").notNull(),
  originalFileHash: text("original_file_hash").notNull(),
  brandedStorageRef: text("branded_storage_ref"),
  brandedFileHash: text("branded_file_hash"),
  fileSize: integer("file_size").notNull(),
  changeNotes: text("change_notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var documentDownloadEvents = pgTable("document_download_events", {
  id: serial("id").primaryKey(),
  documentId: text("document_id").notNull(),
  documentType: text("document_type").default("Document").notNull(),
  userUid: text("user_uid"),
  anonymousSessionId: text("anonymous_session_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  version: integer("version").default(1),
  downloadedAt: timestamp("downloaded_at").defaultNow().notNull()
});
var notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  notificationId: text("notification_id").notNull().unique(),
  recipientUid: text("recipient_uid").notNull(),
  // User UID or 'ALL' for broadcast
  title: text("title").notNull(),
  message: text("message").notNull(),
  category: text("category").default("System").notNull(),
  // 'System' | 'Test' | 'Result' | 'Certificate' | 'PastPaper' | 'StudyNote' | 'Announcement'
  isRead: boolean("is_read").default(false).notNull(),
  actionUrl: text("action_url"),
  senderUid: text("sender_uid"),
  senderName: text("sender_name"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var usersRelations = relations(users, ({ many }) => ({
  testResults: many(testResults),
  bookmarks: many(bookmarkedQuestions),
  certificates: many(certificates),
  staffAssignments: many(staffAssignments)
}));
var staffAssignmentsRelations = relations(staffAssignments, ({ one }) => ({
  user: one(users, {
    fields: [staffAssignments.userUid],
    references: [users.uid]
  })
}));
var testResultsRelations = relations(testResults, ({ one }) => ({
  user: one(users, {
    fields: [testResults.userUid],
    references: [users.uid]
  })
}));
var bookmarksRelations = relations(bookmarkedQuestions, ({ one }) => ({
  user: one(users, {
    fields: [bookmarkedQuestions.userUid],
    references: [users.uid]
  })
}));
var certificatesRelations = relations(certificates, ({ one }) => ({
  user: one(users, {
    fields: [certificates.userUid],
    references: [users.uid]
  })
}));
var testsRelations = relations(tests, ({ many }) => ({
  testQuestions: many(testQuestions)
}));
var mcqsRelations = relations(mcqs, ({ many }) => ({
  testQuestions: many(testQuestions)
}));
var testQuestionsRelations = relations(testQuestions, ({ one }) => ({
  test: one(tests, {
    fields: [testQuestions.testId],
    references: [tests.id]
  }),
  mcq: one(mcqs, {
    fields: [testQuestions.mcqId],
    references: [mcqs.id]
  })
}));

// src/db/index.ts
function resolveDatabaseConnectionString() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.SUPABASE_DATABASE_URL,
    process.env.SUPABASE_DB_URL,
    process.env.PG_CONNECTION_STRING
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return void 0;
}
function isLocalHost(host) {
  if (!host) return true;
  const clean = host.toLowerCase().trim();
  return clean === "localhost" || clean === "127.0.0.1" || clean === "::1";
}
var createPool = () => {
  if (!global._postgresPool) {
    try {
      const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1" || process.env.VERCEL_ENV === "production";
      if (process.env.SQL_HOST) {
        const isUnixSocket = process.env.SQL_HOST.startsWith("/");
        global._postgresPool = new Pool({
          host: process.env.SQL_HOST,
          user: process.env.SQL_USER,
          password: process.env.SQL_PASSWORD,
          database: process.env.SQL_DB_NAME,
          ssl: isUnixSocket ? false : process.env.SQL_SSL === "true" ? { rejectUnauthorized: false } : void 0,
          max: 10,
          idleTimeoutMillis: 1e4,
          connectionTimeoutMillis: 15e3
        });
      } else {
        const connectionString = resolveDatabaseConnectionString();
        if (connectionString) {
          const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
          const hasSslDisabled = connectionString.includes("sslmode=disable") || process.env.SQL_SSL === "false";
          global._postgresPool = new Pool({
            connectionString,
            ssl: isLocal || hasSslDisabled ? false : { rejectUnauthorized: false },
            max: 10,
            idleTimeoutMillis: 1e4,
            connectionTimeoutMillis: 15e3
          });
        } else if (process.env.POSTGRES_HOST && !isLocalHost(process.env.POSTGRES_HOST)) {
          global._postgresPool = new Pool({
            host: process.env.POSTGRES_HOST,
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DATABASE,
            port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 5432,
            ssl: { rejectUnauthorized: false },
            max: 10,
            idleTimeoutMillis: 1e4,
            connectionTimeoutMillis: 15e3
          });
        } else if (process.env.PGHOST && !isLocalHost(process.env.PGHOST)) {
          global._postgresPool = new Pool({
            host: process.env.PGHOST,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE,
            port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
            ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
            max: 10,
            idleTimeoutMillis: 1e4,
            connectionTimeoutMillis: 15e3
          });
        } else if (isProduction) {
          const configError = new Error(
            "Database configuration error: Missing required DATABASE_URL or POSTGRES_URL in production environment"
          );
          const stubPool = {
            connect: async () => {
              throw configError;
            },
            query: async () => {
              throw configError;
            },
            on: () => stubPool,
            end: async () => {
            },
            totalCount: 0,
            idleCount: 0,
            waitingCount: 0
          };
          global._postgresPool = stubPool;
          return stubPool;
        } else {
          global._postgresPool = new Pool({
            host: process.env.PGHOST || "localhost",
            user: process.env.PGUSER || "postgres",
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE || "postgres",
            port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
            max: 10,
            idleTimeoutMillis: 1e4,
            connectionTimeoutMillis: 15e3
          });
        }
      }
      global._postgresPool.on("error", (err) => {
        const msg = err?.message || "";
        if (msg.includes("Connection terminated unexpectedly") || msg.includes("idle")) {
          console.info("PostgreSQL idle client connection terminated (expected and managed in serverless/idle states).");
        } else {
          console.error("Unexpected error on idle SQL pool client:", err);
        }
      });
    } catch (outerErr) {
      console.error("Fatal synchronous error initializing database pool:", outerErr);
      const configError = new Error(
        "Database configuration error: Fatal synchronous connection error during startup: " + (outerErr?.message || String(outerErr))
      );
      const stubPool = {
        connect: async () => {
          throw configError;
        },
        query: async () => {
          throw configError;
        },
        on: () => stubPool,
        end: async () => {
        },
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0
      };
      global._postgresPool = stubPool;
    }
  }
  return global._postgresPool;
};
var pool = createPool();
var db = drizzle(pool, { schema: schema_exports });

// src/server/documentStorage.ts
import { eq, sql } from "drizzle-orm";
var ORIGINALS_DIR = path3.resolve(process.cwd(), "storage", "documents", "originals");
var BRANDED_DIR = path3.resolve(process.cwd(), "storage", "documents", "branded");
try {
  if (!fs3.existsSync(ORIGINALS_DIR)) {
    fs3.mkdirSync(ORIGINALS_DIR, { recursive: true });
  }
  if (!fs3.existsSync(BRANDED_DIR)) {
    fs3.mkdirSync(BRANDED_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("[DocumentStorage] Could not create storage directory:", err);
}
function validateMagicBytes(buffer, mimeType, filename) {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Empty file buffer" };
  }
  const ext = path3.extname(filename).toLowerCase();
  if (buffer.length >= 5 && buffer[0] === 37 && buffer[1] === 80 && buffer[2] === 68 && buffer[3] === 70 && buffer[4] === 45) {
    return { valid: true, detectedType: "application/pdf" };
  }
  if (buffer.length >= 8 && buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71) {
    return { valid: true, detectedType: "image/png" };
  }
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
    return { valid: true, detectedType: "image/jpeg" };
  }
  if (buffer.length >= 4 && buffer[0] === 80 && buffer[1] === 75 && buffer[2] === 3 && buffer[3] === 4) {
    if (ext === ".docx") return { valid: true, detectedType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
    if (ext === ".xlsx") return { valid: true, detectedType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
    return { valid: true, detectedType: "application/zip" };
  }
  if ([".txt", ".md"].includes(ext) || mimeType.includes("text")) {
    for (let i = 0; i < Math.min(buffer.length, 1024); i++) {
      if (buffer[i] === 0) {
        return { valid: false, error: "Text document contains invalid null bytes" };
      }
    }
    return { valid: true, detectedType: ext === ".md" ? "text/markdown" : "text/plain" };
  }
  const prohibitedExts = [".exe", ".sh", ".bat", ".cmd", ".js", ".mjs", ".php", ".py", ".pl", ".rb", ".vbs", ".dll", ".bin", ".so"];
  if (prohibitedExts.includes(ext)) {
    return { valid: false, error: `Executable or script extension ${ext} is prohibited` };
  }
  return { valid: false, error: "Unsupported file signature or corrupt document format" };
}
async function processAndStoreDocument(fileBuffer, originalFilename, options = {}, authorUid) {
  if (fileBuffer.length > MAX_DOCUMENT_SIZE_BYTES) {
    return { success: false, error: `Document exceeds maximum permitted size of 25MB` };
  }
  const sanitizedFilename = sanitizeDownloadFilename(originalFilename, "document.pdf");
  const magicValidation = validateMagicBytes(fileBuffer, "application/pdf", sanitizedFilename);
  if (!magicValidation.valid) {
    return { success: false, error: magicValidation.error || "Invalid file format" };
  }
  const mimeType = magicValidation.detectedType || "application/pdf";
  const originalFileHash = computeHash(fileBuffer);
  if (db) {
    const existing = await db.select().from(documents).where(eq(documents.originalFileHash, originalFileHash)).limit(1);
    if (existing.length > 0) {
      if (!options.allowDuplicate) {
        return {
          success: false,
          isDuplicate: true,
          existingDocumentId: existing[0].id,
          error: `Duplicate file detected: Document already exists with ID "${existing[0].id}" and title "${existing[0].title}".`
        };
      }
    }
  }
  const docId = `tg_doc_${Date.now()}_${crypto2.randomBytes(4).toString("hex")}`;
  const originalFileStorageName = `${docId}_orig_${sanitizedFilename}`;
  const originalPath = path3.join(ORIGINALS_DIR, originalFileStorageName);
  fs3.writeFileSync(originalPath, fileBuffer);
  let brandedStorageRef;
  let brandedFileHash;
  let brandingStatus = "Not Applicable";
  const isPdf = mimeType === "application/pdf" || sanitizedFilename.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    try {
      const brandedResult = await brandPdfBuffer(fileBuffer, { title: options.title || sanitizedFilename });
      const brandedStorageName = `${docId}_branded_${sanitizedFilename}`;
      const brandedPath = path3.join(BRANDED_DIR, brandedStorageName);
      fs3.writeFileSync(brandedPath, brandedResult.buffer);
      brandedStorageRef = brandedPath;
      brandedFileHash = computeHash(brandedResult.buffer);
      brandingStatus = "Completed";
    } catch (brandingErr) {
      console.warn(`[DocumentStorage] Automatic branding failed for ${docId}:`, brandingErr.message);
      brandingStatus = "Failed";
    }
  }
  const docItem = {
    id: docId,
    title: options.title || sanitizedFilename.replace(/\.[^/.]+$/, ""),
    originalFilename,
    sanitizedFilename,
    mimeType,
    fileSize: fileBuffer.length,
    storageRef: originalPath,
    originalFileHash,
    brandedStorageRef,
    brandedFileHash,
    documentType: options.documentType || "Document",
    contentType: isPdf ? "PDF" : "Other",
    board: options.board,
    classLevel: options.classLevel,
    subject: options.subject,
    chapter: options.chapter,
    topic: options.topic,
    year: options.year,
    language: options.language || "English",
    status: options.status || "Published",
    version: 1,
    brandingStatus,
    brandingVersion: "2.0",
    brandedAt: brandingStatus === "Completed" ? (/* @__PURE__ */ new Date()).toISOString() : void 0,
    downloadsCount: 0,
    associatedEntityId: options.associatedEntityId,
    createdBy: authorUid,
    updatedBy: authorUid,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (db) {
    await db.insert(documents).values({
      id: docItem.id,
      title: docItem.title,
      originalFilename: docItem.originalFilename,
      sanitizedFilename: docItem.sanitizedFilename,
      mimeType: docItem.mimeType,
      fileSize: docItem.fileSize,
      storageRef: docItem.storageRef,
      originalFileHash: docItem.originalFileHash,
      brandedStorageRef: docItem.brandedStorageRef,
      brandedFileHash: docItem.brandedFileHash,
      documentType: docItem.documentType,
      contentType: docItem.contentType,
      board: docItem.board,
      classLevel: docItem.classLevel,
      subject: docItem.subject,
      chapter: docItem.chapter,
      topic: docItem.topic,
      year: docItem.year,
      language: docItem.language,
      status: docItem.status,
      version: docItem.version,
      brandingStatus: docItem.brandingStatus,
      brandingVersion: docItem.brandingVersion,
      brandedAt: docItem.brandedAt ? new Date(docItem.brandedAt) : null,
      downloadsCount: 0,
      associatedEntityId: docItem.associatedEntityId,
      createdBy: docItem.createdBy,
      updatedBy: docItem.updatedBy
    });
    await db.insert(documentVersions).values({
      documentId: docId,
      versionNumber: 1,
      originalFilename,
      storageRef: originalPath,
      originalFileHash,
      brandedStorageRef: brandedStorageRef || originalPath,
      brandedFileHash: brandedFileHash || originalFileHash,
      fileSize: fileBuffer.length,
      changeNotes: "Initial document upload",
      createdBy: authorUid
    });
  }
  return { success: true, document: docItem };
}
async function createDocumentVersion(documentId, newFileBuffer, originalFilename, changeNotes, authorUid) {
  if (!db) throw new Error("Database not connected");
  const existingRows = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (existingRows.length === 0) {
    return { success: false, error: "Document not found" };
  }
  const currentDoc = existingRows[0];
  const newVersionNumber = currentDoc.version + 1;
  const sanitizedFilename = sanitizeDownloadFilename(originalFilename, currentDoc.sanitizedFilename);
  const magicValidation = validateMagicBytes(newFileBuffer, currentDoc.mimeType, sanitizedFilename);
  if (!magicValidation.valid) {
    return { success: false, error: magicValidation.error || "Invalid file format" };
  }
  const originalFileStorageName = `${documentId}_v${newVersionNumber}_orig_${sanitizedFilename}`;
  const originalPath = path3.join(ORIGINALS_DIR, originalFileStorageName);
  fs3.writeFileSync(originalPath, newFileBuffer);
  const originalFileHash = computeHash(newFileBuffer);
  let brandedStorageRef;
  let brandedFileHash;
  let brandingStatus = currentDoc.brandingStatus;
  const isPdf = currentDoc.mimeType === "application/pdf" || sanitizedFilename.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    try {
      const brandedResult = await brandPdfBuffer(newFileBuffer, { title: currentDoc.title });
      const brandedStorageName = `${documentId}_v${newVersionNumber}_branded_${sanitizedFilename}`;
      const brandedPath = path3.join(BRANDED_DIR, brandedStorageName);
      fs3.writeFileSync(brandedPath, brandedResult.buffer);
      brandedStorageRef = brandedPath;
      brandedFileHash = computeHash(brandedResult.buffer);
      brandingStatus = "Completed";
    } catch {
      brandingStatus = "Failed";
    }
  }
  await db.insert(documentVersions).values({
    documentId,
    versionNumber: newVersionNumber,
    originalFilename,
    storageRef: originalPath,
    originalFileHash,
    brandedStorageRef: brandedStorageRef || originalPath,
    brandedFileHash: brandedFileHash || originalFileHash,
    fileSize: newFileBuffer.length,
    changeNotes: changeNotes || `Updated to version ${newVersionNumber}`,
    createdBy: authorUid
  });
  await db.update(documents).set({
    version: newVersionNumber,
    originalFilename,
    sanitizedFilename,
    fileSize: newFileBuffer.length,
    storageRef: originalPath,
    originalFileHash,
    brandedStorageRef: brandedStorageRef || currentDoc.brandedStorageRef,
    brandedFileHash: brandedFileHash || currentDoc.brandedFileHash,
    brandingStatus,
    updatedBy: authorUid,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(documents.id, documentId));
  const updatedRows = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  return { success: true, document: updatedRows[0] };
}
async function rebrandDocument(documentId) {
  if (!db) throw new Error("Database not connected");
  const rows = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (rows.length === 0) {
    return { success: false, error: "Document not found" };
  }
  const doc = rows[0];
  if (!fs3.existsSync(doc.storageRef)) {
    return { success: false, error: "Original document file is missing on storage" };
  }
  const originalBuffer = fs3.readFileSync(doc.storageRef);
  const brandedResult = await brandPdfBuffer(originalBuffer, { title: doc.title, forceRebrand: true });
  const brandedStorageName = `${documentId}_branded_${doc.sanitizedFilename}`;
  const brandedPath = path3.join(BRANDED_DIR, brandedStorageName);
  fs3.writeFileSync(brandedPath, brandedResult.buffer);
  const brandedFileHash = computeHash(brandedResult.buffer);
  await db.update(documents).set({
    brandedStorageRef: brandedPath,
    brandedFileHash,
    brandingStatus: "Completed",
    brandingVersion: "2.0",
    brandedAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(documents.id, documentId));
  return { success: true, brandedHash: brandedFileHash };
}
async function recordDocumentDownload(documentId, options) {
  if (!db) return { success: false, totalDownloads: 0 };
  try {
    await db.insert(documentDownloadEvents).values({
      documentId,
      documentType: options.documentType || "Document",
      userUid: options.userUid,
      anonymousSessionId: options.anonymousSessionId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      version: options.version || 1
    });
    const countResult = await db.select({ count: sql`count(*)::int` }).from(documentDownloadEvents).where(eq(documentDownloadEvents.documentId, documentId));
    const totalDownloads = countResult[0]?.count || 1;
    await db.update(documents).set({ downloadsCount: totalDownloads }).where(eq(documents.id, documentId));
    await db.update(pastPapers).set({ downloadsCount: totalDownloads }).where(eq(pastPapers.id, documentId));
    await db.update(studyNotes).set({ downloadsCount: totalDownloads }).where(eq(studyNotes.id, documentId));
    return { success: true, totalDownloads };
  } catch (err) {
    console.error("Error recording document download event:", err);
    return { success: false, totalDownloads: 0 };
  }
}
function getSafeBrandedPath(doc) {
  const target = doc.brandedStorageRef || doc.storageRef;
  if (!target) return { valid: false, error: "File reference missing" };
  const resolved = path3.resolve(target);
  const storageRoot = path3.resolve(process.cwd(), "storage");
  if (!resolved.startsWith(storageRoot)) {
    return { valid: false, error: "Path traversal violation" };
  }
  if (!fs3.existsSync(resolved)) {
    return { valid: false, error: "Distribution file does not exist on storage" };
  }
  return { valid: true, filePath: resolved };
}
function getSafeOriginalPath(doc) {
  const target = doc.storageRef;
  if (!target) return { valid: false, error: "Original storage reference missing" };
  const resolved = path3.resolve(target);
  const originalsRoot = ORIGINALS_DIR;
  if (!resolved.startsWith(originalsRoot)) {
    return { valid: false, error: "Access denied: path escapes originals storage" };
  }
  if (!fs3.existsSync(resolved)) {
    return { valid: false, error: "Original file missing on storage" };
  }
  return { valid: true, filePath: resolved };
}

// src/server/unifiedSearch.ts
import { eq as eq2, and, ilike, sql as sql2, or } from "drizzle-orm";
function escapeIlike(str) {
  return str.replace(/[%_\\]/g, "\\$&");
}
async function executeUnifiedSearch(filters, isStaff = false) {
  const queryStr = (filters.query || "").trim();
  const searchType = (filters.type || "all").toLowerCase();
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const offset = (page - 1) * limit;
  let allowedStatus = "Published";
  if (isStaff) {
    if (filters.status === "Draft" || filters.status === "Archived" || filters.status === "All") {
      allowedStatus = filters.status;
    } else {
      allowedStatus = filters.status || "All";
    }
  }
  const allItems = [];
  const categoryCounts = {
    all: 0,
    mcqs: 0,
    tests: 0,
    past_papers: 0,
    study_notes: 0,
    documents: 0,
    curriculum: 0
  };
  if (!db) {
    return {
      results: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      hasMore: false,
      countsByCategory: categoryCounts,
      query: queryStr,
      appliedFilters: { ...filters, status: allowedStatus }
    };
  }
  const tokens = queryStr.toLowerCase().split(/\s+/).filter(Boolean);
  const shouldSearchMCQs = searchType === "all" || searchType === "mcqs";
  if (shouldSearchMCQs) {
    try {
      const conditions = [];
      if (allowedStatus !== "All") {
        conditions.push(eq2(mcqs.status, allowedStatus));
      }
      if (filters.board && filters.board !== "All") {
        conditions.push(ilike(mcqs.board, `%${escapeIlike(filters.board)}%`));
      }
      if (filters.classLevel && filters.classLevel !== "All") {
        conditions.push(ilike(mcqs.classLevel, `%${escapeIlike(filters.classLevel)}%`));
      }
      if (filters.subject && filters.subject !== "All") {
        conditions.push(ilike(mcqs.subject, `%${escapeIlike(filters.subject)}%`));
      }
      if (filters.chapter && filters.chapter !== "All") {
        conditions.push(ilike(mcqs.chapter, `%${escapeIlike(filters.chapter)}%`));
      }
      if (filters.year) {
        conditions.push(eq2(mcqs.year, filters.year));
      }
      if (queryStr) {
        const textConditions = tokens.map(
          (tok) => or(
            ilike(mcqs.question, `%${escapeIlike(tok)}%`),
            ilike(mcqs.subject, `%${escapeIlike(tok)}%`),
            ilike(mcqs.chapter, `%${escapeIlike(tok)}%`),
            ilike(mcqs.topic, `%${escapeIlike(tok)}%`)
          )
        );
        conditions.push(and(...textConditions));
      }
      const rows = await db.select().from(mcqs).where(conditions.length > 0 ? and(...conditions) : void 0).limit(200);
      categoryCounts.mcqs = rows.length;
      for (const row of rows) {
        allItems.push({
          id: row.id,
          type: "mcq",
          title: row.question,
          subtitle: `${row.subject} \u2022 ${row.classLevel || "Matric/FSc"} \u2022 ${row.difficulty || "Medium"}`,
          description: row.explanation || void 0,
          subject: row.subject,
          classLevel: row.classLevel || void 0,
          board: row.board || void 0,
          chapter: row.chapter || void 0,
          topic: row.topic || void 0,
          year: row.year || void 0,
          status: row.status || "Published",
          badge: "MCQ",
          difficulty: row.difficulty,
          meta: {
            options: row.options,
            correctAnswer: row.correctAnswer
          }
        });
      }
    } catch (err) {
      console.error("Error searching MCQs:", err);
    }
  }
  const shouldSearchTests = searchType === "all" || searchType === "tests";
  if (shouldSearchTests) {
    try {
      const conditions = [];
      if (allowedStatus !== "All") {
        conditions.push(eq2(tests.status, allowedStatus));
      }
      if (filters.board && filters.board !== "All") {
        conditions.push(ilike(tests.board, `%${escapeIlike(filters.board)}%`));
      }
      if (filters.classLevel && filters.classLevel !== "All") {
        conditions.push(ilike(tests.classLevel, `%${escapeIlike(filters.classLevel)}%`));
      }
      if (filters.subject && filters.subject !== "All") {
        conditions.push(ilike(tests.subject, `%${escapeIlike(filters.subject)}%`));
      }
      if (filters.chapter && filters.chapter !== "All") {
        conditions.push(ilike(tests.chapter, `%${escapeIlike(filters.chapter)}%`));
      }
      if (queryStr) {
        const textConditions = tokens.map(
          (tok) => or(
            ilike(tests.title, `%${escapeIlike(tok)}%`),
            ilike(tests.subject, `%${escapeIlike(tok)}%`),
            ilike(tests.description, `%${escapeIlike(tok)}%`),
            ilike(tests.category, `%${escapeIlike(tok)}%`)
          )
        );
        conditions.push(and(...textConditions));
      }
      const rows = await db.select().from(tests).where(conditions.length > 0 ? and(...conditions) : void 0).limit(200);
      categoryCounts.tests = rows.length;
      for (const row of rows) {
        allItems.push({
          id: row.id,
          type: "test",
          title: row.title,
          subtitle: `${row.subject} \u2022 ${row.category} \u2022 ${row.totalQuestions} Questions \u2022 ${row.durationMinutes} Mins`,
          description: row.description || void 0,
          subject: row.subject,
          classLevel: row.classLevel || void 0,
          board: row.board || void 0,
          chapter: row.chapter || void 0,
          status: row.status || "Published",
          badge: "Online Test",
          meta: {
            durationMinutes: row.durationMinutes,
            totalQuestions: row.totalQuestions,
            totalMarks: row.totalMarks,
            negativeMarking: row.negativeMarking
          }
        });
      }
    } catch (err) {
      console.error("Error searching tests:", err);
    }
  }
  const shouldSearchPastPapers = searchType === "all" || searchType === "past_papers";
  if (shouldSearchPastPapers) {
    try {
      const conditions = [];
      if (allowedStatus !== "All") {
        conditions.push(eq2(pastPapers.status, allowedStatus));
      }
      if (filters.board && filters.board !== "All") {
        conditions.push(ilike(pastPapers.board, `%${escapeIlike(filters.board)}%`));
      }
      if (filters.classLevel && filters.classLevel !== "All") {
        conditions.push(ilike(pastPapers.classLevel, `%${escapeIlike(filters.classLevel)}%`));
      }
      if (filters.subject && filters.subject !== "All") {
        conditions.push(ilike(pastPapers.subject, `%${escapeIlike(filters.subject)}%`));
      }
      if (filters.chapter && filters.chapter !== "All") {
        conditions.push(ilike(pastPapers.chapter, `%${escapeIlike(filters.chapter)}%`));
      }
      if (filters.year) {
        conditions.push(eq2(pastPapers.year, filters.year));
      }
      if (queryStr) {
        const textConditions = tokens.map(
          (tok) => or(
            ilike(pastPapers.title, `%${escapeIlike(tok)}%`),
            ilike(pastPapers.board, `%${escapeIlike(tok)}%`),
            ilike(pastPapers.subject, `%${escapeIlike(tok)}%`),
            ilike(pastPapers.description, `%${escapeIlike(tok)}%`)
          )
        );
        conditions.push(and(...textConditions));
      }
      const rows = await db.select().from(pastPapers).where(conditions.length > 0 ? and(...conditions) : void 0).limit(200);
      categoryCounts.past_papers = rows.length;
      for (const row of rows) {
        allItems.push({
          id: row.id,
          type: "past_paper",
          title: row.title,
          subtitle: `${row.board} \u2022 ${row.classLevel} \u2022 ${row.subject} \u2022 ${row.year}`,
          description: row.description || void 0,
          subject: row.subject,
          classLevel: row.classLevel,
          board: row.board,
          chapter: row.chapter || void 0,
          topic: row.topic || void 0,
          year: row.year,
          status: row.status || "Published",
          badge: "Past Paper",
          url: row.brandedFileUrl || row.downloadUrl || row.fileUrl || void 0,
          meta: {
            paperGroup: row.paperGroup,
            type: row.type,
            downloadsCount: row.downloadsCount
          }
        });
      }
    } catch (err) {
      console.error("Error searching past papers:", err);
    }
  }
  const shouldSearchStudyNotes = searchType === "all" || searchType === "study_notes";
  if (shouldSearchStudyNotes) {
    try {
      const conditions = [];
      if (allowedStatus !== "All") {
        conditions.push(eq2(studyNotes.status, allowedStatus));
      }
      if (filters.board && filters.board !== "All") {
        conditions.push(ilike(studyNotes.board, `%${escapeIlike(filters.board)}%`));
      }
      if (filters.classLevel && filters.classLevel !== "All") {
        conditions.push(ilike(studyNotes.classLevel, `%${escapeIlike(filters.classLevel)}%`));
      }
      if (filters.subject && filters.subject !== "All") {
        conditions.push(ilike(studyNotes.subject, `%${escapeIlike(filters.subject)}%`));
      }
      if (filters.chapter && filters.chapter !== "All") {
        conditions.push(ilike(studyNotes.chapter, `%${escapeIlike(filters.chapter)}%`));
      }
      if (queryStr) {
        const textConditions = tokens.map(
          (tok) => or(
            ilike(studyNotes.title, `%${escapeIlike(tok)}%`),
            ilike(studyNotes.subject, `%${escapeIlike(tok)}%`),
            ilike(studyNotes.chapter, `%${escapeIlike(tok)}%`),
            ilike(studyNotes.description, `%${escapeIlike(tok)}%`),
            ilike(studyNotes.contentSnippet, `%${escapeIlike(tok)}%`)
          )
        );
        conditions.push(and(...textConditions));
      }
      const rows = await db.select().from(studyNotes).where(conditions.length > 0 ? and(...conditions) : void 0).limit(200);
      categoryCounts.study_notes = rows.length;
      for (const row of rows) {
        allItems.push({
          id: row.id,
          type: "study_note",
          title: row.title,
          subtitle: `${row.subject} \u2022 ${row.classLevel} \u2022 ${row.chapter}${row.topic ? " - " + row.topic : ""}`,
          description: row.description || row.contentSnippet || void 0,
          subject: row.subject,
          classLevel: row.classLevel,
          board: row.board || void 0,
          chapter: row.chapter,
          topic: row.topic || void 0,
          status: row.status || "Published",
          badge: "Study Note",
          url: row.brandedFileUrl || row.pdfUrl || void 0,
          meta: {
            readTime: row.readTime,
            downloadsCount: row.downloadsCount
          }
        });
      }
    } catch (err) {
      console.error("Error searching study notes:", err);
    }
  }
  const shouldSearchDocuments = searchType === "all" || searchType === "documents";
  if (shouldSearchDocuments) {
    try {
      const conditions = [];
      if (allowedStatus !== "All") {
        conditions.push(eq2(documents.status, allowedStatus));
      }
      if (filters.board && filters.board !== "All") {
        conditions.push(ilike(documents.board, `%${escapeIlike(filters.board)}%`));
      }
      if (filters.classLevel && filters.classLevel !== "All") {
        conditions.push(ilike(documents.classLevel, `%${escapeIlike(filters.classLevel)}%`));
      }
      if (filters.subject && filters.subject !== "All") {
        conditions.push(ilike(documents.subject, `%${escapeIlike(filters.subject)}%`));
      }
      if (filters.chapter && filters.chapter !== "All") {
        conditions.push(ilike(documents.chapter, `%${escapeIlike(filters.chapter)}%`));
      }
      if (filters.year) {
        conditions.push(eq2(documents.year, filters.year));
      }
      if (queryStr) {
        const textConditions = tokens.map(
          (tok) => or(
            ilike(documents.title, `%${escapeIlike(tok)}%`),
            ilike(documents.originalFilename, `%${escapeIlike(tok)}%`),
            ilike(documents.subject, `%${escapeIlike(tok)}%`),
            ilike(documents.documentType, `%${escapeIlike(tok)}%`)
          )
        );
        conditions.push(and(...textConditions));
      }
      const rows = await db.select().from(documents).where(conditions.length > 0 ? and(...conditions) : void 0).limit(200);
      categoryCounts.documents = rows.length;
      for (const row of rows) {
        allItems.push({
          id: row.id,
          type: "document",
          title: row.title,
          subtitle: `${row.documentType} \u2022 ${row.subject || "Academic"} \u2022 ${row.classLevel || ""}`,
          description: row.originalFilename,
          subject: row.subject || void 0,
          classLevel: row.classLevel || void 0,
          board: row.board || void 0,
          chapter: row.chapter || void 0,
          year: row.year || void 0,
          status: row.status || "Published",
          badge: row.documentType,
          url: `/api/documents/${row.id}/download`,
          meta: {
            fileSize: row.fileSize,
            mimeType: row.mimeType,
            downloadsCount: row.downloadsCount
          }
        });
      }
    } catch (err) {
      console.error("Error searching documents:", err);
    }
  }
  const shouldSearchCurriculum = searchType === "all" || searchType === "curriculum" || searchType === "boards" || searchType === "classes" || searchType === "subjects" || searchType === "chapters";
  if (shouldSearchCurriculum && queryStr) {
    try {
      let currCount = 0;
      if (searchType === "all" || searchType === "curriculum" || searchType === "boards") {
        const boardRows = await db.select().from(boards).where(ilike(boards.name, `%${escapeIlike(queryStr)}%`)).limit(20);
        for (const b of boardRows) {
          currCount++;
          allItems.push({
            id: `board-${b.id}`,
            type: "board",
            title: b.name,
            subtitle: "Education Examination Board \u2022 Pakistan",
            status: b.status === "Active" ? "Published" : "Draft",
            badge: "Board",
            meta: { boardId: b.id }
          });
        }
      }
      if (searchType === "all" || searchType === "curriculum" || searchType === "classes") {
        const classRows = await db.select().from(classes).where(ilike(classes.name, `%${escapeIlike(queryStr)}%`)).limit(20);
        for (const c of classRows) {
          currCount++;
          allItems.push({
            id: `class-${c.id}`,
            type: "class",
            title: c.name,
            subtitle: "Academic Grade / Level",
            status: c.status === "Active" ? "Published" : "Draft",
            badge: "Class",
            meta: { classId: c.id, boardId: c.boardId }
          });
        }
      }
      if (searchType === "all" || searchType === "curriculum" || searchType === "subjects") {
        const subjectRows = await db.select().from(subjects).where(ilike(subjects.name, `%${escapeIlike(queryStr)}%`)).limit(20);
        for (const s of subjectRows) {
          currCount++;
          allItems.push({
            id: `subject-${s.id}`,
            type: "subject",
            title: s.name,
            subtitle: "Curriculum Subject",
            status: s.status === "Active" ? "Published" : "Draft",
            badge: "Subject",
            meta: { subjectId: s.id, classId: s.classId }
          });
        }
      }
      if (searchType === "all" || searchType === "curriculum" || searchType === "chapters") {
        const chapterRows = await db.select().from(chapters).where(ilike(chapters.name, `%${escapeIlike(queryStr)}%`)).limit(20);
        for (const ch of chapterRows) {
          currCount++;
          allItems.push({
            id: `chapter-${ch.id}`,
            type: "chapter",
            title: ch.name,
            subtitle: "Subject Chapter / Topic",
            status: ch.status === "Active" && ch.draftStatus === "Published" ? "Published" : "Draft",
            badge: "Chapter",
            meta: { chapterId: ch.id, subjectId: ch.subjectId }
          });
        }
      }
      categoryCounts.curriculum = currCount;
    } catch (err) {
      console.error("Error searching curriculum hierarchy:", err);
    }
  }
  if (queryStr) {
    const qLower = queryStr.toLowerCase();
    for (const item of allItems) {
      let score = 0;
      const titleLower = item.title.toLowerCase();
      if (titleLower === qLower) {
        score += 100;
      } else if (titleLower.startsWith(qLower)) {
        score += 60;
      } else if (titleLower.includes(qLower)) {
        score += 40;
      }
      for (const tok of tokens) {
        if (titleLower.includes(tok)) score += 15;
        if (item.subject && item.subject.toLowerCase().includes(tok)) score += 12;
        if (item.classLevel && item.classLevel.toLowerCase().includes(tok)) score += 10;
        if (item.board && item.board.toLowerCase().includes(tok)) score += 8;
        if (item.chapter && item.chapter.toLowerCase().includes(tok)) score += 6;
        if (item.description && item.description.toLowerCase().includes(tok)) score += 4;
      }
      item.score = score;
    }
    allItems.sort((a, b) => (b.score || 0) - (a.score || 0));
  } else {
    allItems.sort((a, b) => (b.year || 0) - (a.year || 0));
  }
  const total = allItems.length;
  categoryCounts.all = total;
  const paginated = allItems.slice(offset, offset + limit);
  const totalPages = Math.ceil(total / limit);
  let suggestions = [];
  if (total === 0 && queryStr) {
    suggestions = generateSearchSuggestions(queryStr);
  }
  return {
    results: paginated,
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
    countsByCategory: categoryCounts,
    suggestions,
    query: queryStr,
    appliedFilters: {
      type: filters.type,
      board: filters.board,
      classLevel: filters.classLevel,
      subject: filters.subject,
      chapter: filters.chapter,
      year: filters.year,
      status: allowedStatus
    }
  };
}
async function getQuickSearchSuggestions(query, isStaff = false) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed || trimmed.length < 2) return [];
  const response = await executeUnifiedSearch(
    { query: trimmed, limit: 8, type: "all" },
    isStaff
  );
  return response.results.slice(0, 8).map((item) => ({
    text: item.title,
    category: item.badge || item.type,
    type: item.type,
    id: item.id,
    url: item.url
  }));
}
async function getDynamicSearchFilters() {
  const filterSets = {
    boards: /* @__PURE__ */ new Set(),
    classes: /* @__PURE__ */ new Set(),
    subjects: /* @__PURE__ */ new Set(),
    chapters: /* @__PURE__ */ new Set(),
    years: /* @__PURE__ */ new Set()
  };
  if (!db) {
    return {
      boards: [],
      classes: [],
      subjects: [],
      chapters: [],
      years: [],
      contentTypes: getDefaultContentTypes()
    };
  }
  try {
    const bRows = await db.select({ name: boards.name }).from(boards).where(eq2(boards.status, "Active"));
    bRows.forEach((r) => r.name && filterSets.boards.add(r.name));
    const cRows = await db.select({ name: classes.name }).from(classes).where(eq2(classes.status, "Active"));
    cRows.forEach((r) => r.name && filterSets.classes.add(r.name));
    const sRows = await db.select({ name: subjects.name }).from(subjects).where(eq2(subjects.status, "Active"));
    sRows.forEach((r) => r.name && filterSets.subjects.add(r.name));
    const chRows = await db.select({ name: chapters.name }).from(chapters).where(eq2(chapters.status, "Active"));
    chRows.forEach((r) => r.name && filterSets.chapters.add(r.name));
    const pYears = await db.select({ year: pastPapers.year }).from(pastPapers).where(sql2`${pastPapers.year} IS NOT NULL`);
    pYears.forEach((r) => r.year && filterSets.years.add(r.year));
    const dYears = await db.select({ year: documents.year }).from(documents).where(sql2`${documents.year} IS NOT NULL`);
    dYears.forEach((r) => r.year && filterSets.years.add(r.year));
  } catch (err) {
    console.error("Error fetching dynamic search filters:", err);
  }
  return {
    boards: Array.from(filterSets.boards).sort(),
    classes: Array.from(filterSets.classes).sort(),
    subjects: Array.from(filterSets.subjects).sort(),
    chapters: Array.from(filterSets.chapters).sort(),
    years: Array.from(filterSets.years).sort((a, b) => b - a),
    contentTypes: getDefaultContentTypes()
  };
}
function getDefaultContentTypes() {
  return [
    { id: "all", label: "All Content" },
    { id: "mcqs", label: "MCQs & Question Bank" },
    { id: "tests", label: "Online Tests & Quizzes" },
    { id: "past_papers", label: "Past Papers" },
    { id: "study_notes", label: "Study Notes & Summaries" },
    { id: "documents", label: "PDF Documents & Syllabi" },
    { id: "curriculum", label: "Boards, Classes & Subjects" }
  ];
}
function generateSearchSuggestions(query) {
  const commonAcademicTopics = [
    "Physics Class 9",
    "Physics Class 10",
    "Mathematics FSc Part 1",
    "Biology MCQs Class 10",
    "Chemistry Past Papers",
    "English Grammar Notes",
    "Computer Science Matric",
    "BISE Lahore Past Papers",
    "Federal Board SSC",
    "MDCAT Biology Preparation",
    "ECAT Mathematics Practice"
  ];
  const qLower = query.toLowerCase();
  const matched = commonAcademicTopics.filter(
    (topic) => topic.toLowerCase().split(" ").some((word) => qLower.includes(word) || word.toLowerCase().includes(qLower))
  );
  return matched.length > 0 ? matched.slice(0, 4) : commonAcademicTopics.slice(0, 4);
}

// src/db/analytics.ts
import { sql as sql3, eq as eq3, and as and2, gte, lte, count, desc as desc3, inArray } from "drizzle-orm";
function getDateCondition(column, filter) {
  if (!filter || !filter.range || filter.range === "all") {
    return void 0;
  }
  const now = /* @__PURE__ */ new Date();
  let start = /* @__PURE__ */ new Date();
  if (filter.range === "today") {
    start.setHours(0, 0, 0, 0);
    return gte(column, start);
  } else if (filter.range === "7days") {
    start.setDate(now.getDate() - 7);
    return gte(column, start);
  } else if (filter.range === "30days") {
    start.setDate(now.getDate() - 30);
    return gte(column, start);
  } else if (filter.range === "custom" && filter.startDate && filter.endDate) {
    const customStart = new Date(filter.startDate);
    const customEnd = new Date(filter.endDate);
    customEnd.setHours(23, 59, 59, 999);
    return and2(gte(column, customStart), lte(column, customEnd));
  }
  return void 0;
}
async function getAdminAnalytics(filter) {
  const dateCondUsers = getDateCondition(users.createdAt, filter);
  const dateCondResults = getDateCondition(testResults.createdAt, filter);
  const dateCondAttempts = getDateCondition(examAttempts.createdAt, filter);
  const dateCondDownloads = getDateCondition(documentDownloadEvents.downloadedAt, filter);
  const totalUsersQuery = dateCondUsers ? db.select({ count: count() }).from(users).where(dateCondUsers) : db.select({ count: count() }).from(users);
  const activeUsersQuery = db.select({ count: sql3`count(DISTINCT ${testResults.userUid})` }).from(testResults).where(dateCondResults);
  const testsStartedQuery = dateCondAttempts ? db.select({ count: count() }).from(examAttempts).where(dateCondAttempts) : db.select({ count: count() }).from(examAttempts);
  const testsCompletedQuery = dateCondResults ? db.select({ count: count() }).from(testResults).where(dateCondResults) : db.select({ count: count() }).from(testResults);
  const resultsQuery = dateCondResults ? db.select({ percentage: testResults.percentage, passed: sql3`${testResults.percentage} >= 50` }).from(testResults).where(dateCondResults) : db.select({ percentage: testResults.percentage, passed: sql3`${testResults.percentage} >= 50` }).from(testResults);
  const downloadsQuery = dateCondDownloads ? db.select({ count: count() }).from(documentDownloadEvents).where(dateCondDownloads) : db.select({ count: count() }).from(documentDownloadEvents);
  const mcqsCountQuery = db.select({ count: count() }).from(mcqs);
  const testsCountQuery = db.select({ count: count() }).from(tests);
  const pastPapersCountQuery = db.select({ count: count() }).from(pastPapers);
  const notesCountQuery = db.select({ count: count() }).from(studyNotes);
  const popularSubjectsQuery = db.select({
    subject: testResults.subject,
    count: count()
  }).from(testResults).groupBy(testResults.subject).orderBy(desc3(count())).limit(5);
  const contributionsQuery = db.select({
    author: tests.createdBy,
    count: count()
  }).from(tests).where(sql3`${tests.createdBy} IS NOT NULL`).groupBy(tests.createdBy).orderBy(desc3(count())).limit(5);
  const [
    totalUsersRes,
    activeUsersRes,
    testsStartedRes,
    testsCompletedRes,
    resultsRes,
    downloadsRes,
    mcqsRes,
    testsRes,
    pastPapersRes,
    notesRes,
    popularSubjectsRes,
    contributionsRes
  ] = await Promise.all([
    totalUsersQuery,
    activeUsersQuery,
    testsStartedQuery,
    testsCompletedQuery,
    resultsQuery,
    downloadsQuery,
    mcqsCountQuery,
    testsCountQuery,
    pastPapersCountQuery,
    notesCountQuery,
    popularSubjectsQuery,
    contributionsQuery
  ]);
  const totalUsers = Number(totalUsersRes[0]?.count || 0);
  const activeUsers = Number(activeUsersRes[0]?.count || 0);
  const testsStarted = Number(testsStartedRes[0]?.count || 0);
  const testsCompleted = Number(testsCompletedRes[0]?.count || 0);
  const totalDownloads = Number(downloadsRes[0]?.count || 0);
  const totalScores = resultsRes.reduce((acc, r) => acc + (r.percentage || 0), 0);
  const averageScore = resultsRes.length > 0 ? Math.round(totalScores / resultsRes.length) : 0;
  const passCount = resultsRes.filter((r) => r.percentage >= 50).length;
  const passRate = resultsRes.length > 0 ? Math.round(passCount / resultsRes.length * 100) : 0;
  return {
    role: "admin",
    totalUsers,
    activeUsers,
    testsStarted,
    testsCompleted,
    totalAttempts: testsStarted,
    averageScore,
    passRate,
    totalDownloads,
    contentStats: {
      mcqs: Number(mcqsRes[0]?.count || 0),
      tests: Number(testsRes[0]?.count || 0),
      pastPapers: Number(pastPapersRes[0]?.count || 0),
      studyNotes: Number(notesRes[0]?.count || 0)
    },
    popularSubjects: popularSubjectsRes.map((s) => ({ subject: s.subject, attempts: Number(s.count) })),
    teacherContributions: contributionsRes.map((c) => ({ author: c.author || "System", testsAuthored: Number(c.count) }))
  };
}
async function getTeacherAnalytics(teacherUid, filter) {
  const assignments = await db.select().from(staffAssignments).where(eq3(staffAssignments.userUid, teacherUid));
  const subjectsTaught = assignments.map((a) => a.subject).filter((s) => s !== "All");
  const dateCondResults = getDateCondition(testResults.createdAt, filter);
  const dateCondAttempts = getDateCondition(examAttempts.createdAt, filter);
  const authoredTests = await db.select({ id: tests.id }).from(tests).where(eq3(tests.createdBy, teacherUid));
  const authTestIds = authoredTests.map((t) => t.id);
  if (authTestIds.length === 0) {
    return {
      role: "teacher",
      teacherUid,
      authoredTestsCount: 0,
      testsStarted: 0,
      testsCompleted: 0,
      averageScore: 0,
      passRate: 0,
      cohortSubmissions: 0
    };
  }
  const results = await db.select().from(testResults).where(dateCondResults ? and2(dateCondResults, inArray(testResults.testId, authTestIds)) : inArray(testResults.testId, authTestIds));
  const totalSubmissions = results.length;
  const totalScores = results.reduce((acc, r) => acc + (r.percentage || 0), 0);
  const averageScore = totalSubmissions > 0 ? Math.round(totalScores / totalSubmissions) : 0;
  const passCount = results.filter((r) => r.percentage >= 50).length;
  const passRate = totalSubmissions > 0 ? Math.round(passCount / totalSubmissions * 100) : 0;
  const attempts = await db.select({ count: count() }).from(examAttempts).where(dateCondAttempts ? and2(dateCondAttempts, inArray(examAttempts.testId, authTestIds)) : inArray(examAttempts.testId, authTestIds));
  return {
    role: "teacher",
    teacherUid,
    authoredTestsCount: authTestIds.length,
    testsStarted: Number(attempts[0]?.count || 0),
    testsCompleted: totalSubmissions,
    averageScore,
    passRate,
    cohortSubmissions: totalSubmissions
  };
}
async function getStudentAnalytics(studentUid, filter) {
  const dateCondResults = getDateCondition(testResults.createdAt, filter);
  const dateCondAttempts = getDateCondition(examAttempts.createdAt, filter);
  const results = await db.select().from(testResults).where(dateCondResults ? and2(eq3(testResults.userUid, studentUid), dateCondResults) : eq3(testResults.userUid, studentUid)).orderBy(desc3(testResults.createdAt));
  const attempts = await db.select({ count: count() }).from(examAttempts).where(dateCondAttempts ? and2(eq3(examAttempts.userUid, studentUid), dateCondAttempts) : eq3(examAttempts.userUid, studentUid));
  const totalTestsTaken = results.length;
  const totalScores = results.reduce((acc, r) => acc + (r.percentage || 0), 0);
  const averageScore = totalTestsTaken > 0 ? Math.round(totalScores / totalTestsTaken) : 0;
  const passCount = results.filter((r) => r.percentage >= 50).length;
  const passRate = totalTestsTaken > 0 ? Math.round(passCount / totalTestsTaken * 100) : 0;
  return {
    role: "student",
    studentUid,
    testsStarted: Number(attempts[0]?.count || 0),
    testsCompleted: totalTestsTaken,
    averageScore,
    passRate,
    recentResults: results.slice(0, 10).map((r) => ({
      testTitle: r.testTitle,
      subject: r.subject,
      score: r.marksObtained,
      totalMarks: r.totalMarks,
      percentage: r.percentage,
      grade: r.grade,
      createdAt: r.createdAt
    }))
  };
}

// src/db/notifications.ts
import { eq as eq4, or as or2, and as and3, desc as desc4, count as count2, sql as sql4 } from "drizzle-orm";
async function createNotification(params) {
  const thirtySecondsAgo = new Date(Date.now() - 3e4);
  const recent = await db.select().from(auditLogs).where(
    and3(
      eq4(auditLogs.targetType, "NOTIFICATION"),
      eq4(auditLogs.adminUid, params.recipientUid),
      eq4(auditLogs.action, params.title),
      eq4(auditLogs.details, params.message),
      sql4`${auditLogs.createdAt} >= ${thirtySecondsAgo}`
    )
  );
  if (recent.length > 0) {
    const r = recent[0];
    return {
      notificationId: r.targetId || `notif-${r.id}`,
      recipientUid: r.adminUid,
      title: r.action,
      message: r.details || "",
      category: r.subject || "System",
      isRead: r.classLevel === "READ",
      actionUrl: r.board,
      senderUid: r.ipAddress,
      senderName: r.adminName,
      createdAt: r.createdAt
    };
  }
  const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const [inserted] = await db.insert(auditLogs).values({
    adminUid: params.recipientUid,
    adminEmail: "system@taleemguru.pk",
    adminName: params.senderName || "System",
    action: params.title,
    targetType: "NOTIFICATION",
    targetId: notificationId,
    details: params.message,
    board: params.actionUrl || "",
    classLevel: "UNREAD",
    subject: params.category || "System",
    ipAddress: params.senderUid || "system"
  }).returning();
  return {
    notificationId: inserted.targetId || notificationId,
    recipientUid: inserted.adminUid,
    title: inserted.action,
    message: inserted.details || "",
    category: inserted.subject || "System",
    isRead: false,
    actionUrl: inserted.board,
    senderUid: inserted.ipAddress,
    senderName: inserted.adminName,
    createdAt: inserted.createdAt
  };
}
async function getNotificationsForUser(userUid) {
  const rows = await db.select().from(auditLogs).where(
    and3(
      eq4(auditLogs.targetType, "NOTIFICATION"),
      or2(eq4(auditLogs.adminUid, userUid), eq4(auditLogs.adminUid, "ALL"))
    )
  ).orderBy(desc4(auditLogs.createdAt)).limit(100);
  return rows.map((r) => ({
    notificationId: r.targetId || `notif-${r.id}`,
    recipientUid: r.adminUid,
    title: r.action,
    message: r.details || "",
    category: r.subject || "System",
    isRead: r.classLevel === "READ",
    actionUrl: r.board,
    senderUid: r.ipAddress,
    senderName: r.adminName,
    createdAt: r.createdAt
  }));
}
async function markNotificationRead(notificationId, userUid) {
  const rows = await db.select().from(auditLogs).where(
    and3(
      eq4(auditLogs.targetType, "NOTIFICATION"),
      eq4(auditLogs.targetId, notificationId)
    )
  );
  if (rows.length === 0) {
    throw new Error("Notification not found");
  }
  const target = rows[0];
  if (target.adminUid !== userUid && target.adminUid !== "ALL") {
    throw new Error("Unauthorized: Cannot modify notification for another user");
  }
  const [updated] = await db.update(auditLogs).set({ classLevel: "READ" }).where(eq4(auditLogs.id, target.id)).returning();
  return {
    notificationId: updated.targetId || notificationId,
    recipientUid: updated.adminUid,
    title: updated.action,
    message: updated.details || "",
    category: updated.subject || "System",
    isRead: true,
    actionUrl: updated.board,
    senderUid: updated.ipAddress,
    senderName: updated.adminName,
    createdAt: updated.createdAt
  };
}
async function markAllNotificationsRead(userUid) {
  await db.update(auditLogs).set({ classLevel: "READ" }).where(
    and3(
      eq4(auditLogs.targetType, "NOTIFICATION"),
      or2(eq4(auditLogs.adminUid, userUid), eq4(auditLogs.adminUid, "ALL"))
    )
  );
  return { success: true };
}
async function getUnreadNotificationCount(userUid) {
  const rows = await db.select({ count: count2() }).from(auditLogs).where(
    and3(
      eq4(auditLogs.targetType, "NOTIFICATION"),
      or2(eq4(auditLogs.adminUid, userUid), eq4(auditLogs.adminUid, "ALL")),
      eq4(auditLogs.classLevel, "UNREAD")
    )
  );
  return Number(rows[0]?.count || 0);
}

// src/db/integrityBackup.ts
import { sql as sql5 } from "drizzle-orm";
async function runDatabaseIntegrityCheck() {
  const issues = [];
  const uCount = await db.execute(sql5`SELECT COUNT(*) FROM users`);
  const tCount = await db.execute(sql5`SELECT COUNT(*) FROM tests`);
  const mCount = await db.execute(sql5`SELECT COUNT(*) FROM mcqs`);
  const pCount = await db.execute(sql5`SELECT COUNT(*) FROM past_papers`);
  const sCount = await db.execute(sql5`SELECT COUNT(*) FROM study_notes`);
  const dCount = await db.execute(sql5`SELECT COUNT(*) FROM documents`);
  const aCount = await db.execute(sql5`SELECT COUNT(*) FROM audit_logs`);
  const totalUsers = Number(uCount.rows?.[0]?.count || 0);
  const totalTests = Number(tCount.rows?.[0]?.count || 0);
  const totalMcqs = Number(mCount.rows?.[0]?.count || 0);
  const totalPastPapers = Number(pCount.rows?.[0]?.count || 0);
  const totalStudyNotes = Number(sCount.rows?.[0]?.count || 0);
  const totalDocuments = Number(dCount.rows?.[0]?.count || 0);
  const totalAuditLogs = Number(aCount.rows?.[0]?.count || 0);
  let orphanTestQuestions = 0;
  try {
    const res = await db.execute(
      sql5`SELECT tq.id FROM test_questions tq LEFT JOIN tests t ON tq.test_id = t.id WHERE t.id IS NULL`
    );
    orphanTestQuestions = res.rowCount || res.rows?.length || 0;
  } catch {
  }
  if (orphanTestQuestions > 0) {
    issues.push(`Found ${orphanTestQuestions} test question(s) referencing non-existent tests.`);
  }
  let orphanTestResults = 0;
  try {
    const res = await db.execute(
      sql5`SELECT tr.id FROM test_results tr LEFT JOIN users u ON tr.user_uid = u.uid WHERE u.uid IS NULL`
    );
    orphanTestResults = res.rowCount || res.rows?.length || 0;
  } catch {
  }
  if (orphanTestResults > 0) {
    issues.push(`Found ${orphanTestResults} test result(s) referencing non-existent users.`);
  }
  let orphanDocumentVersions = 0;
  try {
    const res = await db.execute(
      sql5`SELECT dv.id FROM document_versions dv LEFT JOIN documents d ON dv.document_id = d.id WHERE d.id IS NULL`
    );
    orphanDocumentVersions = res.rowCount || res.rows?.length || 0;
  } catch {
  }
  if (orphanDocumentVersions > 0) {
    issues.push(`Found ${orphanDocumentVersions} document version(s) referencing non-existent documents.`);
  }
  let invalidDocumentHashes = 0;
  try {
    const res = await db.execute(
      sql5`SELECT id FROM documents WHERE original_file_hash IS NULL OR original_file_hash = ''`
    );
    invalidDocumentHashes = res.rowCount || res.rows?.length || 0;
  } catch {
  }
  if (invalidDocumentHashes > 0) {
    issues.push(`Found ${invalidDocumentHashes} document(s) with missing or invalid file hashes.`);
  }
  let examConsistencyErrors = 0;
  try {
    const res = await db.execute(
      sql5`SELECT id FROM test_results WHERE correct_count < 0 OR correct_count > total_questions`
    );
    examConsistencyErrors = res.rowCount || res.rows?.length || 0;
  } catch {
  }
  if (examConsistencyErrors > 0) {
    issues.push(`Found ${examConsistencyErrors} exam result(s) with inconsistent correct count vs total questions.`);
  }
  const auditLogAnomalyCount = 0;
  const totalIssues = orphanTestQuestions + orphanTestResults + orphanDocumentVersions + invalidDocumentHashes + examConsistencyErrors;
  const status = totalIssues === 0 ? "HEALTHY" : totalIssues < 5 ? "WARNING" : "CRITICAL";
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status,
    summary: {
      totalUsers,
      totalTests,
      totalMcqs,
      totalPastPapers,
      totalStudyNotes,
      totalDocuments,
      totalAuditLogs
    },
    checks: {
      orphanTestQuestions,
      orphanTestResults,
      orphanDocumentVersions,
      invalidDocumentHashes,
      examConsistencyErrors,
      auditLogAnomalyCount
    },
    issues
  };
}
async function generateSystemBackupExport() {
  const integrity = await runDatabaseIntegrityCheck();
  const allUsersRes = await db.execute(sql5`SELECT uid, email, name, roles, created_at FROM users LIMIT 500`);
  const allTestsRes = await db.execute(sql5`SELECT id, title, subject, board, status FROM tests LIMIT 500`);
  const allDocsRes = await db.execute(sql5`SELECT id, title, document_type, original_file_hash FROM documents LIMIT 500`);
  const allUsers = allUsersRes.rows || [];
  const allTests = allTestsRes.rows || [];
  const allDocuments = allDocsRes.rows || [];
  return {
    version: "1.0",
    exportTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
    integrityReport: integrity,
    metadata: {
      usersSampleCount: allUsers.length,
      testsSampleCount: allTests.length,
      documentsSampleCount: allDocuments.length
    },
    data: {
      users: allUsers,
      tests: allTests,
      documents: allDocuments
    }
  };
}

// src/server/productionReliability.ts
import { sql as sql6 } from "drizzle-orm";
var startTime = Date.now();
function validateEnvironmentVariables() {
  const missing = [];
  const warnings = [];
  const dbConfigured = Boolean(
    process.env.SQL_HOST || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_HOST && process.env.POSTGRES_HOST !== "localhost" && process.env.POSTGRES_HOST !== "127.0.0.1" || process.env.PGHOST && process.env.PGHOST !== "localhost" && process.env.PGHOST !== "127.0.0.1"
  );
  if (!dbConfigured) {
    missing.push("DATABASE_URL or POSTGRES_URL or SQL_HOST");
  }
  if (!process.env.VITE_SUPABASE_URL && !process.env.SUPABASE_URL) {
    warnings.push("SUPABASE_URL / VITE_SUPABASE_URL not explicitly set (using fallback auth configuration)");
  }
  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}
async function checkDatabaseHealth() {
  const start = performance.now();
  if (!db) {
    return { connected: false, latencyMs: 0, error: "Database instance not initialized" };
  }
  try {
    await db.execute(sql6`SELECT 1`);
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    return { connected: true, latencyMs };
  } catch (err) {
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    const rawCause = err?.cause?.message ? String(err.cause.message) : err?.message ? String(err.message) : "Database connection error";
    const safeError = rawCause.replace(/postgresql:\/\/[^@]+@/gi, "postgresql://***@").replace(/postgres:\/\/[^@]+@/gi, "postgres://***@");
    return { connected: false, latencyMs, error: safeError };
  }
}
async function getSystemHealthReport() {
  const dbHealth = await checkDatabaseHealth();
  const envCheck = validateEnvironmentVariables();
  const isHealthy = dbHealth.connected;
  return {
    status: isHealthy ? "healthy" : "degraded",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1e3),
    database: dbHealth,
    environment: {
      nodeEnv: process.env.NODE_ENV || "development",
      databaseConfigured: envCheck.valid,
      authConfigured: true
    }
  };
}

// src/db/content.ts
import { eq as eq6, desc as desc6, and as and5, sql as sql8, ilike as ilike2, inArray as inArray3 } from "drizzle-orm";

// src/db/users.ts
import crypto3 from "crypto";
import { eq as eq5, desc as desc5, and as and4, sql as sql7, inArray as inArray2 } from "drizzle-orm";
var DEFAULT_BOOTSTRAP_ADMINS = {
  "admin@taleemguru.pk": { name: "Admin", roles: ["Admin"] }
};
function getTrustedBootstrapAdmins() {
  const configs = { ...DEFAULT_BOOTSTRAP_ADMINS };
  const envCandidates = [
    process.env.TRUSTED_BOOTSTRAP_ADMINS,
    process.env.ADMIN_EMAILS,
    process.env.ADMIN_EMAIL,
    process.env.BOOTSTRAP_ADMIN_EMAILS,
    process.env.BOOTSTRAP_ADMIN
  ].filter(Boolean);
  for (const envRaw of envCandidates) {
    try {
      let trimmed = envRaw.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"') || trimmed.startsWith("'") && trimmed.endsWith("'")) {
        trimmed = trimmed.slice(1, -1).trim();
      }
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        const parsed = JSON.parse(trimmed);
        for (const [key, val] of Object.entries(parsed)) {
          const email = key.trim().toLowerCase().replace(/^["']|["']$/g, "");
          if (email && email.includes("@")) {
            if (typeof val === "string") {
              configs[email] = { name: val || "Admin", roles: ["Admin"] };
            } else if (val && typeof val === "object") {
              configs[email] = {
                name: val.name || "Admin",
                roles: val.roles || val.role ? [val.roles || val.role] : ["Admin"]
              };
            }
          }
        }
      } else {
        const parts = trimmed.split(/[,;\s\n\r]+/);
        for (const p of parts) {
          const clean = p.trim().toLowerCase().replace(/^["']|["']$/g, "");
          if (clean && clean.includes("@")) {
            configs[clean] = { name: "Admin", roles: ["Admin"] };
          }
        }
      }
    } catch (err) {
      console.warn("Notice: Error parsing admin env variable candidate:", err);
    }
  }
  return configs;
}
function isTrustedBootstrapAdminEmail(email) {
  if (!email) return false;
  const clean = email.trim().toLowerCase().replace(/^["']|["']$/g, "");
  const admins = getTrustedBootstrapAdmins();
  return Boolean(admins[clean]);
}
var TRUSTED_BOOTSTRAP_ADMINS = new Proxy(
  DEFAULT_BOOTSTRAP_ADMINS,
  {
    get(target, prop) {
      const current = getTrustedBootstrapAdmins();
      const normalizedProp = typeof prop === "string" ? prop.trim().toLowerCase() : prop;
      return current[normalizedProp] || target[normalizedProp] || current[prop] || target[prop];
    },
    has(target, prop) {
      const current = getTrustedBootstrapAdmins();
      const normalizedProp = typeof prop === "string" ? prop.trim().toLowerCase() : prop;
      return normalizedProp in current || prop in current || normalizedProp in target || prop in target;
    },
    ownKeys() {
      return Object.keys(getTrustedBootstrapAdmins());
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop !== "string") return void 0;
      const current = getTrustedBootstrapAdmins();
      const normalizedProp = prop.trim().toLowerCase();
      const val = current[normalizedProp] || current[prop];
      if (val !== void 0) {
        return {
          enumerable: true,
          configurable: true,
          value: val
        };
      }
      return void 0;
    }
  }
);
var TRUSTED_BOOTSTRAP_ADMIN_EMAILS = new Proxy(new Set(Object.keys(DEFAULT_BOOTSTRAP_ADMINS)), {
  get(target, prop) {
    if (prop === "has") {
      return (val) => isTrustedBootstrapAdminEmail(val);
    }
    const currentSet = new Set(Object.keys(getTrustedBootstrapAdmins()).map((e) => e.toLowerCase()));
    return currentSet[prop];
  }
});
async function getUserByEmail(email) {
  if (!email) return null;
  try {
    const normalized = email.toLowerCase().trim();
    const records = await db.select().from(users).where(sql7`LOWER(TRIM(${users.email})) = ${normalized}`).limit(1);
    const user = records[0] || null;
    if (user) {
      const bootstrapConfig = TRUSTED_BOOTSTRAP_ADMINS[normalized];
      if (bootstrapConfig && (!bootstrapConfig.roles.every((r) => user.roles.includes(r)) || user.name !== bootstrapConfig.name)) {
        const [promoted] = await db.update(users).set({
          roles: bootstrapConfig.roles,
          name: bootstrapConfig.name,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq5(users.id, user.id)).returning();
        return promoted || { ...user, roles: bootstrapConfig.roles, name: bootstrapConfig.name };
      }
    }
    return user;
  } catch (error) {
    console.error("Failed to get user by email:", error);
    return null;
  }
}
async function syncBootstrapAdmins() {
  try {
    for (const [email, config] of Object.entries(TRUSTED_BOOTSTRAP_ADMINS)) {
      const normalized = email.toLowerCase().trim();
      const existing = await getUserByEmail(normalized);
      if (existing) {
        const existingRoles = existing.roles || [];
        if (!config.roles.every((r) => existingRoles.includes(r)) || existing.name !== config.name) {
          await db.update(users).set({
            roles: config.roles,
            name: config.name,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq5(users.id, existing.id));
          console.log(`[Bootstrap] Synchronized admin ${normalized}: roles=${config.roles.join(",")}, name=${config.name}`);
        }
      } else {
        try {
          await db.insert(users).values({
            uid: `bootstrap-admin-${normalized}`,
            email: normalized,
            name: config.name,
            roles: config.roles,
            targetExam: "MDCAT",
            classLevel: "Class 10",
            board: "Punjab",
            avatar: "avatar-1"
          }).onConflictDoNothing();
          console.log(`[Bootstrap] Pre-seeded bootstrap admin ${normalized} with roles=${config.roles.join(",")}`);
        } catch (insertErr) {
          console.warn(`[Bootstrap] Notice pre-seeding ${normalized}:`, insertErr);
        }
      }
    }
  } catch (err) {
    console.warn("[Bootstrap] Notice in syncBootstrapAdmins:", err);
  }
}
async function getOrCreateUser(uid, email, extra) {
  try {
    const normalizedEmail = (email || "").toLowerCase().trim();
    const bootstrapConfig = TRUSTED_BOOTSTRAP_ADMINS[normalizedEmail];
    const isBootstrapAdmin = Boolean(bootstrapConfig || isTrustedBootstrapAdminEmail(normalizedEmail));
    const designatedRoles = bootstrapConfig ? bootstrapConfig.roles : ["Student"];
    let existing = null;
    if (isBootstrapAdmin && normalizedEmail) {
      existing = await getUserByEmail(normalizedEmail);
    }
    if (!existing) {
      existing = await getUserByUid(uid);
    }
    if (!existing && normalizedEmail) {
      existing = await getUserByEmail(normalizedEmail);
    }
    if (existing) {
      const existingEmail = (existing.email || "").toLowerCase().trim();
      const isAccountBootstrapAdmin = isBootstrapAdmin || TRUSTED_BOOTSTRAP_ADMIN_EMAILS.has(existingEmail) || TRUSTED_BOOTSTRAP_ADMIN_EMAILS.has(normalizedEmail);
      const effectiveBootstrap = bootstrapConfig || TRUSTED_BOOTSTRAP_ADMINS[existingEmail] || TRUSTED_BOOTSTRAP_ADMINS[normalizedEmail];
      const shouldUpdateEmail = Boolean(normalizedEmail && existingEmail !== normalizedEmail);
      const rolesArray = Array.isArray(existing.roles) ? existing.roles : existing.role ? [existing.role] : ["Student"];
      const hasRequiredAdminRole = isAccountBootstrapAdmin && effectiveBootstrap ? effectiveBootstrap.roles.every((r) => rolesArray.some((er) => er.toLowerCase() === r.toLowerCase())) : true;
      const shouldPromoteAdmin = isAccountBootstrapAdmin && effectiveBootstrap && !hasRequiredAdminRole;
      const shouldEnforceAdminName = isAccountBootstrapAdmin && effectiveBootstrap && existing.name !== effectiveBootstrap.name;
      const shouldUpdateUid = existing.uid !== uid;
      if (shouldUpdateEmail || shouldPromoteAdmin || shouldEnforceAdminName || shouldUpdateUid) {
        const newRoles = shouldPromoteAdmin ? effectiveBootstrap.roles : rolesArray;
        const newName = shouldEnforceAdminName ? effectiveBootstrap.name : existing.name;
        try {
          const [updated] = await db.update(users).set({
            uid,
            ...shouldUpdateEmail ? { email: normalizedEmail } : {},
            ...shouldPromoteAdmin ? { roles: newRoles } : {},
            ...shouldEnforceAdminName ? { name: newName } : {},
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq5(users.id, existing.id)).returning();
          return updated || existing;
        } catch (updateErr) {
          console.warn("Notice updating user record:", updateErr);
          try {
            const [promoted] = await db.update(users).set({
              ...shouldPromoteAdmin ? { roles: newRoles } : {},
              ...shouldEnforceAdminName ? { name: newName } : {},
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq5(users.uid, uid)).returning();
            return promoted || existing;
          } catch (e2) {
            return existing;
          }
        }
      }
      return existing;
    }
    const finalRoles = isBootstrapAdmin ? bootstrapConfig?.roles || ["Admin"] : ["Student"];
    const initialName = isBootstrapAdmin ? bootstrapConfig?.name || "Admin" : extra?.name?.trim() || "Learner";
    const result = await db.insert(users).values({
      uid,
      email: normalizedEmail,
      name: initialName,
      roles: finalRoles,
      targetExam: extra?.targetExam || "MDCAT",
      classLevel: extra?.classLevel || "Class 10",
      board: extra?.board || "Punjab",
      avatar: extra?.avatar || "avatar-1"
    }).onConflictDoUpdate({
      target: users.uid,
      set: {
        email: normalizedEmail,
        ...isBootstrapAdmin ? { roles: finalRoles, name: initialName } : {},
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Failed in getOrCreateUser:", error);
    throw new Error("Failed to get or create user profile", { cause: error });
  }
}
function sanitizeUserForClient(user) {
  if (!user) return null;
  const clone = { ...user };
  delete clone.password;
  delete clone.passwordHash;
  delete clone.secret;
  if (Array.isArray(clone.permissions)) {
    clone.permissions = clone.permissions.filter((p) => typeof p === "string" && !p.startsWith("__auth_pwd:"));
  }
  return clone;
}
async function getAllUsersFromDb(limit = 150) {
  try {
    const rawUsers = await db.select({
      id: users.id,
      uid: users.uid,
      email: users.email,
      name: users.name,
      roles: users.roles,
      targetExam: users.targetExam,
      classLevel: users.classLevel,
      board: users.board,
      points: users.points,
      streakDays: users.streakDays,
      testsTaken: users.testsTaken,
      avatar: users.avatar,
      status: users.status,
      permissions: users.permissions,
      createdAt: users.createdAt
    }).from(users).orderBy(desc5(users.createdAt)).limit(limit);
    if (rawUsers.length === 0) return [];
    const uids = rawUsers.map((u) => u.uid);
    let assignmentsMap = {};
    try {
      const allAssignments = await db.select().from(staffAssignments).where(inArray2(staffAssignments.userUid, uids));
      for (const a of allAssignments) {
        if (!assignmentsMap[a.userUid]) {
          assignmentsMap[a.userUid] = [];
        }
        assignmentsMap[a.userUid].push(a);
      }
    } catch (assignErr) {
      console.warn("Notice loading staff assignments in getAllUsersFromDb:", assignErr);
    }
    return rawUsers.map((u) => ({
      ...u,
      status: u.status || "Active",
      permissions: (u.permissions || []).filter((p) => typeof p === "string" && !p.startsWith("__auth_pwd:")),
      assignments: assignmentsMap[u.uid] || []
    }));
  } catch (error) {
    console.error("Failed to get all users from database:", error);
    throw new Error("Failed to load users", { cause: error });
  }
}
async function getUserByUid(uid) {
  try {
    const records = await db.select().from(users).where(eq5(users.uid, uid)).limit(1);
    const user = records[0] || null;
    if (user && user.email) {
      const normalized = user.email.toLowerCase().trim();
      const bootstrapConfig = TRUSTED_BOOTSTRAP_ADMINS[normalized];
      if (bootstrapConfig && (!bootstrapConfig.roles.every((r) => user.roles.includes(r)) || user.name !== bootstrapConfig.name)) {
        const [promoted] = await db.update(users).set({
          roles: bootstrapConfig.roles,
          name: bootstrapConfig.name,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq5(users.id, user.id)).returning();
        return promoted || { ...user, roles: bootstrapConfig.roles, name: bootstrapConfig.name };
      }
    }
    return user;
  } catch (error) {
    console.error("Failed to get user by UID:", error);
    throw new Error("Database query failed for user", { cause: error });
  }
}
async function updateUserProfile(uid, updates) {
  try {
    const safeUpdates = {};
    if (typeof updates.name === "string") safeUpdates.name = updates.name.trim().slice(0, 100);
    if (typeof updates.targetExam === "string") safeUpdates.targetExam = updates.targetExam.trim().slice(0, 100);
    if (typeof updates.classLevel === "string") safeUpdates.classLevel = updates.classLevel.trim().slice(0, 100);
    if (typeof updates.board === "string") safeUpdates.board = updates.board.trim().slice(0, 100);
    if (typeof updates.avatar === "string") safeUpdates.avatar = updates.avatar.trim().slice(0, 100);
    const updated = await db.update(users).set({
      ...safeUpdates,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(users.uid, uid)).returning();
    return updated[0] || null;
  } catch (error) {
    console.error("Failed to update user profile:", error);
    throw new Error("Database update failed for user profile", { cause: error });
  }
}
async function saveTestResultToDb(result) {
  try {
    const existing = await db.select().from(testResults).where(eq5(testResults.resultId, result.resultId)).limit(1);
    if (existing && existing.length > 0) {
      return existing[0];
    }
    const saved = await db.insert(testResults).values(result).returning();
    const existingUser = await getUserByUid(result.userUid);
    if (existingUser) {
      await db.update(users).set({
        testsTaken: existingUser.testsTaken + 1,
        points: existingUser.points + Math.max(10, Math.round(result.marksObtained * 5)),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(users.uid, result.userUid));
    }
    return saved[0];
  } catch (error) {
    console.error("Failed to save test result:", error);
    throw new Error("Failed to save test result", { cause: error });
  }
}
async function getUserTestResultsFromDb(userUid) {
  try {
    return await db.select().from(testResults).where(eq5(testResults.userUid, userUid)).orderBy(desc5(testResults.createdAt));
  } catch (error) {
    console.error("Failed to get user test results:", error);
    throw new Error("Failed to retrieve test history", { cause: error });
  }
}
async function saveCertificateToDb(cert) {
  try {
    const existing = await db.select().from(certificates).where(eq5(certificates.id, cert.id)).limit(1);
    if (existing && existing.length > 0) {
      return existing[0];
    }
    const saved = await db.insert(certificates).values({
      ...cert,
      testId: cert.testId || cert.id || "default-test",
      status: cert.status || "VALID"
    }).returning();
    return saved[0];
  } catch (error) {
    console.error("Failed to save certificate:", error);
    throw new Error("Failed to save certificate", { cause: error });
  }
}
async function getUserCertificatesFromDb(userUid) {
  try {
    return await db.select().from(certificates).where(eq5(certificates.userUid, userUid)).orderBy(desc5(certificates.issueDate));
  } catch (error) {
    console.error("Failed to get user certificates:", error);
    throw new Error("Failed to retrieve certificates", { cause: error });
  }
}
async function getCertificateByIdFromDb(certificateId, requestingUserUid) {
  try {
    const list = await db.select().from(certificates).where(eq5(certificates.id, certificateId)).limit(1);
    if (!list || list.length === 0) return null;
    const cert = list[0];
    if (requestingUserUid && cert.userUid !== requestingUserUid) {
      return null;
    }
    return cert;
  } catch (error) {
    console.error("Failed to get certificate by ID:", error);
    return null;
  }
}
async function getTopLeaderboard(limitCount = 20) {
  try {
    return await db.select({
      id: users.id,
      uid: users.uid,
      name: users.name,
      points: users.points,
      streakDays: users.streakDays,
      testsTaken: users.testsTaken,
      board: users.board,
      classLevel: users.classLevel,
      avatar: users.avatar
    }).from(users).orderBy(desc5(users.points)).limit(limitCount);
  } catch (error) {
    console.error("Failed to get leaderboard:", error);
    throw new Error("Failed to load leaderboard", { cause: error });
  }
}
async function toggleBookmarkInDb(userUid, questionId) {
  try {
    const existing = await db.select().from(bookmarkedQuestions).where(
      and4(
        eq5(bookmarkedQuestions.userUid, userUid),
        eq5(bookmarkedQuestions.questionId, questionId)
      )
    ).limit(1);
    if (existing.length > 0) {
      await db.delete(bookmarkedQuestions).where(
        and4(
          eq5(bookmarkedQuestions.userUid, userUid),
          eq5(bookmarkedQuestions.questionId, questionId)
        )
      );
      return { bookmarked: false };
    } else {
      await db.insert(bookmarkedQuestions).values({
        userUid,
        questionId
      });
      return { bookmarked: true };
    }
  } catch (error) {
    console.error("Failed to toggle bookmark:", error);
    throw new Error("Failed to toggle question bookmark", { cause: error });
  }
}
async function getUserBookmarksFromDb(userUid) {
  try {
    const list = await db.select({ questionId: bookmarkedQuestions.questionId }).from(bookmarkedQuestions).where(eq5(bookmarkedQuestions.userUid, userUid));
    return list.map((item) => item.questionId);
  } catch (error) {
    console.error("Failed to get user bookmarks:", error);
    throw new Error("Failed to get bookmarks", { cause: error });
  }
}
async function getPlatformPublicStats() {
  try {
    const totalUsersResult = await db.select({ count: sql7`count(*)` }).from(users);
    const totalResultsResult = await db.select({ count: sql7`count(*)` }).from(testResults);
    const totalCertsResult = await db.select({ count: sql7`count(*)` }).from(certificates);
    return {
      registeredStudents: Number(totalUsersResult[0]?.count || 0),
      testSubmissions: Number(totalResultsResult[0]?.count || 0),
      certificatesIssued: Number(totalCertsResult[0]?.count || 0)
    };
  } catch (error) {
    console.error("Failed to get platform public stats:", error);
    return {
      registeredStudents: 0,
      testSubmissions: 0,
      certificatesIssued: 0
    };
  }
}
async function getAllTestResultsFromDb(limit = 200) {
  try {
    return await db.select({
      id: testResults.resultId,
      resultId: testResults.resultId,
      userUid: testResults.userUid,
      testId: testResults.testId,
      testTitle: testResults.testTitle,
      testType: testResults.testType,
      subject: testResults.subject,
      category: testResults.category,
      totalQuestions: testResults.totalQuestions,
      answeredCount: testResults.answeredCount,
      correctCount: testResults.correctCount,
      wrongCount: testResults.wrongCount,
      marksObtained: testResults.marksObtained,
      totalMarks: testResults.totalMarks,
      percentage: testResults.percentage,
      grade: testResults.grade,
      timeUsedSeconds: testResults.timeUsedSeconds,
      percentileRank: testResults.percentileRank,
      createdAt: testResults.createdAt
    }).from(testResults).orderBy(desc5(testResults.createdAt)).limit(limit);
  } catch (error) {
    console.error("Failed to load all test results for admin:", error);
    throw new Error("Failed to load test submissions", { cause: error });
  }
}
async function saveContentReportToDb(report) {
  try {
    const reportId = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const inserted = await db.insert(contentReports).values({
      reportId,
      category: report.category,
      questionId: report.questionId || null,
      subject: report.subject || null,
      description: report.description,
      userEmail: report.userEmail || null,
      userUid: report.userUid || null,
      status: "OPEN"
    }).returning();
    return inserted[0] || null;
  } catch (error) {
    console.error("Failed to save content report to database:", error);
    throw new Error("Failed to save content report", { cause: error });
  }
}
async function getAllContentReportsFromDb(limit = 100) {
  try {
    return await db.select().from(contentReports).orderBy(desc5(contentReports.createdAt)).limit(limit);
  } catch (error) {
    console.error("Failed to get content reports:", error);
    throw new Error("Failed to retrieve content reports", { cause: error });
  }
}
async function updateContentReportStatusInDb(reportId, status, adminNotes, resolvedBy) {
  try {
    const updated = await db.update(contentReports).set({
      status,
      adminNotes: adminNotes ?? void 0,
      resolvedBy: resolvedBy ?? void 0,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(contentReports.reportId, reportId)).returning();
    return updated[0] || null;
  } catch (error) {
    console.error("Failed to update content report status:", error);
    throw new Error("Failed to update content report status", { cause: error });
  }
}
async function saveAuditLogToDb(log) {
  try {
    const inserted = await db.insert(auditLogs).values({
      adminUid: log.adminUid,
      adminEmail: log.adminEmail,
      adminName: log.adminName || null,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId || null,
      details: log.details || null,
      board: log.board || null,
      classLevel: log.classLevel || null,
      subject: log.subject || null,
      ipAddress: log.ipAddress || null
    }).returning();
    return inserted[0] || null;
  } catch (error) {
    console.error("Failed to record audit log:", error);
    return null;
  }
}
async function getAllAuditLogsFromDb(filters = {}) {
  try {
    const whereConditions = [];
    if (filters.adminUid) whereConditions.push(eq5(auditLogs.adminUid, filters.adminUid));
    if (filters.board) whereConditions.push(eq5(auditLogs.board, filters.board));
    if (filters.classLevel) whereConditions.push(eq5(auditLogs.classLevel, filters.classLevel));
    if (filters.subject) whereConditions.push(eq5(auditLogs.subject, filters.subject));
    return await db.select().from(auditLogs).where(whereConditions.length > 0 ? and4(...whereConditions) : void 0).orderBy(desc5(auditLogs.createdAt)).limit(filters.limit || 150);
  } catch (error) {
    console.error("Failed to get audit logs:", error);
    throw new Error("Failed to retrieve audit logs", { cause: error });
  }
}
async function updateUserRolesInDb(uid, newRoles) {
  try {
    const updated = await db.update(users).set({
      roles: newRoles,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(users.uid, uid)).returning();
    return updated[0] || null;
  } catch (error) {
    console.error("Failed to update user roles in database:", error);
    throw new Error("Failed to update user roles", { cause: error });
  }
}
async function createUserInDb(data) {
  try {
    const cleanEmail = data.email.toLowerCase().trim();
    let initialPermissions = [...data.permissions || []];
    if (data.password) {
      const pwdToken = hashPassword(data.password);
      initialPermissions = [pwdToken, ...initialPermissions];
    }
    const [created] = await db.insert(users).values({
      uid: data.uid,
      email: cleanEmail,
      name: data.name || cleanEmail.split("@")[0],
      roles: data.roles || ["Student"],
      targetExam: data.targetExam || "MDCAT",
      classLevel: data.classLevel || "Class 10",
      board: data.board || "Punjab",
      avatar: data.avatar || "avatar-1",
      status: data.status || "Active",
      permissions: initialPermissions,
      points: 0,
      streakDays: 0,
      testsTaken: 0
    }).returning();
    return created;
  } catch (error) {
    console.error("Failed to create user in database:", error);
    throw new Error("Failed to create user account", { cause: error });
  }
}
async function updateUserStatusInDb(uid, status) {
  try {
    const [updated] = await db.update(users).set({
      status,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(users.uid, uid)).returning();
    return updated || null;
  } catch (error) {
    console.error("Failed to update user status in database:", error);
    throw new Error("Failed to update user status", { cause: error });
  }
}
async function updateUserPermissionsInDb(uid, permissions) {
  try {
    const existing = await getUserByUid(uid);
    const internalPwd = (existing?.permissions || []).find((p) => p.startsWith("__auth_pwd:"));
    const finalPermissions = internalPwd && !permissions.some((p) => p.startsWith("__auth_pwd:")) ? [internalPwd, ...permissions] : permissions;
    const [updated] = await db.update(users).set({
      permissions: finalPermissions,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(users.uid, uid)).returning();
    return updated || null;
  } catch (error) {
    console.error("Failed to update user permissions in database:", error);
    throw new Error("Failed to update user permissions", { cause: error });
  }
}
function hashPassword(password) {
  const salt = crypto3.randomBytes(16).toString("hex");
  const hash = crypto3.pbkdf2Sync(password, salt, 1e4, 64, "sha512").toString("hex");
  return `__auth_pwd:${salt}:${hash}`;
}
function verifyPassword(password, storedHashToken) {
  if (!storedHashToken || !storedHashToken.startsWith("__auth_pwd:")) return false;
  const parts = storedHashToken.split(":");
  if (parts.length !== 3) return false;
  const salt = parts[1];
  const originalHash = parts[2];
  try {
    const hash = crypto3.pbkdf2Sync(password, salt, 1e4, 64, "sha512").toString("hex");
    return crypto3.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
  } catch (err) {
    return false;
  }
}
async function setUserPasswordInDb(uid, password) {
  try {
    const user = await getUserByUid(uid);
    if (!user) return null;
    const pwdToken = hashPassword(password);
    const existingPerms = (user.permissions || []).filter((p) => !p.startsWith("__auth_pwd:"));
    const updatedPerms = [pwdToken, ...existingPerms];
    const [updated] = await db.update(users).set({
      permissions: updatedPerms,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(users.uid, uid)).returning();
    return updated || null;
  } catch (error) {
    console.error("Failed to set user password in db:", error);
    return null;
  }
}
async function getStaffAssignmentsFromDb(userUid) {
  try {
    return await db.select().from(staffAssignments).where(eq5(staffAssignments.userUid, userUid)).orderBy(desc5(staffAssignments.createdAt));
  } catch (error) {
    console.error("Failed to get staff assignments from database:", error);
    return [];
  }
}
async function addStaffAssignmentToDb(data) {
  try {
    const [inserted] = await db.insert(staffAssignments).values({
      userUid: data.userUid,
      role: data.role,
      board: data.board || "All",
      classLevel: data.classLevel || "All",
      subject: data.subject || "All",
      contentTypes: data.contentTypes || []
    }).returning();
    return inserted;
  } catch (error) {
    console.error("Failed to add staff assignment to database:", error);
    throw new Error("Failed to create staff assignment", { cause: error });
  }
}
async function deleteStaffAssignmentFromDb(assignmentId, userUid) {
  try {
    const whereCondition = userUid ? and4(eq5(staffAssignments.id, assignmentId), eq5(staffAssignments.userUid, userUid)) : eq5(staffAssignments.id, assignmentId);
    const [deleted] = await db.delete(staffAssignments).where(whereCondition).returning();
    return deleted || null;
  } catch (error) {
    console.error("Failed to delete staff assignment from database:", error);
    throw new Error("Failed to delete staff assignment", { cause: error });
  }
}
async function getBoardsFromDb() {
  return await db.select().from(boards).orderBy(desc5(boards.createdAt));
}
async function addBoardToDb(name) {
  const normalizedName = name.toLowerCase().trim();
  const existing = await db.select().from(boards).where(sql7`LOWER(TRIM(${boards.name})) = ${normalizedName}`).limit(1);
  if (existing.length > 0) throw new Error("DUPLICATE_BOARD");
  return await db.insert(boards).values({ name }).returning();
}
async function updateBoardInDb(id, data) {
  if (data.name) {
    const normalizedName = data.name.toLowerCase().trim();
    const existing = await db.select().from(boards).where(and4(sql7`LOWER(TRIM(${boards.name})) = ${normalizedName}`, sql7`${boards.id} != ${id}`)).limit(1);
    if (existing.length > 0) throw new Error("DUPLICATE_BOARD");
  }
  return await db.update(boards).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(boards.id, id)).returning();
}
async function addClassToDb(boardId, name) {
  const normalizedName = name.toLowerCase().trim();
  const existing = await db.select().from(classes).where(and4(eq5(classes.boardId, boardId), sql7`LOWER(TRIM(${classes.name})) = ${normalizedName}`)).limit(1);
  if (existing.length > 0) throw new Error("DUPLICATE_CLASS");
  return await db.insert(classes).values({ boardId, name }).returning();
}
async function updateClassInDb(id, data) {
  if (data.name) {
    const classRecord = await db.select().from(classes).where(eq5(classes.id, id)).limit(1);
    if (classRecord.length > 0) {
      const boardId = classRecord[0].boardId;
      const normalizedName = data.name.toLowerCase().trim();
      const existing = await db.select().from(classes).where(and4(eq5(classes.boardId, boardId), sql7`LOWER(TRIM(${classes.name})) = ${normalizedName}`, sql7`${classes.id} != ${id}`)).limit(1);
      if (existing.length > 0) throw new Error("DUPLICATE_CLASS");
    }
  }
  return await db.update(classes).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(classes.id, id)).returning();
}
async function getSubjectsFromDb() {
  return await db.select().from(subjects).orderBy(desc5(subjects.createdAt));
}
async function addSubjectToDb(classId, name) {
  const normalizedName = name.toLowerCase().trim();
  const existing = await db.select().from(subjects).where(and4(eq5(subjects.classId, classId), sql7`LOWER(TRIM(${subjects.name})) = ${normalizedName}`)).limit(1);
  if (existing.length > 0) throw new Error("DUPLICATE_SUBJECT");
  return await db.insert(subjects).values({ classId, name }).returning();
}
async function updateSubjectInDb(id, data) {
  if (data.name) {
    const subjectRecord = await db.select().from(subjects).where(eq5(subjects.id, id)).limit(1);
    if (subjectRecord.length > 0) {
      const classId = subjectRecord[0].classId;
      const normalizedName = data.name.toLowerCase().trim();
      const existing = await db.select().from(subjects).where(and4(eq5(subjects.classId, classId), sql7`LOWER(TRIM(${subjects.name})) = ${normalizedName}`, sql7`${subjects.id} != ${id}`)).limit(1);
      if (existing.length > 0) throw new Error("DUPLICATE_SUBJECT");
    }
  }
  return await db.update(subjects).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(subjects.id, id)).returning();
}
async function addChapterToDb(subjectId, name) {
  const normalizedName = name.toLowerCase().trim();
  const existing = await db.select().from(chapters).where(and4(eq5(chapters.subjectId, subjectId), sql7`LOWER(TRIM(${chapters.name})) = ${normalizedName}`)).limit(1);
  if (existing.length > 0) throw new Error("DUPLICATE_CHAPTER");
  return await db.insert(chapters).values({ subjectId, name }).returning();
}
async function updateChapterInDb(id, data) {
  if (data.name) {
    const chapterRecord = await db.select().from(chapters).where(eq5(chapters.id, id)).limit(1);
    if (chapterRecord.length > 0) {
      const subjectId = chapterRecord[0].subjectId;
      const normalizedName = data.name.toLowerCase().trim();
      const existing = await db.select().from(chapters).where(and4(eq5(chapters.subjectId, subjectId), sql7`LOWER(TRIM(${chapters.name})) = ${normalizedName}`, sql7`${chapters.id} != ${id}`)).limit(1);
      if (existing.length > 0) throw new Error("DUPLICATE_CHAPTER");
    }
  }
  return await db.update(chapters).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(chapters.id, id)).returning();
}
async function deleteChapterFromDb(id) {
  return await db.delete(chapters).where(eq5(chapters.id, id)).returning();
}
async function getSyllabusFromDb() {
  return await db.select().from(syllabus).orderBy(desc5(syllabus.createdAt));
}
async function addSyllabusToDb(subjectId, content) {
  return await db.insert(syllabus).values({ subjectId, content }).returning();
}
async function updateSyllabusInDb(id, content) {
  return await db.update(syllabus).set({ content, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(syllabus.id, id)).returning();
}
async function deleteSyllabusFromDb(id) {
  return await db.delete(syllabus).where(eq5(syllabus.id, id)).returning();
}
async function getAllCertificatesFromDb() {
  try {
    return await db.select().from(certificates).orderBy(desc5(certificates.issueDate));
  } catch (error) {
    console.error("Error fetching all certificates:", error);
    return [];
  }
}
async function revokeCertificateInDb(certificateId, _revokedBy, _reason) {
  try {
    await db.update(certificates).set({ status: "REVOKED", revokedAt: /* @__PURE__ */ new Date() }).where(eq5(certificates.id, certificateId));
    return true;
  } catch (error) {
    console.error("Error revoking certificate:", error);
    return false;
  }
}
async function restoreCertificateInDb(certificateId) {
  try {
    await db.update(certificates).set({ status: "VALID", revokedAt: null }).where(eq5(certificates.id, certificateId));
    return true;
  } catch (error) {
    console.error("Error restoring certificate:", error);
    return false;
  }
}

// src/data/educationalHierarchy.ts
var PAKISTAN_BOARDS = [
  // --- PUNJAB BOARDS (Represented Individually) ---
  {
    id: "bise-lahore",
    name: "BISE Lahore",
    code: "LHR",
    province: "Punjab",
    city: "Lahore",
    established: "1954",
    description: "Board of Intermediate and Secondary Education Lahore conducting SSC and HSSC exams for Lahore, Kasur, Sheikhupura, and Nankana Sahib.",
    totalPastPapers: 340,
    totalTests: 185,
    website: "https://www.biselahore.com",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-rawalpindi",
    name: "BISE Rawalpindi",
    code: "RWP",
    province: "Punjab",
    city: "Rawalpindi",
    established: "1977",
    description: "Serving Rawalpindi, Attock, Chakwal, Jhelum, and Murree districts.",
    totalPastPapers: 290,
    totalTests: 140,
    website: "https://www.biserawalpindi.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-gujranwala",
    name: "BISE Gujranwala",
    code: "GRW",
    province: "Punjab",
    city: "Gujranwala",
    established: "1982",
    description: "Serving Gujranwala, Gujrat, Mandi Bahauddin, Hafizabad, Narowal, and Sialkot.",
    totalPastPapers: 260,
    totalTests: 130,
    website: "https://www.bisegrw.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-faisalabad",
    name: "BISE Faisalabad",
    code: "FSD",
    province: "Punjab",
    city: "Faisalabad",
    established: "1988",
    description: "Serving Faisalabad division including Chiniot, Toba Tek Singh, and Jhang.",
    totalPastPapers: 280,
    totalTests: 145,
    website: "https://www.bisefsd.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-multan",
    name: "BISE Multan",
    code: "MUL",
    province: "Punjab",
    city: "Multan",
    established: "1968",
    description: "Serving Southern Punjab students including Multan, Lodhran, Vehari, and Khanewal.",
    totalPastPapers: 250,
    totalTests: 120,
    website: "https://www.bisemultan.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-sargodha",
    name: "BISE Sargodha",
    code: "SGD",
    province: "Punjab",
    city: "Sargodha",
    established: "1968",
    description: "Conducting annual exams for Sargodha, Khushab, Mianwali, and Bhakkar districts.",
    totalPastPapers: 210,
    totalTests: 110,
    website: "https://www.bisesargodha.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-bahawalpur",
    name: "BISE Bahawalpur",
    code: "BWP",
    province: "Punjab",
    city: "Bahawalpur",
    established: "1977",
    description: "Education board serving Bahawalpur, Bahawalnagar, and Rahim Yar Khan divisions.",
    totalPastPapers: 195,
    totalTests: 95,
    website: "https://www.bisebwp.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-dgkhan",
    name: "BISE DG Khan",
    code: "DGK",
    province: "Punjab",
    city: "Dera Ghazi Khan",
    established: "1989",
    description: "Serving Dera Ghazi Khan, Muzaffargarh, Layyah, Rajanpur, and Kot Addu.",
    totalPastPapers: 180,
    totalTests: 90,
    website: "https://www.bisedgkhan.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-sahiwal",
    name: "BISE Sahiwal",
    code: "SWL",
    province: "Punjab",
    city: "Sahiwal",
    established: "2012",
    description: "Board serving Sahiwal, Okara, and Pakpattan districts with standardized exams.",
    totalPastPapers: 165,
    totalTests: 85,
    website: "https://www.bisesahiwal.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  // --- FEDERAL BOARD ---
  {
    id: "fbise-islamabad",
    name: "FBISE Islamabad",
    code: "FED",
    province: "Federal",
    city: "Islamabad",
    established: "1975",
    description: "Federal Board of Intermediate and Secondary Education Islamabad (National, Overseas & Cantonments).",
    totalPastPapers: 520,
    totalTests: 290,
    website: "https://www.fbise.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  // --- SINDH BOARDS ---
  {
    id: "bise-karachi",
    name: "BSEK / BIEK Karachi",
    code: "KHI",
    province: "Sindh",
    city: "Karachi",
    established: "1950",
    description: "Board of Secondary Education Karachi (BSEK) & Board of Intermediate Education Karachi (BIEK).",
    totalPastPapers: 420,
    totalTests: 220,
    website: "https://www.biek.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-hyderabad",
    name: "BISE Hyderabad",
    code: "HYD",
    province: "Sindh",
    city: "Hyderabad",
    established: "1961",
    description: "Intermediate and Secondary Education Board for Hyderabad, Jamshoro, Matiari, and Dadu.",
    totalPastPapers: 230,
    totalTests: 115,
    website: "https://www.biseh.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-sukkur",
    name: "BISE Sukkur",
    code: "SKR",
    province: "Sindh",
    city: "Sukkur",
    established: "1979",
    description: "Secondary and Intermediate examinations for Upper Sindh including Sukkur, Ghotki, and Khairpur.",
    totalPastPapers: 185,
    totalTests: 90,
    website: "https://www.bisesuksindh.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-larkana",
    name: "BISE Larkana",
    code: "LRK",
    province: "Sindh",
    city: "Larkana",
    established: "1995",
    description: "Serving Larkana division including Shikarpur, Jacobabad, Kashmore, and Qambar Shahdadkot.",
    totalPastPapers: 160,
    totalTests: 80,
    website: "https://www.biselrk.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-mirpurkhas",
    name: "BISE Mirpurkhas",
    code: "MPK",
    province: "Sindh",
    city: "Mirpurkhas",
    established: "2014",
    description: "Serving Mirpurkhas, Umerkot, and Tharparkar districts.",
    totalPastPapers: 140,
    totalTests: 70,
    website: "https://www.bisempk.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  // --- KPK BOARDS ---
  {
    id: "bise-peshawar",
    name: "BISE Peshawar",
    code: "PEW",
    province: "KPK",
    city: "Peshawar",
    established: "1961",
    description: "Khyber Pakhtunkhwa premier board conducting SSC and HSSC exams for Peshawar, Charsadda, and Khyber.",
    totalPastPapers: 310,
    totalTests: 160,
    website: "https://www.bisep.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-abbottabad",
    name: "BISE Abbottabad",
    code: "ATD",
    province: "KPK",
    city: "Abbottabad",
    established: "1990",
    description: "Conducting examinations for Hazara division including Abbottabad, Mansehra, Haripur, Battagram, and Kohistan.",
    totalPastPapers: 210,
    totalTests: 110,
    website: "https://www.biseatd.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-mardan",
    name: "BISE Mardan",
    code: "MDN",
    province: "KPK",
    city: "Mardan",
    established: "1990",
    description: "Serving students of Mardan, Swabi, and Nowshera districts.",
    totalPastPapers: 200,
    totalTests: 105,
    website: "https://www.bisemdn.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-swat",
    name: "BISE Swat",
    code: "SWT",
    province: "KPK",
    city: "Saidu Sharif (Swat)",
    established: "1992",
    description: "Board for Swat, Shangla, and Buner districts.",
    totalPastPapers: 190,
    totalTests: 95,
    website: "https://www.bisess.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-malakand",
    name: "BISE Malakand",
    code: "MLK",
    province: "KPK",
    city: "Chakdara",
    established: "2008",
    description: "Serving students from Dir Lower, Dir Upper, Bajaur, and Malakand Protected Area.",
    totalPastPapers: 150,
    totalTests: 75,
    website: "https://www.bisemalakand.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-kohat",
    name: "BISE Kohat",
    code: "KHT",
    province: "KPK",
    city: "Kohat",
    established: "2002",
    description: "Serving Kohat, Karak, Hangu, Kurram, and Orakzai districts.",
    totalPastPapers: 160,
    totalTests: 80,
    website: "https://www.bisekt.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-bannu",
    name: "BISE Bannu",
    code: "BNU",
    province: "KPK",
    city: "Bannu",
    established: "1990",
    description: "Conducting examinations for Bannu, Lakki Marwat, and North Waziristan.",
    totalPastPapers: 140,
    totalTests: 70,
    website: "https://www.biseb.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  {
    id: "bise-dikhan",
    name: "BISE DI Khan",
    code: "DIK",
    province: "KPK",
    city: "Dera Ismail Khan",
    established: "2006",
    description: "Serving Dera Ismail Khan, Tank, and South Waziristan districts.",
    totalPastPapers: 135,
    totalTests: 65,
    website: "https://www.bisedik.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  // --- BALOCHISTAN BOARDS ---
  {
    id: "bbise-quetta",
    name: "BBISE Quetta",
    code: "QTA",
    province: "Balochistan",
    city: "Quetta",
    established: "1976",
    description: "Balochistan Board of Intermediate and Secondary Education Quetta covering all provincial districts.",
    totalPastPapers: 240,
    totalTests: 120,
    website: "https://www.bbiseqta.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  },
  // --- AJK BOARD ---
  {
    id: "bise-ajk",
    name: "BISE AJK (Mirpur)",
    code: "AJK",
    province: "AJK",
    city: "Mirpur (Azad Kashmir)",
    established: "1973",
    description: "Board of Intermediate and Secondary Education Azad Jammu & Kashmir Mirpur (covering Mirpur, Muzaffarabad, Rawalakot, Kotli, Bagh, Bhimber, Neelum, Haveli, Sudhnuti, and Hattian Bala).",
    totalPastPapers: 180,
    totalTests: 95,
    website: "https://www.ajkbise.edu.pk",
    supportedClasses: ["Class 9", "Class 10", "Class 11", "Class 12"]
  }
];
var ACADEMIC_CLASSES = [
  {
    id: "class-9",
    name: "Class 9",
    shortCode: "9th",
    level: "Matric",
    badge: "SSC-I",
    description: "Secondary School Certificate Part 1 (Science, Computer & Arts Groups)",
    availableSubjectIds: [
      "physics",
      "chemistry",
      "biology",
      "mathematics",
      "computer-science",
      "english",
      "urdu",
      "islamiat",
      "tarjuma-tul-quran",
      "pakistan-studies",
      "general-science"
    ]
  },
  {
    id: "class-10",
    name: "Class 10",
    shortCode: "10th",
    level: "Matric",
    badge: "SSC-II",
    description: "Secondary School Certificate Part 2 Board Examinations (Science & General)",
    availableSubjectIds: [
      "physics",
      "chemistry",
      "biology",
      "mathematics",
      "computer-science",
      "english",
      "urdu",
      "pakistan-studies",
      "islamiat",
      "tarjuma-tul-quran",
      "general-science"
    ]
  },
  {
    id: "class-11",
    name: "Class 11",
    shortCode: "11th",
    level: "Intermediate",
    badge: "HSSC-I",
    description: "Higher Secondary Certificate Part 1 (FSc Pre-Medical, Pre-Engineering, ICS & I.Com)",
    availableSubjectIds: [
      "physics",
      "chemistry",
      "biology",
      "mathematics",
      "computer-science",
      "english",
      "urdu",
      "islamiat",
      "tarjuma-tul-quran"
    ]
  },
  {
    id: "class-12",
    name: "Class 12",
    shortCode: "12th",
    level: "Intermediate",
    badge: "HSSC-II",
    description: "Higher Secondary Certificate Part 2 Board Examinations & College Finals",
    availableSubjectIds: [
      "physics",
      "chemistry",
      "biology",
      "mathematics",
      "computer-science",
      "english",
      "urdu",
      "pakistan-studies",
      "tarjuma-tul-quran"
    ]
  },
  // Expandable levels
  {
    id: "mdcat",
    name: "MDCAT",
    shortCode: "MDCAT",
    level: "Entry Test",
    badge: "Medical",
    description: "Medical & Dental College Admission Test (PM&DC & Provincial Universities)",
    availableSubjectIds: ["biology", "chemistry", "physics", "english", "iq-intelligence"]
  },
  {
    id: "ecat",
    name: "ECAT",
    shortCode: "ECAT",
    level: "Entry Test",
    badge: "Engineering",
    description: "Engineering College Admission Test (UET Lahore, NUST, FAST & GIKI)",
    availableSubjectIds: ["mathematics", "physics", "chemistry", "computer-science", "english"]
  }
];
var ACADEMIC_SUBJECTS = [
  {
    id: "physics",
    name: "Physics",
    category: "Science",
    icon: "\u26A1",
    accentColor: "from-blue-600 to-cyan-500",
    description: "Mechanics, Electromagnetism, Modern Physics, Thermal Physics, Geometrical Optics & Wave Mechanics.",
    applicableClasses: ["Class 9", "Class 10", "Class 11", "Class 12", "MDCAT", "ECAT"],
    applicableBoards: ["All"],
    chaptersCount: 9,
    mcqsCount: 420,
    testsCount: 38
  },
  {
    id: "chemistry",
    name: "Chemistry",
    category: "Science",
    icon: "\u{1F9EA}",
    accentColor: "from-emerald-600 to-teal-500",
    description: "Organic, Inorganic, Physical Chemistry, Stoichiometry, Chemical Equilibrium & Electrochemistry.",
    applicableClasses: ["Class 9", "Class 10", "Class 11", "Class 12", "MDCAT", "ECAT"],
    applicableBoards: ["All"],
    chaptersCount: 8,
    mcqsCount: 390,
    testsCount: 35
  },
  {
    id: "biology",
    name: "Biology",
    category: "Science",
    icon: "\u{1F9EC}",
    accentColor: "from-teal-600 to-emerald-500",
    description: "Cell Biology, Genetics, Physiology, Ecology, Human Anatomy, Bioenergetics & Biotechnology.",
    applicableClasses: ["Class 9", "Class 10", "Class 11", "Class 12", "MDCAT"],
    applicableBoards: ["All"],
    chaptersCount: 9,
    mcqsCount: 480,
    testsCount: 42
  },
  {
    id: "mathematics",
    name: "Mathematics",
    category: "Science",
    icon: "\u{1F4D0}",
    accentColor: "from-amber-600 to-orange-500",
    description: "Algebra, Matrices & Determinants, Trigonometry, Calculus, Coordinate Geometry & Vectors.",
    applicableClasses: ["Class 9", "Class 10", "Class 11", "Class 12", "ECAT"],
    applicableBoards: ["All"],
    chaptersCount: 13,
    mcqsCount: 520,
    testsCount: 50
  },
  {
    id: "computer-science",
    name: "Computer Science",
    category: "Technology",
    icon: "\u{1F4BB}",
    accentColor: "from-indigo-600 to-blue-500",
    description: "Programming (C / C++ / Python), Boolean Algebra, Computer Architecture, Databases & Computer Networks.",
    applicableClasses: ["Class 9", "Class 10", "Class 11", "Class 12", "ECAT"],
    applicableBoards: ["All"],
    chaptersCount: 7,
    mcqsCount: 340,
    testsCount: 28
  },
  {
    id: "english",
    name: "English",
    category: "Compulsory",
    icon: "\u{1F4D6}",
    accentColor: "from-purple-600 to-pink-500",
    description: "Grammar, Tenses, Active/Passive Voice, Direct/Indirect, Reading Comprehension, Vocabulary & Essay Writing.",
    applicableClasses: ["Class 9", "Class 10", "Class 11", "Class 12", "MDCAT", "ECAT"],
    applicableBoards: ["All"],
    chaptersCount: 12,
    mcqsCount: 360,
    testsCount: 30
  },
  {
    id: "urdu",
    name: "Urdu",
    category: "Compulsory",
    icon: "\u270D\uFE0F",
    accentColor: "from-rose-600 to-red-500",
    description: "Urdu Qawaid-o-Insha, Nasr Asbaaq, Nazmein, Ghazliyat, Tashreehat, Khutoot & Mazameen.",
    applicableClasses: ["Class 9", "Class 10", "Class 11", "Class 12"],
    applicableBoards: ["All"],
    chaptersCount: 14,
    mcqsCount: 310,
    testsCount: 26
  },
  {
    id: "pakistan-studies",
    name: "Pakistan Studies",
    category: "Compulsory",
    icon: "\u{1F1F5}\u{1F1F0}",
    accentColor: "from-green-700 to-emerald-600",
    description: "Ideology of Pakistan, Freedom Movement, Constitution, Geography, Climate, Natural Resources & Foreign Relations.",
    applicableClasses: ["Class 9", "Class 10", "Class 12"],
    applicableBoards: ["All"],
    chaptersCount: 6,
    mcqsCount: 290,
    testsCount: 24
  },
  {
    id: "islamiat",
    name: "Islamiat",
    category: "Compulsory",
    icon: "\u{1F54C}",
    accentColor: "from-emerald-700 to-teal-600",
    description: "Quranic Surahs, Ahadees-e-Mubaraka, Arkaan-e-Islam, Seerat-un-Nabi (PBUH) & Islamic Ethics.",
    applicableClasses: ["Class 9", "Class 10", "Class 11"],
    applicableBoards: ["All"],
    chaptersCount: 8,
    mcqsCount: 300,
    testsCount: 25
  },
  {
    id: "tarjuma-tul-quran",
    name: "Tarjuma-tul-Quran",
    category: "Compulsory",
    icon: "\u{1F4D7}",
    accentColor: "from-teal-700 to-emerald-800",
    description: "New National Curriculum compulsory Quran Translation with word-by-word meaning, context, and exercises.",
    applicableClasses: ["Class 9", "Class 10", "Class 11", "Class 12"],
    applicableBoards: ["All"],
    chaptersCount: 10,
    mcqsCount: 220,
    testsCount: 20
  },
  {
    id: "general-science",
    name: "General Science",
    category: "Arts & Languages",
    icon: "\u{1F52C}",
    accentColor: "from-cyan-600 to-blue-600",
    description: "Everyday Science, Human Body, Food & Nutrition, Diseases, Environment, Energy & Technology for Arts Group.",
    applicableClasses: ["Class 9", "Class 10"],
    applicableBoards: ["All"],
    chaptersCount: 10,
    mcqsCount: 240,
    testsCount: 20
  },
  {
    id: "iq-intelligence",
    name: "IQ & Intelligence",
    category: "Technology",
    icon: "\u{1F9E0}",
    accentColor: "from-violet-600 to-purple-500",
    description: "Verbal & Non-Verbal Intelligence, Analytical Reasoning, Number Series, Pattern Recognition & Spatial Logic.",
    applicableClasses: ["MDCAT", "ECAT", "Class 11", "Class 12"],
    applicableBoards: ["All"],
    chaptersCount: 8,
    mcqsCount: 380,
    testsCount: 32
  }
];
var ACADEMIC_CHAPTERS = [
  // --- Class 10 Physics ---
  {
    id: "chap-phy-10-1",
    subjectId: "physics",
    subjectName: "Physics",
    classLevel: "Class 10",
    chapterNumber: 10,
    name: "Simple Harmonic Motion and Waves",
    description: "SHM characteristics, simple pendulum, wave motion, types of waves, and ripple tank.",
    topics: [
      { id: "top-phy-10-1-1", chapterId: "chap-phy-10-1", topicNumber: "10.1", title: "Simple Harmonic Motion (SHM)", keyPoints: ["Restoring force", "Hooke's law", "Mass attached to spring"] },
      { id: "top-phy-10-1-2", chapterId: "chap-phy-10-1", topicNumber: "10.2", title: "Simple Pendulum & Damped Oscillations", keyPoints: ["Time period T = 2\u03C0\u221A(l/g)", "Energy conservation", "Damping applications"] },
      { id: "top-phy-10-1-3", chapterId: "chap-phy-10-1", topicNumber: "10.3", title: "Wave Motion & Wave Equation", keyPoints: ["Transverse vs Longitudinal", "v = f\u03BB formula", "Wavefronts"] },
      { id: "top-phy-10-1-4", chapterId: "chap-phy-10-1", topicNumber: "10.4", title: "Ripple Tank & Wave Phenomenon", keyPoints: ["Reflection", "Refraction", "Diffraction"] }
    ]
  },
  {
    id: "chap-phy-10-2",
    subjectId: "physics",
    subjectName: "Physics",
    classLevel: "Class 10",
    chapterNumber: 11,
    name: "Sound",
    description: "Nature of sound waves, longitudinal characteristics, audible frequency range, and ultrasound.",
    topics: [
      { id: "top-phy-10-2-1", chapterId: "chap-phy-10-2", topicNumber: "11.1", title: "Characteristics of Sound", keyPoints: ["Loudness & Amplitude", "Pitch & Frequency", "Quality / Timbre"] },
      { id: "top-phy-10-2-2", chapterId: "chap-phy-10-2", topicNumber: "11.2", title: "Reflection (Echo) of Sound", keyPoints: ["Echo calculation d = vt/2", "Reverberation", "Acoustics"] },
      { id: "top-phy-10-2-3", chapterId: "chap-phy-10-2", topicNumber: "11.3", title: "Ultrasound & Medical Applications", keyPoints: ["Frequency > 20 kHz", "SONAR", "Echocardiography"] }
    ]
  },
  {
    id: "chap-phy-10-3",
    subjectId: "physics",
    subjectName: "Physics",
    classLevel: "Class 10",
    chapterNumber: 12,
    name: "Geometrical Optics",
    description: "Reflection, spherical mirrors, refraction of light, Snell law, total internal reflection, and optical instruments.",
    topics: [
      { id: "top-phy-10-3-1", chapterId: "chap-phy-10-3", topicNumber: "12.1", title: "Reflection of Light & Spherical Mirrors", keyPoints: ["Concave vs Convex mirrors", "Focal length f = R/2", "Sign conventions"] },
      { id: "top-phy-10-3-2", chapterId: "chap-phy-10-3", topicNumber: "12.2", title: "Mirror Formula & Magnification", keyPoints: ["1/f = 1/p + 1/q", "m = h_i / h_o = -q/p", "Real vs Virtual images"] },
      { id: "top-phy-10-3-3", chapterId: "chap-phy-10-3", topicNumber: "12.3", title: "Refraction & Snell\u2019s Law", keyPoints: ["n = c/v", "n1 sin(\u03B81) = n2 sin(\u03B82)", "Apparent depth"] },
      { id: "top-phy-10-3-4", chapterId: "chap-phy-10-3", topicNumber: "12.4", title: "Total Internal Reflection & Optical Fibers", keyPoints: ["Critical angle sin(\u03B8c) = 1/n", "Light pipes", "Endoscopy"] },
      { id: "top-phy-10-3-5", chapterId: "chap-phy-10-3", topicNumber: "12.5", title: "Compound Microscope & Astronomical Telescope", keyPoints: ["Objective & Eyepiece", "Magnification power", "Resolving power"] }
    ]
  },
  {
    id: "chap-phy-10-4",
    subjectId: "physics",
    subjectName: "Physics",
    classLevel: "Class 10",
    chapterNumber: 13,
    name: "Electrostatics",
    description: "Electric charges, Coulomb law, electric field, electric potential, and capacitors.",
    topics: [
      { id: "top-phy-10-4-1", chapterId: "chap-phy-10-4", topicNumber: "13.1", title: "Coulomb's Law", keyPoints: ["F = k(q1 q2)/r\xB2", "k = 9\xD710\u2079 N m\xB2/C\xB2", "Permittivity of medium"] },
      { id: "top-phy-10-4-2", chapterId: "chap-phy-10-4", topicNumber: "13.2", title: "Electric Field & Field Lines", keyPoints: ["E = F/q\u2080 (N/C)", "Vector direction", "Uniform electric fields"] },
      { id: "top-phy-10-4-3", chapterId: "chap-phy-10-4", topicNumber: "13.3", title: "Capacitors and Capacitance", keyPoints: ["Q = CV", "Parallel: C_eq = C1 + C2", "Series: 1/C_eq = 1/C1 + 1/C2"] }
    ]
  },
  // --- Class 10 Chemistry ---
  {
    id: "chap-chem-10-1",
    subjectId: "chemistry",
    subjectName: "Chemistry",
    classLevel: "Class 10",
    chapterNumber: 9,
    name: "Chemical Equilibrium",
    description: "Reversible reactions, dynamic equilibrium, law of mass action, and equilibrium constant Kc.",
    topics: [
      { id: "top-chem-10-1-1", chapterId: "chap-chem-10-1", topicNumber: "9.1", title: "Reversible Reactions & Dynamic Equilibrium", keyPoints: ["Forward vs Reverse rate", "Macroscopic characteristics"] },
      { id: "top-chem-10-1-2", chapterId: "chap-chem-10-1", topicNumber: "9.2", title: "Law of Mass Action & Equilibrium Constant Kc", keyPoints: ["Kc = [Products]/[Reactants]", "Units of Kc", "Reaction quotient Qc"] }
    ]
  },
  {
    id: "chap-chem-10-2",
    subjectId: "chemistry",
    subjectName: "Chemistry",
    classLevel: "Class 10",
    chapterNumber: 10,
    name: "Acids, Bases and Salts",
    description: "Arrhenius, Bronsted-Lowry & Lewis concepts, pH scale, indicators, and preparation of salts.",
    topics: [
      { id: "top-chem-10-2-1", chapterId: "chap-chem-10-2", topicNumber: "10.1", title: "Concepts of Acids and Bases", keyPoints: ["Arrhenius H+/OH-", "Bronsted proton donor/acceptor", "Lewis electron pair donor/acceptor"] },
      { id: "top-chem-10-2-2", chapterId: "chap-chem-10-2", topicNumber: "10.2", title: "pH Scale & Auto-Ionization of Water", keyPoints: ["pH = -log[H+]", "Kw = 1.0\xD710\u207B\xB9\u2074", "Acidic, Neutral & Basic ranges"] },
      { id: "top-chem-10-2-3", chapterId: "chap-chem-10-2", topicNumber: "10.3", title: "Salts: Preparation and Types", keyPoints: ["Neutralization", "Acidic, Basic, Normal salts", "Applications"] }
    ]
  },
  {
    id: "chap-chem-10-3",
    subjectId: "chemistry",
    subjectName: "Chemistry",
    classLevel: "Class 10",
    chapterNumber: 11,
    name: "Organic Chemistry & Hydrocarbons",
    description: "Functional groups, structural formulas, alkanes, alkenes, and alkynes.",
    topics: [
      { id: "top-chem-10-3-1", chapterId: "chap-chem-10-3", topicNumber: "11.1", title: "Classification & Functional Groups", keyPoints: ["Homologous series", "Isomerism", "Functional group tests"] },
      { id: "top-chem-10-3-2", chapterId: "chap-chem-10-3", topicNumber: "11.2", title: "Alkanes, Alkenes and Alkynes", keyPoints: ["CnH2n+2, CnH2n, CnH2n-2", "Halogenation", "Combustion reactions"] }
    ]
  },
  // --- Class 10 Biology ---
  {
    id: "chap-bio-10-1",
    subjectId: "biology",
    subjectName: "Biology",
    classLevel: "Class 10",
    chapterNumber: 10,
    name: "Gaseous Exchange",
    description: "Gaseous exchange in plants and humans, respiratory system, and respiratory disorders.",
    topics: [
      { id: "top-bio-10-1-1", chapterId: "chap-bio-10-1", topicNumber: "10.1", title: "Gaseous Exchange in Humans", keyPoints: ["Air passageway", "Lungs & Alveoli", "Inhalation vs Exhalation"] },
      { id: "top-bio-10-1-2", chapterId: "chap-bio-10-1", topicNumber: "10.2", title: "Respiratory Disorders", keyPoints: ["Bronchitis", "Emphysema", "Pneumonia", "Lung Cancer"] }
    ]
  },
  {
    id: "chap-bio-10-2",
    subjectId: "biology",
    subjectName: "Biology",
    classLevel: "Class 10",
    chapterNumber: 12,
    name: "Coordination and Control",
    description: "Nervous system, neurons, brain structure, endocrine system, and hormones.",
    topics: [
      { id: "top-bio-10-2-1", chapterId: "chap-bio-10-2", topicNumber: "12.1", title: "Human Nervous System", keyPoints: ["Sensory, Motor & Interneurons", "Central vs Peripheral nervous system"] },
      { id: "top-bio-10-2-2", chapterId: "chap-bio-10-2", topicNumber: "12.2", title: "Human Brain & Reflex Action", keyPoints: ["Forebrain, Midbrain, Hindbrain", "Reflex arc pathway"] },
      { id: "top-bio-10-2-3", chapterId: "chap-bio-10-2", topicNumber: "12.3", title: "Endocrine System", keyPoints: ["Pituitary, Thyroid, Pancreas, Adrenal glands", "Insulin & Glucagon"] }
    ]
  },
  // --- Class 10 Mathematics ---
  {
    id: "chap-math-10-1",
    subjectId: "mathematics",
    subjectName: "Mathematics",
    classLevel: "Class 10",
    chapterNumber: 1,
    name: "Quadratic Equations",
    description: "Solution of quadratic equations by factorization, completing square, and quadratic formula.",
    topics: [
      { id: "top-math-10-1-1", chapterId: "chap-math-10-1", topicNumber: "1.1", title: "Methods of Solving Quadratic Equations", keyPoints: ["ax\xB2 + bx + c = 0", "Quadratic formula: x = (-b \xB1 \u221A(b\xB2 - 4ac)) / (2a)"] },
      { id: "top-math-10-1-2", chapterId: "chap-math-10-1", topicNumber: "1.2", title: "Equations Reducible to Quadratic Form", keyPoints: ["Reciprocal equations", "Exponential equations", "Radical equations"] }
    ]
  },
  {
    id: "chap-math-10-2",
    subjectId: "mathematics",
    subjectName: "Mathematics",
    classLevel: "Class 10",
    chapterNumber: 7,
    name: "Introduction to Trigonometry",
    description: "Measurement of angles, radian measure, trigonometric ratios, and fundamental identities.",
    topics: [
      { id: "top-math-10-2-1", chapterId: "chap-math-10-2", topicNumber: "7.1", title: "Radians, Degrees and Sector Length", keyPoints: ["l = r\u03B8", "Area of sector = (1/2)r\xB2\u03B8", "1 rad = 180\xB0/\u03C0"] },
      { id: "top-math-10-2-2", chapterId: "chap-math-10-2", topicNumber: "7.2", title: "Fundamental Trigonometric Identities", keyPoints: ["sin\xB2\u03B8 + cos\xB2\u03B8 = 1", "1 + tan\xB2\u03B8 = sec\xB2\u03B8", "1 + cot\xB2\u03B8 = csc\xB2\u03B8"] }
    ]
  },
  // --- Class 12 Physics ---
  {
    id: "chap-phy-12-1",
    subjectId: "physics",
    subjectName: "Physics",
    classLevel: "Class 12",
    chapterNumber: 12,
    name: "Electrostatics",
    description: "Coulomb's Law, Electric Fields, Gauss's Law, Electric Potential, Capacitors & Energy Storage.",
    topics: [
      { id: "top-phy-12-1-1", chapterId: "chap-phy-12-1", topicNumber: "12.1", title: "Gauss's Law & Its Applications", keyPoints: ["Electric flux \u03A6 = E\xB7A", "\u03A6 = Q/\u03B5\u2080", "Charge inside hollow sphere"] },
      { id: "top-phy-12-1-2", chapterId: "chap-phy-12-1", topicNumber: "12.2", title: "Electric Potential & Millikan Oil Drop", keyPoints: ["V = W/q", "Potential gradient E = -\u0394V/\u0394r", "Charge of electron e = 1.6\xD710\u207B\xB9\u2079 C"] }
    ]
  },
  {
    id: "chap-phy-12-2",
    subjectId: "physics",
    subjectName: "Physics",
    classLevel: "Class 12",
    chapterNumber: 14,
    name: "Electromagnetism",
    description: "Magnetic field, Ampere law, force on moving charge, torque on current-carrying coil, and galvanometer.",
    topics: [
      { id: "top-phy-12-2-1", chapterId: "chap-phy-12-2", topicNumber: "14.1", title: "Magnetic Force on Charge & Wire", keyPoints: ["F = q(v \xD7 B)", "F = I(L \xD7 B)", "Right hand rule"] },
      { id: "top-phy-12-2-2", chapterId: "chap-phy-12-2", topicNumber: "14.2", title: "Ampere's Law & Solenoid Field", keyPoints: ["\u222E B\xB7dl = \u03BC\u2080 I", "B = \u03BC\u2080 n I", "Toroid field"] }
    ]
  },
  // --- Class 12 Mathematics ---
  {
    id: "chap-math-12-1",
    subjectId: "mathematics",
    subjectName: "Mathematics",
    classLevel: "Class 12",
    chapterNumber: 2,
    name: "Differentiation",
    description: "Derivatives of algebraic, trigonometric, logarithmic, and inverse functions. Chain, Product, and Quotient rules.",
    topics: [
      { id: "top-math-12-1-1", chapterId: "chap-math-12-1", topicNumber: "2.1", title: "Derivatives from First Principles", keyPoints: ["f'(x) = lim_{h\u21920} [f(x+h) - f(x)]/h", "Power rule d/dx(x\u207F) = n\xB7x\u207F\u207B\xB9"] },
      { id: "top-math-12-1-2", chapterId: "chap-math-12-1", topicNumber: "2.2", title: "Chain Rule & Implicit Differentiation", keyPoints: ["dy/dx = (dy/du)\xB7(du/dx)", "Parametric equations"] },
      { id: "top-math-12-1-3", chapterId: "chap-math-12-1", topicNumber: "2.3", title: "Maxima, Minima & Points of Inflection", keyPoints: ["First derivative test f'(x) = 0", "Second derivative test f''(x) > 0 (Min), < 0 (Max)"] }
    ]
  },
  {
    id: "chap-math-12-2",
    subjectId: "mathematics",
    subjectName: "Mathematics",
    classLevel: "Class 12",
    chapterNumber: 3,
    name: "Integration",
    description: "Indefinite & definite integrals, integration by parts, partial fractions, and area under curve.",
    topics: [
      { id: "top-math-12-2-1", chapterId: "chap-math-12-2", topicNumber: "3.1", title: "Standard Integration Techniques", keyPoints: ["\u222B x\u207F dx = x\u207F\u207A\xB9/(n+1) + C", "\u222B [f(x)]\u207F f'(x) dx"] },
      { id: "top-math-12-2-2", chapterId: "chap-math-12-2", topicNumber: "3.2", title: "Integration by Parts", keyPoints: ["\u222B u v dx = u \u222B v dx - \u222B [u' \u222B v dx] dx", "ILATE rule"] }
    ]
  },
  // --- Class 9 Physics ---
  {
    id: "chap-phy-9-1",
    subjectId: "physics",
    subjectName: "Physics",
    classLevel: "Class 9",
    chapterNumber: 1,
    name: "Physical Quantities and Measurement",
    description: "Introduction to Physics, International System of Units (SI), prefixes, scientific notation, and measuring instruments (Vernier Calipers, Screw Gauge).",
    topics: [
      { id: "top-phy-9-1-1", chapterId: "chap-phy-9-1", topicNumber: "1.1", title: "Base and Derived Quantities", keyPoints: ["7 base SI units", "Derived units (Newton, Joule, Pascal)", "Dimensional analysis"] },
      { id: "top-phy-9-1-2", chapterId: "chap-phy-9-1", topicNumber: "1.2", title: "Measuring Instruments & Least Count", keyPoints: ["Vernier Calipers (0.01 cm / 0.1 mm)", "Micrometer Screw Gauge (0.001 cm / 0.01 mm)", "Zero error correction"] }
    ]
  },
  {
    id: "chap-phy-9-2",
    subjectId: "physics",
    subjectName: "Physics",
    classLevel: "Class 9",
    chapterNumber: 2,
    name: "Kinematics",
    description: "Rest and motion, types of motion, scalars and vectors, distance and displacement, speed and velocity, acceleration, and equations of motion.",
    topics: [
      { id: "top-phy-9-2-1", chapterId: "chap-phy-9-2", topicNumber: "2.1", title: "Distance, Velocity and Acceleration", keyPoints: ["Scalar vs Vector", "Average velocity vs Instantaneous", "Uniform acceleration"] },
      { id: "top-phy-9-2-2", chapterId: "chap-phy-9-2", topicNumber: "2.2", title: "Three Equations of Uniform Motion", keyPoints: ["v_f = v_i + at", "S = v_i t + (1/2)at\xB2", "2aS = v_f\xB2 - v_i\xB2"] },
      { id: "top-phy-9-2-3", chapterId: "chap-phy-9-2", topicNumber: "2.3", title: "Motion under Gravity (Free Fall)", keyPoints: ["g = 9.8 m/s\xB2", "Equations with free-fall acceleration"] }
    ]
  },
  {
    id: "chap-phy-9-3",
    subjectId: "physics",
    subjectName: "Physics",
    classLevel: "Class 9",
    chapterNumber: 3,
    name: "Dynamics",
    description: "Force, inertia, momentum, Newton's three laws of motion, mass and weight, friction, and uniform circular motion.",
    topics: [
      { id: "top-phy-9-3-1", chapterId: "chap-phy-9-3", topicNumber: "3.1", title: "Newton's Laws of Motion", keyPoints: ["First law & Inertia", "Second law F = ma", "Third law Action & Reaction"] },
      { id: "top-phy-9-3-2", chapterId: "chap-phy-9-3", topicNumber: "3.2", title: "Linear Momentum & Law of Conservation", keyPoints: ["p = mv", "Isolated system total momentum is conserved", "Impulse"] },
      { id: "top-phy-9-3-3", chapterId: "chap-phy-9-3", topicNumber: "3.3", title: "Friction and Centripetal Force", keyPoints: ["Static vs Kinetic friction", "Centripetal force F_c = mv\xB2/r", "Centrifuge applications"] }
    ]
  },
  {
    id: "chap-phy-9-5",
    subjectId: "physics",
    subjectName: "Physics",
    classLevel: "Class 9",
    chapterNumber: 5,
    name: "Gravitation",
    description: "Newton's law of universal gravitation, mass of earth, variation of g with altitude, and artificial satellites.",
    topics: [
      { id: "top-phy-9-5-1", chapterId: "chap-phy-9-5", topicNumber: "5.1", title: "Law of Universal Gravitation", keyPoints: ["F = G(m1 m2)/r\xB2", "G = 6.673 \xD7 10\u207B\xB9\xB9 N m\xB2 kg\u207B\xB2", "Inverse square relationship"] },
      { id: "top-phy-9-5-2", chapterId: "chap-phy-9-5", topicNumber: "5.2", title: "Mass of the Earth & Satellites", keyPoints: ["M_e = 6.0 \xD7 10\xB2\u2074 kg", "Orbital speed v\u2080 = \u221A(gR)", "Geostationary satellites"] }
    ]
  },
  // --- Class 9 Chemistry ---
  {
    id: "chap-chem-9-1",
    subjectId: "chemistry",
    subjectName: "Chemistry",
    classLevel: "Class 9",
    chapterNumber: 1,
    name: "Fundamentals of Chemistry",
    description: "Branches of chemistry, basic definitions, elements, compounds, mixtures, atomic number, mass number, Avogadro number, and mole concept.",
    topics: [
      { id: "top-chem-9-1-1", chapterId: "chap-chem-9-1", topicNumber: "1.1", title: "Atomic Number, Mass Number & Valency", keyPoints: ["Z = proton count", "A = protons + neutrons", "Variable valency"] },
      { id: "top-chem-9-1-2", chapterId: "chap-chem-9-1", topicNumber: "1.2", title: "Mole and Avogadro\u2019s Number", keyPoints: ["NA = 6.022 \xD7 10\xB2\xB3", "Mole = Mass / Molar Mass", "Molar volume at STP = 22.4 dm\xB3"] }
    ]
  },
  {
    id: "chap-chem-9-3",
    subjectId: "chemistry",
    subjectName: "Chemistry",
    classLevel: "Class 9",
    chapterNumber: 3,
    name: "Periodic Table & Periodicity",
    description: "Modern periodic law, groups and periods, periodic trends in physical properties (atomic radius, ionization energy, electron affinity, and electronegativity).",
    topics: [
      { id: "top-chem-9-3-1", chapterId: "chap-chem-9-3", topicNumber: "3.1", title: "Periodic Trends Across Periods and Groups", keyPoints: ["Atomic radius decreases across period, increases down group", "Shielding effect"] },
      { id: "top-chem-9-3-2", chapterId: "chap-chem-9-3", topicNumber: "3.2", title: "Ionization Energy & Electronegativity", keyPoints: ["Ionization energy trend", "Fluorine highest electronegativity (4.0)", "Electron affinity"] }
    ]
  },
  // --- Class 11 Biology (MDCAT Core) ---
  {
    id: "chap-bio-11-1",
    subjectId: "biology",
    subjectName: "Biology",
    classLevel: "Class 11",
    chapterNumber: 1,
    name: "Cell Structure and Function",
    description: "Structure of generalized cell, fluid mosaic model of plasma membrane, organelles (endoplasmic reticulum, ribosomes, Golgi apparatus, mitochondria, chloroplasts, and nucleus).",
    topics: [
      { id: "top-bio-11-1-1", chapterId: "chap-bio-11-1", topicNumber: "1.1", title: "Plasma Membrane & Fluid Mosaic Model", keyPoints: ["Phospholipid bilayer", "Integral & peripheral proteins", "Selective permeability"] },
      { id: "top-bio-11-1-2", chapterId: "chap-bio-11-1", topicNumber: "1.2", title: "Mitochondria & Chloroplasts (Energy Transducers)", keyPoints: ["Cristae and matrix", "Thylakoids and stroma", "Endosymbiotic theory"] },
      { id: "top-bio-11-1-3", chapterId: "chap-bio-11-1", topicNumber: "1.3", title: "Nucleus & Chromatin Structure", keyPoints: ["Nuclear pore complex", "Nucleolus (rRNA synthesis)", "Histone proteins"] }
    ]
  },
  {
    id: "chap-bio-11-2",
    subjectId: "biology",
    subjectName: "Biology",
    classLevel: "Class 11",
    chapterNumber: 2,
    name: "Biological Molecules",
    description: "Importance of water, carbohydrates (monosaccharides, disaccharides, polysaccharides), lipids, proteins (structure and types), nucleic acids (DNA and RNA), and conjugated molecules.",
    topics: [
      { id: "top-bio-11-2-1", chapterId: "chap-bio-11-2", topicNumber: "2.1", title: "Carbohydrates & Glycosidic Bonds", keyPoints: ["Glucose & Fructose isomers", "Condensation vs Hydrolysis", "Cellulose, Starch, Glycogen"] },
      { id: "top-bio-11-2-2", chapterId: "chap-bio-11-2", topicNumber: "2.2", title: "Protein Architecture (1\xB0, 2\xB0, 3\xB0, 4\xB0 Structures)", keyPoints: ["Peptide bonds", "Alpha helix & Beta sheets", "Hemoglobin quaternary structure"] },
      { id: "top-bio-11-2-3", chapterId: "chap-bio-11-2", topicNumber: "2.3", title: "Nucleic Acids (DNA vs RNA)", keyPoints: ["Phosphodiester linkage", "Watson-Crick double helix", "Purines (A,G) vs Pyrimidines (C,T,U)"] }
    ]
  },
  {
    id: "chap-bio-11-14",
    subjectId: "biology",
    subjectName: "Biology",
    classLevel: "Class 11",
    chapterNumber: 14,
    name: "Circulation & Cardiovascular System",
    description: "Transport in animals, human blood composition, cardiac cycle, blood pressure, heart diseases, and lymphatic system.",
    topics: [
      { id: "top-bio-11-14-1", chapterId: "chap-bio-11-14", topicNumber: "14.1", title: "Human Heart Anatomy & Cardiac Cycle", keyPoints: ["SA node pacemaker & AV node", "Systole (0.3s) & Diastole (0.5s)", "Coronary circulation"] },
      { id: "top-bio-11-14-2", chapterId: "chap-bio-11-14", topicNumber: "14.2", title: "Blood Vessels & Blood Pressure", keyPoints: ["Arteries, Veins, Capillaries", "Normal BP 120/80 mmHg", "Atherosclerosis & Arteriosclerosis"] }
    ]
  },
  // --- Class 11 Mathematics (ECAT Core) ---
  {
    id: "chap-math-11-1",
    subjectId: "mathematics",
    subjectName: "Mathematics",
    classLevel: "Class 11",
    chapterNumber: 3,
    name: "Matrices and Determinants",
    description: "Types of matrices, operations, determinant of square matrix, adjoint, inverse, Cramer rule, and matrix inversion method.",
    topics: [
      { id: "top-math-11-3-1", chapterId: "chap-math-11-1", topicNumber: "3.1", title: "Determinant Properties & Singular Matrices", keyPoints: ["|AB| = |A||B|", "|kA| = k\u207F|A|", "A\u207B\xB9 = adj(A) / |A|"] },
      { id: "top-math-11-3-2", chapterId: "chap-math-11-1", topicNumber: "3.2", title: "Solving Linear Systems (Cramer\u2019s Rule)", keyPoints: ["x = |A1|/|A|, y = |A2|/|A|", "Echelon & Reduced Echelon forms", "Rank of a matrix"] }
    ]
  },
  {
    id: "chap-math-11-9",
    subjectId: "mathematics",
    subjectName: "Mathematics",
    classLevel: "Class 11",
    chapterNumber: 9,
    name: "Fundamentals of Trigonometry",
    description: "Units of angular measurement, radian-degree conversion, fundamental identities, and signs of trigonometric ratios in four quadrants.",
    topics: [
      { id: "top-math-11-9-1", chapterId: "chap-math-11-9", topicNumber: "9.1", title: "Trigonometric Ratios & CAST Rule", keyPoints: ["All-Sin-Tan-Cos quadrant signs", "General angles \u03B8 + 2k\u03C0", "Domain & Range"] },
      { id: "top-math-11-9-2", chapterId: "chap-math-11-9", topicNumber: "9.2", title: "Fundamental Trigonometric Identities", keyPoints: ["sin\xB2\u03B8 + cos\xB2\u03B8 = 1", "sec\xB2\u03B8 - tan\xB2\u03B8 = 1", "csc\xB2\u03B8 - cot\xB2\u03B8 = 1"] }
    ]
  },
  // --- Computer Science (Class 10 & 12) ---
  {
    id: "chap-cs-10-1",
    subjectId: "computer-science",
    subjectName: "Computer Science",
    classLevel: "Class 10",
    chapterNumber: 1,
    name: "Problem Solving and Algorithm Design",
    description: "Problem solving steps, flowcharts, flowchart symbols, algorithms, and algorithm efficiency.",
    topics: [
      { id: "top-cs-10-1-1", chapterId: "chap-cs-10-1", topicNumber: "1.1", title: "Flowcharts and Standard Symbols", keyPoints: ["Terminal, Process, Decision, Input/Output symbols", "Connector & Flow lines"] },
      { id: "top-cs-10-1-2", chapterId: "chap-cs-10-1", topicNumber: "1.2", title: "Algorithm Efficiency and Complexity", keyPoints: ["Time vs Space complexity", "Trace table verification"] }
    ]
  },
  {
    id: "chap-cs-12-1",
    subjectId: "computer-science",
    subjectName: "Computer Science",
    classLevel: "Class 12",
    chapterNumber: 1,
    name: "Database Management Systems",
    description: "Data vs Information, File processing system vs DBMS, Database architecture, Relational models, Keys, and Normalization.",
    topics: [
      { id: "top-cs-12-1-1", chapterId: "chap-cs-12-1", topicNumber: "1.1", title: "Relational Database Concepts & Keys", keyPoints: ["Primary Key (Unique + Not Null)", "Foreign Key (Referential integrity)", "Candidate & Composite keys"] },
      { id: "top-cs-12-1-2", chapterId: "chap-cs-12-1", topicNumber: "1.2", title: "Database Normalization (1NF, 2NF, 3NF)", keyPoints: ["Eliminating anomalies (Insert, Update, Delete)", "Functional dependency", "Transitive dependency"] }
    ]
  },
  {
    id: "chap-cs-12-2",
    subjectId: "computer-science",
    subjectName: "Computer Science",
    classLevel: "Class 12",
    chapterNumber: 2,
    name: "Data Structures and Algorithms",
    description: "Arrays, Stacks (LIFO), Queues (FIFO), Linked Lists, Binary Trees, and Searching/Sorting algorithms.",
    topics: [
      { id: "top-cs-12-2-1", chapterId: "chap-cs-12-2", topicNumber: "2.1", title: "Linear Data Structures (Stack & Queue)", keyPoints: ["Stack: Push/Pop/Peek (LIFO)", "Queue: Enqueue/Dequeue (FIFO)", "Circular queue"] },
      { id: "top-cs-12-2-2", chapterId: "chap-cs-12-2", topicNumber: "2.2", title: "Searching & Sorting Algorithms", keyPoints: ["Binary search O(log n)", "Bubble sort O(n\xB2)", "Quick sort O(n log n)"] }
    ]
  },
  // --- Pakistan Studies ---
  {
    id: "chap-pak-10-1",
    subjectId: "pakistan-studies",
    subjectName: "Pakistan Studies",
    classLevel: "Class 10",
    chapterNumber: 1,
    name: "Pakistan Movement and Political History",
    description: "Historical background of Pakistan movement, Two-Nation Theory, 1940 Lahore Resolution, Cabinet Mission, and Independence 1947.",
    topics: [
      { id: "top-pak-10-1-1", chapterId: "chap-pak-10-1", topicNumber: "1.1", title: "Lahore Resolution 23rd March 1940", keyPoints: ["Drafted by Sir Zafarullah Khan", "Presented by A.K. Fazlul Huq", "Historic turning point for Muslim homeland"] },
      { id: "top-pak-10-1-2", chapterId: "chap-pak-10-1", topicNumber: "1.2", title: "Constitutional History & 1973 Constitution", keyPoints: ["Parliamentary system", "Senate 6-year term rotation", "Fundamental human rights"] }
    ]
  },
  // --- Islamiat ---
  {
    id: "chap-isl-10-1",
    subjectId: "islamiat",
    subjectName: "Islamiat",
    classLevel: "Class 10",
    chapterNumber: 1,
    name: "Quranic Sciences and Hadith",
    description: "Surahs study, Makki vs Madani Surahs, Ahadees-e-Mubaraka, and ethical principles of Islam.",
    topics: [
      { id: "top-isl-10-1-1", chapterId: "chap-isl-10-1", topicNumber: "1.1", title: "Makki vs Madani Surahs & Quranic Structure", keyPoints: ["86 Makki Surahs (Beliefs & Oneness)", "28 Madani Surahs (Social & State laws)", "114 Total Surahs"] },
      { id: "top-isl-10-1-2", chapterId: "chap-isl-10-1", topicNumber: "1.2", title: "Seerat-un-Nabi & Treaties", keyPoints: ["Treaty of Hudaibiyyah 6 AH", "Conquest of Makkah 8 AH", "Farewell Sermon (Khutba Hajjat-ul-Wida)"] }
    ]
  }
];
var MASTER_STUDY_NOTES = [
  {
    id: "note-class10-phy-ch5",
    title: "Class 10 Physics Chapter 12: Geometrical Optics Master Revision Notes",
    board: "All Boards",
    subject: "Physics",
    classLevel: "Class 10",
    chapter: "Geometrical Optics",
    topic: "Refraction & Total Internal Reflection",
    description: "Complete board-oriented revision guide covering reflection, refraction, spherical mirrors formula, Snell law, total internal reflection, and optical fiber communications.",
    type: "Notes",
    contentSnippet: "Comprehensive conceptual notes on reflection, refraction, spherical mirrors, mirror formula 1/f = 1/p + 1/q, Snell law, total internal reflection, and optical fibers.",
    fullContent: `CHAPTER 12: GEOMETRICAL OPTICS (CLASS 10 COMPLETE REVISION NOTES)
Taleem Guru Official Academic Material

1. REFLECTION OF LIGHT
When light traveling in a certain medium falls on the surface of another medium, a part of it turns back into the same medium. This turning back is called reflection.
- First Law of Reflection: The incident ray, the reflected ray, and the normal at the point of incidence all lie in the same plane.
- Second Law of Reflection: The angle of incidence (\u2220i) is equal to the angle of reflection (\u2220r).

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
Snell's Law: n\u2081 sin(\u03B8\u2081) = n\u2082 sin(\u03B8\u2082)
Refractive Index: n = c / v

5. TOTAL INTERNAL REFLECTION
When light travels from an optically denser medium into a rarer medium at an angle of incidence greater than the critical angle (\u03B8c), the entire light ray is reflected back into the denser medium.
Conditions:
1. Light must enter from denser to rarer medium.
2. Angle of incidence must exceed critical angle.
Formula: sin(\u03B8c) = 1 / n`,
    content: `Comprehensive revision notes for Class 10 Physics Chapter 12 Geometrical Optics with solved formulas, definitions, and board diagrams.`,
    readTime: "12 mins",
    downloadsCount: 0,
    status: "Published",
    keyPoints: [
      "Mirror Equation: 1/f = 1/p + 1/q",
      "Snell's Law: n\u2081 sin(\u03B8\u2081) = n\u2082 sin(\u03B8\u2082)",
      "Critical Angle: sin(\u03B8c) = 1/n",
      "Optical Fibers utilize continuous total internal reflection"
    ],
    thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80",
    pdfUrl: "https://taleemguru.pk/pdf/notes/class10-physics-optics.pdf",
    createdAt: "2026-01-10"
  },
  {
    id: "note-math-differentiation-formulas",
    title: "Class 12 & ECAT Mathematics: Master Calculus & Derivatives Formula Sheet",
    board: "All Boards",
    subject: "Mathematics",
    classLevel: "Class 12",
    chapter: "Differentiation",
    topic: "Derivative Rules & Trig Formulas",
    description: "Complete handbook of all critical differentiation rules, product/quotient/chain rules, implicit derivatives, logarithmic and trigonometric formulas.",
    type: "Formulas",
    contentSnippet: "All critical differentiation formulas, chain rule, product rule, quotient rule, trigonometric, logarithmic and inverse trigonometric derivatives for board and entry tests.",
    fullContent: `MASTER DIFFERENTIATION FORMULA SHEET
Taleem Guru Engineering Test Series (ECAT & Board Class 12)

1. BASIC RULES
\u2022 Power Rule: d/dx (x\u207F) = n\xB7x\u207F\u207B\xB9
\u2022 Constant Rule: d/dx (c) = 0
\u2022 Constant Multiple Rule: d/dx [c\xB7f(x)] = c\xB7f'(x)
\u2022 Sum / Difference Rule: d/dx [f(x) \xB1 g(x)] = f'(x) \xB1 g'(x)

2. PRODUCT & QUOTIENT RULES
\u2022 Product Rule: d/dx [u\xB7v] = u\xB7(dv/dx) + v\xB7(du/dx)
\u2022 Quotient Rule: d/dx [u/v] = [v\xB7(du/dx) - u\xB7(dv/dx)] / v\xB2
\u2022 Chain Rule: dy/dx = (dy/du) \xB7 (du/dx)

3. TRIGONOMETRIC DERIVATIVES
\u2022 d/dx [sin(x)] = cos(x)
\u2022 d/dx [cos(x)] = -sin(x)
\u2022 d/dx [tan(x)] = sec\xB2(x)
\u2022 d/dx [cot(x)] = -csc\xB2(x)
\u2022 d/dx [sec(x)] = sec(x)\xB7tan(x)
\u2022 d/dx [csc(x)] = -csc(x)\xB7cot(x)

4. EXPONENTIAL & LOGARITHMIC DERIVATIVES
\u2022 d/dx [e\u02E3] = e\u02E3
\u2022 d/dx [a\u02E3] = a\u02E3 \xB7 ln(a)
\u2022 d/dx [ln(x)] = 1 / x
\u2022 d/dx [log\u2090(x)] = 1 / [x \xB7 ln(a)]`,
    readTime: "8 mins",
    downloadsCount: 0,
    status: "Published",
    keyPoints: [
      "Power Rule: d/dx(x\u207F) = n x\u207F\u207B\xB9",
      "Product Rule: (uv)' = u'v + uv'",
      "Quotient Rule: (u/v)' = (u'v - uv') / v\xB2",
      "Chain Rule: dy/dx = (dy/du) * (du/dx)"
    ],
    thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80",
    pdfUrl: "https://taleemguru.pk/pdf/notes/class12-calculus-derivatives.pdf",
    createdAt: "2026-01-18"
  },
  {
    id: "note-mdcat-bio-cell",
    title: "MDCAT Biology: High-Yield Cell Structure & Organelles Summary",
    board: "Federal & Punjab Boards",
    subject: "Biology",
    classLevel: "Class 11",
    chapter: "Cell Structure & Function",
    topic: "Organelles & Endosymbiotic Theory",
    description: "High-yield revision summary for MDCAT, UHS & NUMS candidates covering cellular enzymes, prokaryote vs eukaryote differences, and cell membrane transport.",
    type: "Definitions",
    contentSnippet: "High-yield points for UHS and NUMS: Endosymbiotic theory, Ribosomes (70S vs 80S), Golgi cisternae, Lysosomes hydrolytic enzymes, and Cytoskeleton fibers.",
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
    readTime: "10 mins",
    downloadsCount: 0,
    status: "Published",
    keyPoints: [
      "Fluid Mosaic Model: Singer & Nicolson 1972",
      "Prokaryotic 70S vs Eukaryotic 80S Ribosomes",
      "Mitochondria: Cristae folds increase surface area for ATP synthase"
    ],
    thumbnail: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80",
    pdfUrl: "https://taleemguru.pk/pdf/notes/mdcat-cell-biology.pdf",
    createdAt: "2026-02-02"
  },
  {
    id: "note-chem-equilibrium-10",
    title: "Class 10 Chemistry Chapter 9: Chemical Equilibrium Solved Short & Long Qs",
    board: "BISE Lahore",
    subject: "Chemistry",
    classLevel: "Class 10",
    chapter: "Chemical Equilibrium",
    topic: "Law of Mass Action & Kc Derivations",
    description: "Complete solved short questions, conceptual explanations, numerical problems on Kc value calculation, and equilibrium shifts.",
    type: "Short Questions",
    contentSnippet: "Step-by-step derivation of Law of Mass Action Kc expression with units, dynamic equilibrium condition, and Le Chatelier principle overview.",
    fullContent: `CLASS 10 CHEMISTRY CHAPTER 9: CHEMICAL EQUILIBRIUM
Solved Board Questions & Answers

Q1: What is the difference between static and dynamic equilibrium?
Answer:
- Static Equilibrium: A state where a reaction ceases completely (e.g., a building standing still).
- Dynamic Equilibrium: A state where forward and reverse reactions proceed at equal rates, keeping concentrations constant.

Q2: Derive the equilibrium constant expression for the reaction: aA + bB \u21CC cC + dD.
Answer:
Rate of forward reaction Rf = kf [A]^a [B]^b
Rate of reverse reaction Rr = kr [C]^c [D]^d
At equilibrium: Rf = Rr => kf [A]^a [B]^b = kr [C]^c [D]^d
Kc = kf / kr = [C]^c [D]^d / ([A]^a [B]^b)`,
    readTime: "11 mins",
    downloadsCount: 0,
    status: "Published",
    keyPoints: [
      "Dynamic Equilibrium occurs in closed systems",
      "Kc = [Products] / [Reactants]",
      "If Qc < Kc, reaction proceeds forward to reach equilibrium"
    ],
    thumbnail: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80",
    pdfUrl: "https://taleemguru.pk/pdf/notes/class10-chem-equilibrium.pdf",
    createdAt: "2026-02-14"
  },
  {
    id: "note-css-pak-studies-1940",
    title: "Pakistan Studies & History: Lahore Resolution 1940 to 1947 Partition Analysis",
    board: "All Boards",
    subject: "Pakistan Studies",
    classLevel: "Class 10",
    chapter: "Ideology of Pakistan & Freedom Movement",
    topic: "1940 Resolution & 3rd June Plan",
    description: "Analytical review of the 1940 Lahore Resolution, Cripps Mission 1942, Cabinet Mission Plan 1946, 3rd June Plan, and Boundary Commission awards.",
    type: "Summary",
    contentSnippet: "In-depth historical points: Pakistan Resolution text, Quaid-e-Azam presidential address, Cripps proposals rejection reasons, and Radcliffe Award controversies.",
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
    readTime: "15 mins",
    downloadsCount: 0,
    status: "Published",
    keyPoints: [
      "Lahore Resolution 23 March 1940 presented by A.K. Fazlul Haq",
      "Cabinet Mission Plan 1946 had three sections (A, B, C)",
      "Independence achieved on 27th Ramadan 1366 AH (14 August 1947)"
    ],
    thumbnail: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=600&auto=format&fit=crop&q=80",
    pdfUrl: "https://taleemguru.pk/pdf/notes/pak-studies-1940-1947.pdf",
    createdAt: "2026-02-20"
  }
];
var MASTER_PAST_PAPERS = [
  {
    id: "pp-lhr-10-phy-2024",
    title: "BISE Lahore Class 10 Physics Annual Paper 2024 (Group 1)",
    board: "BISE Lahore",
    province: "Punjab",
    classLevel: "Class 10",
    subject: "Physics",
    chapter: "Full Book",
    year: 2024,
    paperGroup: "Group 1",
    type: "Objective (MCQs)",
    paperType: "First Annual Examination",
    questionsCount: 12,
    downloadUrl: "https://taleemguru.pk/papers/bise-lhr-10-phy-2024.pdf",
    status: "Published",
    description: "Official 2024 Board Annual Question Paper with verified answer keys, detailed explanations, and marking scheme."
  },
  {
    id: "pp-lhr-10-phy-2023",
    title: "BISE Lahore Class 10 Physics Annual Paper 2023 (Group 1)",
    board: "BISE Lahore",
    province: "Punjab",
    classLevel: "Class 10",
    subject: "Physics",
    chapter: "Full Book",
    year: 2023,
    paperGroup: "Group 1",
    type: "Objective (MCQs)",
    paperType: "Annual Group 1",
    questionsCount: 12,
    downloadUrl: "https://taleemguru.pk/papers/bise-lhr-10-phy-2023-g1.pdf",
    status: "Published",
    description: "Complete 12 MCQs paper with optical refraction, capacitance, and electrostatics questions."
  },
  {
    id: "pp-lhr-10-phy-2022",
    title: "BISE Lahore Class 10 Physics Annual Paper 2022 (Group 2)",
    board: "BISE Lahore",
    province: "Punjab",
    classLevel: "Class 10",
    subject: "Physics",
    chapter: "Full Book",
    year: 2022,
    paperGroup: "Group 2",
    type: "Objective (MCQs)",
    paperType: "Annual Group 2",
    questionsCount: 12,
    downloadUrl: "https://taleemguru.pk/papers/bise-lhr-10-phy-2022-g2.pdf",
    status: "Published",
    description: "Morning and Evening shift solved past paper with authentic solutions."
  },
  {
    id: "pp-fbise-10-chem-2024",
    title: "FBISE Federal Board Class 10 Chemistry Annual Paper 2024",
    board: "FBISE Islamabad",
    province: "Federal",
    classLevel: "Class 10",
    subject: "Chemistry",
    chapter: "Full Book",
    year: 2024,
    paperGroup: "Annual",
    type: "Objective (MCQs)",
    paperType: "SLO Based Annual Exam",
    questionsCount: 12,
    downloadUrl: "https://taleemguru.pk/papers/fbise-10-chem-2024.pdf",
    status: "Published",
    description: "Federal Board SLO (Student Learning Outcomes) based conceptual paper with answer keys."
  },
  {
    id: "pp-khi-12-math-2023",
    title: "BIEK Karachi Board Class 12 Mathematics Annual Exam 2023",
    board: "BSEK / BIEK Karachi",
    province: "Sindh",
    classLevel: "Class 12",
    subject: "Mathematics",
    chapter: "Full Book",
    year: 2023,
    paperGroup: "Annual",
    type: "Objective (MCQs)",
    paperType: "HSSC-II Science General & Pre-Engineering",
    questionsCount: 20,
    downloadUrl: "https://taleemguru.pk/papers/biek-12-math-2023.pdf",
    status: "Published",
    description: "Karachi Board 20-mark objective MCQ test with calculus and coordinate geometry questions."
  },
  {
    id: "pp-pew-10-bio-2023",
    title: "BISE Peshawar Class 10 Biology Annual Examination 2023",
    board: "BISE Peshawar",
    province: "KPK",
    classLevel: "Class 10",
    subject: "Biology",
    chapter: "Full Book",
    year: 2023,
    paperGroup: "Annual",
    type: "Objective (MCQs)",
    paperType: "SSC-II Science Group",
    questionsCount: 12,
    downloadUrl: "https://taleemguru.pk/papers/bise-pew-10-bio-2023.pdf",
    status: "Published",
    description: "Peshawar Board official solved examination paper for Matric Class 10 students."
  },
  {
    id: "pp-qta-10-math-2023",
    title: "BBISE Quetta Board Class 10 Mathematics Annual Paper 2023",
    board: "BBISE Quetta",
    province: "Balochistan",
    classLevel: "Class 10",
    subject: "Mathematics",
    chapter: "Full Book",
    year: 2023,
    paperGroup: "Annual",
    type: "Objective (MCQs)",
    paperType: "Matric Annual Exam",
    questionsCount: 15,
    downloadUrl: "https://taleemguru.pk/papers/bbise-qta-10-math-2023.pdf",
    status: "Published",
    description: "Quetta Board official 15 solved MCQs on quadratic equations, sets, matrices, and trigonometry."
  },
  {
    id: "pp-ajk-10-phy-2023",
    title: "BISE AJK Mirpur Board Class 10 Physics Annual Paper 2023",
    board: "BISE AJK (Mirpur)",
    province: "AJK",
    classLevel: "Class 10",
    subject: "Physics",
    chapter: "Full Book",
    year: 2023,
    paperGroup: "Annual",
    type: "Objective (MCQs)",
    paperType: "SSC Part 2 Examination",
    questionsCount: 12,
    downloadUrl: "https://taleemguru.pk/papers/bise-ajk-10-phy-2023.pdf",
    status: "Published",
    description: "Azad Jammu & Kashmir Mirpur Board official physics past paper with complete solution key."
  },
  {
    id: "pp-mdcat-uhs-2023",
    title: "MDCAT UHS Official Past Paper 2023 (Full Solution & Keys)",
    board: "FBISE Islamabad",
    province: "Punjab",
    classLevel: "Class 12",
    subject: "Biology",
    chapter: "MDCAT Syllabus",
    year: 2023,
    paperGroup: "Annual",
    type: "Objective (MCQs)",
    paperType: "PM&DC National MDCAT",
    questionsCount: 68,
    downloadUrl: "https://taleemguru.pk/papers/mdcat-uhs-2023.pdf",
    status: "Published",
    description: "PM&DC official past paper containing 68 high-yield biology questions with detailed explanations."
  }
];

// src/data/mockData.ts
var MCQS_DATABASE = [
  // Class 10 Physics Chapter 5 & Classical Physics
  {
    id: "mcq-1",
    question: "In geometrical optics, the ratio of the speed of light in a vacuum to that in a medium is called:",
    options: ["Critical angle", "Refractive index", "Magnification", "Optical density"],
    correctAnswer: 1,
    explanation: "Refractive index (n) is defined as n = c / v, where c is the speed of light in vacuum and v is the speed of light in the medium.",
    subject: "Physics",
    chapter: "Geometrical Optics",
    topic: "Refraction of Light",
    difficulty: "Medium",
    classLevel: "Class 10 (Matric Pt 2)",
    board: "BISE Lahore",
    year: 2023,
    tags: ["Optics", "Class 10", "Refraction", "Physics"]
  },
  {
    id: "mcq-2",
    question: "Which type of mirror is predominantly used as a rear-view mirror in vehicles in Pakistan?",
    options: ["Concave mirror", "Convex mirror", "Plane mirror", "Parabolic mirror"],
    correctAnswer: 1,
    explanation: "Convex mirrors produce virtual, erect, and diminished images, providing a much wider field of view for drivers.",
    subject: "Physics",
    chapter: "Geometrical Optics",
    topic: "Spherical Mirrors",
    difficulty: "Easy",
    classLevel: "Class 10 (Matric Pt 2)",
    board: "FBISE Islamabad",
    year: 2024,
    tags: ["Spherical Mirrors", "Optics", "Class 10"]
  },
  {
    id: "mcq-3",
    question: "The unit of electric charge in SI units is:",
    options: ["Ampere", "Coulomb", "Volt", "Ohm"],
    correctAnswer: 1,
    explanation: "The SI unit of electric charge is the Coulomb (C), where 1 C = 1 Ampere \xD7 1 second.",
    subject: "Physics",
    chapter: "Electrostatics",
    topic: "Coulomb Law",
    difficulty: "Easy",
    classLevel: "Class 10 (Matric Pt 2)",
    board: "BISE Rawalpindi",
    year: 2022,
    tags: ["Electrostatics", "Units", "Physics"]
  },
  {
    id: "mcq-4",
    question: "What is the value of gravitational constant G in SI units?",
    options: ["6.673 \xD7 10\u207B\xB9\xB9 N m\xB2 kg\u207B\xB2", "9.8 m s\u207B\xB2", "3.0 \xD7 10\u2078 m s\u207B\xB9", "1.6 \xD7 10\u207B\xB9\u2079 C"],
    correctAnswer: 0,
    explanation: "The universal gravitational constant G is approximately 6.673 \xD7 10\u207B\xB9\xB9 N m\xB2 kg\u207B\xB2.",
    subject: "Physics",
    chapter: "Gravitation",
    topic: "Newton's Law of Gravitation",
    difficulty: "Medium",
    classLevel: "Class 9 (Matric Pt 1)",
    board: "BISE Gujranwala",
    year: 2023,
    tags: ["Gravitation", "Class 9", "Constants"]
  },
  // Chemistry
  {
    id: "mcq-5",
    question: "Which of the following organic compounds is an example of an alkyne?",
    options: ["Methane (CH\u2084)", "Ethene (C\u2082H\u2084)", "Ethyne (C\u2082H\u2082)", "Propane (C\u2083H\u2088)"],
    correctAnswer: 2,
    explanation: "Alkynes are hydrocarbons containing at least one carbon-carbon triple bond. Ethyne (acetylene, C\u2082H\u2082) is the simplest alkyne.",
    subject: "Chemistry",
    chapter: "Hydrocarbons",
    topic: "Alkynes",
    difficulty: "Easy",
    classLevel: "Class 10 (Matric Pt 2)",
    board: "BISE Faisalabad",
    year: 2023,
    tags: ["Chemistry", "Hydrocarbons", "Organic Chemistry"]
  },
  {
    id: "mcq-6",
    question: "What is the pH of pure water at 25 \xB0C?",
    options: ["0", "7", "14", "1"],
    correctAnswer: 1,
    explanation: "At 25 \xB0C, pure water dissociates into equal concentrations of H\u207A and OH\u207B ions (1.0 \xD7 10\u207B\u2077 M), yielding a neutral pH of 7.",
    subject: "Chemistry",
    chapter: "Acids, Bases and Salts",
    topic: "pH Scale",
    difficulty: "Easy",
    classLevel: "Class 10 (Matric Pt 2)",
    board: "BISE Multan",
    year: 2024,
    tags: ["Chemistry", "Acids and Bases", "pH"]
  },
  {
    id: "mcq-7",
    question: "In the modern periodic table, elements in the same vertical group possess:",
    options: ["Same number of shells", "Same number of valence electrons", "Same atomic mass", "Same atomic number"],
    correctAnswer: 1,
    explanation: "Elements in the same group have identical valence electron configurations, which gives them similar chemical properties.",
    subject: "Chemistry",
    chapter: "Periodic Table & Periodicity",
    topic: "Groups and Periods",
    difficulty: "Medium",
    classLevel: "Class 9 (Matric Pt 1)",
    board: "BSEK Karachi",
    year: 2023,
    tags: ["Periodic Table", "Valence", "Chemistry"]
  },
  // Biology (MDCAT & FSc)
  {
    id: "mcq-8",
    question: "Which organelle is universally recognized as the powerhouse of eukaryotic cells?",
    options: ["Ribosome", "Golgi apparatus", "Mitochondria", "Endoplasmic reticulum"],
    correctAnswer: 2,
    explanation: "Mitochondria generate most of the chemical energy needed to power the cell\u2019s biochemical reactions in the form of ATP.",
    subject: "Biology",
    chapter: "Cell Structure and Function",
    topic: "Mitochondria",
    difficulty: "Easy",
    classLevel: "Class 11 (FSc / ICS Pt 1)",
    exam: "MDCAT",
    board: "UHS Lahore",
    year: 2023,
    tags: ["Biology", "MDCAT", "Cytology"]
  },
  {
    id: "mcq-9",
    question: "During human cardiac cycle, the ventricular contraction corresponds to:",
    options: ["Diastole", "Systole", "Atrial fibrillation", "Isovolumetric relaxation"],
    correctAnswer: 1,
    explanation: "Systole refers to the phase of heartbeat when the heart muscle contracts and pumps blood from the chambers into the arteries.",
    subject: "Biology",
    chapter: "Circulation",
    topic: "Cardiac Cycle",
    difficulty: "Medium",
    classLevel: "Class 11 (FSc / ICS Pt 1)",
    exam: "MDCAT",
    board: "PM&DC",
    year: 2024,
    tags: ["MDCAT", "Biology", "Physiology"]
  },
  {
    id: "mcq-10",
    question: "Which nitrogenous base is present in RNA but absent in DNA?",
    options: ["Adenine", "Cytosine", "Guanine", "Uracil"],
    correctAnswer: 3,
    explanation: "In RNA, Uracil (U) replaces Thymine (T) and forms hydrogen bonds with Adenine.",
    subject: "Biology",
    chapter: "Biological Molecules",
    topic: "Nucleic Acids",
    difficulty: "Easy",
    classLevel: "Class 11 (FSc / ICS Pt 1)",
    exam: "NUMS",
    year: 2023,
    tags: ["Genetics", "MDCAT", "Biology"]
  },
  // Mathematics (ECAT & Board)
  {
    id: "mcq-11",
    question: "If A is a 2\xD72 matrix and |A| = 5, what is the value of |3A|?",
    options: ["15", "45", "9", "25"],
    correctAnswer: 1,
    explanation: "For an n\xD7n square matrix, |kA| = k\u207F |A|. Since n=2, |3A| = 3\xB2 \xD7 |A| = 9 \xD7 5 = 45.",
    subject: "Mathematics",
    chapter: "Matrices and Determinants",
    topic: "Properties of Determinants",
    difficulty: "Hard",
    classLevel: "Class 11 (FSc / ICS Pt 1)",
    exam: "ECAT",
    board: "UET Lahore",
    year: 2023,
    tags: ["ECAT", "Math", "Matrices"]
  },
  {
    id: "mcq-12",
    question: "The derivative of sin\xB2(x) with respect to x is:",
    options: ["cos\xB2(x)", "2 sin(x) cos(x)", "2 cos(x)", "-2 sin(x) cos(x)"],
    correctAnswer: 1,
    explanation: "By the chain rule: d/dx [sin\xB2(x)] = 2 sin(x) \xB7 d/dx[sin(x)] = 2 sin(x) cos(x) = sin(2x).",
    subject: "Mathematics",
    chapter: "Differentiation",
    topic: "Trigonometric Derivatives",
    difficulty: "Medium",
    classLevel: "Class 12 (FSc / ICS Pt 2)",
    exam: "NUST-NET",
    year: 2024,
    tags: ["Calculus", "Derivatives", "ECAT"]
  },
  // Computer Science
  {
    id: "mcq-13",
    question: "Which data structure operates strictly on a First-In, First-Out (FIFO) principle?",
    options: ["Stack", "Queue", "Binary Tree", "Graph"],
    correctAnswer: 1,
    explanation: "A Queue enforces FIFO (First-In, First-Out) where elements inserted first are removed first, unlike a Stack which is LIFO.",
    subject: "Computer Science",
    chapter: "Data Structures",
    topic: "Queues and Stacks",
    difficulty: "Easy",
    classLevel: "Class 12 (FSc / ICS Pt 2)",
    exam: "FAST-NU",
    year: 2023,
    tags: ["CS", "Data Structures", "ICS"]
  },
  {
    id: "mcq-14",
    question: "In relational database terminology, a primary key must satisfy which condition?",
    options: ["Can contain duplicate entries", "Must be unique and not null", "Must only be numeric", "Can contain null values"],
    correctAnswer: 1,
    explanation: "A primary key uniquely identifies each record in a database table and strictly rejects duplicate or NULL values.",
    subject: "Computer Science",
    chapter: "Database Management Systems",
    topic: "Keys and Relational Model",
    difficulty: "Medium",
    classLevel: "Class 12 (FSc / ICS Pt 2)",
    board: "BISE Lahore",
    year: 2023,
    tags: ["Databases", "Computer Science"]
  },
  // Pakistan Affairs & Pakistan Studies (CSS / PMS / Matric)
  {
    id: "mcq-15",
    question: "Who drafted the historic Lahore Resolution passed on 23rd March 1940?",
    options: ["Allama Muhammad Iqbal", "Sir Muhammad Zafarullah Khan", "A. K. Fazlul Huq", "Liaquat Ali Khan"],
    correctAnswer: 1,
    explanation: "Sir Muhammad Zafarullah Khan prepared and drafted the Lahore Resolution, while Maulvi A.K. Fazlul Huq presented it at the annual session of the All-India Muslim League.",
    subject: "Pakistan Studies",
    chapter: "Pakistan Movement",
    topic: "Lahore Resolution 1940",
    difficulty: "Medium",
    classLevel: "Class 10 (Matric Pt 2)",
    exam: "CSS",
    year: 2023,
    tags: ["Pakistan Studies", "CSS", "History"]
  },
  {
    id: "mcq-16",
    question: "Under the 1973 Constitution of Pakistan, what is the term length of a Senator in the Senate of Pakistan?",
    options: ["4 years", "5 years", "6 years", "3 years"],
    correctAnswer: 2,
    explanation: "Senators serve a six-year term, with half of the Senate retiring every three years via rotation.",
    subject: "Pakistan Studies",
    chapter: "Constitutional Development",
    topic: "1973 Constitution",
    difficulty: "Medium",
    exam: "PPSC",
    year: 2024,
    tags: ["Constitution", "PPSC", "Pakistan Studies"]
  },
  {
    id: "mcq-17",
    question: "Which is the highest mountain peak situated entirely within Pakistan\u2019s territory (excluding disputed borders)?",
    options: ["K2", "Nanga Parbat", "Broad Peak", "Gasherbrum I"],
    correctAnswer: 1,
    explanation: "Nanga Parbat (8,126 m, 9th highest in the world) is located completely in the Gilgit-Baltistan region of Pakistan.",
    subject: "General Knowledge",
    chapter: "Geography of Pakistan",
    topic: "Mountain Peaks",
    difficulty: "Easy",
    exam: "PPSC",
    year: 2023,
    tags: ["Geography", "GK", "PPSC"]
  },
  // Islamiyat
  {
    id: "mcq-18",
    question: "How many Surahs in the Holy Quran are categorized as Makki?",
    options: ["28", "86", "114", "76"],
    correctAnswer: 1,
    explanation: "Out of 114 Surahs in the Holy Quran, 86 were revealed before the Hijrah in Makkah (Makki) and 28 were revealed in Madinah (Madani).",
    subject: "Islamiat",
    chapter: "Quranic Sciences",
    topic: "Surahs Classification",
    difficulty: "Easy",
    classLevel: "Class 9 (Matric Pt 1)",
    board: "BISE Lahore",
    year: 2023,
    tags: ["Islamiyat", "Quran", "Religion"]
  },
  {
    id: "mcq-19",
    question: "The Treaty of Hudaibiyyah was signed in which Hijri year?",
    options: ["2 AH", "4 AH", "6 AH", "8 AH"],
    correctAnswer: 2,
    explanation: "The Treaty of Hudaibiyyah (Sulh al-Hudaibiyyah) was formulated in the month of Dhu al-Qadah in 6 AH (628 CE).",
    subject: "Islamiat",
    chapter: "Seerah of Prophet Muhammad (PBUH)",
    topic: "Ghazwat and Treaties",
    difficulty: "Medium",
    exam: "PMS",
    year: 2024,
    tags: ["Islamiyat", "Seerah", "PMS"]
  },
  // English Learning
  {
    id: "mcq-20",
    question: "Choose the correct synonym of the word 'METICULOUS':",
    options: ["Careless", "Diligent and precise", "Hasty", "Obsolete"],
    correctAnswer: 1,
    explanation: "'Meticulous' means showing great attention to detail; very careful and precise.",
    subject: "English",
    chapter: "Vocabulary & Synonyms",
    topic: "Synonyms",
    difficulty: "Medium",
    exam: "CSS",
    year: 2024,
    tags: ["English", "Vocabulary", "CSS"]
  },
  {
    id: "mcq-21",
    question: "Select the sentence with correct preposition usage:",
    options: [
      "He has been absent since three days.",
      "He has been absent for three days.",
      "He has been absent from three days.",
      "He has been absent in three days."
    ],
    correctAnswer: 1,
    explanation: "'For' is used to denote a period of duration (three days), while 'since' is reserved for a specific starting point in time.",
    subject: "English",
    chapter: "Grammar & Prepositions",
    topic: "Prepositions",
    difficulty: "Easy",
    exam: "NTS",
    year: 2023,
    tags: ["English", "Grammar", "NTS"]
  },
  {
    id: "mcq-22",
    question: "Convert to Indirect Speech: He said, 'I am reading a book.'",
    options: [
      "He said that he was reading a book.",
      "He said that he is reading a book.",
      "He said that I was reading a book.",
      "He told that he had been reading a book."
    ],
    correctAnswer: 0,
    explanation: "Present continuous tense 'am reading' changes to past continuous 'was reading', and first person 'I' changes to 'he'.",
    subject: "English",
    chapter: "Direct & Indirect Speech",
    topic: "Tenses Shift",
    difficulty: "Easy",
    classLevel: "Class 10 (Matric Pt 2)",
    year: 2023,
    tags: ["English", "Grammar", "Direct-Indirect"]
  },
  // Armed Forces (Intelligence: Verbal & Non-Verbal & IQ)
  {
    id: "mcq-23",
    question: "Army Intelligence (Verbal): What comes next in the series: 4, 9, 19, 39, 79, ?",
    options: ["119", "159", "149", "169"],
    correctAnswer: 1,
    explanation: "Pattern: Multiply previous number by 2 and add 1. 4\xD72+1=9, 9\xD72+1=19, 19\xD72+1=39, 39\xD72+1=79, 79\xD72+1=159.",
    subject: "IQ & Intelligence",
    chapter: "Number Series",
    topic: "Verbal Intelligence",
    difficulty: "Medium",
    exam: "Pakistan Army",
    year: 2024,
    tags: ["Army", "Intelligence", "Verbal IQ"]
  },
  {
    id: "mcq-24",
    question: "Army Intelligence (Odd One Out): Find the odd man out from the following:",
    options: ["Islamabad", "Lahore", "Karachi", "Punjab"],
    correctAnswer: 3,
    explanation: "Punjab is a province, whereas Islamabad, Lahore, and Karachi are cities.",
    subject: "IQ & Intelligence",
    chapter: "Classification & Analogies",
    topic: "Odd One Out",
    difficulty: "Easy",
    exam: "Pakistan Air Force",
    year: 2024,
    tags: ["Air Force", "Navy", "Odd One Out"]
  },
  {
    id: "mcq-25",
    question: "If CAT is coded as 24, DOG is coded as 26, how will RAT be coded?",
    options: ["39", "42", "38", "40"],
    correctAnswer: 0,
    explanation: "Sum of alphabetical positions: R(18) + A(1) + T(20) = 39.",
    subject: "IQ & Intelligence",
    chapter: "Coding & Decoding",
    topic: "Alphabetical Values",
    difficulty: "Medium",
    exam: "Pakistan Navy",
    year: 2024,
    tags: ["Navy", "IQ", "Coding-Decoding"]
  },
  // Current Affairs
  {
    id: "mcq-26",
    question: "Which sea does the Gwadar Deep Sea Port of Pakistan open into?",
    options: ["Red Sea", "Arabian Sea", "Caspian Sea", "Bay of Bengal"],
    correctAnswer: 1,
    explanation: "Gwadar Port is situated on the shores of the Arabian Sea in Balochistan at the mouth of the Persian Gulf.",
    subject: "Current Affairs",
    chapter: "Pakistan Geopolitics & CPEC",
    topic: "Gwadar Port",
    difficulty: "Easy",
    exam: "CSS",
    year: 2024,
    tags: ["Current Affairs", "Gwadar", "GK"]
  },
  {
    id: "mcq-27",
    question: "The United Nations Climate Change Conference COP28 was held in which city?",
    options: ["Dubai, UAE", "Baku, Azerbaijan", "Glasgow, UK", "Sharm El-Sheikh, Egypt"],
    correctAnswer: 0,
    explanation: "COP28 was convened in Dubai, United Arab Emirates in December 2023.",
    subject: "Current Affairs",
    chapter: "International Relations & Climate",
    topic: "COP Summits",
    difficulty: "Medium",
    exam: "FPSC",
    year: 2024,
    tags: ["Current Affairs", "Environment", "FPSC"]
  }
];
var POPULAR_TESTS = [
  {
    id: "test-class10-phy-chap5",
    title: "Class 10 Physics - Chapter 5 Geometrical Optics Test",
    description: "Chapter-level assessment covering spherical mirrors, lenses, Snell law, total internal reflection, and optical instruments.",
    testType: "Chapter Test",
    category: "Matric",
    subject: "Physics",
    classLevel: "Class 10 (Matric Pt 2)",
    board: "BISE Lahore",
    durationMinutes: 15,
    totalQuestions: 10,
    totalMarks: 10,
    negativeMarking: false,
    passPercentage: 50,
    questions: MCQS_DATABASE.slice(0, 4)
  },
  {
    id: "test-mdcat-biology-mock",
    title: "MDCAT Biology High-Yield Mock Series 2024",
    description: "PM&DC syllabus aligned medical entry test questions with exact timing and negative marking calculation.",
    testType: "Entry Test",
    category: "MDCAT",
    subject: "Biology",
    classLevel: "Class 12 (FSc / ICS Pt 2)",
    exam: "MDCAT",
    durationMinutes: 20,
    totalQuestions: 15,
    totalMarks: 15,
    negativeMarking: true,
    negativeMarkValue: 0.25,
    passPercentage: 65,
    questions: MCQS_DATABASE.filter((m) => m.subject === "Biology" || m.exam === "MDCAT").concat(MCQS_DATABASE.slice(0, 3))
  },
  {
    id: "test-ecat-math-speed",
    title: "ECAT Mathematics Speed Drill: Matrices & Calculus",
    description: "UET Lahore pattern quick problem solving test with negative marking penalty per wrong answer.",
    testType: "Entry Test",
    category: "ECAT",
    subject: "Mathematics",
    classLevel: "Class 12 (FSc / ICS Pt 2)",
    exam: "ECAT",
    durationMinutes: 15,
    totalQuestions: 10,
    totalMarks: 40,
    negativeMarking: true,
    negativeMarkValue: 1,
    passPercentage: 60,
    questions: MCQS_DATABASE.filter((m) => m.subject === "Mathematics").concat(MCQS_DATABASE.slice(4, 7))
  },
  {
    id: "test-css-pak-affairs",
    title: "CSS MPT Screening Exam: Pakistan Affairs & GK",
    description: "FPSC Central Superior Services preliminary screening practice test with in-depth analytical rationale.",
    testType: "Competitive Exam Test",
    category: "CSS",
    subject: "Pakistan Studies",
    exam: "CSS",
    durationMinutes: 25,
    totalQuestions: 15,
    totalMarks: 15,
    negativeMarking: false,
    passPercentage: 50,
    questions: MCQS_DATABASE.filter((m) => m.subject === "Pakistan Studies" || m.subject === "Current Affairs").concat(MCQS_DATABASE.slice(18, 22))
  },
  {
    id: "test-army-intelligence",
    title: "Pakistan Army Initial Test: Verbal Intelligence Portal",
    description: "PMA Long Course & Cadet initial intelligence screening containing number series, analogies, and odd-one-out.",
    testType: "Practice Test",
    category: "Army",
    subject: "IQ & Intelligence",
    exam: "Pakistan Army",
    durationMinutes: 15,
    totalQuestions: 10,
    totalMarks: 10,
    negativeMarking: false,
    passPercentage: 60,
    questions: MCQS_DATABASE.filter((m) => m.subject === "IQ & Intelligence").concat(MCQS_DATABASE.slice(14, 18))
  },
  {
    id: "test-daily-quiz-today",
    title: "Today's National Challenge Quiz (10 MCQs)",
    description: "Compete with 45,000+ students across Pakistan today to maintain your daily streak and earn academic badges.",
    testType: "Daily Test",
    category: "Daily Quiz",
    subject: "General Knowledge",
    durationMinutes: 10,
    totalQuestions: 10,
    totalMarks: 10,
    negativeMarking: false,
    passPercentage: 50,
    questions: MCQS_DATABASE.slice(0, 10)
  }
];
var PAST_PAPERS_DATA = MASTER_PAST_PAPERS;
var STUDY_NOTES_DATA = MASTER_STUDY_NOTES;
var SAMPLE_PAST_RESULTS = [
  {
    id: "res-phys-chap5-1",
    testId: "test-class10-phy-chap5",
    testTitle: "Class 10 Physics - Chapter 5 Geometrical Optics Test",
    testType: "Chapter Test",
    subject: "Physics",
    category: "Matric",
    timestamp: "10/09/2026, 03:45 PM",
    totalQuestions: 10,
    answeredCount: 10,
    correctCount: 9,
    wrongCount: 1,
    skippedCount: 0,
    marksObtained: 9,
    totalMarks: 10,
    percentage: 90,
    grade: "A+",
    timeUsedSeconds: 420,
    totalDurationSeconds: 900,
    percentileRank: 95,
    answers: [
      { questionId: "mcq-1", selectedOption: 1, markedForReview: false, timeSpentSeconds: 28 },
      { questionId: "mcq-2", selectedOption: 1, markedForReview: false, timeSpentSeconds: 32 },
      { questionId: "mcq-3", selectedOption: 1, markedForReview: false, timeSpentSeconds: 22 },
      { questionId: "mcq-4", selectedOption: 2, markedForReview: false, timeSpentSeconds: 45 }
    ],
    questions: MCQS_DATABASE.slice(0, 4)
  },
  {
    id: "res-mdcat-bio-2",
    testId: "test-mdcat-biology-mock",
    testTitle: "MDCAT Biology High-Yield Mock Series 2024",
    testType: "Entry Test",
    subject: "Biology",
    category: "MDCAT",
    timestamp: "08/09/2026, 11:20 AM",
    totalQuestions: 15,
    answeredCount: 14,
    correctCount: 12,
    wrongCount: 2,
    skippedCount: 1,
    marksObtained: 11.5,
    totalMarks: 15,
    percentage: 76.6,
    grade: "A",
    timeUsedSeconds: 980,
    totalDurationSeconds: 1200,
    percentileRank: 88,
    answers: [
      { questionId: "mcq-5", selectedOption: 0, markedForReview: false, timeSpentSeconds: 35 },
      { questionId: "mcq-6", selectedOption: 1, markedForReview: false, timeSpentSeconds: 40 }
    ],
    questions: MCQS_DATABASE.filter((m) => m.subject === "Biology").slice(0, 4)
  }
];

// src/db/content.ts
async function getMCQsFromDb(filters = {}) {
  if (!db) return [];
  try {
    const conditions = [];
    if (filters.subject && filters.subject !== "All") {
      conditions.push(ilike2(mcqs.subject, `%${filters.subject}%`));
    }
    if (filters.classLevel && filters.classLevel !== "All") {
      conditions.push(ilike2(mcqs.classLevel, `%${filters.classLevel}%`));
    }
    if (filters.board && filters.board !== "All") {
      conditions.push(ilike2(mcqs.board, `%${filters.board}%`));
    }
    if (filters.chapter && filters.chapter !== "All") {
      conditions.push(ilike2(mcqs.chapter, `%${filters.chapter}%`));
    }
    if (filters.exam && filters.exam !== "All") {
      conditions.push(ilike2(mcqs.exam, `%${filters.exam}%`));
    }
    if (filters.difficulty && filters.difficulty !== "All") {
      conditions.push(eq6(mcqs.difficulty, filters.difficulty));
    }
    if (filters.status && filters.status !== "All") {
      conditions.push(eq6(mcqs.status, filters.status));
    } else if (!filters.isStaff && !filters.createdBy) {
      conditions.push(eq6(mcqs.status, "Published"));
    }
    if (filters.createdBy) {
      conditions.push(eq6(mcqs.createdBy, filters.createdBy));
    }
    if (filters.search) {
      conditions.push(ilike2(mcqs.question, `%${filters.search}%`));
    }
    const query = db.select().from(mcqs).where(conditions.length > 0 ? and5(...conditions) : void 0).orderBy(desc6(mcqs.createdAt)).limit(filters.limit || 500);
    const rows = await query;
    return rows.map((r) => ({
      id: r.id,
      question: r.question,
      options: r.options || [],
      correctAnswer: r.correctAnswer,
      explanation: r.explanation || "",
      subject: r.subject,
      chapter: r.chapter || void 0,
      topic: r.topic || void 0,
      difficulty: r.difficulty || "Medium",
      classLevel: r.classLevel || void 0,
      board: r.board || void 0,
      exam: r.exam || void 0,
      year: r.year || void 0,
      tags: r.tags || [],
      language: r.language || "English",
      status: r.status || "Published",
      submittedBy: r.submittedBy || void 0,
      reviewedBy: r.reviewedBy || void 0,
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt).toISOString() : void 0,
      rejectionReason: r.rejectionReason || void 0,
      changeNotes: r.changeNotes || void 0,
      version: r.version || 1,
      createdBy: r.createdBy || void 0,
      updatedBy: r.updatedBy || void 0,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : void 0
    }));
  } catch (error) {
    console.error("Error in getMCQsFromDb:", error);
    return [];
  }
}
async function getMCQByIdFromDb(id) {
  if (!db) return null;
  try {
    const rows = await db.select().from(mcqs).where(eq6(mcqs.id, id)).limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      question: r.question,
      options: r.options || [],
      correctAnswer: r.correctAnswer,
      explanation: r.explanation || "",
      subject: r.subject,
      chapter: r.chapter || void 0,
      topic: r.topic || void 0,
      difficulty: r.difficulty || "Medium",
      classLevel: r.classLevel || void 0,
      board: r.board || void 0,
      exam: r.exam || void 0,
      year: r.year || void 0,
      tags: r.tags || [],
      language: r.language || "English",
      status: r.status || "Published",
      submittedBy: r.submittedBy || void 0,
      reviewedBy: r.reviewedBy || void 0,
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt).toISOString() : void 0,
      rejectionReason: r.rejectionReason || void 0,
      changeNotes: r.changeNotes || void 0,
      version: r.version || 1,
      createdBy: r.createdBy || void 0,
      updatedBy: r.updatedBy || void 0,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : void 0
    };
  } catch (error) {
    console.error("Error in getMCQByIdFromDb:", error);
    return null;
  }
}
async function createMCQInDb(mcqData, authorUid) {
  if (!db) throw new Error("Database not connected");
  const id = mcqData.id || `mcq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const values = {
    id,
    question: mcqData.question.trim(),
    options: mcqData.options,
    correctAnswer: mcqData.correctAnswer,
    explanation: mcqData.explanation || null,
    subject: mcqData.subject.trim(),
    chapter: mcqData.chapter?.trim() || null,
    topic: mcqData.topic?.trim() || null,
    difficulty: mcqData.difficulty || "Medium",
    classLevel: mcqData.classLevel?.trim() || null,
    board: mcqData.board?.trim() || null,
    exam: mcqData.exam?.trim() || null,
    year: mcqData.year || null,
    tags: mcqData.tags || [],
    language: mcqData.language || "English",
    status: mcqData.status || "Published",
    createdBy: authorUid || mcqData.createdBy || "system",
    updatedBy: authorUid || mcqData.updatedBy || "system"
  };
  await db.insert(mcqs).values(values).onConflictDoUpdate({
    target: mcqs.id,
    set: {
      question: values.question,
      options: values.options,
      correctAnswer: values.correctAnswer,
      explanation: values.explanation,
      subject: values.subject,
      chapter: values.chapter,
      topic: values.topic,
      difficulty: values.difficulty,
      classLevel: values.classLevel,
      board: values.board,
      exam: values.exam,
      year: values.year,
      tags: values.tags,
      language: values.language,
      status: values.status,
      updatedBy: values.updatedBy,
      updatedAt: /* @__PURE__ */ new Date()
    }
  });
  const created = await getMCQByIdFromDb(id);
  if (!created) throw new Error("Failed to create MCQ");
  return created;
}
async function updateMCQInDb(id, updates, updaterUid) {
  if (!db) throw new Error("Database not connected");
  const updateFields = {
    updatedAt: /* @__PURE__ */ new Date(),
    updatedBy: updaterUid || "system"
  };
  if (updates.question !== void 0) updateFields.question = updates.question.trim();
  if (updates.options !== void 0) updateFields.options = updates.options;
  if (updates.correctAnswer !== void 0) updateFields.correctAnswer = updates.correctAnswer;
  if (updates.explanation !== void 0) updateFields.explanation = updates.explanation;
  if (updates.subject !== void 0) updateFields.subject = updates.subject.trim();
  if (updates.chapter !== void 0) updateFields.chapter = updates.chapter?.trim() || null;
  if (updates.topic !== void 0) updateFields.topic = updates.topic?.trim() || null;
  if (updates.difficulty !== void 0) updateFields.difficulty = updates.difficulty;
  if (updates.classLevel !== void 0) updateFields.classLevel = updates.classLevel?.trim() || null;
  if (updates.board !== void 0) updateFields.board = updates.board?.trim() || null;
  if (updates.exam !== void 0) updateFields.exam = updates.exam?.trim() || null;
  if (updates.year !== void 0) updateFields.year = updates.year;
  if (updates.tags !== void 0) updateFields.tags = updates.tags;
  if (updates.language !== void 0) updateFields.language = updates.language;
  if (updates.status !== void 0) updateFields.status = updates.status;
  await db.update(mcqs).set(updateFields).where(eq6(mcqs.id, id));
  return await getMCQByIdFromDb(id);
}
async function deleteMCQInDb(id) {
  if (!db) throw new Error("Database not connected");
  await db.delete(mcqs).where(eq6(mcqs.id, id));
  return true;
}
async function bulkInsertMCQsInDb(items, authorUid) {
  if (!db || items.length === 0) return 0;
  let count3 = 0;
  for (const item of items) {
    try {
      await createMCQInDb(item, authorUid);
      count3++;
    } catch (e) {
      console.warn(`Bulk insert MCQ warning for ${item.id}:`, e);
    }
  }
  return count3;
}
async function getTestsFromDb(filters = {}) {
  if (!db) return [];
  try {
    const conditions = [];
    if (filters.subject && filters.subject !== "All") {
      conditions.push(ilike2(tests.subject, `%${filters.subject}%`));
    }
    if (filters.classLevel && filters.classLevel !== "All") {
      conditions.push(ilike2(tests.classLevel, `%${filters.classLevel}%`));
    }
    if (filters.board && filters.board !== "All") {
      conditions.push(ilike2(tests.board, `%${filters.board}%`));
    }
    if (filters.category && filters.category !== "All") {
      conditions.push(ilike2(tests.category, `%${filters.category}%`));
    }
    if (filters.testType && filters.testType !== "All") {
      conditions.push(ilike2(tests.testType, `%${filters.testType}%`));
    }
    if (filters.status && filters.status !== "All") {
      conditions.push(eq6(tests.status, filters.status));
    } else if (!filters.isStaff && !filters.createdBy) {
      conditions.push(eq6(tests.status, "Published"));
    }
    if (filters.createdBy) {
      conditions.push(eq6(tests.createdBy, filters.createdBy));
    }
    if (filters.search) {
      conditions.push(ilike2(tests.title, `%${filters.search}%`));
    }
    const testRows = await db.select().from(tests).where(conditions.length > 0 ? and5(...conditions) : void 0).orderBy(desc6(tests.createdAt)).limit(filters.limit || 200);
    if (testRows.length === 0) return [];
    const testIds = testRows.map((t) => t.id);
    const junctionRows = await db.select({
      testId: testQuestions.testId,
      mcqId: testQuestions.mcqId,
      ordering: testQuestions.ordering,
      mcq: mcqs
    }).from(testQuestions).innerJoin(mcqs, eq6(testQuestions.mcqId, mcqs.id)).where(inArray3(testQuestions.testId, testIds)).orderBy(testQuestions.ordering);
    const questionsByTestId = {};
    junctionRows.forEach((j) => {
      if (!questionsByTestId[j.testId]) {
        questionsByTestId[j.testId] = [];
      }
      questionsByTestId[j.testId].push({
        id: j.mcq.id,
        question: j.mcq.question,
        options: j.mcq.options || [],
        correctAnswer: j.mcq.correctAnswer,
        explanation: j.mcq.explanation || "",
        subject: j.mcq.subject,
        chapter: j.mcq.chapter || void 0,
        topic: j.mcq.topic || void 0,
        difficulty: j.mcq.difficulty || "Medium",
        classLevel: j.mcq.classLevel || void 0,
        board: j.mcq.board || void 0,
        exam: j.mcq.exam || void 0,
        year: j.mcq.year || void 0,
        tags: j.mcq.tags || [],
        language: j.mcq.language || "English",
        status: j.mcq.status || "Published",
        createdAt: j.mcq.createdAt ? new Date(j.mcq.createdAt).toISOString() : void 0
      });
    });
    return testRows.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || "",
      testType: t.testType || "Chapter Test",
      category: t.category,
      subject: t.subject,
      chapter: t.chapter || void 0,
      classLevel: t.classLevel || void 0,
      board: t.board || void 0,
      exam: t.exam || void 0,
      durationMinutes: t.durationMinutes,
      totalQuestions: t.totalQuestions,
      totalMarks: t.totalMarks,
      negativeMarking: t.negativeMarking,
      negativeMarkValue: t.negativeMarkValue ? parseFloat(t.negativeMarkValue) : 0.25,
      passPercentage: t.passPercentage,
      randomizeQuestions: Boolean(t.randomizeQuestions),
      randomizeOptions: Boolean(t.randomizeOptions),
      allowRetake: t.allowRetake !== false,
      maxAttempts: t.maxAttempts || 0,
      reviewPolicy: t.reviewPolicy || "immediate",
      isPremium: t.isPremium,
      status: t.status || "Published",
      submittedBy: t.submittedBy || void 0,
      reviewedBy: t.reviewedBy || void 0,
      reviewedAt: t.reviewedAt ? new Date(t.reviewedAt).toISOString() : void 0,
      rejectionReason: t.rejectionReason || void 0,
      changeNotes: t.changeNotes || void 0,
      version: t.version || 1,
      createdBy: t.createdBy || void 0,
      updatedBy: t.updatedBy || void 0,
      questions: questionsByTestId[t.id] || [],
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : void 0
    }));
  } catch (error) {
    console.error("Error in getTestsFromDb:", error);
    return [];
  }
}
async function getTestByIdFromDb(id) {
  if (!db) return null;
  try {
    const testRows = await db.select().from(tests).where(eq6(tests.id, id)).limit(1);
    if (testRows.length === 0) return null;
    const t = testRows[0];
    const junctionRows = await db.select({
      mcq: mcqs
    }).from(testQuestions).innerJoin(mcqs, eq6(testQuestions.mcqId, mcqs.id)).where(eq6(testQuestions.testId, id)).orderBy(testQuestions.ordering);
    const questions = junctionRows.map((j) => ({
      id: j.mcq.id,
      question: j.mcq.question,
      options: j.mcq.options || [],
      correctAnswer: j.mcq.correctAnswer,
      explanation: j.mcq.explanation || "",
      subject: j.mcq.subject,
      chapter: j.mcq.chapter || void 0,
      topic: j.mcq.topic || void 0,
      difficulty: j.mcq.difficulty || "Medium",
      classLevel: j.mcq.classLevel || void 0,
      board: j.mcq.board || void 0,
      exam: j.mcq.exam || void 0,
      year: j.mcq.year || void 0,
      tags: j.mcq.tags || [],
      language: j.mcq.language || "English",
      status: j.mcq.status || "Published",
      createdAt: j.mcq.createdAt ? new Date(j.mcq.createdAt).toISOString() : void 0
    }));
    return {
      id: t.id,
      title: t.title,
      description: t.description || "",
      testType: t.testType || "Chapter Test",
      category: t.category,
      subject: t.subject,
      chapter: t.chapter || void 0,
      classLevel: t.classLevel || void 0,
      board: t.board || void 0,
      exam: t.exam || void 0,
      durationMinutes: t.durationMinutes,
      totalQuestions: t.totalQuestions,
      totalMarks: t.totalMarks,
      negativeMarking: t.negativeMarking,
      negativeMarkValue: t.negativeMarkValue ? parseFloat(t.negativeMarkValue) : 0.25,
      passPercentage: t.passPercentage,
      randomizeQuestions: Boolean(t.randomizeQuestions),
      randomizeOptions: Boolean(t.randomizeOptions),
      allowRetake: t.allowRetake !== false,
      maxAttempts: t.maxAttempts || 0,
      reviewPolicy: t.reviewPolicy || "immediate",
      isPremium: t.isPremium,
      status: t.status || "Published",
      submittedBy: t.submittedBy || void 0,
      reviewedBy: t.reviewedBy || void 0,
      reviewedAt: t.reviewedAt ? new Date(t.reviewedAt).toISOString() : void 0,
      rejectionReason: t.rejectionReason || void 0,
      changeNotes: t.changeNotes || void 0,
      version: t.version || 1,
      createdBy: t.createdBy || void 0,
      updatedBy: t.updatedBy || void 0,
      questions,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : void 0
    };
  } catch (error) {
    console.error("Error in getTestByIdFromDb:", error);
    return null;
  }
}
async function createTestInDb(testData, authorUid) {
  if (!db) throw new Error("Database not connected");
  const id = testData.id || `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const questionsList = testData.questions || [];
  for (const q of questionsList) {
    if (q.question && q.options) {
      await createMCQInDb(q, authorUid);
    }
  }
  const values = {
    id,
    title: testData.title.trim(),
    description: testData.description || null,
    testType: testData.testType || "Chapter Test",
    category: testData.category || "Academic",
    subject: testData.subject.trim(),
    chapter: testData.chapter?.trim() || null,
    classLevel: testData.classLevel?.trim() || null,
    board: testData.board?.trim() || null,
    exam: testData.exam?.trim() || null,
    durationMinutes: testData.durationMinutes || 15,
    totalQuestions: questionsList.length > 0 ? questionsList.length : testData.totalQuestions || 10,
    totalMarks: testData.totalMarks || (questionsList.length > 0 ? questionsList.length : 10),
    negativeMarking: Boolean(testData.negativeMarking),
    negativeMarkValue: testData.negativeMarkValue !== void 0 ? String(testData.negativeMarkValue) : "0.25",
    passPercentage: testData.passPercentage || 50,
    randomizeQuestions: Boolean(testData.randomizeQuestions),
    randomizeOptions: Boolean(testData.randomizeOptions),
    allowRetake: testData.allowRetake !== false,
    maxAttempts: testData.maxAttempts || 0,
    reviewPolicy: testData.reviewPolicy || "immediate",
    isPremium: Boolean(testData.isPremium),
    status: testData.status || "Published",
    createdBy: authorUid || "system",
    updatedBy: authorUid || "system"
  };
  await db.insert(tests).values(values).onConflictDoUpdate({
    target: tests.id,
    set: {
      title: values.title,
      description: values.description,
      testType: values.testType,
      category: values.category,
      subject: values.subject,
      chapter: values.chapter,
      classLevel: values.classLevel,
      board: values.board,
      exam: values.exam,
      durationMinutes: values.durationMinutes,
      totalQuestions: values.totalQuestions,
      totalMarks: values.totalMarks,
      negativeMarking: values.negativeMarking,
      negativeMarkValue: values.negativeMarkValue,
      passPercentage: values.passPercentage,
      randomizeQuestions: values.randomizeQuestions,
      randomizeOptions: values.randomizeOptions,
      allowRetake: values.allowRetake,
      maxAttempts: values.maxAttempts,
      reviewPolicy: values.reviewPolicy,
      isPremium: values.isPremium,
      status: values.status,
      updatedBy: values.updatedBy,
      updatedAt: /* @__PURE__ */ new Date()
    }
  });
  await db.delete(testQuestions).where(eq6(testQuestions.testId, id));
  if (questionsList.length > 0) {
    for (let i = 0; i < questionsList.length; i++) {
      const q = questionsList[i];
      await db.insert(testQuestions).values({
        testId: id,
        mcqId: q.id,
        ordering: i
      });
    }
  } else if (testData.questionIds && testData.questionIds.length > 0) {
    for (let i = 0; i < testData.questionIds.length; i++) {
      const qId = testData.questionIds[i];
      await db.insert(testQuestions).values({
        testId: id,
        mcqId: qId,
        ordering: i
      });
    }
  }
  const created = await getTestByIdFromDb(id);
  if (!created) throw new Error("Failed to create test configuration");
  return created;
}
async function updateTestInDb(id, updates, updaterUid) {
  if (!db) throw new Error("Database not connected");
  const updateFields = {
    updatedAt: /* @__PURE__ */ new Date(),
    updatedBy: updaterUid || "system"
  };
  if (updates.title !== void 0) updateFields.title = updates.title.trim();
  if (updates.description !== void 0) updateFields.description = updates.description;
  if (updates.testType !== void 0) updateFields.testType = updates.testType;
  if (updates.category !== void 0) updateFields.category = updates.category;
  if (updates.subject !== void 0) updateFields.subject = updates.subject.trim();
  if (updates.chapter !== void 0) updateFields.chapter = updates.chapter?.trim() || null;
  if (updates.classLevel !== void 0) updateFields.classLevel = updates.classLevel?.trim() || null;
  if (updates.board !== void 0) updateFields.board = updates.board?.trim() || null;
  if (updates.exam !== void 0) updateFields.exam = updates.exam?.trim() || null;
  if (updates.durationMinutes !== void 0) updateFields.durationMinutes = updates.durationMinutes;
  if (updates.totalQuestions !== void 0) updateFields.totalQuestions = updates.totalQuestions;
  if (updates.totalMarks !== void 0) updateFields.totalMarks = updates.totalMarks;
  if (updates.negativeMarking !== void 0) updateFields.negativeMarking = updates.negativeMarking;
  if (updates.negativeMarkValue !== void 0) updateFields.negativeMarkValue = String(updates.negativeMarkValue);
  if (updates.passPercentage !== void 0) updateFields.passPercentage = updates.passPercentage;
  if (updates.randomizeQuestions !== void 0) updateFields.randomizeQuestions = updates.randomizeQuestions;
  if (updates.randomizeOptions !== void 0) updateFields.randomizeOptions = updates.randomizeOptions;
  if (updates.allowRetake !== void 0) updateFields.allowRetake = updates.allowRetake;
  if (updates.maxAttempts !== void 0) updateFields.maxAttempts = updates.maxAttempts;
  if (updates.reviewPolicy !== void 0) updateFields.reviewPolicy = updates.reviewPolicy;
  if (updates.isPremium !== void 0) updateFields.isPremium = updates.isPremium;
  if (updates.status !== void 0) updateFields.status = updates.status;
  await db.update(tests).set(updateFields).where(eq6(tests.id, id));
  if (updates.questions) {
    for (const q of updates.questions) {
      if (q.question && q.options) {
        await createMCQInDb(q, updaterUid);
      }
    }
    await db.delete(testQuestions).where(eq6(testQuestions.testId, id));
    for (let i = 0; i < updates.questions.length; i++) {
      const q = updates.questions[i];
      await db.insert(testQuestions).values({
        testId: id,
        mcqId: q.id,
        ordering: i
      });
    }
  }
  return await getTestByIdFromDb(id);
}
async function deleteTestInDb(id) {
  if (!db) throw new Error("Database not connected");
  await db.delete(tests).where(eq6(tests.id, id));
  return true;
}
async function bulkInsertTestsInDb(items, authorUid) {
  if (!db || items.length === 0) return 0;
  let count3 = 0;
  for (const item of items) {
    try {
      await createTestInDb(item, authorUid);
      count3++;
    } catch (e) {
      console.warn(`Bulk insert test warning for ${item.id}:`, e);
    }
  }
  return count3;
}
async function getPastPapersFromDb(filters = {}) {
  if (!db) return [];
  try {
    const conditions = [];
    if (filters.status && filters.status !== "All") {
      conditions.push(eq6(pastPapers.status, filters.status));
    } else if (!filters.isStaff && !filters.createdBy) {
      conditions.push(eq6(pastPapers.status, "Published"));
    }
    if (filters.createdBy) {
      conditions.push(eq6(pastPapers.createdBy, filters.createdBy));
    }
    if (filters.board && filters.board !== "All") {
      conditions.push(ilike2(pastPapers.board, `%${filters.board}%`));
    }
    if (filters.province && filters.province !== "All") {
      conditions.push(ilike2(pastPapers.province, `%${filters.province}%`));
    }
    if (filters.classLevel && filters.classLevel !== "All") {
      conditions.push(ilike2(pastPapers.classLevel, `%${filters.classLevel}%`));
    }
    if (filters.subject && filters.subject !== "All") {
      conditions.push(ilike2(pastPapers.subject, `%${filters.subject}%`));
    }
    if (filters.topic && filters.topic !== "All") {
      conditions.push(ilike2(pastPapers.topic, `%${filters.topic}%`));
    }
    if (filters.exam && filters.exam !== "All") {
      conditions.push(ilike2(pastPapers.exam, `%${filters.exam}%`));
    }
    if (filters.year) {
      conditions.push(eq6(pastPapers.year, filters.year));
    }
    if (filters.language && filters.language !== "All") {
      conditions.push(eq6(pastPapers.language, filters.language));
    }
    if (filters.search) {
      conditions.push(ilike2(pastPapers.title, `%${filters.search}%`));
    }
    const rows = await db.select().from(pastPapers).where(conditions.length > 0 ? and5(...conditions) : void 0).orderBy(desc6(pastPapers.year), desc6(pastPapers.createdAt)).limit(filters.limit || 300);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      board: r.board,
      province: r.province || void 0,
      classLevel: r.classLevel,
      subject: r.subject,
      chapter: r.chapter || void 0,
      topic: r.topic || void 0,
      exam: r.exam || void 0,
      year: r.year,
      paperGroup: r.paperGroup || void 0,
      type: r.type || "Objective (MCQs)",
      paperType: r.paperType || void 0,
      language: r.language || "English",
      totalQuestions: r.totalQuestions || r.questionsCount || 0,
      totalMarks: r.totalMarks || 0,
      durationMinutes: r.durationMinutes || void 0,
      questionsCount: r.questionsCount,
      downloadUrl: r.downloadUrl || void 0,
      fileUrl: r.fileUrl || void 0,
      pdfUrl: r.pdfUrl || void 0,
      thumbnail: r.thumbnail || void 0,
      description: r.description || void 0,
      status: r.status || "Published",
      version: r.version || 1,
      brandingStatus: r.brandingStatus || "Not Applicable",
      brandedFileUrl: r.brandedFileUrl || void 0,
      brandingVersion: r.brandingVersion || void 0,
      originalFileHash: r.originalFileHash || void 0,
      brandedFileHash: r.brandedFileHash || void 0,
      brandedAt: r.brandedAt ? new Date(r.brandedAt).toISOString() : void 0,
      downloadsCount: r.downloadsCount || 0,
      questions: r.questions || [],
      createdBy: r.createdBy || void 0,
      updatedBy: r.updatedBy || void 0,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : void 0,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : void 0
    }));
  } catch (error) {
    console.error("Error in getPastPapersFromDb:", error);
    return [];
  }
}
async function getPastPaperByIdFromDb(id, isStaff = false) {
  if (!db) return null;
  try {
    const rows = await db.select().from(pastPapers).where(eq6(pastPapers.id, id)).limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    if (!isStaff && r.status !== "Published") {
      return null;
    }
    return {
      id: r.id,
      title: r.title,
      board: r.board,
      province: r.province || void 0,
      classLevel: r.classLevel,
      subject: r.subject,
      chapter: r.chapter || void 0,
      topic: r.topic || void 0,
      exam: r.exam || void 0,
      year: r.year,
      paperGroup: r.paperGroup || void 0,
      type: r.type || "Objective (MCQs)",
      paperType: r.paperType || void 0,
      language: r.language || "English",
      totalQuestions: r.totalQuestions || r.questionsCount || 0,
      totalMarks: r.totalMarks || 0,
      durationMinutes: r.durationMinutes || void 0,
      questionsCount: r.questionsCount,
      downloadUrl: r.downloadUrl || void 0,
      fileUrl: r.fileUrl || void 0,
      pdfUrl: r.pdfUrl || void 0,
      thumbnail: r.thumbnail || void 0,
      description: r.description || void 0,
      status: r.status || "Published",
      version: r.version || 1,
      brandingStatus: r.brandingStatus || "Not Applicable",
      brandedFileUrl: r.brandedFileUrl || void 0,
      brandingVersion: r.brandingVersion || void 0,
      originalFileHash: r.originalFileHash || void 0,
      brandedFileHash: r.brandedFileHash || void 0,
      brandedAt: r.brandedAt ? new Date(r.brandedAt).toISOString() : void 0,
      downloadsCount: r.downloadsCount || 0,
      questions: r.questions || [],
      createdBy: r.createdBy || void 0,
      updatedBy: r.updatedBy || void 0,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : void 0,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : void 0
    };
  } catch (error) {
    console.error("Error in getPastPaperByIdFromDb:", error);
    return null;
  }
}
async function createPastPaperInDb(paperData, authorUid) {
  if (!db) throw new Error("Database not connected");
  const id = paperData.id || `pp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const values = {
    id,
    title: paperData.title.trim(),
    board: paperData.board.trim(),
    province: paperData.province?.trim() || null,
    classLevel: paperData.classLevel.trim(),
    subject: paperData.subject.trim(),
    chapter: paperData.chapter?.trim() || null,
    topic: paperData.topic?.trim() || null,
    exam: paperData.exam?.trim() || null,
    year: paperData.year,
    paperGroup: paperData.paperGroup || null,
    type: paperData.type || "Objective (MCQs)",
    paperType: paperData.paperType?.trim() || null,
    language: paperData.language?.trim() || "English",
    totalQuestions: paperData.totalQuestions || paperData.questionsCount || (paperData.questions?.length || 0),
    totalMarks: paperData.totalMarks || 0,
    durationMinutes: paperData.durationMinutes || null,
    questionsCount: paperData.questionsCount || (paperData.questions?.length || 0),
    downloadUrl: paperData.downloadUrl || paperData.fileUrl || null,
    fileUrl: paperData.fileUrl || paperData.downloadUrl || null,
    pdfUrl: paperData.pdfUrl || null,
    thumbnail: paperData.thumbnail || null,
    description: paperData.description || null,
    status: paperData.status || "Published",
    version: paperData.version || 1,
    brandingStatus: paperData.brandingStatus || "Not Applicable",
    brandedFileUrl: paperData.brandedFileUrl || null,
    brandingVersion: paperData.brandingVersion || null,
    originalFileHash: paperData.originalFileHash || null,
    brandedFileHash: paperData.brandedFileHash || null,
    brandedAt: paperData.brandedAt ? new Date(paperData.brandedAt) : null,
    downloadsCount: paperData.downloadsCount || 0,
    questions: paperData.questions || [],
    createdBy: authorUid || "system",
    updatedBy: authorUid || "system"
  };
  await db.insert(pastPapers).values(values).onConflictDoUpdate({
    target: pastPapers.id,
    set: {
      title: values.title,
      board: values.board,
      province: values.province,
      classLevel: values.classLevel,
      subject: values.subject,
      chapter: values.chapter,
      topic: values.topic,
      exam: values.exam,
      year: values.year,
      paperGroup: values.paperGroup,
      type: values.type,
      paperType: values.paperType,
      language: values.language,
      totalQuestions: values.totalQuestions,
      totalMarks: values.totalMarks,
      durationMinutes: values.durationMinutes,
      questionsCount: values.questionsCount,
      downloadUrl: values.downloadUrl,
      fileUrl: values.fileUrl,
      pdfUrl: values.pdfUrl,
      thumbnail: values.thumbnail,
      description: values.description,
      status: values.status,
      version: values.version,
      brandingStatus: values.brandingStatus,
      brandedFileUrl: values.brandedFileUrl,
      brandingVersion: values.brandingVersion,
      originalFileHash: values.originalFileHash,
      brandedFileHash: values.brandedFileHash,
      brandedAt: values.brandedAt,
      downloadsCount: values.downloadsCount,
      questions: values.questions,
      updatedBy: values.updatedBy,
      updatedAt: /* @__PURE__ */ new Date()
    }
  });
  const created = await getPastPaperByIdFromDb(id, true);
  if (!created) throw new Error("Failed to create past paper");
  return created;
}
async function updatePastPaperInDb(id, updates, updaterUid) {
  if (!db) throw new Error("Database not connected");
  const updateFields = {
    updatedAt: /* @__PURE__ */ new Date(),
    updatedBy: updaterUid || "system"
  };
  if (updates.title !== void 0) updateFields.title = updates.title.trim();
  if (updates.board !== void 0) updateFields.board = updates.board.trim();
  if (updates.province !== void 0) updateFields.province = updates.province?.trim() || null;
  if (updates.classLevel !== void 0) updateFields.classLevel = updates.classLevel.trim();
  if (updates.subject !== void 0) updateFields.subject = updates.subject.trim();
  if (updates.chapter !== void 0) updateFields.chapter = updates.chapter?.trim() || null;
  if (updates.topic !== void 0) updateFields.topic = updates.topic?.trim() || null;
  if (updates.exam !== void 0) updateFields.exam = updates.exam?.trim() || null;
  if (updates.year !== void 0) updateFields.year = updates.year;
  if (updates.paperGroup !== void 0) updateFields.paperGroup = updates.paperGroup;
  if (updates.type !== void 0) updateFields.type = updates.type;
  if (updates.paperType !== void 0) updateFields.paperType = updates.paperType?.trim() || null;
  if (updates.language !== void 0) updateFields.language = updates.language?.trim() || "English";
  if (updates.totalQuestions !== void 0) updateFields.totalQuestions = updates.totalQuestions;
  if (updates.totalMarks !== void 0) updateFields.totalMarks = updates.totalMarks;
  if (updates.durationMinutes !== void 0) updateFields.durationMinutes = updates.durationMinutes;
  if (updates.questionsCount !== void 0) updateFields.questionsCount = updates.questionsCount;
  if (updates.downloadUrl !== void 0) updateFields.downloadUrl = updates.downloadUrl;
  if (updates.fileUrl !== void 0) updateFields.fileUrl = updates.fileUrl;
  if (updates.pdfUrl !== void 0) updateFields.pdfUrl = updates.pdfUrl;
  if (updates.thumbnail !== void 0) updateFields.thumbnail = updates.thumbnail;
  if (updates.description !== void 0) updateFields.description = updates.description;
  if (updates.status !== void 0) updateFields.status = updates.status;
  if (updates.version !== void 0) updateFields.version = updates.version;
  if (updates.brandingStatus !== void 0) updateFields.brandingStatus = updates.brandingStatus;
  if (updates.brandedFileUrl !== void 0) updateFields.brandedFileUrl = updates.brandedFileUrl;
  if (updates.brandingVersion !== void 0) updateFields.brandingVersion = updates.brandingVersion;
  if (updates.originalFileHash !== void 0) updateFields.originalFileHash = updates.originalFileHash;
  if (updates.brandedFileHash !== void 0) updateFields.brandedFileHash = updates.brandedFileHash;
  if (updates.brandedAt !== void 0) updateFields.brandedAt = updates.brandedAt ? new Date(updates.brandedAt) : null;
  if (updates.downloadsCount !== void 0) updateFields.downloadsCount = updates.downloadsCount;
  if (updates.questions !== void 0) updateFields.questions = updates.questions;
  await db.update(pastPapers).set(updateFields).where(eq6(pastPapers.id, id));
  return await getPastPaperByIdFromDb(id, true);
}
async function deletePastPaperInDb(id) {
  if (!db) throw new Error("Database not connected");
  await db.delete(pastPapers).where(eq6(pastPapers.id, id));
  return true;
}
async function bulkInsertPastPapersInDb(items, authorUid) {
  if (!db || items.length === 0) return 0;
  let count3 = 0;
  for (const item of items) {
    try {
      await createPastPaperInDb(item, authorUid);
      count3++;
    } catch (e) {
      console.warn(`Bulk insert past paper warning for ${item.id}:`, e);
    }
  }
  return count3;
}
async function getStudyNotesFromDb(filters = {}) {
  if (!db) return [];
  try {
    const conditions = [];
    if (filters.status && filters.status !== "All") {
      conditions.push(eq6(studyNotes.status, filters.status));
    } else if (!filters.isStaff && !filters.createdBy) {
      conditions.push(eq6(studyNotes.status, "Published"));
    }
    if (filters.createdBy) {
      conditions.push(eq6(studyNotes.createdBy, filters.createdBy));
    }
    if (filters.subject && filters.subject !== "All") {
      conditions.push(ilike2(studyNotes.subject, `%${filters.subject}%`));
    }
    if (filters.classLevel && filters.classLevel !== "All") {
      conditions.push(ilike2(studyNotes.classLevel, `%${filters.classLevel}%`));
    }
    if (filters.board && filters.board !== "All") {
      conditions.push(ilike2(studyNotes.board, `%${filters.board}%`));
    }
    if (filters.chapter && filters.chapter !== "All") {
      conditions.push(ilike2(studyNotes.chapter, `%${filters.chapter}%`));
    }
    if (filters.topic && filters.topic !== "All") {
      conditions.push(ilike2(studyNotes.topic, `%${filters.topic}%`));
    }
    if (filters.type && filters.type !== "All") {
      conditions.push(ilike2(studyNotes.type, `%${filters.type}%`));
    }
    if (filters.language && filters.language !== "All") {
      conditions.push(eq6(studyNotes.language, filters.language));
    }
    if (filters.search) {
      conditions.push(ilike2(studyNotes.title, `%${filters.search}%`));
    }
    const rows = await db.select().from(studyNotes).where(conditions.length > 0 ? and5(...conditions) : void 0).orderBy(desc6(studyNotes.createdAt)).limit(filters.limit || 300);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      board: r.board || void 0,
      subject: r.subject,
      classLevel: r.classLevel,
      chapter: r.chapter,
      topic: r.topic || void 0,
      description: r.description || void 0,
      type: r.type || "Notes",
      contentSnippet: r.contentSnippet || void 0,
      fullContent: r.fullContent || void 0,
      content: r.content || void 0,
      language: r.language || "English",
      pdfUrl: r.pdfUrl || void 0,
      fileUrl: r.fileUrl || void 0,
      thumbnail: r.thumbnail || void 0,
      status: r.status || "Published",
      version: r.version || 1,
      brandingStatus: r.brandingStatus || "Not Applicable",
      brandedFileUrl: r.brandedFileUrl || void 0,
      brandingVersion: r.brandingVersion || void 0,
      originalFileHash: r.originalFileHash || void 0,
      brandedFileHash: r.brandedFileHash || void 0,
      brandedAt: r.brandedAt ? new Date(r.brandedAt).toISOString() : void 0,
      keyPoints: r.keyPoints || [],
      readTime: r.readTime || void 0,
      downloadsCount: r.downloadsCount || 0,
      isPremium: r.isPremium,
      createdBy: r.createdBy || void 0,
      updatedBy: r.updatedBy || void 0,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : void 0,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : void 0
    }));
  } catch (error) {
    console.error("Error in getStudyNotesFromDb:", error);
    return [];
  }
}
async function getStudyNoteByIdFromDb(id, isStaff = false) {
  if (!db) return null;
  try {
    const rows = await db.select().from(studyNotes).where(eq6(studyNotes.id, id)).limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    if (!isStaff && r.status !== "Published") {
      return null;
    }
    return {
      id: r.id,
      title: r.title,
      board: r.board || void 0,
      subject: r.subject,
      classLevel: r.classLevel,
      chapter: r.chapter,
      topic: r.topic || void 0,
      description: r.description || void 0,
      type: r.type || "Notes",
      contentSnippet: r.contentSnippet || void 0,
      fullContent: r.fullContent || void 0,
      content: r.content || void 0,
      language: r.language || "English",
      pdfUrl: r.pdfUrl || void 0,
      fileUrl: r.fileUrl || void 0,
      thumbnail: r.thumbnail || void 0,
      status: r.status || "Published",
      version: r.version || 1,
      brandingStatus: r.brandingStatus || "Not Applicable",
      brandedFileUrl: r.brandedFileUrl || void 0,
      brandingVersion: r.brandingVersion || void 0,
      originalFileHash: r.originalFileHash || void 0,
      brandedFileHash: r.brandedFileHash || void 0,
      brandedAt: r.brandedAt ? new Date(r.brandedAt).toISOString() : void 0,
      keyPoints: r.keyPoints || [],
      readTime: r.readTime || void 0,
      downloadsCount: r.downloadsCount || 0,
      isPremium: r.isPremium,
      createdBy: r.createdBy || void 0,
      updatedBy: r.updatedBy || void 0,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : void 0,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : void 0
    };
  } catch (error) {
    console.error("Error in getStudyNoteByIdFromDb:", error);
    return null;
  }
}
async function createStudyNoteInDb(noteData, authorUid) {
  if (!db) throw new Error("Database not connected");
  const id = noteData.id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const values = {
    id,
    title: noteData.title.trim(),
    board: noteData.board?.trim() || null,
    subject: noteData.subject.trim(),
    classLevel: noteData.classLevel.trim(),
    chapter: noteData.chapter.trim(),
    topic: noteData.topic?.trim() || null,
    description: noteData.description || null,
    type: noteData.type || "Notes",
    contentSnippet: noteData.contentSnippet || null,
    fullContent: noteData.fullContent || null,
    content: noteData.content || null,
    language: noteData.language?.trim() || "English",
    pdfUrl: noteData.pdfUrl || null,
    fileUrl: noteData.fileUrl || null,
    thumbnail: noteData.thumbnail || null,
    status: noteData.status || "Published",
    version: noteData.version || 1,
    brandingStatus: noteData.brandingStatus || "Not Applicable",
    brandedFileUrl: noteData.brandedFileUrl || null,
    brandingVersion: noteData.brandingVersion || null,
    originalFileHash: noteData.originalFileHash || null,
    brandedFileHash: noteData.brandedFileHash || null,
    brandedAt: noteData.brandedAt ? new Date(noteData.brandedAt) : null,
    keyPoints: noteData.keyPoints || [],
    readTime: noteData.readTime || "5 min",
    downloadsCount: noteData.downloadsCount || 0,
    isPremium: Boolean(noteData.isPremium),
    createdBy: authorUid || "system",
    updatedBy: authorUid || "system"
  };
  await db.insert(studyNotes).values(values).onConflictDoUpdate({
    target: studyNotes.id,
    set: {
      title: values.title,
      board: values.board,
      subject: values.subject,
      classLevel: values.classLevel,
      chapter: values.chapter,
      topic: values.topic,
      description: values.description,
      type: values.type,
      contentSnippet: values.contentSnippet,
      fullContent: values.fullContent,
      content: values.content,
      language: values.language,
      pdfUrl: values.pdfUrl,
      fileUrl: values.fileUrl,
      thumbnail: values.thumbnail,
      status: values.status,
      version: values.version,
      brandingStatus: values.brandingStatus,
      brandedFileUrl: values.brandedFileUrl,
      brandingVersion: values.brandingVersion,
      originalFileHash: values.originalFileHash,
      brandedFileHash: values.brandedFileHash,
      brandedAt: values.brandedAt,
      keyPoints: values.keyPoints,
      readTime: values.readTime,
      downloadsCount: values.downloadsCount,
      isPremium: values.isPremium,
      updatedBy: values.updatedBy,
      updatedAt: /* @__PURE__ */ new Date()
    }
  });
  const created = await getStudyNoteByIdFromDb(id, true);
  if (!created) throw new Error("Failed to create study note");
  return created;
}
async function updateStudyNoteInDb(id, updates, updaterUid) {
  if (!db) throw new Error("Database not connected");
  const updateFields = {
    updatedAt: /* @__PURE__ */ new Date(),
    updatedBy: updaterUid || "system"
  };
  if (updates.title !== void 0) updateFields.title = updates.title.trim();
  if (updates.board !== void 0) updateFields.board = updates.board?.trim() || null;
  if (updates.subject !== void 0) updateFields.subject = updates.subject.trim();
  if (updates.classLevel !== void 0) updateFields.classLevel = updates.classLevel.trim();
  if (updates.chapter !== void 0) updateFields.chapter = updates.chapter.trim();
  if (updates.topic !== void 0) updateFields.topic = updates.topic?.trim() || null;
  if (updates.description !== void 0) updateFields.description = updates.description;
  if (updates.type !== void 0) updateFields.type = updates.type;
  if (updates.contentSnippet !== void 0) updateFields.contentSnippet = updates.contentSnippet;
  if (updates.fullContent !== void 0) updateFields.fullContent = updates.fullContent;
  if (updates.content !== void 0) updateFields.content = updates.content;
  if (updates.language !== void 0) updateFields.language = updates.language?.trim() || "English";
  if (updates.pdfUrl !== void 0) updateFields.pdfUrl = updates.pdfUrl;
  if (updates.fileUrl !== void 0) updateFields.fileUrl = updates.fileUrl;
  if (updates.thumbnail !== void 0) updateFields.thumbnail = updates.thumbnail;
  if (updates.status !== void 0) updateFields.status = updates.status;
  if (updates.version !== void 0) updateFields.version = updates.version;
  if (updates.brandingStatus !== void 0) updateFields.brandingStatus = updates.brandingStatus;
  if (updates.brandedFileUrl !== void 0) updateFields.brandedFileUrl = updates.brandedFileUrl;
  if (updates.brandingVersion !== void 0) updateFields.brandingVersion = updates.brandingVersion;
  if (updates.originalFileHash !== void 0) updateFields.originalFileHash = updates.originalFileHash;
  if (updates.brandedFileHash !== void 0) updateFields.brandedFileHash = updates.brandedFileHash;
  if (updates.brandedAt !== void 0) updateFields.brandedAt = updates.brandedAt ? new Date(updates.brandedAt) : null;
  if (updates.keyPoints !== void 0) updateFields.keyPoints = updates.keyPoints;
  if (updates.readTime !== void 0) updateFields.readTime = updates.readTime;
  if (updates.downloadsCount !== void 0) updateFields.downloadsCount = updates.downloadsCount;
  if (updates.isPremium !== void 0) updateFields.isPremium = updates.isPremium;
  await db.update(studyNotes).set(updateFields).where(eq6(studyNotes.id, id));
  return await getStudyNoteByIdFromDb(id, true);
}
async function deleteStudyNoteInDb(id) {
  if (!db) throw new Error("Database not connected");
  await db.delete(studyNotes).where(eq6(studyNotes.id, id));
  return true;
}
async function bulkInsertStudyNotesInDb(items, authorUid) {
  if (!db || items.length === 0) return 0;
  let count3 = 0;
  for (const item of items) {
    try {
      await createStudyNoteInDb(item, authorUid);
      count3++;
    } catch (e) {
      console.warn(`Bulk insert study note warning for ${item.id}:`, e);
    }
  }
  return count3;
}
async function seedInitialEducationalContent() {
  if (!db) return { mcqsCount: 0, testsCount: 0, papersCount: 0, notesCount: 0 };
  let mcqsCount = 0;
  let testsCount = 0;
  let papersCount = 0;
  let notesCount = 0;
  try {
    const existingMCQs = await db.select({ count: sql8`count(*)` }).from(mcqs);
    const numMCQs = Number(existingMCQs[0]?.count || 0);
    if (numMCQs === 0 && MCQS_DATABASE.length > 0) {
      console.log(`[Database Seeder] Seeding ${MCQS_DATABASE.length} foundational MCQs into PostgreSQL...`);
      mcqsCount = await bulkInsertMCQsInDb(MCQS_DATABASE, "system-seeder");
    }
    const existingTests = await db.select({ count: sql8`count(*)` }).from(tests);
    const numTests = Number(existingTests[0]?.count || 0);
    if (numTests === 0 && POPULAR_TESTS.length > 0) {
      console.log(`[Database Seeder] Seeding ${POPULAR_TESTS.length} curriculum test modules into PostgreSQL...`);
      testsCount = await bulkInsertTestsInDb(POPULAR_TESTS, "system-seeder");
    }
    const existingPapers = await db.select({ count: sql8`count(*)` }).from(pastPapers);
    const numPapers = Number(existingPapers[0]?.count || 0);
    const allPaperSources = [...PAST_PAPERS_DATA, ...MASTER_PAST_PAPERS];
    const uniquePapersMap = /* @__PURE__ */ new Map();
    allPaperSources.forEach((p) => uniquePapersMap.set(p.id, p));
    const uniquePapers = Array.from(uniquePapersMap.values());
    if (numPapers === 0 && uniquePapers.length > 0) {
      console.log(`[Database Seeder] Seeding ${uniquePapers.length} authentic Board Past Papers into PostgreSQL...`);
      papersCount = await bulkInsertPastPapersInDb(uniquePapers, "system-seeder");
    }
    const existingNotes = await db.select({ count: sql8`count(*)` }).from(studyNotes);
    const numNotes = Number(existingNotes[0]?.count || 0);
    const allNoteSources = [...STUDY_NOTES_DATA, ...MASTER_STUDY_NOTES];
    const uniqueNotesMap = /* @__PURE__ */ new Map();
    allNoteSources.forEach((n) => uniqueNotesMap.set(n.id, n));
    const uniqueNotes = Array.from(uniqueNotesMap.values());
    if (numNotes === 0 && uniqueNotes.length > 0) {
      console.log(`[Database Seeder] Seeding ${uniqueNotes.length} chapter study notes into PostgreSQL...`);
      notesCount = await bulkInsertStudyNotesInDb(uniqueNotes, "system-seeder");
    }
  } catch (error) {
    console.error("Notice: Error during initial database content seeding:", error);
  }
  return { mcqsCount, testsCount, papersCount, notesCount };
}
async function getComprehensiveStatsFromDb() {
  if (!db) {
    return {
      totalUsers: 0,
      totalSubmissions: 0,
      totalMCQs: 0,
      publishedMCQs: 0,
      draftMCQs: 0,
      archivedMCQs: 0,
      totalTests: 0,
      publishedTests: 0,
      draftTests: 0,
      totalPastPapers: 0,
      publishedPastPapers: 0,
      draftPastPapers: 0,
      totalStudyNotes: 0,
      publishedStudyNotes: 0,
      draftStudyNotes: 0,
      totalReports: 0,
      openReports: 0,
      resolvedReports: 0,
      totalAuditLogs: 0
    };
  }
  try {
    const [
      uCount,
      subCount,
      mcqAll,
      mcqPub,
      mcqDraft,
      mcqArch,
      testAll,
      testPub,
      testDraft,
      paperAll,
      paperPub,
      paperDraft,
      noteAll,
      notePub,
      noteDraft,
      repAll,
      repOpen,
      repRes,
      audAll
    ] = await Promise.all([
      db.select({ count: sql8`count(*)` }).from(users),
      db.select({ count: sql8`count(*)` }).from(testResults),
      db.select({ count: sql8`count(*)` }).from(mcqs),
      db.select({ count: sql8`count(*)` }).from(mcqs).where(eq6(mcqs.status, "Published")),
      db.select({ count: sql8`count(*)` }).from(mcqs).where(eq6(mcqs.status, "Draft")),
      db.select({ count: sql8`count(*)` }).from(mcqs).where(eq6(mcqs.status, "Archived")),
      db.select({ count: sql8`count(*)` }).from(tests),
      db.select({ count: sql8`count(*)` }).from(tests).where(eq6(tests.status, "Published")),
      db.select({ count: sql8`count(*)` }).from(tests).where(eq6(tests.status, "Draft")),
      db.select({ count: sql8`count(*)` }).from(pastPapers),
      db.select({ count: sql8`count(*)` }).from(pastPapers).where(eq6(pastPapers.status, "Published")),
      db.select({ count: sql8`count(*)` }).from(pastPapers).where(eq6(pastPapers.status, "Draft")),
      db.select({ count: sql8`count(*)` }).from(studyNotes),
      db.select({ count: sql8`count(*)` }).from(studyNotes).where(eq6(studyNotes.status, "Published")),
      db.select({ count: sql8`count(*)` }).from(studyNotes).where(eq6(studyNotes.status, "Draft")),
      db.select({ count: sql8`count(*)` }).from(contentReports),
      db.select({ count: sql8`count(*)` }).from(contentReports).where(eq6(contentReports.status, "OPEN")),
      db.select({ count: sql8`count(*)` }).from(contentReports).where(eq6(contentReports.status, "RESOLVED")),
      db.select({ count: sql8`count(*)` }).from(auditLogs)
    ]);
    return {
      totalUsers: Number(uCount[0]?.count || 0),
      totalSubmissions: Number(subCount[0]?.count || 0),
      totalMCQs: Number(mcqAll[0]?.count || 0),
      publishedMCQs: Number(mcqPub[0]?.count || 0),
      draftMCQs: Number(mcqDraft[0]?.count || 0),
      archivedMCQs: Number(mcqArch[0]?.count || 0),
      totalTests: Number(testAll[0]?.count || 0),
      publishedTests: Number(testPub[0]?.count || 0),
      draftTests: Number(testDraft[0]?.count || 0),
      totalPastPapers: Number(paperAll[0]?.count || 0),
      publishedPastPapers: Number(paperPub[0]?.count || 0),
      draftPastPapers: Number(paperDraft[0]?.count || 0),
      totalStudyNotes: Number(noteAll[0]?.count || 0),
      publishedStudyNotes: Number(notePub[0]?.count || 0),
      draftStudyNotes: Number(noteDraft[0]?.count || 0),
      totalReports: Number(repAll[0]?.count || 0),
      openReports: Number(repOpen[0]?.count || 0),
      resolvedReports: Number(repRes[0]?.count || 0),
      totalAuditLogs: Number(audAll[0]?.count || 0)
    };
  } catch (error) {
    console.error("Error fetching comprehensive stats from DB:", error);
    return {
      totalUsers: 0,
      totalSubmissions: 0,
      totalMCQs: 0,
      publishedMCQs: 0,
      draftMCQs: 0,
      archivedMCQs: 0,
      totalTests: 0,
      publishedTests: 0,
      draftTests: 0,
      totalPastPapers: 0,
      publishedPastPapers: 0,
      draftPastPapers: 0,
      totalStudyNotes: 0,
      publishedStudyNotes: 0,
      draftStudyNotes: 0,
      totalReports: 0,
      openReports: 0,
      resolvedReports: 0,
      totalAuditLogs: 0
    };
  }
}
async function bulkUpdateMCQStatusInDb(ids, status, updatedBy) {
  if (!db || ids.length === 0) return 0;
  const result = await db.update(mcqs).set({
    status,
    updatedBy: updatedBy || "admin",
    updatedAt: /* @__PURE__ */ new Date()
  }).where(inArray3(mcqs.id, ids));
  return ids.length;
}
async function bulkDeleteMCQsInDb(ids) {
  if (!db || ids.length === 0) return 0;
  await db.delete(mcqs).where(inArray3(mcqs.id, ids));
  return ids.length;
}
async function bulkCreateMCQsBatchInDb(items, authorUid) {
  if (!db || items.length === 0) {
    return { inserted: 0, errors: [] };
  }
  const errors = [];
  const validRecords = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.question || typeof item.question !== "string" || item.question.trim().length < 5) {
      errors.push({ index: i, error: `Row ${i + 1}: Question text must be at least 5 characters.` });
      continue;
    }
    if (!Array.isArray(item.options) || item.options.length < 2) {
      errors.push({ index: i, error: `Row ${i + 1}: At least 2 options are required.` });
      continue;
    }
    const emptyOptIndex = item.options.findIndex((opt) => typeof opt !== "string" || !opt.trim());
    if (emptyOptIndex !== -1) {
      errors.push({ index: i, error: `Row ${i + 1}: Option ${String.fromCharCode(65 + emptyOptIndex)} cannot be empty.` });
      continue;
    }
    if (typeof item.correctAnswer !== "number" || item.correctAnswer < 0 || item.correctAnswer >= item.options.length) {
      errors.push({ index: i, error: `Row ${i + 1}: Correct answer index (${item.correctAnswer}) is out of bounds.` });
      continue;
    }
    if (!item.subject || !item.subject.trim()) {
      errors.push({ index: i, error: `Row ${i + 1}: Subject is required.` });
      continue;
    }
    const id = `mcq-bulk-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`;
    validRecords.push({
      id,
      question: item.question.trim(),
      options: item.options.map((o) => o.trim()),
      correctAnswer: item.correctAnswer,
      explanation: item.explanation?.trim() || null,
      subject: item.subject.trim(),
      chapter: item.chapter?.trim() || null,
      topic: item.topic?.trim() || null,
      difficulty: item.difficulty || "Medium",
      classLevel: item.classLevel?.trim() || null,
      board: item.board?.trim() || null,
      exam: item.exam?.trim() || null,
      year: item.year || null,
      tags: Array.isArray(item.tags) ? item.tags : [],
      language: item.language || "English",
      status: item.status || "Published",
      createdBy: authorUid || "admin",
      updatedBy: authorUid || "admin",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    });
  }
  if (validRecords.length > 0) {
    try {
      await db.insert(mcqs).values(validRecords);
    } catch (err) {
      console.error("Error in batch insert of MCQs:", err);
      let singleInserted = 0;
      for (let j = 0; j < validRecords.length; j++) {
        try {
          await db.insert(mcqs).values(validRecords[j]);
          singleInserted++;
        } catch (singleErr) {
          errors.push({ index: j, error: `Database insert failed: ${singleErr?.message || "Conflict"}` });
        }
      }
      return { inserted: singleInserted, errors };
    }
  }
  return { inserted: validRecords.length, errors };
}
async function bulkUpdateTestStatusInDb(ids, status, updatedBy) {
  if (!db || ids.length === 0) return 0;
  await db.update(tests).set({
    status,
    updatedBy: updatedBy || "admin",
    updatedAt: /* @__PURE__ */ new Date()
  }).where(inArray3(tests.id, ids));
  return ids.length;
}
async function bulkDeleteTestsInDb(ids) {
  if (!db || ids.length === 0) return 0;
  await db.delete(tests).where(inArray3(tests.id, ids));
  return ids.length;
}
async function bulkUpdatePastPaperStatusInDb(ids, status, updatedBy) {
  if (!db || ids.length === 0) return 0;
  await db.update(pastPapers).set({
    status,
    updatedBy: updatedBy || "admin",
    updatedAt: /* @__PURE__ */ new Date()
  }).where(inArray3(pastPapers.id, ids));
  return ids.length;
}
async function bulkDeletePastPapersInDb(ids) {
  if (!db || ids.length === 0) return 0;
  await db.delete(pastPapers).where(inArray3(pastPapers.id, ids));
  return ids.length;
}
async function bulkUpdateStudyNoteStatusInDb(ids, status, updatedBy) {
  if (!db || ids.length === 0) return 0;
  await db.update(studyNotes).set({
    status,
    updatedBy: updatedBy || "admin",
    updatedAt: /* @__PURE__ */ new Date()
  }).where(inArray3(studyNotes.id, ids));
  return ids.length;
}
async function bulkDeleteStudyNotesInDb(ids) {
  if (!db || ids.length === 0) return 0;
  await db.delete(studyNotes).where(inArray3(studyNotes.id, ids));
  return ids.length;
}
async function getBoardsFromDb2(statusFilter) {
  if (!db) return [];
  if (statusFilter && statusFilter !== "All") {
    return await db.select().from(boards).where(eq6(boards.status, statusFilter)).orderBy(boards.name);
  }
  return await db.select().from(boards).orderBy(boards.name);
}
async function createBoardInDb(name, status = "Active") {
  if (!db) return null;
  const [created] = await db.insert(boards).values({
    name: name.trim(),
    status: status || "Active",
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  }).returning();
  return created;
}
async function updateBoardInDb2(id, updates) {
  if (!db) return null;
  const [updated] = await db.update(boards).set({
    ...updates,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq6(boards.id, id)).returning();
  return updated;
}
async function deleteBoardInDb(id) {
  if (!db) return { success: false, error: "Database unavailable" };
  const linkedClasses = await db.select({ count: sql8`count(*)` }).from(classes).where(eq6(classes.boardId, id));
  if (Number(linkedClasses[0]?.count || 0) > 0) {
    return {
      success: false,
      error: "Cannot delete board because it has associated classes. Deactivate it instead."
    };
  }
  await db.delete(boards).where(eq6(boards.id, id));
  return { success: true };
}
async function getClassesFromDb(boardId, statusFilter) {
  if (!db) return [];
  const conditions = [];
  if (boardId) conditions.push(eq6(classes.boardId, boardId));
  if (statusFilter && statusFilter !== "All") conditions.push(eq6(classes.status, statusFilter));
  if (conditions.length > 0) {
    return await db.select().from(classes).where(and5(...conditions)).orderBy(classes.name);
  }
  return await db.select().from(classes).orderBy(classes.name);
}
async function createClassInDb(boardId, name, status = "Active") {
  if (!db) return null;
  const [created] = await db.insert(classes).values({
    boardId,
    name: name.trim(),
    status: status || "Active",
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  }).returning();
  return created;
}
async function updateClassInDb2(id, updates) {
  if (!db) return null;
  const [updated] = await db.update(classes).set({
    ...updates,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq6(classes.id, id)).returning();
  return updated;
}
async function deleteClassInDb(id) {
  if (!db) return { success: false, error: "Database unavailable" };
  const linkedSubjects = await db.select({ count: sql8`count(*)` }).from(subjects).where(eq6(subjects.classId, id));
  if (Number(linkedSubjects[0]?.count || 0) > 0) {
    return {
      success: false,
      error: "Cannot delete class because it has associated subjects. Deactivate it instead."
    };
  }
  await db.delete(classes).where(eq6(classes.id, id));
  return { success: true };
}
async function getSubjectsFromDb2(classId, statusFilter) {
  if (!db) return [];
  const conditions = [];
  if (classId) conditions.push(eq6(subjects.classId, classId));
  if (statusFilter && statusFilter !== "All") conditions.push(eq6(subjects.status, statusFilter));
  if (conditions.length > 0) {
    return await db.select().from(subjects).where(and5(...conditions)).orderBy(subjects.name);
  }
  return await db.select().from(subjects).orderBy(subjects.name);
}
async function createSubjectInDb(classId, name, status = "Active") {
  if (!db) return null;
  const [created] = await db.insert(subjects).values({
    classId,
    name: name.trim(),
    status: status || "Active",
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  }).returning();
  return created;
}
async function updateSubjectInDb2(id, updates) {
  if (!db) return null;
  const [updated] = await db.update(subjects).set({
    ...updates,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq6(subjects.id, id)).returning();
  return updated;
}
async function deleteSubjectInDb(id) {
  if (!db) return { success: false, error: "Database unavailable" };
  const linkedChapters = await db.select({ count: sql8`count(*)` }).from(chapters).where(eq6(chapters.subjectId, id));
  if (Number(linkedChapters[0]?.count || 0) > 0) {
    return {
      success: false,
      error: "Cannot delete subject because it has associated chapters. Deactivate it instead."
    };
  }
  await db.delete(subjects).where(eq6(subjects.id, id));
  return { success: true };
}
async function getChaptersFromDb(subjectId, statusFilter) {
  if (!db) return [];
  const conditions = [];
  if (subjectId) conditions.push(eq6(chapters.subjectId, subjectId));
  if (statusFilter && statusFilter !== "All") conditions.push(eq6(chapters.status, statusFilter));
  if (conditions.length > 0) {
    return await db.select().from(chapters).where(and5(...conditions)).orderBy(chapters.name);
  }
  return await db.select().from(chapters).orderBy(chapters.name);
}
async function createChapterInDb(subjectId, name, status = "Active", draftStatus = "Published") {
  if (!db) return null;
  const [created] = await db.insert(chapters).values({
    subjectId,
    name: name.trim(),
    status: status || "Active",
    draftStatus: draftStatus || "Published",
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  }).returning();
  return created;
}
async function updateChapterInDb2(id, updates) {
  if (!db) return null;
  const [updated] = await db.update(chapters).set({
    ...updates,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq6(chapters.id, id)).returning();
  return updated;
}
async function deleteChapterInDb(id) {
  if (!db) return { success: false, error: "Database unavailable" };
  await db.delete(chapters).where(eq6(chapters.id, id));
  return { success: true };
}
async function seedInitialHierarchy() {
  if (!db) return { boardsCount: 0, classesCount: 0, subjectsCount: 0, chaptersCount: 0 };
  let boardsCount = 0;
  let classesCount = 0;
  let subjectsCount = 0;
  let chaptersCount = 0;
  try {
    const existingBoards = await db.select({ count: sql8`count(*)` }).from(boards);
    if (Number(existingBoards[0]?.count || 0) === 0) {
      console.log("[Hierarchy Seeder] Seeding foundational Pakistani boards...");
      for (const b of PAKISTAN_BOARDS) {
        await db.insert(boards).values({
          name: b.name,
          status: "Active",
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
        boardsCount++;
      }
    }
    const existingClasses = await db.select({ count: sql8`count(*)` }).from(classes);
    const dbBoards = await db.select().from(boards).limit(1);
    const defaultBoardId = dbBoards[0]?.id || 1;
    if (Number(existingClasses[0]?.count || 0) === 0) {
      console.log("[Hierarchy Seeder] Seeding academic classes...");
      for (const c of ACADEMIC_CLASSES) {
        await db.insert(classes).values({
          boardId: defaultBoardId,
          name: c.name,
          status: "Active",
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
        classesCount++;
      }
    }
    const existingSubjects = await db.select({ count: sql8`count(*)` }).from(subjects);
    const dbClasses = await db.select().from(classes).limit(1);
    const defaultClassId = dbClasses[0]?.id || 1;
    if (Number(existingSubjects[0]?.count || 0) === 0) {
      console.log("[Hierarchy Seeder] Seeding academic subjects...");
      for (const s of ACADEMIC_SUBJECTS) {
        await db.insert(subjects).values({
          classId: defaultClassId,
          name: s.name,
          status: "Active",
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
        subjectsCount++;
      }
    }
    const existingChapters = await db.select({ count: sql8`count(*)` }).from(chapters);
    const dbSubjects = await db.select().from(subjects).limit(1);
    const defaultSubjectId = dbSubjects[0]?.id || 1;
    if (Number(existingChapters[0]?.count || 0) === 0) {
      console.log("[Hierarchy Seeder] Seeding academic chapters...");
      for (const ch of ACADEMIC_CHAPTERS) {
        await db.insert(chapters).values({
          subjectId: defaultSubjectId,
          name: ch.name,
          status: "Active",
          draftStatus: "Published",
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
        chaptersCount++;
      }
    }
  } catch (error) {
    console.error("Notice: Error seeding academic hierarchy:", error);
  }
  return { boardsCount, classesCount, subjectsCount, chaptersCount };
}
async function moderateContentItemInDb(params) {
  if (!db) throw new Error("Database not connected");
  const { contentType, id, targetStatus, userUid, userRoles = [], rejectionReason, changeNotes } = params;
  let table;
  let idCol;
  if (contentType === "MCQ") {
    table = mcqs;
    idCol = mcqs.id;
  } else if (contentType === "Test") {
    table = tests;
    idCol = tests.id;
  } else if (contentType === "PastPaper") {
    table = pastPapers;
    idCol = pastPapers.id;
  } else if (contentType === "StudyNote") {
    table = studyNotes;
    idCol = studyNotes.id;
  } else if (contentType === "Document") {
    table = documents;
    idCol = documents.id;
  } else throw new Error(`Invalid contentType: ${contentType}`);
  const existingRows = await db.select().from(table).where(eq6(idCol, id)).limit(1);
  if (existingRows.length === 0) {
    return { success: false, item: null, message: "Content item not found" };
  }
  const item = existingRows[0];
  const normalizedRoles = userRoles.map((r) => r.toLowerCase());
  const isCallerAdmin = normalizedRoles.includes("admin") || normalizedRoles.includes("superadmin");
  if ((targetStatus === "Approved" || targetStatus === "Published") && item.createdBy === userUid && !isCallerAdmin) {
    return {
      success: false,
      item,
      message: "Forbidden: Self-approval is disabled. Independent review by an Editor or Admin is required."
    };
  }
  if (targetStatus === "Rejected" && (!rejectionReason || rejectionReason.trim().length === 0)) {
    return {
      success: false,
      item,
      message: "A review rejection reason is required when rejecting content."
    };
  }
  const currentVersion = item.version || 1;
  const newVersion = targetStatus === "Published" || item.status === "Published" ? currentVersion + 1 : currentVersion;
  const updateFields = {
    status: targetStatus,
    updatedAt: /* @__PURE__ */ new Date(),
    updatedBy: userUid,
    version: newVersion
  };
  if (targetStatus === "Pending Review") {
    updateFields.submittedBy = userUid;
  }
  if (targetStatus === "Approved" || targetStatus === "Published" || targetStatus === "Rejected") {
    updateFields.reviewedBy = userUid;
    updateFields.reviewedAt = /* @__PURE__ */ new Date();
  }
  if (targetStatus === "Rejected") {
    updateFields.rejectionReason = rejectionReason?.trim();
  } else {
    updateFields.rejectionReason = null;
  }
  if (changeNotes) {
    updateFields.changeNotes = changeNotes.trim();
  }
  await db.update(table).set(updateFields).where(eq6(idCol, id));
  const updatedRows = await db.select().from(table).where(eq6(idCol, id)).limit(1);
  const updatedItem = updatedRows[0];
  if (targetStatus === "Published" || item.status === "Published") {
    await db.insert(contentVersions).values({
      contentType,
      contentId: id,
      versionNumber: newVersion,
      status: targetStatus,
      snapshot: updatedItem,
      changeNotes: changeNotes?.trim() || `Status changed to ${targetStatus}`,
      rejectionReason: targetStatus === "Rejected" ? rejectionReason?.trim() : null,
      createdBy: userUid,
      createdAt: /* @__PURE__ */ new Date()
    });
  }
  await saveAuditLogToDb({
    adminUid: userUid,
    adminEmail: "moderator@taleemguru.pk",
    adminName: "Staff Moderator",
    action: `CONTENT_STATUS_${targetStatus.replace(/\s+/g, "_").toUpperCase()}`,
    targetType: contentType.toUpperCase(),
    targetId: id,
    details: `Transitioned ${contentType} ${id} status from "${item.status}" to "${targetStatus}"${rejectionReason ? `. Reason: ${rejectionReason}` : ""}`,
    subject: item.subject || void 0,
    classLevel: item.classLevel || void 0,
    board: item.board || void 0
  });
  return { success: true, item: updatedItem };
}
async function bulkModerateContentInDb(params) {
  let successCount = 0;
  let failedCount = 0;
  let skippedSelfApprovalCount = 0;
  const details = [];
  for (const id of params.ids) {
    try {
      const res = await moderateContentItemInDb({ ...params, id });
      if (res.success) {
        successCount++;
        details.push({ id, success: true, status: params.targetStatus });
      } else if (res.message?.includes("Self-approval")) {
        skippedSelfApprovalCount++;
        details.push({ id, success: false, reason: res.message });
      } else {
        failedCount++;
        details.push({ id, success: false, reason: res.message });
      }
    } catch (err) {
      failedCount++;
      details.push({ id, success: false, reason: err.message });
    }
  }
  return { successCount, failedCount, skippedSelfApprovalCount, details };
}
async function getContentVersionHistoryFromDb(contentType, contentId) {
  if (!db) return [];
  try {
    return await db.select().from(contentVersions).where(and5(eq6(contentVersions.contentType, contentType), eq6(contentVersions.contentId, contentId))).orderBy(desc6(contentVersions.versionNumber));
  } catch (error) {
    console.error("Error in getContentVersionHistoryFromDb:", error);
    return [];
  }
}

// src/lib/config.ts
var CANONICAL_PRODUCTION_DOMAIN = "https://www.taleemguru.pk";
var getCanonicalUrl = (pathname = "/") => {
  if (!pathname || pathname === "/") return `${CANONICAL_PRODUCTION_DOMAIN}/`;
  const cleanPath = pathname.split("?")[0].split("#")[0].trim();
  const normalized = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  const withoutTrailingSlash = normalized.length > 1 && normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  return `${CANONICAL_PRODUCTION_DOMAIN}${withoutTrailingSlash}`;
};

// src/lib/seo.ts
var ROUTE_SEO_REGISTRY = {
  home: {
    title: "TALEEM GURU - Learn. Practice. Test. Improve. | Pakistan Online Tests & MCQs",
    description: "Pakistan\u2019s leading online test & quiz platform for 9th, 10th, 11th, 12th Matric & Intermediate BISE Board exams, MDCAT, ECAT, CSS, Armed Forces, and comprehensive solved past papers.",
    canonicalPath: "/",
    keywords: [
      "Pakistan education",
      "Board exams",
      "MCQs online test",
      "Matric preparation",
      "9th class",
      "10th class",
      "11th class",
      "12th class",
      "Punjab Board",
      "Federal Board",
      "Past papers",
      "Educational notes",
      "MDCAT mock test",
      "ECAT entry test"
    ],
    schemaType: "EducationalOrganization",
    isPublic: true
  },
  tests: {
    title: "Online Chapter Tests & Quizzes for Class 9, 10, 11, 12 | Taleem Guru",
    description: "Take timed online tests and quizzes for Matric and Inter BISE Punjab, Federal, Sindh, and KPK boards with instant scoring, negative marking, and detailed answer keys.",
    canonicalPath: "/tests",
    keywords: ["Online quizzes", "Chapter tests", "Board exams preparation", "Mock tests Pakistan", "Self assessment"],
    schemaType: "Quiz",
    isPublic: true
  },
  mcqs: {
    title: "Solved MCQ Bank with Explanations - Matric & Intermediate | Taleem Guru",
    description: "Search over 10,000+ board-verified multiple choice questions with step-by-step solutions for Physics, Chemistry, Biology, Mathematics, and Computer Science.",
    canonicalPath: "/mcqs",
    keywords: ["MCQ Bank", "Solved MCQs", "Past paper MCQs", "Matric MCQs", "FSc MCQs", "MDCAT MCQs"],
    schemaType: "Course",
    isPublic: true
  },
  boards: {
    title: "All Pakistan Education Boards Directory - BISE & FBISE | Taleem Guru",
    description: "Find past papers, date sheets, roll number slips, and chapter tests for all BISE Punjab, Federal Board Islamabad, Sindh, KPK, Balochistan, and AJK boards.",
    canonicalPath: "/boards",
    keywords: ["Punjab Board", "BISE Lahore", "Federal Board", "FBISE Islamabad", "BISE Rawalpindi", "Sindh Board"],
    schemaType: "EducationalOrganization",
    isPublic: true
  },
  classes: {
    title: "Class 9, 10, 11, 12 Academic Portals & Syllabus | Taleem Guru",
    description: "Grade-specific preparation hubs for Class 9 (SSC-I), Class 10 (SSC-II), Class 11 (HSSC-I), and Class 12 (HSSC-II) with chapter-wise MCQs, notes, and past papers.",
    canonicalPath: "/classes",
    keywords: ["9th class", "10th class", "11th class", "12th class", "SSC Part 1", "HSSC Part 2", "FSc Pre Medical"],
    schemaType: "Course",
    isPublic: true
  },
  subjects: {
    title: "Academic Subjects Catalog - Science, Arts & Compulsory | Taleem Guru",
    description: "Browse Physics, Chemistry, Biology, Mathematics, Computer Science, English, Urdu, Pakistan Studies, and Islamiat preparation materials.",
    canonicalPath: "/subjects",
    keywords: ["Physics MCQs", "Chemistry notes", "Biology past papers", "Mathematics formulas", "Computer Science syllabus"],
    schemaType: "Course",
    isPublic: true
  },
  notes: {
    title: "High-Yield Educational Notes & Formula Sheets | Taleem Guru",
    description: "Download authentic PDF chapter notes, short questions, long questions, definitions, and formula sheets for Pakistani school and college examinations.",
    canonicalPath: "/notes",
    keywords: ["Educational notes", "Physics formula sheet", "Short questions solved", "Class 10 notes", "FSc notes PDF"],
    schemaType: "Course",
    isPublic: true
  },
  "past-papers": {
    title: "10-Year Solved Past Papers Archive for All Boards | Taleem Guru",
    description: "Download and practice 10-year past examination papers for BISE Lahore, FBISE Islamabad, Karachi Board, and more with verified answer keys.",
    canonicalPath: "/past-papers",
    keywords: ["Past papers", "BISE Lahore past papers", "FBISE past papers", "Solved matric papers", "10 year past papers"],
    schemaType: "Course",
    isPublic: true
  },
  search: {
    title: "Search Educational Content - MCQs, Tests, Past Papers & Notes | Taleem Guru",
    description: "Search across thousands of verified MCQs, online tests, solved past papers, study notes, and educational documents for Matric, Inter, MDCAT, and ECAT.",
    canonicalPath: "/search",
    keywords: ["Search MCQs", "Search past papers", "Online tests Pakistan", "Study notes search", "Taleem Guru search"],
    schemaType: "ItemPage",
    isPublic: true
  },
  "entry-tests": {
    title: "MDCAT, ECAT, NUMS, NUST & GIKI Entry Test Preparation | Taleem Guru",
    description: "Crack medical and engineering entrance exams in Pakistan with full-length syllabus mock tests, past papers, and national percentile ranking.",
    canonicalPath: "/entry-tests",
    keywords: ["MDCAT preparation", "ECAT test practice", "NUMS mock exam", "UHS past papers", "NUST NET preparation"],
    schemaType: "Quiz",
    isPublic: true
  },
  "competitive-exams": {
    title: "CSS & PMS Competitive Exams Preparation Portal | Taleem Guru",
    description: "FPSC CSS Screening MPT and PPSC PMS general knowledge, Pakistan affairs, current affairs, Islamic studies, and everyday science MCQ tests.",
    canonicalPath: "/competitive-exams",
    keywords: ["CSS preparation", "FPSC MPT screening test", "PMS past papers", "General Knowledge MCQs", "Pakistan affairs"],
    schemaType: "Course",
    isPublic: true
  },
  "armed-forces": {
    title: "Pakistan Armed Forces Initial Test Preparation (Army, Navy, PAF) | Taleem Guru",
    description: "Prepare for PMA Long Course, PAF GDP, and Pak Navy cadet tests with verbal, non-verbal intelligence, and academic test simulator.",
    canonicalPath: "/armed-forces",
    keywords: ["PMA Long Course", "Army initial test", "Verbal intelligence test", "Non verbal test", "PAF GDP test"],
    schemaType: "Quiz",
    isPublic: true
  },
  leaderboard: {
    title: "National Student Merit Leaderboard & Rankings | Taleem Guru",
    description: "View weekly, monthly, and all-time student rankings across Pakistan based on quiz accuracy, test scores, and learning streaks.",
    canonicalPath: "/leaderboard",
    keywords: ["Student leaderboard", "National rankings", "Merit list Pakistan", "Quiz competition", "Taleem Guru top scorers"],
    schemaType: "ItemPage",
    isPublic: true
  },
  "privacy-policy": {
    title: "Privacy Policy - Student Data & Academic Protection | Taleem Guru Pakistan",
    description: "Review the Privacy Policy for Taleem Guru Pakistan. Learn how we safeguard student account credentials, test results, performance analytics, and merit certificates.",
    canonicalPath: "/privacy-policy",
    keywords: ["Privacy policy", "Taleem Guru privacy", "Student data protection", "Academic privacy Pakistan", "Educational data security"],
    schemaType: "ItemPage",
    isPublic: true
  },
  "terms-of-service": {
    title: "Terms of Service - Academic Integrity & Testing Agreement | Taleem Guru Pakistan",
    description: "Terms of Service for Taleem Guru Pakistan. Understanding candidate rights, permissible test engine usage, merit certificate verification, and examination conduct.",
    canonicalPath: "/terms-of-service",
    keywords: ["Terms of service", "Taleem Guru terms", "Academic integrity", "Test rules Pakistan", "Certificate verification rules"],
    schemaType: "ItemPage",
    isPublic: true
  },
  "not-found": {
    title: "Page Not Found (404) | Taleem Guru Pakistan",
    description: "The requested educational page, test, or study note does not exist or has been relocated.",
    canonicalPath: "/404",
    keywords: ["404 not found", "Taleem Guru"],
    schemaType: "ItemPage",
    isPublic: false
  },
  // Private / Authenticated Views
  "student-dashboard": {
    title: "Student Dashboard | Taleem Guru",
    description: "Personalized student learning analytics, test attempts, and bookmark repository.",
    canonicalPath: "/dashboard",
    keywords: ["Student dashboard"],
    schemaType: "ItemPage",
    isPublic: false
  },
  "admin-panel": {
    title: "Admin Control Center | Taleem Guru",
    description: "Administrative platform management, question banking, and moderation center.",
    canonicalPath: "/admin",
    keywords: ["Admin panel"],
    schemaType: "ItemPage",
    isPublic: false
  },
  "teacher-panel": {
    title: "Teacher Evaluation Portal | Taleem Guru",
    description: "Instructor dashboard for managing student assessments and question verification.",
    canonicalPath: "/admin",
    keywords: ["Teacher panel"],
    schemaType: "ItemPage",
    isPublic: false
  },
  "access-denied": {
    title: "Access Restricted | Taleem Guru",
    description: "Unauthorized access. Authentication with required role credentials is required.",
    canonicalPath: "/access-denied",
    keywords: ["Access restricted"],
    schemaType: "ItemPage",
    isPublic: false
  },
  "test-session": {
    title: "Live Online Examination | Taleem Guru",
    description: "Timed online exam simulation in progress.",
    canonicalPath: "/tests",
    keywords: ["Test session"],
    schemaType: "Quiz",
    isPublic: false
  },
  "quiz-session": {
    title: "Live Quiz Session | Taleem Guru",
    description: "Timed interactive quiz attempt in progress.",
    canonicalPath: "/quizzes",
    keywords: ["Quiz session"],
    schemaType: "Quiz",
    isPublic: false
  },
  results: {
    title: "Examination Result & Performance Breakdown | Taleem Guru",
    description: "Detailed candidate score report and performance diagnostics.",
    canonicalPath: "/results",
    keywords: ["Test results"],
    schemaType: "ItemPage",
    isPublic: false
  },
  certificates: {
    title: "Merit Certificates Repository | Taleem Guru",
    description: "Download verified merit certificates and score cards.",
    canonicalPath: "/certificates",
    keywords: ["Certificates"],
    schemaType: "ItemPage",
    isPublic: false
  },
  "verify-certificate": {
    title: "Verify Certificate Authenticity | Taleem Guru",
    description: "Validate authentic Taleem Guru examination certificates using QR verification codes.",
    canonicalPath: "/verify",
    keywords: ["Verify certificate"],
    schemaType: "ItemPage",
    isPublic: true
  }
};
var PRIVATE_NOINDEX_VIEWS = /* @__PURE__ */ new Set([
  "student-dashboard",
  "admin-panel",
  "teacher-panel",
  "access-denied",
  "test-session",
  "quiz-session",
  "results",
  "certificates",
  "auth-callback",
  "not-found"
]);
function determineRobotsDirective(options) {
  const { view, contentStatus, isNotFound, isEmptyContent, hasSearchQuery } = options;
  if (isNotFound || view === "not-found") {
    return "noindex, nofollow";
  }
  if (PRIVATE_NOINDEX_VIEWS.has(view)) {
    return "noindex, nofollow";
  }
  if (contentStatus) {
    const normalizedStatus = contentStatus.trim().toLowerCase();
    if (normalizedStatus !== "published") {
      return "noindex, nofollow";
    }
  }
  if (isEmptyContent) {
    return "noindex, follow";
  }
  if (hasSearchQuery || view === "search" && options.hasSearchQuery) {
    return "noindex, follow";
  }
  const routeCfg = ROUTE_SEO_REGISTRY[view];
  if (routeCfg && !routeCfg.isPublic) {
    return "noindex, nofollow";
  }
  return "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";
}
function buildDynamicTitle(view, subFilter, customTitle) {
  if (customTitle) return customTitle;
  const base = ROUTE_SEO_REGISTRY[view] || ROUTE_SEO_REGISTRY.home;
  if (!subFilter) return base.title;
  const cleanFilter = subFilter.trim();
  switch (view) {
    case "boards":
      return `${cleanFilter} BISE Board - Model Papers, Syllabi & Past Papers | Taleem Guru`;
    case "classes":
      return `${cleanFilter} Syllabus, Chapter MCQs & Solved Papers | Taleem Guru`;
    case "subjects":
      return `${cleanFilter} Solved MCQs, Notes & Online Chapter Tests | Taleem Guru`;
    case "past-papers":
      return `${cleanFilter} Solved Past Papers with Answer Keys | Taleem Guru`;
    case "notes":
      return `${cleanFilter} Chapter Study Notes & Formula Sheets | Taleem Guru`;
    case "mcqs":
      return `${cleanFilter} Chapter MCQs Bank with Solutions | Taleem Guru`;
    case "entry-tests":
      return `${cleanFilter} Syllabus Mocks & Past Papers | Taleem Guru`;
    case "search":
      return `Search: "${cleanFilter}" - Educational Results | Taleem Guru`;
    default:
      return `${cleanFilter} - ${base.title}`;
  }
}
function buildDynamicDescription(view, subFilter, customDescription) {
  if (customDescription) return customDescription;
  const base = ROUTE_SEO_REGISTRY[view] || ROUTE_SEO_REGISTRY.home;
  if (!subFilter) return base.description;
  const cleanFilter = subFilter.trim();
  switch (view) {
    case "boards":
      return `Access verified past papers, chapter tests, model exams, and date sheet notices for ${cleanFilter} across all Matric & Inter grades on Taleem Guru.`;
    case "classes":
      return `Complete curriculum preparation for ${cleanFilter} students in Pakistan. Chapter-wise MCQs, revision notes, and board past papers on Taleem Guru.`;
    case "subjects":
      return `Comprehensive syllabus preparation for ${cleanFilter}. Practice chapter MCQs, download formula sheets, and take timed online assessments on Taleem Guru.`;
    case "past-papers":
      return `Download 10-year past examination papers and answer keys for ${cleanFilter} with step-by-step verified solutions on Taleem Guru.`;
    case "notes":
      return `High-yield chapter notes, definitions, formula summaries, and solved short questions for ${cleanFilter} on Taleem Guru.`;
    case "mcqs":
      return `Extensive collection of board-verified multiple choice questions for ${cleanFilter} with explanations on Taleem Guru.`;
    default:
      return `Educational resources, tests, past papers, and notes for ${cleanFilter} on Taleem Guru Pakistan.`;
  }
}
function generateSchemaGraph(options) {
  const { view, canonicalUrl, title, description, subFilter, activeItem } = options;
  const baseUrl = CANONICAL_PRODUCTION_DOMAIN;
  const organizationNode = {
    "@type": "EducationalOrganization",
    "@id": `${baseUrl}/#organization`,
    name: "Taleem Guru",
    url: baseUrl,
    logo: `${baseUrl}/vite.svg`,
    description: "Pakistan\u2019s Smart Online Test & Quiz Platform for BISE Boards, MDCAT, ECAT, CSS, and Matric/Inter Exam Preparation.",
    slogan: "Learn. Practice. Test. Improve.",
    educationalCredentialAwarded: "Certificate of Merit & Assessment Performance Report",
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Pakistan"
    },
    knowsAbout: [
      "Matriculation Examination",
      "Intermediate Examination",
      "BISE Board Past Papers",
      "MDCAT Entry Test",
      "ECAT Engineering Test",
      "Pakistan CSS Examination"
    ]
  };
  const websiteNode = {
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    url: baseUrl,
    name: "Taleem Guru - Pakistan Online Tests & MCQs",
    publisher: {
      "@id": `${baseUrl}/#organization`
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
  const breadcrumbElements = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${baseUrl}/`
    }
  ];
  if (view !== "home" && view !== "not-found") {
    breadcrumbElements.push({
      "@type": "ListItem",
      position: 2,
      name: view.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      item: getCanonicalUrl(`/${view}`)
    });
    if (subFilter) {
      breadcrumbElements.push({
        "@type": "ListItem",
        position: 3,
        name: subFilter,
        item: canonicalUrl
      });
    }
  }
  const breadcrumbNode = {
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl}#breadcrumb`,
    itemListElement: breadcrumbElements
  };
  const graph = [organizationNode, websiteNode, breadcrumbNode];
  if (activeItem) {
    if (view === "tests" || view === "test-session") {
      graph.push({
        "@type": "Quiz",
        "@id": `${canonicalUrl}#quiz`,
        name: activeItem.title,
        description: activeItem.description || description,
        educationalLevel: activeItem.classLevel || "General",
        timeRequired: activeItem.durationMinutes ? `PT${activeItem.durationMinutes}M` : void 0,
        about: activeItem.subject,
        hasPart: activeItem.totalQuestions ? {
          "@type": "ItemList",
          numberOfItems: activeItem.totalQuestions
        } : void 0
      });
    } else if (view === "past-papers") {
      graph.push({
        "@type": "LearningResource",
        "@id": `${canonicalUrl}#resource`,
        name: activeItem.title,
        description: activeItem.description || description,
        learningResourceType: "Past Examination Paper",
        educationalLevel: activeItem.classLevel,
        about: activeItem.subject,
        keywords: [activeItem.board, activeItem.subject, activeItem.year?.toString()].filter(Boolean)
      });
    } else if (view === "notes") {
      graph.push({
        "@type": "LearningResource",
        "@id": `${canonicalUrl}#resource`,
        name: activeItem.title,
        description: activeItem.description || description,
        learningResourceType: "Study Notes & Formula Sheets",
        educationalLevel: activeItem.classLevel,
        about: activeItem.subject
      });
    }
  }
  return {
    "@context": "https://schema.org",
    "@graph": graph
  };
}

// src/server/seoServer.ts
async function generateDynamicSitemap() {
  const baseUrl = CANONICAL_PRODUCTION_DOMAIN;
  const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const staticPublicRoutes = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/tests", priority: "0.9", changefreq: "daily" },
    { path: "/mcqs", priority: "0.9", changefreq: "daily" },
    { path: "/past-papers", priority: "0.9", changefreq: "daily" },
    { path: "/notes", priority: "0.9", changefreq: "daily" },
    { path: "/boards", priority: "0.8", changefreq: "weekly" },
    { path: "/classes", priority: "0.8", changefreq: "weekly" },
    { path: "/subjects", priority: "0.8", changefreq: "weekly" },
    { path: "/entry-tests", priority: "0.8", changefreq: "weekly" },
    { path: "/competitive-exams", priority: "0.8", changefreq: "weekly" },
    { path: "/armed-forces", priority: "0.8", changefreq: "weekly" },
    { path: "/leaderboard", priority: "0.7", changefreq: "daily" },
    { path: "/privacy-policy", priority: "0.5", changefreq: "monthly" },
    { path: "/terms-of-service", priority: "0.5", changefreq: "monthly" }
  ];
  const urls = [];
  for (const route of staticPublicRoutes) {
    urls.push({
      loc: `${baseUrl}${route.path}`,
      lastmod: now,
      changefreq: route.changefreq,
      priority: route.priority
    });
  }
  try {
    const publishedTests = await getTestsFromDb({ status: "Published", limit: 100 });
    for (const test of publishedTests) {
      if (test.status === "Published" && test.id) {
        const lastModDate = test.createdAt ? test.createdAt.split("T")[0] : now;
        urls.push({
          loc: `${baseUrl}/tests?subject=${encodeURIComponent(test.subject)}`,
          lastmod: lastModDate,
          changefreq: "weekly",
          priority: "0.8"
        });
      }
    }
    const publishedPapers = await getPastPapersFromDb({ status: "Published", limit: 100 });
    for (const paper of publishedPapers) {
      if (paper.status === "Published" && paper.id) {
        const lastModDate = paper.createdAt ? paper.createdAt.split("T")[0] : now;
        urls.push({
          loc: `${baseUrl}/past-papers?board=${encodeURIComponent(paper.board)}`,
          lastmod: lastModDate,
          changefreq: "weekly",
          priority: "0.8"
        });
      }
    }
    const publishedNotes = await getStudyNotesFromDb({ status: "Published", limit: 100 });
    for (const note of publishedNotes) {
      if (note.status === "Published" && note.id) {
        const lastModDate = note.createdAt ? note.createdAt.split("T")[0] : now;
        urls.push({
          loc: `${baseUrl}/notes?subject=${encodeURIComponent(note.subject)}`,
          lastmod: lastModDate,
          changefreq: "weekly",
          priority: "0.8"
        });
      }
    }
    const activeBoards = await getBoardsFromDb2();
    for (const board of activeBoards) {
      if (board.status === "Active" && board.name) {
        urls.push({
          loc: `${baseUrl}/boards?filter=${encodeURIComponent(board.name)}`,
          lastmod: now,
          changefreq: "monthly",
          priority: "0.7"
        });
      }
    }
    const activeClasses = await getClassesFromDb();
    for (const cls of activeClasses) {
      if (cls.status === "Active" && cls.name) {
        urls.push({
          loc: `${baseUrl}/classes?filter=${encodeURIComponent(cls.name)}`,
          lastmod: now,
          changefreq: "monthly",
          priority: "0.7"
        });
      }
    }
    const activeSubjects = await getSubjectsFromDb2();
    for (const subj of activeSubjects) {
      if (subj.status === "Active" && subj.name) {
        urls.push({
          loc: `${baseUrl}/subjects?filter=${encodeURIComponent(subj.name)}`,
          lastmod: now,
          changefreq: "monthly",
          priority: "0.7"
        });
      }
    }
  } catch (err) {
    console.warn("[SEO] Notice: Database query during sitemap generation encountered fallback:", err);
  }
  const uniqueUrlsMap = /* @__PURE__ */ new Map();
  for (const u of urls) {
    if (!uniqueUrlsMap.has(u.loc)) {
      uniqueUrlsMap.set(u.loc, u);
    }
  }
  const xmlEntries = Array.from(uniqueUrlsMap.values()).map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>
`;
}
function generateRobotsTxt() {
  const baseUrl = CANONICAL_PRODUCTION_DOMAIN;
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /admin-panel
Disallow: /dashboard
Disallow: /profile
Disallow: /certificates
Disallow: /attempts
Disallow: /results
Disallow: /test-session
Disallow: /quiz-session
Disallow: /access-denied
Disallow: /auth/
Disallow: /api/
Disallow: /*?*

# Canonical Sitemap
Sitemap: ${baseUrl}/sitemap.xml
`;
}
async function getDynamicSeoMetadata(params) {
  const { view = "home", subFilter, testId, paperId, noteId, mcqId, path: path6 = "/" } = params;
  let activeItem = null;
  let contentStatus = null;
  let isNotFound = false;
  if (testId) {
    const test = await getTestByIdFromDb(testId);
    if (test) {
      activeItem = {
        id: test.id,
        title: test.title,
        description: test.description,
        status: test.status,
        subject: test.subject,
        classLevel: test.classLevel,
        board: test.board,
        durationMinutes: test.durationMinutes,
        totalQuestions: test.totalQuestions
      };
      contentStatus = test.status;
    } else {
      isNotFound = true;
    }
  } else if (paperId) {
    const paper = await getPastPaperByIdFromDb(paperId);
    if (paper) {
      activeItem = {
        id: paper.id,
        title: paper.title,
        description: paper.description,
        status: paper.status,
        subject: paper.subject,
        classLevel: paper.classLevel,
        board: paper.board,
        year: paper.year,
        type: paper.type
      };
      contentStatus = paper.status;
    } else {
      isNotFound = true;
    }
  } else if (noteId) {
    const note = await getStudyNoteByIdFromDb(noteId);
    if (note) {
      activeItem = {
        id: note.id,
        title: note.title,
        description: note.description || note.contentSnippet,
        status: note.status,
        subject: note.subject,
        classLevel: note.classLevel,
        board: note.board
      };
      contentStatus = note.status;
    } else {
      isNotFound = true;
    }
  } else if (mcqId) {
    const mcq = await getMCQByIdFromDb(mcqId);
    if (mcq) {
      activeItem = {
        id: mcq.id,
        title: mcq.question,
        description: mcq.explanation,
        status: mcq.status,
        subject: mcq.subject,
        classLevel: mcq.classLevel,
        board: mcq.board
      };
      contentStatus = mcq.status;
    } else {
      isNotFound = true;
    }
  }
  const finalCanonical = getCanonicalUrl(path6);
  const finalTitle = buildDynamicTitle(view, subFilter, activeItem?.title);
  const finalDescription = buildDynamicDescription(view, subFilter, activeItem?.description);
  const robots = determineRobotsDirective({
    view,
    contentStatus,
    isNotFound,
    isEmptyContent: false,
    hasSearchQuery: view === "search" && Boolean(subFilter)
  });
  const isIndexable = robots.startsWith("index");
  const schemaGraph = generateSchemaGraph({
    view,
    canonicalUrl: finalCanonical,
    title: finalTitle,
    description: finalDescription,
    subFilter,
    activeItem
  });
  return {
    title: finalTitle,
    description: finalDescription,
    canonicalUrl: finalCanonical,
    robots,
    isIndexable,
    status: contentStatus || "Published",
    schemaOrg: schemaGraph,
    activeItem
  };
}

// src/db/documents.ts
import { eq as eq7, and as and6, desc as desc7, sql as sql9, ilike as ilike3, inArray as inArray4 } from "drizzle-orm";
async function getDocumentsFromDb(filters = {}, isStaff = false) {
  if (!db) return { items: [], total: 0 };
  try {
    const conditions = [];
    if (!isStaff && !filters.createdBy) {
      conditions.push(eq7(documents.status, "Published"));
    } else if (filters.status && filters.status !== "All") {
      conditions.push(eq7(documents.status, filters.status));
    }
    if (filters.createdBy) {
      conditions.push(eq7(documents.createdBy, filters.createdBy));
    }
    if (filters.documentType && filters.documentType !== "All") {
      conditions.push(eq7(documents.documentType, filters.documentType));
    }
    if (filters.board && filters.board !== "All") {
      conditions.push(ilike3(documents.board, `%${filters.board}%`));
    }
    if (filters.classLevel && filters.classLevel !== "All") {
      conditions.push(ilike3(documents.classLevel, `%${filters.classLevel}%`));
    }
    if (filters.subject && filters.subject !== "All") {
      conditions.push(ilike3(documents.subject, `%${filters.subject}%`));
    }
    if (filters.chapter && filters.chapter !== "All") {
      conditions.push(ilike3(documents.chapter, `%${filters.chapter}%`));
    }
    if (filters.year) {
      conditions.push(eq7(documents.year, filters.year));
    }
    if (filters.search) {
      conditions.push(ilike3(documents.title, `%${filters.search}%`));
    }
    const whereClause = conditions.length > 0 ? and6(...conditions) : void 0;
    const totalRes = await db.select({ count: sql9`count(*)::int` }).from(documents).where(whereClause);
    const total = totalRes[0]?.count || 0;
    const limit = Math.min(filters.limit || 50, 200);
    const offset = filters.offset || 0;
    const rows = await db.select().from(documents).where(whereClause).orderBy(desc7(documents.createdAt)).limit(limit).offset(offset);
    const items = rows.map((r) => ({
      id: r.id,
      title: r.title,
      originalFilename: r.originalFilename,
      sanitizedFilename: r.sanitizedFilename,
      mimeType: r.mimeType,
      fileSize: r.fileSize,
      storageRef: r.storageRef,
      originalFileHash: r.originalFileHash,
      brandedStorageRef: r.brandedStorageRef || void 0,
      brandedFileHash: r.brandedFileHash || void 0,
      documentType: r.documentType,
      contentType: r.contentType,
      board: r.board || void 0,
      classLevel: r.classLevel || void 0,
      subject: r.subject || void 0,
      chapter: r.chapter || void 0,
      topic: r.topic || void 0,
      year: r.year || void 0,
      language: r.language || "English",
      status: r.status,
      submittedBy: r.submittedBy || void 0,
      reviewedBy: r.reviewedBy || void 0,
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt).toISOString() : void 0,
      rejectionReason: r.rejectionReason || void 0,
      changeNotes: r.changeNotes || void 0,
      version: r.version,
      brandingStatus: r.brandingStatus,
      brandingVersion: r.brandingVersion || void 0,
      brandedAt: r.brandedAt ? new Date(r.brandedAt).toISOString() : void 0,
      downloadsCount: r.downloadsCount,
      associatedEntityId: r.associatedEntityId || void 0,
      createdBy: r.createdBy || void 0,
      updatedBy: r.updatedBy || void 0,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : void 0,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : void 0
    }));
    return { items, total };
  } catch (err) {
    console.error("Error in getDocumentsFromDb:", err);
    return { items: [], total: 0 };
  }
}
async function getDocumentByIdFromDb(id, isStaff = false) {
  if (!db) return null;
  try {
    const rows = await db.select().from(documents).where(eq7(documents.id, id)).limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    if (!isStaff && r.status !== "Published") {
      return null;
    }
    return {
      id: r.id,
      title: r.title,
      originalFilename: r.originalFilename,
      sanitizedFilename: r.sanitizedFilename,
      mimeType: r.mimeType,
      fileSize: r.fileSize,
      storageRef: r.storageRef,
      originalFileHash: r.originalFileHash,
      brandedStorageRef: r.brandedStorageRef || void 0,
      brandedFileHash: r.brandedFileHash || void 0,
      documentType: r.documentType,
      contentType: r.contentType,
      board: r.board || void 0,
      classLevel: r.classLevel || void 0,
      subject: r.subject || void 0,
      chapter: r.chapter || void 0,
      topic: r.topic || void 0,
      year: r.year || void 0,
      language: r.language || "English",
      status: r.status,
      submittedBy: r.submittedBy || void 0,
      reviewedBy: r.reviewedBy || void 0,
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt).toISOString() : void 0,
      rejectionReason: r.rejectionReason || void 0,
      changeNotes: r.changeNotes || void 0,
      version: r.version,
      brandingStatus: r.brandingStatus,
      brandingVersion: r.brandingVersion || void 0,
      brandedAt: r.brandedAt ? new Date(r.brandedAt).toISOString() : void 0,
      downloadsCount: r.downloadsCount,
      associatedEntityId: r.associatedEntityId || void 0,
      createdBy: r.createdBy || void 0,
      updatedBy: r.updatedBy || void 0,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : void 0,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : void 0
    };
  } catch (err) {
    console.error("Error in getDocumentByIdFromDb:", err);
    return null;
  }
}
async function updateDocumentMetadataInDb(id, updates, updaterUid) {
  if (!db) return null;
  try {
    const updateData = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (updates.title !== void 0) updateData.title = updates.title;
    if (updates.board !== void 0) updateData.board = updates.board;
    if (updates.classLevel !== void 0) updateData.classLevel = updates.classLevel;
    if (updates.subject !== void 0) updateData.subject = updates.subject;
    if (updates.chapter !== void 0) updateData.chapter = updates.chapter;
    if (updates.topic !== void 0) updateData.topic = updates.topic;
    if (updates.year !== void 0) updateData.year = updates.year;
    if (updates.language !== void 0) updateData.language = updates.language;
    if (updates.status !== void 0) updateData.status = updates.status;
    if (updates.documentType !== void 0) updateData.documentType = updates.documentType;
    if (updaterUid) updateData.updatedBy = updaterUid;
    await db.update(documents).set(updateData).where(eq7(documents.id, id));
    return await getDocumentByIdFromDb(id, true);
  } catch (err) {
    console.error("Error in updateDocumentMetadataInDb:", err);
    return null;
  }
}
async function bulkUpdateDocumentMetadataInDb(ids, metadata, updaterUid) {
  if (!db || ids.length === 0) return 0;
  try {
    const updateData = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (metadata.board !== void 0 && metadata.board !== "All") updateData.board = metadata.board;
    if (metadata.classLevel !== void 0 && metadata.classLevel !== "All") updateData.classLevel = metadata.classLevel;
    if (metadata.subject !== void 0 && metadata.subject !== "All") updateData.subject = metadata.subject;
    if (metadata.chapter !== void 0) updateData.chapter = metadata.chapter;
    if (metadata.year !== void 0) updateData.year = metadata.year;
    if (metadata.language !== void 0) updateData.language = metadata.language;
    if (metadata.status !== void 0) updateData.status = metadata.status;
    if (updaterUid) updateData.updatedBy = updaterUid;
    await db.update(documents).set(updateData).where(inArray4(documents.id, ids));
    return ids.length;
  } catch (err) {
    console.error("Error in bulkUpdateDocumentMetadataInDb:", err);
    return 0;
  }
}
async function bulkUpdateDocumentStatusInDb(ids, status, updaterUid) {
  if (!db || ids.length === 0) return 0;
  try {
    await db.update(documents).set({
      status,
      updatedBy: updaterUid,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(inArray4(documents.id, ids));
    return ids.length;
  } catch (err) {
    console.error("Error in bulkUpdateDocumentStatusInDb:", err);
    return 0;
  }
}
async function deleteDocumentFromDb(id) {
  if (!db) return false;
  try {
    await db.delete(documentVersions).where(eq7(documentVersions.documentId, id));
    await db.delete(documentDownloadEvents).where(eq7(documentDownloadEvents.documentId, id));
    await db.delete(documents).where(eq7(documents.id, id));
    return true;
  } catch (err) {
    console.error("Error in deleteDocumentFromDb:", err);
    return false;
  }
}
async function getDocumentVersionsFromDb(documentId) {
  if (!db) return [];
  try {
    const rows = await db.select().from(documentVersions).where(eq7(documentVersions.documentId, documentId)).orderBy(desc7(documentVersions.versionNumber));
    return rows.map((r) => ({
      id: r.id,
      documentId: r.documentId,
      versionNumber: r.versionNumber,
      originalFilename: r.originalFilename,
      storageRef: r.storageRef,
      originalFileHash: r.originalFileHash,
      brandedStorageRef: r.brandedStorageRef || void 0,
      brandedFileHash: r.brandedFileHash || void 0,
      fileSize: r.fileSize,
      changeNotes: r.changeNotes || void 0,
      createdBy: r.createdBy || void 0,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    }));
  } catch (err) {
    console.error("Error in getDocumentVersionsFromDb:", err);
    return [];
  }
}
async function getDocumentDownloadEventsFromDb(documentId, limit = 50) {
  if (!db) return [];
  try {
    const rows = await db.select().from(documentDownloadEvents).where(eq7(documentDownloadEvents.documentId, documentId)).orderBy(desc7(documentDownloadEvents.downloadedAt)).limit(limit);
    return rows.map((r) => ({
      id: r.id,
      documentId: r.documentId,
      documentType: r.documentType,
      userUid: r.userUid || void 0,
      anonymousSessionId: r.anonymousSessionId || void 0,
      ipAddress: r.ipAddress || void 0,
      userAgent: r.userAgent || void 0,
      version: r.version || 1,
      downloadedAt: r.downloadedAt ? new Date(r.downloadedAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    }));
  } catch (err) {
    console.error("Error in getDocumentDownloadEventsFromDb:", err);
    return [];
  }
}

// src/middleware/auth.ts
import { createClient } from "@supabase/supabase-js";
function getSupabaseServerClient() {
  const rawSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  const isConfigured = Boolean(
    supabaseUrl && supabaseKey && supabaseUrl.startsWith("https://") && !supabaseUrl.includes("placeholder")
  );
  if (!isConfigured) return null;
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
var requireAuth = async (req, res, next) => {
  if (req.user && req.user.uid) {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or malformed authorization token" });
  }
  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Empty token provided" });
  }
  const client = getSupabaseServerClient();
  let user = null;
  if (client) {
    try {
      const { data, error } = await client.auth.getUser(token);
      if (!error && data?.user) {
        user = data.user;
      }
    } catch (apiErr) {
      console.warn("Notice in Supabase auth.getUser:", apiErr);
    }
  }
  if (!user) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const crypto4 = await import("crypto");
        const secret = process.env.SUPABASE_ANON_KEY || process.env.SQL_ADMIN_PASSWORD || "taleemguru-admin-auth-key";
        const expectedSig = crypto4.createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest("base64url");
        if (parts[2] === expectedSig) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
          const nowSeconds = Math.floor(Date.now() / 1e3);
          if (payload && payload.sub && (!payload.exp || payload.exp > nowSeconds)) {
            user = {
              id: payload.sub,
              email: payload.email || payload.user_metadata?.email,
              user_metadata: payload.user_metadata || {}
            };
          }
        }
      }
    } catch (jwtErr) {
    }
  }
  if (!user) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired authentication token" });
  }
  try {
    const normalizedEmail = (user.email || "").toLowerCase().trim();
    const isBootstrap = isTrustedBootstrapAdminEmail(normalizedEmail);
    const bootstrapAdmins = getTrustedBootstrapAdmins();
    const bootstrapConfig = bootstrapAdmins[normalizedEmail];
    let dbUser = null;
    try {
      dbUser = await getUserByUid(user.id);
      if (!dbUser && normalizedEmail) {
        dbUser = await getOrCreateUser(user.id, normalizedEmail, {
          name: isBootstrap ? bootstrapConfig?.name || "Admin" : user.user_metadata?.name || user.user_metadata?.full_name
        });
      } else if (dbUser && isBootstrap && (!dbUser.roles || !dbUser.roles.includes("Admin") || dbUser.name !== (bootstrapConfig?.name || "Admin"))) {
        dbUser = await getOrCreateUser(user.id, normalizedEmail, {
          name: bootstrapConfig?.name || "Admin"
        });
      }
    } catch (dbErr) {
      console.warn("Notice: Unable to query or initialize database user in requireAuth:", dbErr);
    }
    let authoritativeRoles = ["Student"];
    if (isBootstrap) {
      authoritativeRoles = ["Admin"];
    } else if (dbUser?.roles && Array.isArray(dbUser.roles)) {
      authoritativeRoles = dbUser.roles;
    } else if (dbUser?.role) {
      authoritativeRoles = [dbUser.role];
    }
    if (isBootstrap) {
      console.log("[Auth Diagnostic]", {
        normalizedEmail,
        tokenVerificationSuccess: true,
        trustedAdminMatch: isBootstrap,
        dbProfileRoles: dbUser?.roles || [],
        authoritativeRoles,
        isAdmin: authoritativeRoles.includes("Admin")
      });
    }
    req.user = {
      uid: user.id,
      email: normalizedEmail,
      name: (isBootstrap ? bootstrapConfig?.name || "Admin" : dbUser?.name) || user.user_metadata?.name || user.user_metadata?.full_name || normalizedEmail.split("@")[0],
      roles: authoritativeRoles
    };
    return next();
  } catch (error) {
    console.error("Error verifying authentication token:", error);
    return res.status(401).json({ error: "Unauthorized: Failed to authenticate token" });
  }
};
var optionalAuth = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }
  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) return next();
  try {
    const client = getSupabaseServerClient();
    let user = null;
    if (client) {
      try {
        const { data } = await client.auth.getUser(token);
        if (data?.user) user = data.user;
      } catch {
      }
    }
    if (!user) {
      const parts = token.split(".");
      if (parts.length === 3) {
        const crypto4 = await import("crypto");
        const secret = process.env.SUPABASE_ANON_KEY || process.env.SQL_ADMIN_PASSWORD || "taleemguru-admin-auth-key";
        const expectedSig = crypto4.createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest("base64url");
        if (parts[2] === expectedSig) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
          const nowSeconds = Math.floor(Date.now() / 1e3);
          if (payload && payload.sub && (!payload.exp || payload.exp > nowSeconds)) {
            user = {
              id: payload.sub,
              email: payload.email || payload.user_metadata?.email,
              user_metadata: payload.user_metadata || {}
            };
          }
        }
      }
    }
    if (user) {
      const normalizedEmail = (user.email || "").toLowerCase().trim();
      const isBootstrap = isTrustedBootstrapAdminEmail(normalizedEmail);
      const bootstrapAdmins = getTrustedBootstrapAdmins();
      const bootstrapConfig = bootstrapAdmins[normalizedEmail];
      let dbUser = null;
      try {
        dbUser = await getUserByUid(user.id);
      } catch {
      }
      let authoritativeRoles = ["Student"];
      if (isBootstrap) authoritativeRoles = ["Admin"];
      else if (dbUser?.roles && Array.isArray(dbUser.roles)) authoritativeRoles = dbUser.roles;
      req.user = {
        uid: user.id,
        email: normalizedEmail,
        name: (isBootstrap ? bootstrapConfig?.name || "Admin" : dbUser?.name) || user.user_metadata?.name || normalizedEmail.split("@")[0],
        roles: authoritativeRoles
      };
    }
  } catch (err) {
  }
  return next();
};
var requireAdmin = async (req, res, next) => {
  await requireAuth(req, res, async () => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid) {
        return res.status(401).json({ error: "Unauthorized: Missing user identity" });
      }
      const normalizedEmail = (email || "").toLowerCase().trim();
      const isBootstrap = isTrustedBootstrapAdminEmail(normalizedEmail);
      if (isBootstrap) {
        req.user.roles = ["Admin"];
        return next();
      }
      let dbUser = null;
      try {
        dbUser = await getUserByUid(uid);
        if (!dbUser && normalizedEmail) {
          dbUser = await getOrCreateUser(uid, normalizedEmail);
        }
      } catch (dbErr) {
        console.warn("Notice in requireAdmin database lookup:", dbErr);
      }
      if (!dbUser) {
        return res.status(403).json({
          error: "Forbidden: User record not found in system. Access denied."
        });
      }
      if (dbUser.status && (dbUser.status.toLowerCase() === "suspended" || dbUser.status.toLowerCase() === "inactive")) {
        return res.status(403).json({
          error: `Forbidden: Account is currently ${dbUser.status}. Access denied.`,
          status: dbUser.status
        });
      }
      const staffRolesToCheck = [
        "admin",
        "superadmin",
        "super_admin",
        "administrator",
        "teacher",
        "editor",
        "contentmanager",
        "content_manager",
        "moderator"
      ];
      const roles = (dbUser.roles || [dbUser.role || ""]).map((r) => r.trim().toLowerCase().replace(/\s+/g, "_"));
      const isAuthorizedAdmin = roles.some((role) => staffRolesToCheck.includes(role));
      if (!isAuthorizedAdmin) {
        return res.status(403).json({
          error: "Forbidden: Administrative or staff privileges required. Access denied.",
          currentRoles: dbUser.roles || [dbUser.role]
        });
      }
      req.user.roles = dbUser.roles || [dbUser.role];
      return next();
    } catch (err) {
      console.error("requireAdmin verification failed:", err);
      return res.status(403).json({
        error: "Forbidden: Admin security verification failed"
      });
    }
  });
};
var requireContentManager = async (req, res, next) => {
  await requireAuth(req, res, async () => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid) {
        return res.status(401).json({ error: "Unauthorized: Missing user identity" });
      }
      const normalizedEmail = (email || "").toLowerCase().trim();
      const isBootstrap = isTrustedBootstrapAdminEmail(normalizedEmail);
      if (isBootstrap) {
        return next();
      }
      let dbUser = null;
      try {
        dbUser = await getUserByUid(uid);
      } catch (dbErr) {
        console.warn("Notice in requireContentManager database lookup:", dbErr);
      }
      if (!dbUser) {
        return res.status(403).json({
          error: "Forbidden: User record not found."
        });
      }
      const roles = (dbUser.roles || [dbUser.role || ""]).map((r) => r.trim().toLowerCase().replace(/\s+/g, "_"));
      const isAuthorized = roles.some((role) => ["admin", "superadmin", "super_admin", "administrator", "contentmanager", "content_manager"].includes(role));
      if (!isAuthorized) {
        return res.status(403).json({
          error: "Forbidden: Content Manager or Administrator privileges required."
        });
      }
      return next();
    } catch (err) {
      console.error("requireContentManager verification failed:", err);
      return res.status(403).json({
        error: "Forbidden: Security verification failed"
      });
    }
  });
};
var requireHighAdmin = async (req, res, next) => {
  await requireAdmin(req, res, async () => {
    const normalizedEmail = (req.user?.email || "").toLowerCase().trim();
    if (isTrustedBootstrapAdminEmail(normalizedEmail)) {
      return next();
    }
    const dbRoles = (req.user?.roles || []).map((r) => r.trim().toLowerCase().replace(/\s+/g, "_"));
    const isHighAdmin = dbRoles.some((role) => [
      "admin",
      "superadmin",
      "super_admin",
      "administrator"
    ].includes(role));
    if (!isHighAdmin) {
      return res.status(403).json({
        error: "Forbidden: Elevated administrator privileges required for user and role administration. Teachers, Editors, Content Managers, and Moderators cannot access this resource.",
        currentRoles: req.user?.roles
      });
    }
    return next();
  });
};
var requireMCQCurator = async (req, res, next) => {
  await requireAuth(req, res, async () => {
    try {
      const email = (req.user?.email || "").toLowerCase().trim();
      if (isTrustedBootstrapAdminEmail(email)) {
        return next();
      }
      const roles = (req.user?.roles || []).map((r) => r.trim().toLowerCase().replace(/\s+/g, "_"));
      const isAuthorized = roles.some((role) => [
        "admin",
        "superadmin",
        "super_admin",
        "administrator",
        "editor",
        "teacher",
        "contentmanager",
        "content_manager"
      ].includes(role));
      if (!isAuthorized) {
        return res.status(403).json({
          error: "Forbidden: MCQ curation privileges required (Admin, Teacher, Editor, Content Manager)."
        });
      }
      return next();
    } catch (err) {
      return res.status(403).json({ error: "Forbidden: Security verification failed" });
    }
  });
};
var requireQuizCreator = async (req, res, next) => {
  await requireAuth(req, res, async () => {
    try {
      const email = (req.user?.email || "").toLowerCase().trim();
      if (isTrustedBootstrapAdminEmail(email)) {
        return next();
      }
      const roles = (req.user?.roles || []).map((r) => r.trim().toLowerCase().replace(/\s+/g, "_"));
      const isAuthorized = roles.some((role) => [
        "admin",
        "superadmin",
        "super_admin",
        "administrator",
        "teacher",
        "contentmanager",
        "content_manager"
      ].includes(role));
      if (!isAuthorized) {
        return res.status(403).json({
          error: "Forbidden: Assessment creation privileges required (Admin, Teacher, Content Manager)."
        });
      }
      return next();
    } catch (err) {
      return res.status(403).json({ error: "Forbidden: Security verification failed" });
    }
  });
};
var requireContentCurator = async (req, res, next) => {
  await requireAuth(req, res, async () => {
    try {
      const email = (req.user?.email || "").toLowerCase().trim();
      if (isTrustedBootstrapAdminEmail(email)) {
        return next();
      }
      const roles = (req.user?.roles || []).map((r) => r.trim().toLowerCase().replace(/\s+/g, "_"));
      const isAuthorized = roles.some((role) => [
        "admin",
        "superadmin",
        "super_admin",
        "administrator",
        "contentmanager",
        "content_manager",
        "editor",
        "teacher"
      ].includes(role));
      if (!isAuthorized) {
        return res.status(403).json({
          error: "Forbidden: Content curation privileges required."
        });
      }
      return next();
    } catch (err) {
      return res.status(403).json({ error: "Forbidden: Security verification failed" });
    }
  });
};
var requireTeacher = async (req, res, next) => {
  await requireAuth(req, res, async () => {
    try {
      const email = (req.user?.email || "").toLowerCase().trim();
      if (isTrustedBootstrapAdminEmail(email)) {
        return next();
      }
      const roles = (req.user?.roles || []).map((r) => r.trim().toLowerCase().replace(/\s+/g, "_"));
      const isAuthorized = roles.some(
        (role) => [
          "admin",
          "superadmin",
          "super_admin",
          "administrator",
          "teacher",
          "contentmanager",
          "content_manager"
        ].includes(role)
      );
      if (!isAuthorized) {
        return res.status(403).json({
          error: "Forbidden: Teacher or Administrator privileges required to access teacher portal."
        });
      }
      return next();
    } catch (err) {
      return res.status(403).json({ error: "Forbidden: Security verification failed" });
    }
  });
};

// src/db/exams.ts
import { eq as eq8, desc as desc8, and as and7, sql as sql10, ilike as ilike4, inArray as inArray5 } from "drizzle-orm";
async function initExamSystemTables() {
  if (!db) return;
  try {
    await db.select({ count: sql10`count(*)` }).from(examAttempts).limit(1);
  } catch (err) {
    console.log("[Exam DB Init] Exam system tables verified and ready.");
  }
}
async function startExamAttemptInDb(params) {
  if (!db) throw new Error("Database pool unavailable");
  await initExamSystemTables();
  const testId = params.testId;
  const userUid = params.userUid || params.userId || `guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const studentName = params.studentName || "Student";
  const studentEmail = params.studentEmail;
  const ipAddress = params.ipAddress;
  const test = await getTestByIdFromDb(testId);
  if (!test) {
    throw new Error(`Test with ID "${testId}" not found`);
  }
  if (test.status === "Draft") {
    throw new Error("This assessment is currently in Draft mode and cannot be attempted");
  }
  if (test.maxAttempts && test.maxAttempts > 0) {
    const priorAttempts = await db.select({ count: sql10`count(*)` }).from(examAttempts).where(
      and7(
        eq8(examAttempts.testId, testId),
        eq8(examAttempts.userUid, userUid),
        eq8(examAttempts.status, "COMPLETED")
      )
    );
    const completedCount = Number(priorAttempts[0]?.count || 0);
    if (completedCount >= test.maxAttempts) {
      throw new Error(
        `Maximum attempt limit reached (${completedCount}/${test.maxAttempts}). Retakes are not permitted for this test.`
      );
    }
  }
  const existingActive = await db.select().from(examAttempts).where(
    and7(
      eq8(examAttempts.testId, testId),
      eq8(examAttempts.userUid, userUid),
      eq8(examAttempts.status, "IN_PROGRESS")
    )
  ).orderBy(desc8(examAttempts.startedAt)).limit(1);
  if (existingActive.length > 0) {
    const active = existingActive[0];
    const now = Date.now();
    const expiryTime = new Date(active.expiresAt).getTime();
    if (expiryTime > now - 15e3) {
      const timeRemainingSeconds2 = Math.max(0, Math.floor((expiryTime - now) / 1e3));
      const questionOrder2 = active.questionOrder || [];
      const questionsMap = /* @__PURE__ */ new Map();
      test.questions.forEach((q) => questionsMap.set(q.id, q));
      const orderedQuestions = questionOrder2.map((qId) => questionsMap.get(qId)).filter((q) => Boolean(q)).map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        subject: q.subject,
        chapter: q.chapter,
        topic: q.topic,
        difficulty: q.difficulty,
        classLevel: q.classLevel,
        board: q.board,
        year: q.year
      }));
      return {
        success: true,
        attemptId: active.attemptId,
        test: {
          id: test.id,
          title: test.title,
          description: test.description,
          testType: test.testType,
          category: test.category,
          subject: test.subject,
          chapter: test.chapter,
          classLevel: test.classLevel,
          board: test.board,
          durationMinutes: test.durationMinutes,
          totalQuestions: orderedQuestions.length,
          totalMarks: test.totalMarks,
          negativeMarking: test.negativeMarking,
          negativeMarkValue: test.negativeMarkValue,
          passPercentage: test.passPercentage,
          reviewPolicy: test.reviewPolicy || "immediate",
          questions: orderedQuestions
        },
        startedAt: new Date(active.startedAt).toISOString(),
        expiresAt: new Date(active.expiresAt).toISOString(),
        timeRemainingSeconds: timeRemainingSeconds2,
        existingAnswers: active.answers || {}
      };
    } else {
      await db.update(examAttempts).set({ status: "EXPIRED", updatedAt: /* @__PURE__ */ new Date() }).where(eq8(examAttempts.attemptId, active.attemptId));
    }
  }
  const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  let questionList = [...test.questions];
  if (test.randomizeQuestions) {
    questionList = questionList.sort(() => Math.random() - 0.5);
  }
  const questionOrder = questionList.map((q) => q.id);
  const durationMs = Math.max(1, test.durationMinutes) * 60 * 1e3;
  const startedAtDate = /* @__PURE__ */ new Date();
  const expiresAtDate = new Date(startedAtDate.getTime() + durationMs + 30 * 1e3);
  await db.insert(examAttempts).values({
    attemptId,
    testId: test.id,
    testTitle: test.title,
    userUid,
    studentName: studentName || "Student",
    studentEmail: studentEmail || null,
    startedAt: startedAtDate,
    expiresAt: expiresAtDate,
    status: "IN_PROGRESS",
    questionOrder,
    answers: {},
    totalMarks: test.totalMarks,
    reviewPolicy: test.reviewPolicy || "immediate",
    ipAddress: ipAddress || null,
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  });
  const safeQuestions = questionList.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    subject: q.subject,
    chapter: q.chapter,
    topic: q.topic,
    difficulty: q.difficulty,
    classLevel: q.classLevel,
    board: q.board,
    year: q.year
  }));
  const timeRemainingSeconds = Math.floor((expiresAtDate.getTime() - Date.now()) / 1e3);
  return {
    success: true,
    attemptId,
    test: {
      id: test.id,
      title: test.title,
      description: test.description,
      testType: test.testType,
      category: test.category,
      subject: test.subject,
      chapter: test.chapter,
      classLevel: test.classLevel,
      board: test.board,
      durationMinutes: test.durationMinutes,
      totalQuestions: safeQuestions.length,
      totalMarks: test.totalMarks,
      negativeMarking: test.negativeMarking,
      negativeMarkValue: test.negativeMarkValue,
      passPercentage: test.passPercentage,
      reviewPolicy: test.reviewPolicy || "immediate",
      questions: safeQuestions
    },
    startedAt: startedAtDate.toISOString(),
    expiresAt: expiresAtDate.toISOString(),
    timeRemainingSeconds,
    existingAnswers: {}
  };
}
async function saveExamAnswerInDb(params) {
  if (!db) throw new Error("Database pool unavailable");
  const { attemptId, userUid, questionId, selectedOption, markedForReview, timeSpentSeconds } = params;
  const rows = await db.select().from(examAttempts).where(eq8(examAttempts.attemptId, attemptId)).limit(1);
  if (rows.length === 0) {
    throw new Error("Exam attempt not found");
  }
  const attempt = rows[0];
  if (attempt.userUid !== userUid && !userUid.startsWith("admin-")) {
    throw new Error("Unauthorized to modify this exam attempt");
  }
  if (attempt.status !== "IN_PROGRESS") {
    throw new Error(`Cannot save answer: attempt is already marked as ${attempt.status}`);
  }
  const expiryTime = new Date(attempt.expiresAt).getTime();
  if (Date.now() > expiryTime + 3e4) {
    await db.update(examAttempts).set({ status: "EXPIRED", updatedAt: /* @__PURE__ */ new Date() }).where(eq8(examAttempts.attemptId, attemptId));
    throw new Error("Time limit has expired for this examination");
  }
  const currentAnswers = attempt.answers || {};
  const updatedAnswers = {
    ...currentAnswers,
    [questionId]: {
      selectedOption,
      markedForReview: Boolean(markedForReview),
      timeSpentSeconds: Number(timeSpentSeconds || 0),
      savedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
  await db.update(examAttempts).set({
    answers: updatedAnswers,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq8(examAttempts.attemptId, attemptId));
  return { success: true, savedAt: (/* @__PURE__ */ new Date()).toISOString() };
}
async function submitExamAttemptInDb(params) {
  if (!db) throw new Error("Database pool unavailable");
  await initExamSystemTables();
  const { attemptId, userUid, submittedAnswers, timeSpentSeconds } = params;
  const rows = await db.select().from(examAttempts).where(eq8(examAttempts.attemptId, attemptId)).limit(1);
  if (rows.length === 0) {
    throw new Error("Exam attempt not found");
  }
  const attempt = rows[0];
  if (attempt.userUid !== userUid && !userUid.startsWith("admin-")) {
    throw new Error("Unauthorized: attempt belongs to another student");
  }
  if (attempt.status === "COMPLETED") {
    const existingResult = await db.select().from(testResults).where(eq8(testResults.resultId, attemptId)).limit(1);
    if (existingResult.length > 0) {
      const r = existingResult[0];
      const test2 = await getTestByIdFromDb(attempt.testId);
      return {
        result: {
          id: r.resultId,
          testId: r.testId,
          testTitle: r.testTitle,
          testType: r.testType,
          subject: r.subject,
          category: r.category,
          timestamp: new Date(r.createdAt).toISOString(),
          totalQuestions: r.totalQuestions,
          answeredCount: r.answeredCount,
          correctCount: r.correctCount,
          wrongCount: r.wrongCount,
          skippedCount: r.skippedCount,
          marksObtained: r.marksObtained,
          totalMarks: r.totalMarks,
          percentage: r.percentage,
          grade: r.grade,
          timeUsedSeconds: r.timeUsedSeconds,
          totalDurationSeconds: (test2?.durationMinutes || 15) * 60,
          percentileRank: r.percentileRank,
          answers: r.answers || [],
          questions: test2?.questions || []
        }
      };
    }
  }
  const test = await getTestByIdFromDb(attempt.testId);
  if (!test) {
    throw new Error("Test configuration not found");
  }
  const questionOrder = attempt.questionOrder || [];
  const junctionMCQs = await db.select().from(mcqs).where(inArray5(mcqs.id, questionOrder.length > 0 ? questionOrder : ["empty"]));
  const mcqsMap = /* @__PURE__ */ new Map();
  junctionMCQs.forEach((m) => {
    mcqsMap.set(m.id, {
      id: m.id,
      question: m.question,
      options: m.options || [],
      correctAnswer: m.correctAnswer,
      explanation: m.explanation || "",
      subject: m.subject,
      chapter: m.chapter || void 0,
      topic: m.topic || void 0,
      difficulty: m.difficulty,
      classLevel: m.classLevel || void 0,
      board: m.board || void 0,
      exam: m.exam || void 0,
      year: m.year || void 0,
      tags: m.tags || [],
      language: m.language,
      status: m.status
    });
  });
  const mergedAnswers = {
    ...attempt.answers || {},
    ...submittedAnswers || {}
  };
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  const userAnswersList = [];
  const totalQuestions = questionOrder.length;
  for (const qId of questionOrder) {
    const mcq = mcqsMap.get(qId);
    const ansRecord = mergedAnswers[qId];
    const selectedOption = ansRecord?.selectedOption !== void 0 && ansRecord?.selectedOption !== null ? Number(ansRecord.selectedOption) : null;
    userAnswersList.push({
      questionId: qId,
      selectedOption,
      markedForReview: Boolean(ansRecord?.markedForReview),
      timeSpentSeconds: Number(ansRecord?.timeSpentSeconds || 0)
    });
    if (selectedOption === null || selectedOption === void 0) {
      skippedCount++;
    } else if (mcq && selectedOption === mcq.correctAnswer) {
      correctCount++;
    } else {
      wrongCount++;
    }
  }
  const marksPerQuestion = test.totalMarks / (totalQuestions || 1);
  const penaltyPerWrong = test.negativeMarking ? test.negativeMarkValue || 0.25 : 0;
  const rawMarks = correctCount * marksPerQuestion - wrongCount * penaltyPerWrong;
  const marksObtained = Math.max(0, Math.round(rawMarks * 100) / 100);
  const percentage = Math.round(marksObtained / (test.totalMarks || 1) * 100);
  const passed = percentage >= test.passPercentage;
  let grade = "F";
  if (percentage >= 85) grade = "A+";
  else if (percentage >= 75) grade = "A";
  else if (percentage >= 65) grade = "B";
  else if (percentage >= 50) grade = "C";
  const percentileRank = Math.min(99, Math.max(40, Math.floor(percentage * 0.95) + 5));
  const submittedAt = /* @__PURE__ */ new Date();
  const startTime2 = new Date(attempt.startedAt).getTime();
  const calculatedDuration = Math.max(5, Math.floor((submittedAt.getTime() - startTime2) / 1e3));
  const effectiveTimeSpent = timeSpentSeconds ? Math.max(5, timeSpentSeconds) : calculatedDuration;
  await db.update(examAttempts).set({
    status: "COMPLETED",
    submittedAt,
    answers: mergedAnswers,
    score: Math.round(marksObtained),
    totalMarks: test.totalMarks,
    percentage,
    passed,
    grade,
    correctCount,
    wrongCount,
    unansweredCount: skippedCount,
    timeSpentSeconds: effectiveTimeSpent,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq8(examAttempts.attemptId, attemptId));
  try {
    const existingUser = await db.select({ uid: users.uid }).from(users).where(eq8(users.uid, userUid)).limit(1);
    if (existingUser.length === 0) {
      await db.insert(users).values({
        uid: userUid,
        email: attempt.studentEmail || `${userUid}@student.taleemguru.pk`,
        name: attempt.studentName || "Student Candidate",
        roles: ["Student"],
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing();
    }
  } catch (userErr) {
    console.warn("[Exam DB] User check notice:", userErr);
  }
  await db.insert(testResults).values({
    resultId: attemptId,
    userUid,
    testId: test.id,
    testTitle: test.title,
    testType: test.testType,
    subject: test.subject,
    category: test.category,
    totalQuestions,
    answeredCount: correctCount + wrongCount,
    correctCount,
    wrongCount,
    skippedCount,
    marksObtained: Math.round(marksObtained),
    totalMarks: test.totalMarks,
    percentage,
    grade,
    timeUsedSeconds: effectiveTimeSpent,
    percentileRank,
    answers: userAnswersList,
    createdAt: submittedAt
  }).onConflictDoUpdate({
    target: testResults.resultId,
    set: {
      answeredCount: correctCount + wrongCount,
      correctCount,
      wrongCount,
      skippedCount,
      marksObtained: Math.round(marksObtained),
      percentage,
      grade,
      timeUsedSeconds: effectiveTimeSpent,
      percentileRank,
      answers: userAnswersList
    }
  });
  let issuedCertificateId = void 0;
  if (passed && percentage >= 50) {
    try {
      const certId = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await db.insert(certificates).values({
        id: certId,
        userUid,
        studentName: attempt.studentName || "Learner",
        testId: test.id,
        testName: test.title,
        score: Math.round(marksObtained),
        totalMarks: test.totalMarks,
        percentage,
        grade,
        className: test.classLevel || "General",
        subjectName: test.subject,
        chapterName: test.chapter || "Comprehensive Examination",
        performanceLevel: percentage >= 85 ? "Outstanding" : percentage >= 75 ? "Distinction" : "Merit",
        status: "VALID",
        verificationUrl: `/verify-certificate?id=${certId}`,
        issueDate: /* @__PURE__ */ new Date()
      }).onConflictDoNothing();
      issuedCertificateId = certId;
    } catch (certErr) {
      console.warn("[Cert Auto-Issue] Notice creating certificate:", certErr);
    }
  }
  try {
    await db.update(users).set({
      points: sql10`${users.points} + ${Math.round(marksObtained * 10)}`,
      testsTaken: sql10`${users.testsTaken} + 1`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq8(users.uid, userUid));
  } catch (userErr) {
    console.warn("[User Stats] Notice updating user stats:", userErr);
  }
  const orderedQuestions = questionOrder.map((qId) => mcqsMap.get(qId)).filter((q) => Boolean(q));
  const resultPayload = {
    id: attemptId,
    testId: test.id,
    testTitle: test.title,
    testType: test.testType,
    subject: test.subject,
    category: test.category,
    timestamp: submittedAt.toISOString(),
    totalQuestions,
    answeredCount: correctCount + wrongCount,
    correctCount,
    wrongCount,
    skippedCount,
    marksObtained,
    totalMarks: test.totalMarks,
    percentage,
    grade,
    timeUsedSeconds: effectiveTimeSpent,
    totalDurationSeconds: test.durationMinutes * 60,
    percentileRank,
    answers: userAnswersList,
    questions: orderedQuestions,
    userId: userUid,
    userEmail: attempt.studentEmail || void 0
  };
  return { result: resultPayload, certificateId: issuedCertificateId };
}
async function getExamAttemptResultFromDb(attemptId, userUid) {
  if (!db) return null;
  const rows = await db.select().from(examAttempts).where(eq8(examAttempts.attemptId, attemptId)).limit(1);
  if (rows.length === 0) return null;
  const attempt = rows[0];
  if (attempt.userUid !== userUid && !userUid.startsWith("admin-")) {
    return null;
  }
  const test = await getTestByIdFromDb(attempt.testId);
  const questionOrder = attempt.questionOrder || [];
  const junctionMCQs = await db.select().from(mcqs).where(inArray5(mcqs.id, questionOrder.length > 0 ? questionOrder : ["empty"]));
  const mcqsMap = /* @__PURE__ */ new Map();
  junctionMCQs.forEach((m) => {
    mcqsMap.set(m.id, {
      id: m.id,
      question: m.question,
      options: m.options || [],
      correctAnswer: m.correctAnswer,
      explanation: m.explanation || "",
      subject: m.subject,
      chapter: m.chapter || void 0,
      topic: m.topic || void 0,
      difficulty: m.difficulty,
      classLevel: m.classLevel || void 0,
      board: m.board || void 0,
      tags: m.tags || [],
      language: m.language,
      status: m.status
    });
  });
  const orderedQuestions = questionOrder.map((qId) => mcqsMap.get(qId)).filter((q) => Boolean(q));
  const answersMap = attempt.answers || {};
  const userAnswersList = Object.entries(answersMap).map(([qId, val]) => ({
    questionId: qId,
    selectedOption: val.selectedOption,
    markedForReview: Boolean(val.markedForReview),
    timeSpentSeconds: Number(val.timeSpentSeconds || 0)
  }));
  return {
    id: attempt.attemptId,
    testId: attempt.testId,
    testTitle: attempt.testTitle,
    testType: test?.testType || "Chapter Test",
    subject: test?.subject || "Academic",
    category: test?.category || "Assessment",
    timestamp: attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : new Date(attempt.createdAt).toISOString(),
    totalQuestions: orderedQuestions.length,
    answeredCount: (attempt.correctCount || 0) + (attempt.wrongCount || 0),
    correctCount: attempt.correctCount || 0,
    wrongCount: attempt.wrongCount || 0,
    skippedCount: attempt.unansweredCount || 0,
    marksObtained: attempt.score || 0,
    totalMarks: attempt.totalMarks || test?.totalMarks || 10,
    percentage: attempt.percentage || 0,
    grade: attempt.grade || "F",
    timeUsedSeconds: attempt.timeSpentSeconds || 0,
    totalDurationSeconds: (test?.durationMinutes || 15) * 60,
    percentileRank: Math.min(99, Math.max(45, Math.floor((attempt.percentage || 50) * 0.95) + 5)),
    answers: userAnswersList,
    questions: orderedQuestions,
    userId: attempt.userUid,
    userEmail: attempt.studentEmail || void 0
  };
}
async function getUserExamHistoryFromDb(userUid, limit = 50) {
  if (!db) return [];
  const rows = await db.select().from(examAttempts).where(eq8(examAttempts.userUid, userUid)).orderBy(desc8(examAttempts.createdAt)).limit(limit);
  return rows.map((r) => ({
    attemptId: r.attemptId,
    testId: r.testId,
    testTitle: r.testTitle,
    status: r.status,
    startedAt: r.startedAt ? new Date(r.startedAt).toISOString() : "",
    submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : null,
    score: r.score,
    totalMarks: r.totalMarks,
    percentage: r.percentage,
    passed: r.passed,
    grade: r.grade,
    timeSpentSeconds: r.timeSpentSeconds,
    correctCount: r.correctCount,
    wrongCount: r.wrongCount,
    unansweredCount: r.unansweredCount
  }));
}
async function getAllExamAttemptsFromDb(filters) {
  if (!db) return { attempts: [], total: 0, analytics: null };
  const conditions = [];
  if (filters.testId && filters.testId !== "All") {
    conditions.push(eq8(examAttempts.testId, filters.testId));
  }
  if (filters.status && filters.status !== "All") {
    conditions.push(eq8(examAttempts.status, filters.status));
  }
  if (filters.search) {
    conditions.push(
      sql10`(${ilike4(examAttempts.testTitle, `%${filters.search}%`)} OR ${ilike4(
        examAttempts.studentName,
        `%${filters.search}%`
      )} OR ${ilike4(examAttempts.studentEmail, `%${filters.search}%`)})`
    );
  }
  const query = db.select().from(examAttempts).where(conditions.length > 0 ? and7(...conditions) : void 0).orderBy(desc8(examAttempts.createdAt)).limit(filters.limit || 100).offset(filters.offset || 0);
  const rows = await query;
  const countRes = await db.select({ count: sql10`count(*)` }).from(examAttempts).where(conditions.length > 0 ? and7(...conditions) : void 0);
  const total = Number(countRes[0]?.count || 0);
  const completedRows = rows.filter((r) => r.status === "COMPLETED");
  const avgScore = completedRows.length > 0 ? Math.round(
    completedRows.reduce((acc, r) => acc + (r.percentage || 0), 0) / completedRows.length
  ) : 0;
  const passedCount = completedRows.filter((r) => r.passed).length;
  const passRate = completedRows.length > 0 ? Math.round(passedCount / completedRows.length * 100) : 0;
  return {
    attempts: rows.map((r) => ({
      id: r.id,
      attemptId: r.attemptId,
      testId: r.testId,
      testTitle: r.testTitle,
      userUid: r.userUid,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      status: r.status,
      startedAt: r.startedAt ? new Date(r.startedAt).toISOString() : "",
      submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : null,
      score: r.score,
      totalMarks: r.totalMarks,
      percentage: r.percentage,
      passed: r.passed,
      grade: r.grade,
      timeSpentSeconds: r.timeSpentSeconds,
      correctCount: r.correctCount,
      wrongCount: r.wrongCount,
      unansweredCount: r.unansweredCount
    })),
    total,
    analytics: {
      totalAttempts: total,
      completedAttempts: completedRows.length,
      averageScore: avgScore,
      passRate
    }
  };
}
async function getUserActiveExamAttempt(userUid) {
  if (!db || !userUid) return null;
  const now = /* @__PURE__ */ new Date();
  const activeList = await db.select().from(examAttempts).where(
    and7(
      eq8(examAttempts.userUid, userUid),
      eq8(examAttempts.status, "IN_PROGRESS"),
      sql10`${examAttempts.expiresAt} > ${now}`
    )
  ).orderBy(desc8(examAttempts.startedAt)).limit(1);
  if (activeList.length === 0) return null;
  const active = activeList[0];
  const nowMs = Date.now();
  const expiresMs = new Date(active.expiresAt).getTime();
  const remainingSeconds = Math.max(0, Math.floor((expiresMs - nowMs) / 1e3));
  return {
    attemptId: active.attemptId,
    testId: active.testId,
    testTitle: active.testTitle,
    startedAt: active.startedAt ? new Date(active.startedAt).toISOString() : "",
    expiresAt: active.expiresAt ? new Date(active.expiresAt).toISOString() : "",
    remainingSeconds,
    timeRemainingSeconds: remainingSeconds,
    totalQuestions: Array.isArray(active.questionOrder) ? active.questionOrder.length : 0
  };
}
async function getStudentDashboardStats(userUid) {
  if (!db || !userUid) {
    return {
      profile: null,
      summary: {
        totalTestsAttempted: 0,
        totalTestsPassed: 0,
        averagePercentage: 0,
        highestPercentage: 0,
        totalTimeSpentSeconds: 0,
        certificatesEarned: 0,
        bookmarksCount: 0
      },
      recentAttempts: [],
      activeExam: null
    };
  }
  const userRows = await db.select().from(users).where(eq8(users.uid, userUid)).limit(1);
  const user = userRows[0] || null;
  const results = await db.select().from(testResults).where(eq8(testResults.userUid, userUid)).orderBy(desc8(testResults.createdAt));
  const certs = await db.select({ count: sql10`count(*)` }).from(certificates).where(eq8(certificates.userUid, userUid));
  const certificatesEarned = Number(certs[0]?.count || 0);
  const bmarks = await db.select({ count: sql10`count(*)` }).from(bookmarkedQuestions).where(eq8(bookmarkedQuestions.userUid, userUid));
  const bookmarksCount = Number(bmarks[0]?.count || 0);
  const activeExam = await getUserActiveExamAttempt(userUid);
  const totalTestsAttempted = results.length;
  const passedResults = results.filter((r) => r.percentage >= 50);
  const totalTestsPassed = passedResults.length;
  const averagePercentage = totalTestsAttempted > 0 ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalTestsAttempted) : 0;
  const highestPercentage = totalTestsAttempted > 0 ? Math.max(...results.map((r) => r.percentage)) : 0;
  const totalTimeSpentSeconds = results.reduce((sum, r) => sum + (r.timeUsedSeconds || 0), 0);
  return {
    profile: user ? {
      uid: user.uid,
      name: user.name,
      email: user.email,
      roles: user.roles,
      classLevel: user.classLevel,
      board: user.board,
      targetExam: user.targetExam,
      avatar: user.avatar,
      points: user.points,
      streakDays: user.streakDays,
      testsTaken: user.testsTaken || totalTestsAttempted,
      status: user.status
    } : null,
    summary: {
      totalTestsAttempted,
      totalTestsPassed,
      averagePercentage,
      highestPercentage,
      totalTimeSpentSeconds,
      certificatesEarned,
      bookmarksCount
    },
    recentAttempts: results.slice(0, 10).map((r) => ({
      resultId: r.resultId,
      testId: r.testId,
      testTitle: r.testTitle,
      testType: r.testType,
      subject: r.subject,
      category: r.category,
      totalQuestions: r.totalQuestions,
      answeredCount: r.answeredCount,
      correctCount: r.correctCount,
      wrongCount: r.wrongCount,
      skippedCount: r.skippedCount,
      marksObtained: r.marksObtained,
      totalMarks: r.totalMarks,
      percentage: r.percentage,
      grade: r.grade,
      passed: r.percentage >= 50,
      timeUsedSeconds: r.timeUsedSeconds,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : ""
    })),
    activeExam
  };
}
async function getStudentPerformanceAnalytics(userUid) {
  if (!db || !userUid) {
    return {
      hasData: false,
      totalTests: 0,
      passRate: 0,
      averagePercentage: 0,
      highestScore: 0,
      totalQuestionsAnswered: 0,
      totalCorrect: 0,
      totalWrong: 0,
      overallAccuracy: 0,
      subjectBreakdown: [],
      scoreHistory: []
    };
  }
  const results = await db.select().from(testResults).where(eq8(testResults.userUid, userUid)).orderBy(desc8(testResults.createdAt));
  if (results.length === 0) {
    return {
      hasData: false,
      totalTests: 0,
      passRate: 0,
      averagePercentage: 0,
      highestScore: 0,
      totalQuestionsAnswered: 0,
      totalCorrect: 0,
      totalWrong: 0,
      overallAccuracy: 0,
      subjectBreakdown: [],
      scoreHistory: []
    };
  }
  const totalTests = results.length;
  const passedCount = results.filter((r) => r.percentage >= 50).length;
  const passRate = Math.round(passedCount / totalTests * 100);
  const averagePercentage = Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / totalTests);
  const highestScore = Math.max(...results.map((r) => r.percentage));
  const totalQuestionsAnswered = results.reduce((acc, r) => acc + (r.answeredCount || 0), 0);
  const totalCorrect = results.reduce((acc, r) => acc + (r.correctCount || 0), 0);
  const totalWrong = results.reduce((acc, r) => acc + (r.wrongCount || 0), 0);
  const overallAccuracy = totalQuestionsAnswered > 0 ? Math.round(totalCorrect / totalQuestionsAnswered * 100) : 0;
  const subjectMap = {};
  for (const r of results) {
    const subj = r.subject || "General";
    if (!subjectMap[subj]) {
      subjectMap[subj] = { testsCount: 0, totalPct: 0, correct: 0, totalQ: 0 };
    }
    subjectMap[subj].testsCount += 1;
    subjectMap[subj].totalPct += r.percentage;
    subjectMap[subj].correct += r.correctCount || 0;
    subjectMap[subj].totalQ += r.answeredCount || r.totalQuestions || 0;
  }
  const subjectBreakdown = Object.entries(subjectMap).map(([subject, data]) => {
    const avgPct = Math.round(data.totalPct / data.testsCount);
    const accuracy = data.totalQ > 0 ? Math.round(data.correct / data.totalQ * 100) : avgPct;
    let status = "Average";
    if (avgPct >= 80) status = "Strong";
    else if (avgPct < 60) status = "Needs Focus";
    return {
      subject,
      testsCount: data.testsCount,
      averagePercentage: avgPct,
      accuracyPercentage: accuracy,
      status
    };
  });
  const scoreHistory = [...results].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((r, idx) => ({
    index: idx + 1,
    testTitle: r.testTitle,
    subject: r.subject,
    percentage: r.percentage,
    date: r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : ""
  }));
  return {
    hasData: true,
    totalTests,
    passRate,
    averagePercentage,
    highestScore,
    totalQuestionsAnswered,
    totalCorrect,
    totalWrong,
    overallAccuracy,
    subjectBreakdown,
    scoreHistory
  };
}
async function getTeacherDashboardStats(userUid) {
  if (!db || !userUid) {
    return {
      assignments: [],
      testsCreatedCount: 0,
      totalStudentAttempts: 0,
      averageClassScore: 0,
      recentStudentResults: []
    };
  }
  let assignments = [];
  try {
    assignments = await db.select().from(staffAssignments).where(eq8(staffAssignments.userUid, userUid));
  } catch (err) {
    console.warn("Notice loading teacher assignments:", err);
  }
  const teacherTests = await db.select().from(tests).where(eq8(tests.createdBy, userUid));
  const publishedTestsCount = teacherTests.filter((t) => t.status === "Published").length;
  let questionsContributed = 0;
  try {
    const mcqRows = await db.select({ count: sql10`count(*)` }).from(mcqs).where(eq8(mcqs.createdBy, userUid));
    questionsContributed = Number(mcqRows[0]?.count || 0);
  } catch (mcqErr) {
    console.warn("Notice loading teacher contributed MCQs:", mcqErr);
  }
  const testIds = teacherTests.map((t) => t.id);
  let studentResultsList = [];
  if (testIds.length > 0) {
    studentResultsList = await db.select().from(testResults).where(inArray5(testResults.testId, testIds)).orderBy(desc8(testResults.createdAt)).limit(50);
  } else {
    studentResultsList = await db.select().from(testResults).orderBy(desc8(testResults.createdAt)).limit(20);
  }
  const totalAttempts = studentResultsList.length;
  const avgScore = totalAttempts > 0 ? Math.round(studentResultsList.reduce((acc, r) => acc + r.percentage, 0) / totalAttempts) : 0;
  const passedSubmissions = studentResultsList.filter((r) => (r.percentage || 0) >= 50).length;
  const passRate = totalAttempts > 0 ? Math.round(passedSubmissions / totalAttempts * 100) : 0;
  return {
    assignments,
    testsCreatedCount: teacherTests.length,
    totalTestsCreated: teacherTests.length,
    totalPublishedTests: publishedTestsCount,
    totalQuestionsContributed: questionsContributed,
    totalStudentAttempts: totalAttempts,
    totalSubmissionsEvaluated: totalAttempts,
    averageClassScore: avgScore,
    avgStudentPercentage: avgScore,
    passRatePercentage: passRate,
    recentStudentResults: studentResultsList.map((r) => ({
      resultId: r.resultId,
      testId: r.testId,
      testTitle: r.testTitle,
      subject: r.subject,
      userUid: r.userUid,
      totalQuestions: r.totalQuestions,
      correctCount: r.correctCount,
      percentage: r.percentage,
      grade: r.grade,
      timeUsedSeconds: r.timeUsedSeconds,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : ""
    }))
  };
}

// src/serverApp.ts
var app = express();
if (!process.env.VERCEL) {
  syncBootstrapAdmins().catch((err) => {
    console.warn("[Server] Initial admin bootstrap sync notice:", err);
  });
  initExamSystemTables().catch((err) => {
    console.warn("[Server] Initial exam tables notice:", err);
  });
  seedInitialEducationalContent().catch((err) => {
    console.warn("[Server] Initial educational content seeding notice:", err);
  });
  seedInitialHierarchy().catch((err) => {
    console.warn("[Server] Initial hierarchy seeding notice:", err);
  });
}
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req.path.startsWith("/api") || req.path === "/api") {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }
  next();
});
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const configuredOrigin = process.env.VITE_SITE_URL || process.env.SITE_URL;
  const allowedOrigins = [
    configuredOrigin,
    "https://www.taleemguru.pk",
    "https://taleemguru.pk"
  ].filter(Boolean);
  if (origin) {
    const isLocalDev = origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes(".run.app") || origin.includes(".vercel.app");
    if (isLocalDev || allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
  }
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
var apiRouter = express.Router();
apiRouter.get("/health", async (req, res) => {
  try {
    const report = await getSystemHealthReport();
    res.status(report.status === "unhealthy" ? 503 : 200).json(report);
  } catch (error) {
    res.status(500).json({ status: "unhealthy", timestamp: (/* @__PURE__ */ new Date()).toISOString(), error: "Health check failed" });
  }
});
apiRouter.get("/readiness", async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    res.json({ status: "ready", database: dbHealth, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (error) {
    res.json({ status: "ready", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
});
apiRouter.get("/db-health", async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    res.status(200).json(dbHealth);
  } catch (error) {
    res.status(200).json({ connected: false, latencyMs: 0, error: "Database health check failed" });
  }
});
var docRateLimitMap = /* @__PURE__ */ new Map();
function documentRateLimitMiddleware(req, res, next) {
  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "ip";
  const now = Date.now();
  const windowMs = 60 * 1e3;
  const maxRequests = 60;
  const record = docRateLimitMap.get(clientIp);
  if (!record || now - record.firstSeen > windowMs) {
    docRateLimitMap.set(clientIp, { count: 1, firstSeen: now });
    return next();
  }
  record.count += 1;
  if (record.count > maxRequests) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({
      error: "Too many document requests. Please wait a minute before trying again."
    });
  }
  next();
}
function isStaffUser(user) {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  if (isTrustedBootstrapAdminEmail(email)) return true;
  const staffRoles = ["admin", "superadmin", "super_admin", "administrator", "teacher", "editor", "contentmanager", "content_manager", "moderator"];
  const userRoles = (user.roles || []).map((r) => r.trim().toLowerCase().replace(/\s+/g, "_"));
  return userRoles.some((r) => staffRoles.includes(r));
}
function isAdminOrContentManager(user) {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  if (isTrustedBootstrapAdminEmail(email)) return true;
  const privilegedRoles = ["admin", "superadmin", "super_admin", "administrator", "contentmanager", "content_manager"];
  const userRoles = (user.roles || []).map((r) => r.trim().toLowerCase().replace(/\s+/g, "_"));
  return userRoles.some((r) => privilegedRoles.includes(r));
}
function isModeratorOrEditorOrAdmin(user) {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  if (isTrustedBootstrapAdminEmail(email)) return true;
  const modRoles = ["admin", "superadmin", "super_admin", "administrator", "editor", "moderator", "contentmanager", "content_manager"];
  const userRoles = (user.roles || []).map((r) => r.trim().toLowerCase().replace(/\s+/g, "_"));
  return userRoles.some((r) => modRoles.includes(r));
}
var documentRouter = express.Router();
documentRouter.get("/status", (req, res) => {
  res.json({
    status: "active",
    brandingVersion: "2.0",
    brandingFooter: TALEEM_BRAND_FOOTER,
    website: TALEEM_WEBSITE_URL,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
documentRouter.get("/", optionalAuth, async (req, res) => {
  try {
    const isStaff = isStaffUser(req.user);
    const filters = {
      status: req.query.status,
      documentType: req.query.documentType,
      board: req.query.board,
      classLevel: req.query.classLevel,
      subject: req.query.subject,
      chapter: req.query.chapter,
      year: req.query.year ? parseInt(req.query.year, 10) : void 0,
      search: req.query.search,
      limit: req.query.limit ? Math.min(200, parseInt(req.query.limit, 10)) : 50,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : 0
    };
    const { items, total } = await getDocumentsFromDb(filters, isStaff);
    res.json({ documents: items, total });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Failed to retrieve documents" });
  }
});
documentRouter.get("/:id", optionalAuth, async (req, res) => {
  try {
    const isStaff = isStaffUser(req.user);
    const doc = await getDocumentByIdFromDb(req.params.id, isStaff);
    if (!doc) {
      return res.status(404).json({ error: "Document not found or access restricted" });
    }
    res.json({ document: doc });
  } catch (error) {
    console.error("Error fetching document by ID:", error);
    res.status(500).json({ error: "Failed to retrieve document" });
  }
});
documentRouter.post("/upload", requireContentCurator, async (req, res) => {
  try {
    let inputBuffer;
    const body = req.body || {};
    const rawFilename = body.filename || req.query.filename || "document.pdf";
    const originalFilename = typeof rawFilename === "string" ? rawFilename : "document.pdf";
    if (Buffer.isBuffer(req.body)) {
      inputBuffer = req.body;
    } else if (body.fileBase64) {
      if (typeof body.fileBase64 !== "string") {
        return res.status(400).json({ error: "fileBase64 must be a string" });
      }
      inputBuffer = Buffer.from(body.fileBase64, "base64");
    } else {
      return res.status(400).json({ error: "No document file data provided" });
    }
    if (inputBuffer.length > MAX_DOCUMENT_SIZE_BYTES) {
      return res.status(400).json({ error: "Uploaded file exceeds maximum limit of 25MB" });
    }
    const options = {
      title: body.title,
      documentType: body.documentType,
      board: body.board,
      classLevel: body.classLevel,
      subject: body.subject,
      chapter: body.chapter,
      topic: body.topic,
      year: body.year ? parseInt(body.year, 10) : void 0,
      language: body.language || "English",
      status: body.status || "Published",
      associatedEntityId: body.associatedEntityId,
      allowDuplicate: Boolean(body.allowDuplicate)
    };
    const result = await processAndStoreDocument(inputBuffer, originalFilename, options, req.user?.uid);
    if (!result.success) {
      if (result.isDuplicate) {
        return res.status(409).json({
          error: result.error,
          isDuplicate: true,
          existingDocumentId: result.existingDocumentId
        });
      }
      return res.status(400).json({ error: result.error || "Failed to process document" });
    }
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "UPLOAD_DOCUMENT",
      targetType: "DOCUMENT",
      targetId: result.document.id,
      details: `Uploaded document: "${result.document.title}" (${result.document.originalFilename}, ${result.document.documentType})`,
      subject: result.document.subject,
      classLevel: result.document.classLevel,
      board: result.document.board,
      ipAddress: req.ip
    });
    res.status(201).json({ success: true, document: result.document });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ error: error.message || "Error processing document upload" });
  }
});
documentRouter.post("/bulk-upload", requireContentCurator, async (req, res) => {
  try {
    const files = req.body?.files;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "files array is required" });
    }
    const uploaded = [];
    const duplicates = [];
    const errors = [];
    for (const item of files) {
      try {
        if (!item.fileBase64 || !item.filename) {
          errors.push({ filename: item.filename || "unknown", error: "Missing base64 data or filename" });
          continue;
        }
        const buffer = Buffer.from(item.fileBase64, "base64");
        const resObj = await processAndStoreDocument(
          buffer,
          item.filename,
          {
            title: item.title,
            documentType: item.metadata?.documentType || "Document",
            board: item.metadata?.board,
            classLevel: item.metadata?.classLevel,
            subject: item.metadata?.subject,
            chapter: item.metadata?.chapter,
            year: item.metadata?.year,
            language: item.metadata?.language || "English",
            status: item.metadata?.status || "Published",
            allowDuplicate: Boolean(item.metadata?.allowDuplicate)
          },
          req.user?.uid
        );
        if (resObj.success && resObj.document) {
          uploaded.push(resObj.document);
        } else if (resObj.isDuplicate) {
          duplicates.push({ filename: item.filename, existingDocumentId: resObj.existingDocumentId });
        } else {
          errors.push({ filename: item.filename, error: resObj.error || "Failed" });
        }
      } catch (itemErr) {
        errors.push({ filename: item.filename, error: itemErr.message });
      }
    }
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_UPLOAD_DOCUMENTS",
      targetType: "DOCUMENT_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Bulk uploaded ${uploaded.length} documents (${duplicates.length} duplicates, ${errors.length} errors)`,
      ipAddress: req.ip
    });
    res.json({
      success: true,
      uploadedCount: uploaded.length,
      duplicateCount: duplicates.length,
      errorCount: errors.length,
      uploaded,
      duplicates,
      errors
    });
  } catch (error) {
    console.error("Error in bulk upload:", error);
    res.status(500).json({ error: error.message || "Failed to process bulk upload" });
  }
});
documentRouter.post("/bulk-metadata", requireContentCurator, async (req, res) => {
  try {
    const { ids, metadata } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }
    if (!metadata || typeof metadata !== "object") {
      return res.status(400).json({ error: "metadata object is required" });
    }
    const count3 = await bulkUpdateDocumentMetadataInDb(ids, metadata, req.user?.uid);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_UPDATE_DOCUMENT_METADATA",
      targetType: "DOCUMENT_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Updated metadata on ${count3} documents`,
      ipAddress: req.ip
    });
    res.json({ success: true, count: count3 });
  } catch (error) {
    console.error("Error in bulk metadata update:", error);
    res.status(500).json({ error: "Failed to update metadata" });
  }
});
documentRouter.post("/bulk-status", requireContentCurator, async (req, res) => {
  try {
    const { ids, status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }
    if (!["Published", "Draft", "Archived"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be Published, Draft, or Archived" });
    }
    const count3 = await bulkUpdateDocumentStatusInDb(ids, status, req.user?.uid);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_STATUS_DOCUMENTS",
      targetType: "DOCUMENT_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Updated status to "${status}" on ${count3} documents`,
      ipAddress: req.ip
    });
    res.json({ success: true, count: count3 });
  } catch (error) {
    console.error("Error in bulk status update:", error);
    res.status(500).json({ error: "Failed to update document status" });
  }
});
documentRouter.put("/:id", requireContentCurator, async (req, res) => {
  try {
    const updated = await updateDocumentMetadataInDb(req.params.id, req.body, req.user?.uid);
    if (!updated) {
      return res.status(404).json({ error: "Document not found" });
    }
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "UPDATE_DOCUMENT",
      targetType: "DOCUMENT",
      targetId: req.params.id,
      details: `Updated document: ${updated.title}`,
      subject: updated.subject,
      classLevel: updated.classLevel,
      board: updated.board,
      ipAddress: req.ip
    });
    res.json({ success: true, document: updated });
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({ error: error.message || "Failed to update document" });
  }
});
documentRouter.post("/:id/version", requireContentCurator, async (req, res) => {
  try {
    const { fileBase64, filename, changeNotes } = req.body || {};
    if (!fileBase64 || typeof fileBase64 !== "string") {
      return res.status(400).json({ error: "fileBase64 string is required" });
    }
    const buffer = Buffer.from(fileBase64, "base64");
    const result = await createDocumentVersion(req.params.id, buffer, filename || "updated.pdf", changeNotes, req.user?.uid);
    if (!result.success) {
      return res.status(400).json({ error: result.error || "Failed to create new document version" });
    }
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "NEW_DOCUMENT_VERSION",
      targetType: "DOCUMENT",
      targetId: req.params.id,
      details: `Created version ${result.document?.version} for "${result.document?.title}"`,
      ipAddress: req.ip
    });
    res.json({ success: true, document: result.document });
  } catch (error) {
    console.error("Error creating document version:", error);
    res.status(500).json({ error: error.message || "Failed to create document version" });
  }
});
documentRouter.post("/:id/rebrand", requireContentCurator, async (req, res) => {
  try {
    const result = await rebrandDocument(req.params.id);
    if (!result.success) {
      return res.status(400).json({ error: result.error || "Failed to rebrand document" });
    }
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "REBRAND_DOCUMENT",
      targetType: "DOCUMENT",
      targetId: req.params.id,
      details: `Rebranded document ${req.params.id} (new hash: ${result.brandedHash?.substring(0, 12)}...)`,
      ipAddress: req.ip
    });
    res.json({ success: true, brandedHash: result.brandedHash });
  } catch (error) {
    console.error("Error rebranding document:", error);
    res.status(500).json({ error: error.message || "Failed to rebrand document" });
  }
});
documentRouter.get("/:id/versions", requireContentCurator, async (req, res) => {
  try {
    const versions = await getDocumentVersionsFromDb(req.params.id);
    res.json({ versions });
  } catch (error) {
    console.error("Error fetching document versions:", error);
    res.status(500).json({ error: "Failed to retrieve document versions" });
  }
});
documentRouter.get("/:id/downloads", requireContentCurator, async (req, res) => {
  try {
    const events = await getDocumentDownloadEventsFromDb(req.params.id);
    res.json({ events, count: events.length });
  } catch (error) {
    console.error("Error fetching document downloads:", error);
    res.status(500).json({ error: "Failed to retrieve download records" });
  }
});
documentRouter.delete("/:id", requireContentManager, async (req, res) => {
  try {
    const success = await deleteDocumentFromDb(req.params.id);
    if (!success) {
      return res.status(400).json({ error: "Failed to delete document" });
    }
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "DELETE_DOCUMENT",
      targetType: "DOCUMENT",
      targetId: req.params.id,
      details: `Deleted document ${req.params.id}`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: "Document deleted" });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});
documentRouter.get("/:id/download", documentRateLimitMiddleware, optionalAuth, async (req, res) => {
  try {
    const docId = req.params.id;
    const doc = await getDocumentByIdFromDb(docId, true);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    const isStaff = isStaffUser(req.user);
    if (doc.status !== "Published" && !isStaff) {
      return res.status(403).json({ error: "Access denied: Document is not published" });
    }
    const requestOriginal = req.query.original === "true";
    let fileInfo;
    if (requestOriginal) {
      if (!isAdminOrContentManager(req.user)) {
        return res.status(403).json({ error: "Access denied: Administrative privileges required to download unbranded original" });
      }
      fileInfo = getSafeOriginalPath(doc);
    } else {
      fileInfo = getSafeBrandedPath(doc);
    }
    if (!fileInfo.valid || !fileInfo.filePath) {
      return res.status(404).json({ error: fileInfo.error || "Document file unavailable on storage" });
    }
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;
    const userAgent = req.headers["user-agent"]?.substring(0, 500);
    const sessionId = req.headers["x-session-id"] || req.cookies?.tg_session_id;
    recordDocumentDownload(doc.id, {
      documentType: doc.documentType,
      userUid: req.user?.uid,
      anonymousSessionId: sessionId,
      ipAddress: clientIp,
      userAgent,
      version: doc.version
    }).catch((recErr) => console.warn("Failed to record download event:", recErr));
    res.setHeader("Content-Type", doc.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${doc.sanitizedFilename}"`);
    res.setHeader("X-TaleemGuru-Branded", !requestOriginal && doc.brandingStatus === "Completed" ? "true" : "false");
    res.setHeader("X-TaleemGuru-Doc-Id", doc.id);
    res.setHeader("X-TaleemGuru-Version", doc.version.toString());
    const fileStream = fs4.createReadStream(fileInfo.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error in document download:", error);
    res.status(500).json({ error: "Failed to process document download" });
  }
});
documentRouter.get("/:id/preview", documentRateLimitMiddleware, optionalAuth, async (req, res) => {
  try {
    const docId = req.params.id;
    const doc = await getDocumentByIdFromDb(docId, true);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    const isStaff = isStaffUser(req.user);
    if (doc.status !== "Published" && !isStaff) {
      return res.status(403).json({ error: "Access denied: Document is not published" });
    }
    const fileInfo = getSafeBrandedPath(doc);
    if (!fileInfo.valid || !fileInfo.filePath) {
      return res.status(404).json({ error: fileInfo.error || "Preview file unavailable" });
    }
    res.setHeader("Content-Type", doc.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${doc.sanitizedFilename}"`);
    const fileStream = fs4.createReadStream(fileInfo.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error in document preview:", error);
    res.status(500).json({ error: "Failed to stream document preview" });
  }
});
documentRouter.post("/reprocess-all", requireAdmin, async (req, res) => {
  try {
    const { items } = await getDocumentsFromDb({ limit: 500 }, true);
    let reprocessed = 0;
    const errors = [];
    for (const doc of items) {
      if (doc.mimeType === "application/pdf" && doc.brandingStatus !== "Completed") {
        const rebrandResult = await rebrandDocument(doc.id);
        if (rebrandResult.success) {
          reprocessed++;
        } else {
          errors.push({ id: doc.id, error: rebrandResult.error });
        }
      }
    }
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "REPROCESS_DOCUMENTS",
      targetType: "DOCUMENT_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Reprocessed ${reprocessed} documents (${errors.length} errors)`,
      ipAddress: req.ip
    });
    res.json({ success: true, reprocessed, errorsCount: errors.length, errors });
  } catch (error) {
    console.error("Error reprocessing documents:", error);
    res.status(500).json({ error: "Failed to reprocess documents" });
  }
});
documentRouter.post("/brand", documentRateLimitMiddleware, async (req, res) => {
  try {
    let inputBuffer;
    const rawFilename = req.query.filename || req.body?.filename || "document.pdf";
    const rawTitle = req.query.title || req.body?.title || "Study Document";
    const filename = sanitizeDownloadFilename(rawFilename, "document.pdf");
    const title = typeof rawTitle === "string" ? rawTitle.substring(0, 256) : "Study Document";
    if (Buffer.isBuffer(req.body)) {
      if (req.body.length > MAX_DOCUMENT_SIZE_BYTES) {
        return res.status(400).json({ error: "Uploaded document exceeds maximum size limit (25MB)" });
      }
      inputBuffer = req.body;
    } else if (req.body?.fileBase64) {
      if (typeof req.body.fileBase64 !== "string") {
        return res.status(400).json({ error: "fileBase64 must be a valid base64 string" });
      }
      if (req.body.fileBase64.length > MAX_DOCUMENT_SIZE_BYTES * 1.4) {
        return res.status(400).json({ error: "Document exceeds maximum size limit (25MB)" });
      }
      inputBuffer = Buffer.from(req.body.fileBase64, "base64");
      if (inputBuffer.length > MAX_DOCUMENT_SIZE_BYTES) {
        return res.status(400).json({ error: "Decoded document exceeds maximum size limit (25MB)" });
      }
    } else if (req.body?.url) {
      const urlStr = String(req.body.url);
      const fetched = await safeFetchRemoteDocument(urlStr);
      inputBuffer = fetched.buffer;
    } else {
      return res.status(400).json({ error: "Missing valid fileBase64, url, or binary payload" });
    }
    const result = await brandPdfBuffer(inputBuffer, { title });
    res.json({
      success: true,
      filename: filename.endsWith(".pdf") ? filename : `${filename}_TaleemGuru.pdf`,
      brandedBase64: result.buffer.toString("base64"),
      wasAlreadyBranded: result.wasAlreadyBranded,
      pageCount: result.pageCount,
      hash: computeHash(result.buffer)
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to process and brand document" });
  }
});
documentRouter.get("/download", documentRateLimitMiddleware, async (req, res) => {
  try {
    const rawUrl = (req.query.url || req.query.fileId || "").trim();
    const rawFilename = req.query.filename || "TaleemGuru_Document.pdf";
    const rawTitle = req.query.title || "TaleemGuru Study Resource";
    if (!rawUrl) {
      return res.status(400).json({ error: "Missing required document url or fileId parameter" });
    }
    if (rawUrl.length > 2048) {
      return res.status(400).json({ error: "URL parameter exceeds maximum allowed length" });
    }
    const filename = sanitizeDownloadFilename(rawFilename, "TaleemGuru_Document.pdf");
    const title = typeof rawTitle === "string" ? rawTitle.substring(0, 256) : "TaleemGuru Study Resource";
    let inputBuffer;
    let contentType = "application/pdf";
    if (rawUrl.startsWith("/")) {
      const localResolution = resolveSafeLocalFilePath(rawUrl);
      if (!localResolution.valid || !localResolution.absolutePath) {
        return res.status(403).json({ error: localResolution.error || "Access denied" });
      }
      inputBuffer = fs4.readFileSync(localResolution.absolutePath);
      if (rawUrl.endsWith(".txt")) contentType = "text/plain";
      else if (rawUrl.endsWith(".md")) contentType = "text/markdown";
    } else {
      const fetched = await safeFetchRemoteDocument(rawUrl);
      inputBuffer = fetched.buffer;
      contentType = fetched.contentType;
    }
    if (contentType.includes("pdf") || rawUrl.toLowerCase().endsWith(".pdf") || filename.toLowerCase().endsWith(".pdf")) {
      const brandedResult = await brandPdfBuffer(inputBuffer, { title });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename.endsWith(".pdf") ? filename : `${filename}_TaleemGuru.pdf`}"`);
      res.setHeader("X-TaleemGuru-Branded", "true");
      res.setHeader("X-TaleemGuru-Was-Already-Branded", brandedResult.wasAlreadyBranded.toString());
      return res.send(brandedResult.buffer);
    }
    if (contentType.includes("text") || contentType.includes("markdown")) {
      const brandedText = brandTextContent(inputBuffer.toString("utf-8"), title);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(brandedText);
    }
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(inputBuffer);
  } catch (error) {
    res.status(400).json({ error: error.message || "Error processing document download" });
  }
});
apiRouter.use("/documents", documentRouter);
var searchRouter = express.Router();
searchRouter.get("/", optionalAuth, async (req, res) => {
  try {
    const isStaff = isStaffUser(req.user);
    const filters = {
      query: req.query.q || req.query.query || req.query.search || "",
      type: req.query.type || "all",
      board: req.query.board,
      classLevel: req.query.classLevel || req.query.class,
      subject: req.query.subject,
      chapter: req.query.chapter,
      year: req.query.year ? parseInt(req.query.year, 10) : void 0,
      status: req.query.status,
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? Math.min(100, parseInt(req.query.limit, 10)) : 20
    };
    const searchResponse = await executeUnifiedSearch(filters, isStaff);
    res.json(searchResponse);
  } catch (error) {
    console.error("Unified search API error:", error);
    res.status(500).json({ error: error.message || "Error executing search" });
  }
});
searchRouter.get("/suggestions", optionalAuth, async (req, res) => {
  try {
    const isStaff = isStaffUser(req.user);
    const query = req.query.q || req.query.query || "";
    const suggestions = await getQuickSearchSuggestions(query, isStaff);
    res.json({ suggestions });
  } catch (error) {
    console.error("Search suggestions API error:", error);
    res.status(500).json({ error: error.message || "Error fetching search suggestions" });
  }
});
searchRouter.get("/filters", async (req, res) => {
  try {
    const filters = await getDynamicSearchFilters();
    res.json(filters);
  } catch (error) {
    console.error("Search filters API error:", error);
    res.status(500).json({ error: error.message || "Error fetching search filters" });
  }
});
apiRouter.use("/search", searchRouter);
var contentRouter = express.Router();
contentRouter.get("/boards", requireContentManager, async (req, res) => {
  res.json(await getBoardsFromDb());
});
contentRouter.post("/boards", requireContentManager, async (req, res) => {
  try {
    res.json(await addBoardToDb(req.body.name));
  } catch (error) {
    if (error.message === "DUPLICATE_BOARD") return res.status(409).json({ error: "A board with this name already exists." });
    res.status(500).json({ error: "Failed to add board" });
  }
});
contentRouter.put("/boards/:id", requireContentManager, async (req, res) => {
  try {
    res.json(await updateBoardInDb(parseInt(req.params.id), req.body));
  } catch (error) {
    if (error.message === "DUPLICATE_BOARD") return res.status(409).json({ error: "A board with this name already exists." });
    res.status(500).json({ error: "Failed to update board" });
  }
});
contentRouter.post("/classes", requireContentManager, async (req, res) => {
  try {
    res.json(await addClassToDb(req.body.boardId, req.body.name));
  } catch (error) {
    if (error.message === "DUPLICATE_CLASS") return res.status(409).json({ error: "A class with this name already exists in this board." });
    res.status(500).json({ error: "Failed to add class" });
  }
});
contentRouter.put("/classes/:id", requireContentManager, async (req, res) => {
  try {
    res.json(await updateClassInDb(parseInt(req.params.id), req.body));
  } catch (error) {
    if (error.message === "DUPLICATE_CLASS") return res.status(409).json({ error: "A class with this name already exists in this board." });
    res.status(500).json({ error: "Failed to update class" });
  }
});
contentRouter.post("/subjects", requireContentManager, async (req, res) => {
  try {
    res.json(await addSubjectToDb(req.body.classId, req.body.name));
  } catch (error) {
    if (error.message === "DUPLICATE_SUBJECT") return res.status(409).json({ error: "A subject with this name already exists in this class." });
    res.status(500).json({ error: "Failed to add subject" });
  }
});
contentRouter.put("/subjects/:id", requireContentManager, async (req, res) => {
  try {
    res.json(await updateSubjectInDb(parseInt(req.params.id), req.body));
  } catch (error) {
    if (error.message === "DUPLICATE_SUBJECT") return res.status(409).json({ error: "A subject with this name already exists in this class." });
    res.status(500).json({ error: "Failed to update subject" });
  }
});
contentRouter.post("/chapters", requireContentManager, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  try {
    const saved = await addChapterToDb(req.body.subjectId, req.body.name);
    const subjectsList = await getSubjectsFromDb();
    const subject = subjectsList.find((s) => s.id === req.body.subjectId);
    await saveAuditLogToDb({
      adminUid: user.uid,
      adminEmail: user.email || "unknown",
      adminName: user.name || "Staff",
      action: "CREATE_CHAPTER",
      targetType: "CHAPTER",
      targetId: String(saved[0].id),
      details: `Created chapter: ${req.body.name}`,
      subject: subject ? subject.name : String(req.body.subjectId)
    });
    res.json(saved);
  } catch (error) {
    if (error.message === "DUPLICATE_CHAPTER") return res.status(409).json({ error: "A chapter with this name already exists in this subject." });
    res.status(500).json({ error: "Failed to create chapter" });
  }
});
contentRouter.put("/chapters/:id", requireContentManager, async (req, res) => {
  try {
    res.json(await updateChapterInDb(parseInt(req.params.id), req.body));
  } catch (error) {
    if (error.message === "DUPLICATE_CHAPTER") return res.status(409).json({ error: "A chapter with this name already exists in this subject." });
    res.status(500).json({ error: "Failed to update chapter" });
  }
});
contentRouter.delete("/chapters/:id", requireContentManager, async (req, res) => {
  res.json(await deleteChapterFromDb(parseInt(req.params.id)));
});
contentRouter.get("/syllabus", requireContentManager, async (req, res) => {
  res.json(await getSyllabusFromDb());
});
contentRouter.post("/syllabus", requireContentManager, async (req, res) => {
  res.json(await addSyllabusToDb(req.body.subjectId, req.body.content));
});
contentRouter.put("/syllabus/:id", requireContentManager, async (req, res) => {
  res.json(await updateSyllabusInDb(parseInt(req.params.id), req.body.content));
});
contentRouter.delete("/syllabus/:id", requireContentManager, async (req, res) => {
  res.json(await deleteSyllabusFromDb(parseInt(req.params.id)));
});
apiRouter.use("/content", contentRouter);
var loginRateLimitMap = /* @__PURE__ */ new Map();
function checkLoginRateLimit(key) {
  const now = Date.now();
  const record = loginRateLimitMap.get(key);
  if (!record) {
    loginRateLimitMap.set(key, { attempts: 1, firstAttempt: now, blockedUntil: 0 });
    return { allowed: true };
  }
  if (record.blockedUntil > now) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1e3);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }
  if (now - record.firstAttempt > 60 * 1e3) {
    record.attempts = 1;
    record.firstAttempt = now;
    record.blockedUntil = 0;
    return { allowed: true };
  }
  record.attempts += 1;
  if (record.attempts > 6) {
    record.blockedUntil = now + 60 * 1e3;
    return { allowed: false, retryAfterSeconds: 60 };
  }
  return { allowed: true };
}
function clearLoginRateLimit(key) {
  loginRateLimitMap.delete(key);
}
apiRouter.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(400).json({ error: "Please enter a valid administrator or staff email address." });
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }
    const clientIp = req.headers["x-forwarded-for"] || req.ip || "ip";
    const rateLimitKey = `${clientIp}:${cleanEmail}`;
    const rateCheck = checkLoginRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many login attempts. Please wait ${rateCheck.retryAfterSeconds || 60} seconds before trying again.`
      });
    }
    const supabase = getSupabaseServerClient();
    let authenticatedUser = null;
    let authFailed = false;
    if (supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword
        });
        if (authError || !authData?.user) {
          authFailed = true;
        } else {
          authenticatedUser = {
            id: authData.user.id,
            email: authData.user.email,
            user_metadata: authData.user.user_metadata
          };
        }
      } catch (err) {
        console.warn("Supabase signInWithPassword error:", err);
        authFailed = true;
      }
    } else {
      authFailed = true;
    }
    if (!authenticatedUser) {
      try {
        const dbCandidate = await getUserByEmail(cleanEmail);
        if (dbCandidate) {
          const pwdToken = (dbCandidate.permissions || []).find((p) => p.startsWith("__auth_pwd:"));
          if (pwdToken && verifyPassword(cleanPassword, pwdToken)) {
            authenticatedUser = {
              id: dbCandidate.uid,
              email: dbCandidate.email,
              user_metadata: { name: dbCandidate.name, roles: dbCandidate.roles }
            };
            authFailed = false;
          }
        }
      } catch (dbAuthErr) {
        console.warn("Notice in database password verification:", dbAuthErr);
      }
    }
    if (!authenticatedUser && process.env.ADMIN_PASSWORD) {
      if (cleanPassword === process.env.ADMIN_PASSWORD && isTrustedBootstrapAdminEmail(cleanEmail)) {
        authenticatedUser = {
          id: `admin-${cleanEmail.replace(/[^a-zA-Z0-9]/g, "-")}`,
          email: cleanEmail,
          user_metadata: { name: "Administrator" }
        };
        authFailed = false;
      }
    }
    if (authFailed || !authenticatedUser) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }
    clearLoginRateLimit(rateLimitKey);
    const userId = authenticatedUser.id;
    const userEmail = (authenticatedUser.email || cleanEmail).toLowerCase().trim();
    let dbUser = null;
    try {
      dbUser = await getUserByUid(userId);
      if (!dbUser && userEmail) {
        dbUser = await getUserByEmail(userEmail);
      }
    } catch (e) {
      console.warn("DB lookup error in /admin/login:", e);
    }
    const isBootstrap = isTrustedBootstrapAdminEmail(userEmail);
    const bootstrapAdmins = getTrustedBootstrapAdmins();
    const bootstrapConfig = bootstrapAdmins[userEmail];
    const userRoles = dbUser?.roles && Array.isArray(dbUser.roles) && dbUser.roles.length > 0 ? dbUser.roles : dbUser?.role ? [dbUser.role] : ["Student"];
    const authoritativeRole = isBootstrap ? "Admin" : userRoles[0] || "Student";
    const accountStatus = (dbUser?.status || "Active").trim();
    if (accountStatus.toLowerCase() === "inactive" || accountStatus.toLowerCase() === "suspended") {
      return res.status(403).json({
        error: `Access Denied: Your staff account is currently marked as ${accountStatus}. Please contact an administrator.`
      });
    }
    const allowedRoles = [
      "admin",
      "superadmin",
      "super_admin",
      "administrator",
      "staff",
      "teacher",
      "editor",
      "contentmanager",
      "content_manager",
      "moderator"
    ];
    const isAuthorizedStaff = isBootstrap || userRoles.some((r) => allowedRoles.includes(r.trim().toLowerCase().replace(/\s+/g, "_")));
    if (!isAuthorizedStaff) {
      return res.status(403).json({
        error: `Access Denied: The account ${userEmail} is registered with roles "${userRoles.join(", ")}" and does not possess administrative or staff privileges.`
      });
    }
    const adminName = (isBootstrap ? bootstrapConfig?.name || "Admin" : null) || (dbUser?.name && dbUser.name !== "avatar-1" ? dbUser.name : null) || (authenticatedUser.user_metadata?.name && authenticatedUser.user_metadata?.name !== "avatar-1" ? authenticatedUser.user_metadata?.name : null) || (authenticatedUser.user_metadata?.full_name && authenticatedUser.user_metadata?.full_name !== "avatar-1" ? authenticatedUser.user_metadata?.full_name : null) || "Admin";
    const nowSeconds = Math.floor(Date.now() / 1e3);
    const expSeconds = nowSeconds + 60 * 60 * 24 * 7;
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
      sub: userId,
      email: userEmail,
      role: authoritativeRole,
      aud: "authenticated",
      exp: expSeconds,
      iat: nowSeconds,
      user_metadata: {
        name: adminName,
        role: authoritativeRole
      }
    })).toString("base64url");
    const crypto4 = await import("crypto");
    const secret = process.env.SUPABASE_ANON_KEY || process.env.SQL_ADMIN_PASSWORD || "taleemguru-admin-auth-key";
    const signature = crypto4.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
    const token = `${header}.${payload}.${signature}`;
    try {
      await getOrCreateUser(userId, userEmail, {
        name: adminName
      });
    } catch (createErr) {
      console.warn("Notice: Error ensuring user in db during admin login:", createErr);
    }
    return res.json({
      success: true,
      token,
      user: {
        uid: userId,
        email: userEmail,
        name: adminName,
        role: authoritativeRole,
        roles: [authoritativeRole],
        status: accountStatus
      }
    });
  } catch (err) {
    console.error("Error in /api/admin/login:", err);
    return res.status(500).json({ error: "Internal server error processing admin authentication." });
  }
});
apiRouter.post("/auth/sync", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    const email = (req.user?.email || "").toLowerCase().trim();
    if (!uid) {
      return res.status(400).json({ error: "Missing UID" });
    }
    const { name, avatar, targetExam, classLevel, board } = req.body;
    const user = await getOrCreateUser(uid, email, {
      name: name || req.user?.name,
      avatar,
      targetExam,
      classLevel,
      board
    });
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error syncing user:", error);
    res.status(500).json({ error: "Failed to sync user profile" });
  }
});
apiRouter.get("/user/profile", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    const email = (req.user?.email || "").toLowerCase().trim();
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const normalizedEmail = email;
    const isBootstrap = isTrustedBootstrapAdminEmail(normalizedEmail);
    const bootstrapAdmins = getTrustedBootstrapAdmins();
    const bootstrapConfig = bootstrapAdmins[normalizedEmail];
    let profile = await getUserByUid(uid);
    if (!profile) {
      const initialName = isBootstrap ? bootstrapConfig?.name || "Admin" : req.user?.name || (email ? email.split("@")[0] : "Learner");
      profile = await getOrCreateUser(uid, normalizedEmail, {
        name: initialName
      });
    }
    if (isBootstrap && profile) {
      profile.roles = ["Admin"];
      profile.name = bootstrapConfig?.name || "Admin";
    } else if (profile && (profile.name === "avatar-1" || !profile.name)) {
      profile.name = profile.roles.includes("Admin") ? "Admin" : email ? email.split("@")[0] : "Learner";
    }
    res.json({ profile: sanitizeUserForClient(profile) });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});
apiRouter.put("/user/profile", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const { name, targetExam, classLevel, board, avatar } = req.body;
    const updated = await updateUserProfile(uid, {
      ...name ? { name: name.trim() } : {},
      targetExam,
      classLevel,
      board,
      avatar
    });
    res.json({ success: true, profile: sanitizeUserForClient(updated) });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});
apiRouter.patch("/user/profile", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const { name, targetExam, classLevel, board, avatar } = req.body;
    const updated = await updateUserProfile(uid, {
      ...name ? { name: name.trim() } : {},
      targetExam,
      classLevel,
      board,
      avatar
    });
    res.json({ success: true, profile: sanitizeUserForClient(updated) });
  } catch (error) {
    console.error("Error updating profile with PATCH:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});
apiRouter.post("/user/change-password", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    const userEmail = (req.user?.email || "").toLowerCase().trim();
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword) {
      return res.status(400).json({ error: "Current password is required." });
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "New password must be different from current password." });
    }
    let isCurrentPasswordValid = false;
    const supabaseClient = getSupabaseServerClient();
    if (supabaseClient && userEmail) {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
          email: userEmail,
          password: currentPassword
        });
        if (!authError && authData?.user) {
          isCurrentPasswordValid = true;
        }
      } catch (e) {
      }
    }
    if (!isCurrentPasswordValid) {
      try {
        const dbUser = await getUserByUid(uid);
        if (dbUser) {
          const pwdToken = (dbUser.permissions || []).find((p) => p.startsWith("__auth_pwd:"));
          if (pwdToken && verifyPassword(currentPassword, pwdToken)) {
            isCurrentPasswordValid = true;
          }
        }
      } catch (dbErr) {
        console.warn("Notice in db password verification:", dbErr);
      }
    }
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: "Current password is incorrect. Please verify and try again." });
    }
    if (supabaseClient && supabaseClient.auth?.admin?.updateUserById) {
      try {
        await supabaseClient.auth.admin.updateUserById(uid, { password: newPassword });
      } catch (authErr) {
        console.warn("Supabase updateUserById notice:", authErr);
      }
    }
    const updated = await setUserPasswordInDb(uid, newPassword);
    if (!updated) {
      return res.status(500).json({ error: "Failed to update password in database." });
    }
    await saveAuditLogToDb({
      adminUid: uid,
      adminEmail: userEmail,
      adminName: req.user?.name,
      action: "PASSWORD_CHANGED",
      targetType: "user",
      targetId: uid,
      details: `User changed their account password`,
      ipAddress: req.ip
    });
    return res.json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    console.error("Error changing student password:", error);
    return res.status(500).json({ error: "Failed to change password. Please try again." });
  }
});
apiRouter.post("/user/results", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const body = req.body || {};
    const resultId = String(body.resultId || `res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    const testId = String(body.testId || "test-default").slice(0, 100);
    const testTitle = String(body.testTitle || "Academic Assessment").slice(0, 200);
    const testType = String(body.testType || "Quiz").slice(0, 50);
    const subject = String(body.subject || "General").slice(0, 100);
    const category = String(body.category || "Academic").slice(0, 100);
    const totalQuestions = Math.max(1, Math.min(500, parseInt(body.totalQuestions) || 10));
    const totalMarks = Math.max(1, Math.min(1e3, Number(body.totalMarks) || totalQuestions));
    const correctCount = Math.max(0, Math.min(totalQuestions, parseInt(body.correctCount) || 0));
    const wrongCount = Math.max(0, Math.min(totalQuestions, parseInt(body.wrongCount) || 0));
    const answeredCount = Math.min(totalQuestions, Math.max(0, correctCount + wrongCount));
    const skippedCount = Math.max(0, totalQuestions - answeredCount);
    const marksPerQuestion = totalMarks / totalQuestions;
    const computedMarks = Math.min(totalMarks, Math.max(0, Number(body.marksObtained) || correctCount * marksPerQuestion));
    const percentage = Math.min(100, Math.max(0, Math.round(computedMarks / totalMarks * 100)));
    let grade = "F";
    if (percentage >= 85) grade = "A+";
    else if (percentage >= 75) grade = "A";
    else if (percentage >= 65) grade = "B";
    else if (percentage >= 50) grade = "C";
    const timeUsedSeconds = Math.max(1, Math.min(14400, parseInt(body.timeUsedSeconds) || 60));
    const percentileRank = Math.min(99, Math.max(10, parseInt(body.percentileRank) || 85));
    const saved = await saveTestResultToDb({
      resultId,
      userUid: uid,
      testId,
      testTitle,
      testType,
      subject,
      category,
      totalQuestions,
      answeredCount,
      correctCount,
      wrongCount,
      skippedCount,
      marksObtained: computedMarks,
      totalMarks,
      percentage,
      grade,
      timeUsedSeconds,
      percentileRank,
      answers: body.answers || []
    });
    const generateUniqueCertificateId = () => {
      const ts = Date.now().toString(36).toUpperCase();
      const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
      return `TG-CERT-${ts}-${rand}`;
    };
    if (percentage >= 60) {
      try {
        const student = await getUserByUid(uid);
        const certId = generateUniqueCertificateId();
        const verificationUrl = `${process.env.VITE_SITE_URL || "https://taleemguru.pk"}/verify/${certId}`;
        await saveCertificateToDb({
          id: certId,
          userUid: uid,
          studentName: student?.name || "Valued Student",
          testName: testTitle,
          score: computedMarks,
          totalMarks,
          percentage,
          grade,
          className: student?.classLevel || "N/A",
          subjectName: subject,
          status: "VALID",
          verificationUrl
        });
      } catch (certError) {
        console.error("Failed to generate certificate:", certError);
      }
    }
    res.json({ success: true, result: saved });
  } catch (error) {
    console.error("Error saving test result:", error);
    res.status(500).json({ error: "Failed to save test result" });
  }
});
apiRouter.get("/user/results", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const results = await getUserTestResultsFromDb(uid);
    res.json({ results });
  } catch (error) {
    console.error("Error fetching test results:", error);
    res.status(500).json({ error: "Failed to retrieve test history" });
  }
});
apiRouter.get("/student/dashboard", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const data = await getStudentDashboardStats(uid);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error("Error fetching student dashboard data:", error);
    res.status(500).json({ error: "Failed to retrieve student dashboard data" });
  }
});
apiRouter.get("/student/performance", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const analytics = await getStudentPerformanceAnalytics(uid);
    res.json({ success: true, analytics });
  } catch (error) {
    console.error("Error fetching student performance analytics:", error);
    res.status(500).json({ error: "Failed to retrieve performance analytics" });
  }
});
apiRouter.get("/student/active-exam", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const activeExam = await getUserActiveExamAttempt(uid);
    res.json({ success: true, activeExam });
  } catch (error) {
    console.error("Error fetching active exam session:", error);
    res.status(500).json({ error: "Failed to check active exam session" });
  }
});
apiRouter.patch("/student/profile", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const { name, classLevel, board, targetExam, avatar } = req.body || {};
    const updated = await updateUserProfile(uid, {
      ...name && typeof name === "string" ? { name: name.trim().slice(0, 100) } : {},
      ...classLevel && typeof classLevel === "string" ? { classLevel: classLevel.trim().slice(0, 100) } : {},
      ...board && typeof board === "string" ? { board: board.trim().slice(0, 100) } : {},
      ...targetExam && typeof targetExam === "string" ? { targetExam: targetExam.trim().slice(0, 100) } : {},
      ...avatar && typeof avatar === "string" ? { avatar: avatar.trim().slice(0, 50) } : {}
    });
    if (!updated) {
      return res.status(404).json({ error: "Student profile not found" });
    }
    res.json({ success: true, profile: updated });
  } catch (error) {
    console.error("Error updating student profile:", error);
    res.status(500).json({ error: "Failed to update student profile" });
  }
});
apiRouter.get("/teacher/dashboard", requireTeacher, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const data = await getTeacherDashboardStats(uid);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error("Error fetching teacher dashboard data:", error);
    res.status(500).json({ error: "Failed to retrieve teacher dashboard data" });
  }
});
apiRouter.post("/user/bookmarks/toggle", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const { questionId } = req.body;
    if (!questionId) return res.status(400).json({ error: "Missing questionId" });
    const status = await toggleBookmarkInDb(uid, questionId);
    res.json(status);
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    res.status(500).json({ error: "Failed to toggle bookmark" });
  }
});
apiRouter.get("/user/bookmarks", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const bookmarks = await getUserBookmarksFromDb(uid);
    res.json({ bookmarks });
  } catch (error) {
    console.error("Error getting bookmarks:", error);
    res.status(500).json({ error: "Failed to get bookmarks" });
  }
});
apiRouter.get("/user/certificates", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const certs = await getUserCertificatesFromDb(uid);
    res.json({ certificates: certs });
  } catch (error) {
    console.error("Error fetching user certificates:", error);
    res.status(500).json({ error: "Failed to retrieve certificates" });
  }
});
apiRouter.post("/user/certificates", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const { resultId, testName, score, totalMarks, percentage, grade, className, subjectName, chapterName, performanceLevel } = req.body;
    if (!resultId) return res.status(400).json({ error: "Missing resultId" });
    const numScore = Math.max(0, Number(score) || 0);
    const numTotal = Math.max(1, Number(totalMarks) || 100);
    const numPct = Math.min(100, Math.max(0, Number(percentage) || Math.round(numScore / numTotal * 100)));
    if (numPct < 50) {
      return res.status(400).json({ error: "Certificate requires passing grade of 50% or higher" });
    }
    const certId = `TG-CERT-${resultId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase()}`;
    const studentName = req.user?.name || "Candidate";
    const verificationUrl = `https://taleemguru.pk/verify/${certId}`;
    const savedCert = await saveCertificateToDb({
      id: certId,
      userUid: uid,
      studentName,
      testName: String(testName || "Examination Assessment").slice(0, 150),
      score: Math.round(numScore),
      totalMarks: Math.round(numTotal),
      percentage: numPct,
      grade: String(grade || "Pass").slice(0, 10),
      className,
      subjectName,
      chapterName,
      performanceLevel,
      verificationUrl
    });
    res.json({ success: true, certificate: savedCert });
  } catch (error) {
    console.error("Error saving certificate:", error);
    res.status(500).json({ error: "Failed to save certificate" });
  }
});
apiRouter.get("/user/certificates/:id", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const certId = req.params.id;
    const cert = await getCertificateByIdFromDb(certId, uid);
    if (!cert) {
      return res.status(404).json({ error: "Certificate not found or access denied" });
    }
    res.json({ certificate: cert });
  } catch (error) {
    console.error("Error fetching certificate by ID:", error);
    res.status(500).json({ error: "Failed to retrieve certificate" });
  }
});
apiRouter.get("/certificates/verify/:id", async (req, res) => {
  try {
    const certId = req.params.id;
    const cert = await getCertificateByIdFromDb(certId);
    if (!cert) {
      return res.status(404).json({ verified: false, error: "Certificate record not found in Taleem Guru registry" });
    }
    res.json({
      verified: true,
      status: cert.status,
      studentName: cert.studentName,
      testName: cert.testName,
      subject: cert.subjectName,
      className: cert.className,
      score: cert.score,
      percentage: cert.percentage,
      grade: cert.grade,
      issueDate: cert.issueDate,
      certificateId: cert.certificateId || cert.id
    });
  } catch (error) {
    console.error("Error verifying certificate:", error);
    res.status(500).json({ verified: false, error: "Certificate verification failed" });
  }
});
apiRouter.get("/admin/certificates", requireHighAdmin, async (req, res) => {
  try {
    const certs = await getAllCertificatesFromDb();
    res.json({ certificates: certs });
  } catch (error) {
    console.error("Error fetching admin certificates:", error);
    res.status(500).json({ error: "Failed to fetch certificates" });
  }
});
apiRouter.patch("/admin/certificates/:id/revoke", requireHighAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const success = await revokeCertificateInDb(id, req.user?.uid || "system", reason);
    if (!success) throw new Error("Revocation failed");
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "system",
      adminEmail: req.user?.email || "admin@taleemguru.pk",
      action: "REVOKE_CERTIFICATE",
      targetType: "CERTIFICATE",
      targetId: id,
      details: `Revoked certificate ID: ${id}. Reason: ${reason || "No reason provided"}`
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error revoking certificate:", error);
    res.status(500).json({ error: "Failed to revoke certificate" });
  }
});
apiRouter.patch("/admin/certificates/:id/restore", requireHighAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await restoreCertificateInDb(id);
    if (!success) throw new Error("Restoration failed");
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "system",
      adminEmail: req.user?.email || "admin@taleemguru.pk",
      action: "RESTORE_CERTIFICATE",
      targetType: "CERTIFICATE",
      targetId: id,
      details: `Restored certificate ID: ${id}`
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error restoring certificate:", error);
    res.status(500).json({ error: "Failed to restore certificate" });
  }
});
apiRouter.get("/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const topUsers = await getTopLeaderboard(limit);
    res.json({ leaderboard: topUsers });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});
apiRouter.post("/feedback", async (req, res) => {
  try {
    const { type, questionId, subject, description, userEmail, userUid } = req.body;
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return res.status(400).json({ error: "Description is required" });
    }
    const savedReport = await saveContentReportToDb({
      category: String(type || "General Issue").slice(0, 100),
      questionId: questionId ? String(questionId).slice(0, 100) : void 0,
      subject: subject ? String(subject).slice(0, 100) : void 0,
      description: String(description).slice(0, 2e3),
      userEmail: userEmail ? String(userEmail).slice(0, 150) : void 0,
      userUid: userUid ? String(userUid).slice(0, 150) : void 0
    });
    res.json({
      success: true,
      message: "Report received. Our academic editorial team will audit this item.",
      reportId: savedReport?.reportId
    });
  } catch (error) {
    console.error("Error recording content report:", error);
    res.status(500).json({ error: "Failed to record issue report" });
  }
});
apiRouter.get("/public-stats", async (req, res) => {
  try {
    const stats = await getPlatformPublicStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Failed to retrieve platform stats:", error);
    res.status(500).json({ error: "Failed to retrieve platform stats" });
  }
});
apiRouter.post("/content/moderate", requireAuth, async (req, res) => {
  try {
    const { contentType, id, targetStatus, rejectionReason, changeNotes } = req.body || {};
    if (!contentType || !id || !targetStatus) {
      return res.status(400).json({ error: "contentType, id, and targetStatus are required." });
    }
    const validStatuses = ["Draft", "Pending Review", "Approved", "Published", "Rejected", "Archived"];
    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }
    const validTypes = ["MCQ", "Test", "PastPaper", "StudyNote", "Document"];
    if (!validTypes.includes(contentType)) {
      return res.status(400).json({ error: `Invalid contentType. Must be one of: ${validTypes.join(", ")}` });
    }
    const userUid = req.user?.uid || "unknown";
    const userRoles = req.user?.roles || [];
    if (["Approved", "Published", "Rejected", "Archived"].includes(targetStatus) && !isModeratorOrEditorOrAdmin(req.user)) {
      return res.status(403).json({ error: "Forbidden: Moderation rights (Editor, Moderator, or Admin) required for this action." });
    }
    const result = await moderateContentItemInDb({
      contentType,
      id,
      targetStatus,
      userUid,
      userRoles,
      rejectionReason,
      changeNotes
    });
    if (!result.success) {
      const isForbidden = result.message?.includes("Self-approval") || result.message?.includes("Forbidden");
      return res.status(isForbidden ? 403 : 400).json({ error: result.message || "Failed to update content status" });
    }
    res.json({ success: true, item: result.item, message: `Content ${id} status updated to ${targetStatus}` });
  } catch (error) {
    console.error("Error in /content/moderate:", error);
    res.status(500).json({ error: error.message || "Internal server error during content moderation" });
  }
});
apiRouter.post("/content/bulk-moderate", requireAuth, async (req, res) => {
  try {
    const { contentType, ids, targetStatus, rejectionReason, changeNotes } = req.body || {};
    if (!contentType || !Array.isArray(ids) || ids.length === 0 || !targetStatus) {
      return res.status(400).json({ error: "contentType, ids array, and targetStatus are required." });
    }
    if (["Approved", "Published", "Rejected", "Archived"].includes(targetStatus) && !isModeratorOrEditorOrAdmin(req.user)) {
      return res.status(403).json({ error: "Forbidden: Moderation rights (Editor, Moderator, or Admin) required for bulk moderation." });
    }
    const userUid = req.user?.uid || "unknown";
    const userRoles = req.user?.roles || [];
    const result = await bulkModerateContentInDb({
      contentType,
      ids,
      targetStatus,
      userUid,
      userRoles,
      rejectionReason,
      changeNotes
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error in /content/bulk-moderate:", error);
    res.status(500).json({ error: error.message || "Internal server error during bulk moderation" });
  }
});
apiRouter.get("/content/versions/:contentType/:id", requireAuth, async (req, res) => {
  try {
    const { contentType, id } = req.params;
    const versions = await getContentVersionHistoryFromDb(contentType, id);
    res.json({ success: true, contentType, id, versions });
  } catch (error) {
    console.error("Error in /content/versions:", error);
    res.status(500).json({ error: "Failed to retrieve version history" });
  }
});
apiRouter.get("/mcqs", async (req, res) => {
  try {
    const filters = {
      subject: req.query.subject,
      classLevel: req.query.classLevel,
      board: req.query.board,
      chapter: req.query.chapter,
      exam: req.query.exam,
      difficulty: req.query.difficulty,
      status: req.query.status || "Published",
      search: req.query.search,
      limit: req.query.limit ? Math.min(1e3, parseInt(req.query.limit)) : 500
    };
    const items = await getMCQsFromDb(filters);
    res.json({ mcqs: items, total: items.length });
  } catch (error) {
    console.error("Error fetching MCQs:", error);
    res.status(500).json({ error: "Failed to retrieve questions from question bank" });
  }
});
apiRouter.get("/mcqs/:id", async (req, res) => {
  try {
    const mcq = await getMCQByIdFromDb(req.params.id);
    if (!mcq) return res.status(404).json({ error: "Question not found" });
    res.json({ mcq });
  } catch (error) {
    console.error("Error fetching MCQ by ID:", error);
    res.status(500).json({ error: "Failed to retrieve question" });
  }
});
apiRouter.post("/mcqs", requireMCQCurator, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.question || typeof body.question !== "string" || body.question.trim().length === 0) {
      return res.status(400).json({ error: "Question text is required." });
    }
    if (!Array.isArray(body.options) || body.options.length < 2) {
      return res.status(400).json({ error: "At least 2 question options are required." });
    }
    if (typeof body.correctAnswer !== "number" || body.correctAnswer < 0 || body.correctAnswer >= body.options.length) {
      return res.status(400).json({ error: "Valid correct answer index is required." });
    }
    if (!body.subject || typeof body.subject !== "string") {
      return res.status(400).json({ error: "Subject is required." });
    }
    const created = await createMCQInDb(body, req.user?.uid);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "editor@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "CREATE_MCQ",
      targetType: "MCQ",
      targetId: created.id,
      details: `Created MCQ in ${created.subject}: ${created.question.slice(0, 60)}...`,
      subject: created.subject,
      classLevel: created.classLevel,
      board: created.board,
      ipAddress: req.ip
    });
    res.status(201).json({ success: true, mcq: created });
  } catch (error) {
    console.error("Error creating MCQ:", error);
    res.status(500).json({ error: error.message || "Failed to create MCQ" });
  }
});
apiRouter.put("/mcqs/:id", requireMCQCurator, async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const updated = await updateMCQInDb(id, body, req.user?.uid);
    if (!updated) return res.status(404).json({ error: "Question not found" });
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "editor@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "UPDATE_MCQ",
      targetType: "MCQ",
      targetId: id,
      details: `Updated question in ${updated.subject}`,
      subject: updated.subject,
      classLevel: updated.classLevel,
      board: updated.board,
      ipAddress: req.ip
    });
    res.json({ success: true, mcq: updated });
  } catch (error) {
    console.error("Error updating MCQ:", error);
    res.status(500).json({ error: error.message || "Failed to update MCQ" });
  }
});
apiRouter.delete("/mcqs/:id", requireMCQCurator, async (req, res) => {
  try {
    const id = req.params.id;
    await deleteMCQInDb(id);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "editor@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "DELETE_MCQ",
      targetType: "MCQ",
      targetId: id,
      details: `Deleted MCQ ${id}`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting MCQ:", error);
    res.status(500).json({ error: error.message || "Failed to delete MCQ" });
  }
});
apiRouter.post("/mcqs/bulk", requireMCQCurator, async (req, res) => {
  try {
    const items = req.body?.mcqs;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid or empty mcqs array" });
    }
    const count3 = await bulkInsertMCQsInDb(items, req.user?.uid);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "editor@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_IMPORT_MCQS",
      targetType: "MCQ_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Bulk imported ${count3} MCQs`,
      ipAddress: req.ip
    });
    res.json({ success: true, count: count3 });
  } catch (error) {
    console.error("Error bulk importing MCQs:", error);
    res.status(500).json({ error: error.message || "Failed to bulk import questions" });
  }
});
apiRouter.post("/mcqs/bulk-status", requireMCQCurator, async (req, res) => {
  try {
    const { ids, status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }
    if (!["Published", "Draft", "Archived"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be Published, Draft, or Archived" });
    }
    const updatedCount = await bulkUpdateMCQStatusInDb(ids, status, req.user?.uid);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "editor@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_STATUS_MCQS",
      targetType: "MCQ_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Updated status to "${status}" for ${updatedCount} MCQs`,
      ipAddress: req.ip
    });
    res.json({ success: true, count: updatedCount });
  } catch (error) {
    console.error("Error in bulk status update for MCQs:", error);
    res.status(500).json({ error: "Failed to update MCQ status" });
  }
});
apiRouter.post("/mcqs/bulk-delete", requireMCQCurator, async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }
    const deletedCount = await bulkDeleteMCQsInDb(ids);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "editor@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_DELETE_MCQS",
      targetType: "MCQ_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Bulk deleted ${deletedCount} MCQs`,
      ipAddress: req.ip
    });
    res.json({ success: true, count: deletedCount });
  } catch (error) {
    console.error("Error in bulk delete for MCQs:", error);
    res.status(500).json({ error: "Failed to delete MCQs" });
  }
});
apiRouter.post("/mcqs/bulk-create", requireMCQCurator, async (req, res) => {
  try {
    const items = req.body?.mcqs;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid or empty mcqs array" });
    }
    const result = await bulkCreateMCQsBatchInDb(items, req.user?.uid);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "editor@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_CREATE_MCQS",
      targetType: "MCQ_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Bulk entered ${result.inserted} MCQs with ${result.errors.length} validation errors`,
      ipAddress: req.ip
    });
    res.json({ success: true, inserted: result.inserted, errors: result.errors });
  } catch (error) {
    console.error("Error in bulk create for MCQs:", error);
    res.status(500).json({ error: "Failed to bulk create MCQs" });
  }
});
apiRouter.get("/tests", async (req, res) => {
  try {
    const filters = {
      subject: req.query.subject,
      classLevel: req.query.classLevel,
      board: req.query.board,
      category: req.query.category,
      testType: req.query.testType,
      status: req.query.status || "Published",
      search: req.query.search,
      limit: req.query.limit ? Math.min(500, parseInt(req.query.limit)) : 200
    };
    const items = await getTestsFromDb(filters);
    res.json({ tests: items, total: items.length });
  } catch (error) {
    console.error("Error fetching tests:", error);
    res.status(500).json({ error: "Failed to retrieve assessments" });
  }
});
apiRouter.get("/tests/:id", async (req, res) => {
  try {
    const test = await getTestByIdFromDb(req.params.id);
    if (!test) return res.status(404).json({ error: "Test not found" });
    res.json({ test });
  } catch (error) {
    console.error("Error fetching test by ID:", error);
    res.status(500).json({ error: "Failed to retrieve assessment" });
  }
});
apiRouter.post("/tests", requireQuizCreator, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
      return res.status(400).json({ error: "Test title is required." });
    }
    if (!body.subject || typeof body.subject !== "string") {
      return res.status(400).json({ error: "Subject is required." });
    }
    const created = await createTestInDb(body, req.user?.uid);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "CREATE_TEST",
      targetType: "TEST",
      targetId: created.id,
      details: `Created test: ${created.title} (${created.subject})`,
      subject: created.subject,
      classLevel: created.classLevel,
      board: created.board,
      ipAddress: req.ip
    });
    res.status(201).json({ success: true, test: created });
  } catch (error) {
    console.error("Error creating test:", error);
    res.status(500).json({ error: error.message || "Failed to create assessment" });
  }
});
apiRouter.put("/tests/:id", requireQuizCreator, async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const updated = await updateTestInDb(id, body, req.user?.uid);
    if (!updated) return res.status(404).json({ error: "Test not found" });
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "UPDATE_TEST",
      targetType: "TEST",
      targetId: id,
      details: `Updated test: ${updated.title}`,
      subject: updated.subject,
      classLevel: updated.classLevel,
      board: updated.board,
      ipAddress: req.ip
    });
    res.json({ success: true, test: updated });
  } catch (error) {
    console.error("Error updating test:", error);
    res.status(500).json({ error: error.message || "Failed to update assessment" });
  }
});
apiRouter.delete("/tests/:id", requireQuizCreator, async (req, res) => {
  try {
    const id = req.params.id;
    await deleteTestInDb(id);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "DELETE_TEST",
      targetType: "TEST",
      targetId: id,
      details: `Deleted test ${id}`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: "Test deleted successfully" });
  } catch (error) {
    console.error("Error deleting test:", error);
    res.status(500).json({ error: error.message || "Failed to delete assessment" });
  }
});
apiRouter.post("/tests/bulk", requireQuizCreator, async (req, res) => {
  try {
    const items = req.body?.tests;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid or empty tests array" });
    }
    const count3 = await bulkInsertTestsInDb(items, req.user?.uid);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_IMPORT_TESTS",
      targetType: "TEST_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Bulk imported ${count3} test configurations`,
      ipAddress: req.ip
    });
    res.json({ success: true, count: count3 });
  } catch (error) {
    console.error("Error bulk importing tests:", error);
    res.status(500).json({ error: error.message || "Failed to bulk import assessments" });
  }
});
apiRouter.post("/tests/bulk-status", requireQuizCreator, async (req, res) => {
  try {
    const { ids, status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }
    if (!["Published", "Draft", "Archived"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be Published, Draft, or Archived" });
    }
    const updatedCount = await bulkUpdateTestStatusInDb(ids, status, req.user?.uid);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_STATUS_TESTS",
      targetType: "TEST_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Updated status to "${status}" for ${updatedCount} tests`,
      ipAddress: req.ip
    });
    res.json({ success: true, count: updatedCount });
  } catch (error) {
    console.error("Error in bulk status update for tests:", error);
    res.status(500).json({ error: "Failed to update test status" });
  }
});
apiRouter.post("/tests/bulk-delete", requireQuizCreator, async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }
    const deletedCount = await bulkDeleteTestsInDb(ids);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_DELETE_TESTS",
      targetType: "TEST_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Bulk deleted ${deletedCount} tests`,
      ipAddress: req.ip
    });
    res.json({ success: true, count: deletedCount });
  } catch (error) {
    console.error("Error in bulk delete for tests:", error);
    res.status(500).json({ error: "Failed to delete tests" });
  }
});
apiRouter.post("/exams/start", optionalAuth, async (req, res) => {
  try {
    const { testId, candidateSessionId, studentName, studentEmail } = req.body || {};
    if (!testId || typeof testId !== "string") {
      return res.status(400).json({ error: "Valid testId is required to start an assessment" });
    }
    const userUid = req.user?.uid || candidateSessionId || `anon-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const effectiveName = req.user?.name || studentName || "Candidate";
    const effectiveEmail = req.user?.email || studentEmail || void 0;
    const startData = await startExamAttemptInDb({
      testId,
      userUid,
      studentName: effectiveName,
      studentEmail: effectiveEmail,
      ipAddress: req.ip
    });
    res.json(startData);
  } catch (error) {
    console.error("Error starting examination attempt:", error);
    res.status(400).json({ error: error.message || "Failed to initialize examination session" });
  }
});
apiRouter.post("/exams/:attemptId/save-answer", optionalAuth, async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    const { questionId, selectedOption, markedForReview, timeSpentSeconds, candidateSessionId } = req.body || {};
    if (!questionId) {
      return res.status(400).json({ error: "questionId is required" });
    }
    const userUid = req.user?.uid || candidateSessionId;
    if (!userUid) {
      return res.status(401).json({ error: "Session identifier missing" });
    }
    const result = await saveExamAnswerInDb({
      attemptId,
      userUid,
      questionId,
      selectedOption: selectedOption !== void 0 && selectedOption !== null ? Number(selectedOption) : null,
      markedForReview: Boolean(markedForReview),
      timeSpentSeconds: Number(timeSpentSeconds || 0)
    });
    res.json(result);
  } catch (error) {
    console.error("Error saving candidate answer:", error);
    res.status(400).json({ error: error.message || "Failed to record answer" });
  }
});
apiRouter.post("/exams/:attemptId/submit", optionalAuth, async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    const { answers, timeSpentSeconds, candidateSessionId } = req.body || {};
    const userUid = req.user?.uid || candidateSessionId;
    if (!userUid) {
      return res.status(401).json({ error: "Session identifier missing" });
    }
    const evaluation = await submitExamAttemptInDb({
      attemptId,
      userUid,
      submittedAnswers: answers || {},
      timeSpentSeconds: timeSpentSeconds ? Number(timeSpentSeconds) : void 0
    });
    res.json({
      success: true,
      result: evaluation.result,
      certificateId: evaluation.certificateId
    });
  } catch (error) {
    console.error("Error evaluating examination attempt:", error);
    res.status(400).json({ error: error.message || "Failed to submit examination" });
  }
});
apiRouter.get("/exams/:attemptId/result", optionalAuth, async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    const candidateSessionId = req.query.candidateSessionId;
    const userUid = req.user?.uid || candidateSessionId;
    if (!userUid) {
      return res.status(401).json({ error: "Authentication or candidate session required" });
    }
    const result = await getExamAttemptResultFromDb(attemptId, userUid);
    if (!result) {
      return res.status(404).json({ error: "Examination result not found or unauthorized" });
    }
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error retrieving examination result:", error);
    res.status(500).json({ error: "Failed to retrieve assessment result" });
  }
});
apiRouter.get("/user/exam-history", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const history = await getUserExamHistoryFromDb(uid);
    res.json({ success: true, attempts: history });
  } catch (error) {
    console.error("Error fetching student exam history:", error);
    res.status(500).json({ error: "Failed to retrieve examination history" });
  }
});
apiRouter.get("/admin/exam-attempts", requireQuizCreator, async (req, res) => {
  try {
    const filters = {
      testId: req.query.testId,
      status: req.query.status,
      search: req.query.search,
      limit: req.query.limit ? Math.min(500, parseInt(req.query.limit)) : 100,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };
    const data = await getAllExamAttemptsFromDb(filters);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error("Error fetching admin exam attempts:", error);
    res.status(500).json({ error: "Failed to retrieve examination records" });
  }
});
apiRouter.get("/past-papers", optionalAuth, async (req, res) => {
  try {
    const isStaff = isStaffUser(req.user);
    const filters = {
      board: req.query.board,
      province: req.query.province,
      classLevel: req.query.classLevel,
      subject: req.query.subject,
      topic: req.query.topic,
      exam: req.query.exam,
      language: req.query.language,
      year: req.query.year ? parseInt(req.query.year, 10) : void 0,
      status: req.query.status,
      search: req.query.search,
      limit: req.query.limit ? Math.min(500, parseInt(req.query.limit, 10)) : 300,
      isStaff
    };
    const items = await getPastPapersFromDb(filters);
    res.json({ pastPapers: items, total: items.length });
  } catch (error) {
    console.error("Error fetching past papers:", error);
    res.status(500).json({ error: "Failed to retrieve past papers" });
  }
});
apiRouter.get("/past-papers/:id", optionalAuth, async (req, res) => {
  try {
    const isStaff = isStaffUser(req.user);
    const paper = await getPastPaperByIdFromDb(req.params.id, isStaff);
    if (!paper) return res.status(404).json({ error: "Past paper not found or access restricted" });
    res.json({ pastPaper: paper });
  } catch (error) {
    console.error("Error fetching past paper by ID:", error);
    res.status(500).json({ error: "Failed to retrieve past paper" });
  }
});
apiRouter.get("/past-papers/:id/download", documentRateLimitMiddleware, optionalAuth, async (req, res) => {
  try {
    const isStaff = isStaffUser(req.user);
    const paper = await getPastPaperByIdFromDb(req.params.id, true);
    if (!paper) return res.status(404).json({ error: "Past paper not found" });
    if (paper.status !== "Published" && !isStaff) {
      return res.status(403).json({ error: "Access denied: Past paper is not published" });
    }
    const doc = await getDocumentByIdFromDb(paper.id, true);
    let targetFilePath;
    if (doc) {
      const isPrivileged = isAdminOrContentManager(req.user);
      const requestOriginal = req.query.original === "true" && isPrivileged;
      const fileInfo = requestOriginal ? getSafeOriginalPath(doc) : getSafeBrandedPath(doc);
      if (fileInfo.valid && fileInfo.filePath) {
        targetFilePath = fileInfo.filePath;
      }
    }
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;
    const userAgent = req.headers["user-agent"]?.substring(0, 500);
    const sessionId = req.headers["x-session-id"] || req.cookies?.tg_session_id;
    recordDocumentDownload(paper.id, {
      documentType: "Past Paper",
      userUid: req.user?.uid,
      anonymousSessionId: sessionId,
      ipAddress: clientIp,
      userAgent,
      version: paper.version || 1
    }).catch((recErr) => console.warn("Failed to record download event:", recErr));
    if (targetFilePath && fs4.existsSync(targetFilePath)) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${sanitizeDownloadFilename(paper.title + ".pdf", "past_paper.pdf")}"`);
      res.setHeader("X-TaleemGuru-Branded", "true");
      return fs4.createReadStream(targetFilePath).pipe(res);
    }
    const fallbackUrl = paper.brandedFileUrl || paper.downloadUrl || paper.fileUrl;
    if (fallbackUrl && fallbackUrl.startsWith("/")) {
      const resolved = resolveSafeLocalFilePath(fallbackUrl);
      if (resolved.valid && resolved.absolutePath && fs4.existsSync(resolved.absolutePath)) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${sanitizeDownloadFilename(paper.title + ".pdf", "past_paper.pdf")}"`);
        return fs4.createReadStream(resolved.absolutePath).pipe(res);
      }
    }
    return res.status(404).json({ error: "Past paper document file is currently unavailable" });
  } catch (error) {
    console.error("Error downloading past paper:", error);
    res.status(500).json({ error: "Failed to download past paper" });
  }
});
apiRouter.post("/past-papers", requireContentCurator, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
      return res.status(400).json({ error: "Paper title is required." });
    }
    if (!body.board || !body.classLevel || !body.subject || !body.year) {
      return res.status(400).json({ error: "Board, class level, subject, and year are required." });
    }
    const created = await createPastPaperInDb(body, req.user?.uid);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "CREATE_PAST_PAPER",
      targetType: "PAST_PAPER",
      targetId: created.id,
      details: `Created past paper: ${created.title} (${created.board} ${created.year})`,
      subject: created.subject,
      classLevel: created.classLevel,
      board: created.board,
      ipAddress: req.ip
    });
    res.status(201).json({ success: true, pastPaper: created });
  } catch (error) {
    console.error("Error creating past paper:", error);
    res.status(500).json({ error: error.message || "Failed to create past paper" });
  }
});
apiRouter.put("/past-papers/:id", requireContentCurator, async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const updated = await updatePastPaperInDb(id, body, req.user?.uid);
    if (!updated) return res.status(404).json({ error: "Past paper not found" });
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "UPDATE_PAST_PAPER",
      targetType: "PAST_PAPER",
      targetId: id,
      details: `Updated past paper: ${updated.title}`,
      subject: updated.subject,
      classLevel: updated.classLevel,
      board: updated.board,
      ipAddress: req.ip
    });
    res.json({ success: true, pastPaper: updated });
  } catch (error) {
    console.error("Error updating past paper:", error);
    res.status(500).json({ error: error.message || "Failed to update past paper" });
  }
});
apiRouter.delete("/past-papers/:id", requireContentCurator, async (req, res) => {
  try {
    const id = req.params.id;
    await deletePastPaperInDb(id);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "DELETE_PAST_PAPER",
      targetType: "PAST_PAPER",
      targetId: id,
      details: `Deleted past paper ${id}`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: "Past paper deleted successfully" });
  } catch (error) {
    console.error("Error deleting past paper:", error);
    res.status(500).json({ error: error.message || "Failed to delete past paper" });
  }
});
apiRouter.post("/past-papers/bulk", requireContentCurator, async (req, res) => {
  try {
    const items = req.body?.pastPapers;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid or empty pastPapers array" });
    }
    const count3 = await bulkInsertPastPapersInDb(items, req.user?.uid);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_IMPORT_PAST_PAPERS",
      targetType: "PAST_PAPER_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Bulk imported ${count3} past papers`,
      ipAddress: req.ip
    });
    res.json({ success: true, count: count3 });
  } catch (error) {
    console.error("Error bulk importing past papers:", error);
    res.status(500).json({ error: error.message || "Failed to bulk import past papers" });
  }
});
apiRouter.post("/past-papers/bulk-status", requireContentCurator, async (req, res) => {
  try {
    const { ids, status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }
    if (!["Published", "Draft", "Archived"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be Published, Draft, or Archived" });
    }
    const updatedCount = await bulkUpdatePastPaperStatusInDb(ids, status, req.user?.uid);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_STATUS_PAST_PAPERS",
      targetType: "PAST_PAPER_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Updated status to "${status}" for ${updatedCount} past papers`,
      ipAddress: req.ip
    });
    res.json({ success: true, count: updatedCount });
  } catch (error) {
    console.error("Error in bulk status update for past papers:", error);
    res.status(500).json({ error: "Failed to update past paper status" });
  }
});
apiRouter.post("/past-papers/bulk-delete", requireContentCurator, async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }
    const deletedCount = await bulkDeletePastPapersInDb(ids);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_DELETE_PAST_PAPERS",
      targetType: "PAST_PAPER_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Bulk deleted ${deletedCount} past papers`,
      ipAddress: req.ip
    });
    res.json({ success: true, count: deletedCount });
  } catch (error) {
    console.error("Error in bulk delete for past papers:", error);
    res.status(500).json({ error: "Failed to delete past papers" });
  }
});
apiRouter.get("/study-notes", optionalAuth, async (req, res) => {
  try {
    const isStaff = isStaffUser(req.user);
    const filters = {
      subject: req.query.subject,
      classLevel: req.query.classLevel,
      board: req.query.board,
      chapter: req.query.chapter,
      topic: req.query.topic,
      type: req.query.type,
      language: req.query.language,
      status: req.query.status,
      search: req.query.search,
      limit: req.query.limit ? Math.min(500, parseInt(req.query.limit, 10)) : 300,
      isStaff
    };
    const items = await getStudyNotesFromDb(filters);
    res.json({ studyNotes: items, total: items.length });
  } catch (error) {
    console.error("Error fetching study notes:", error);
    res.status(500).json({ error: "Failed to retrieve study notes" });
  }
});
apiRouter.get("/study-notes/:id", optionalAuth, async (req, res) => {
  try {
    const isStaff = isStaffUser(req.user);
    const note = await getStudyNoteByIdFromDb(req.params.id, isStaff);
    if (!note) return res.status(404).json({ error: "Study note not found or access restricted" });
    res.json({ studyNote: note });
  } catch (error) {
    console.error("Error fetching study note by ID:", error);
    res.status(500).json({ error: "Failed to retrieve study note" });
  }
});
apiRouter.get("/study-notes/:id/download", documentRateLimitMiddleware, optionalAuth, async (req, res) => {
  try {
    const isStaff = isStaffUser(req.user);
    const note = await getStudyNoteByIdFromDb(req.params.id, true);
    if (!note) return res.status(404).json({ error: "Study note not found" });
    if (note.status !== "Published" && !isStaff) {
      return res.status(403).json({ error: "Access denied: Study note is not published" });
    }
    const doc = await getDocumentByIdFromDb(note.id, true);
    let targetFilePath;
    if (doc) {
      const isPrivileged = isAdminOrContentManager(req.user);
      const requestOriginal = req.query.original === "true" && isPrivileged;
      const fileInfo = requestOriginal ? getSafeOriginalPath(doc) : getSafeBrandedPath(doc);
      if (fileInfo.valid && fileInfo.filePath) {
        targetFilePath = fileInfo.filePath;
      }
    }
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;
    const userAgent = req.headers["user-agent"]?.substring(0, 500);
    const sessionId = req.headers["x-session-id"] || req.cookies?.tg_session_id;
    recordDocumentDownload(note.id, {
      documentType: "Study Note",
      userUid: req.user?.uid,
      anonymousSessionId: sessionId,
      ipAddress: clientIp,
      userAgent,
      version: note.version || 1
    }).catch((recErr) => console.warn("Failed to record download event:", recErr));
    if (targetFilePath && fs4.existsSync(targetFilePath)) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${sanitizeDownloadFilename(note.title + ".pdf", "study_note.pdf")}"`);
      res.setHeader("X-TaleemGuru-Branded", "true");
      return fs4.createReadStream(targetFilePath).pipe(res);
    }
    const fallbackUrl = note.brandedFileUrl || note.pdfUrl || note.fileUrl;
    if (fallbackUrl && fallbackUrl.startsWith("/")) {
      const resolved = resolveSafeLocalFilePath(fallbackUrl);
      if (resolved.valid && resolved.absolutePath && fs4.existsSync(resolved.absolutePath)) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${sanitizeDownloadFilename(note.title + ".pdf", "study_note.pdf")}"`);
        return fs4.createReadStream(resolved.absolutePath).pipe(res);
      }
    }
    return res.status(404).json({ error: "Study note document file is currently unavailable" });
  } catch (error) {
    console.error("Error downloading study note:", error);
    res.status(500).json({ error: "Failed to download study note" });
  }
});
apiRouter.post("/study-notes", requireContentCurator, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
      return res.status(400).json({ error: "Note title is required." });
    }
    if (!body.subject || !body.classLevel || !body.chapter) {
      return res.status(400).json({ error: "Subject, class level, and chapter are required." });
    }
    const created = await createStudyNoteInDb(body, req.user?.uid);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "CREATE_STUDY_NOTE",
      targetType: "STUDY_NOTE",
      targetId: created.id,
      details: `Created study note: ${created.title} (${created.subject} - ${created.chapter})`,
      subject: created.subject,
      classLevel: created.classLevel,
      board: created.board,
      ipAddress: req.ip
    });
    res.status(201).json({ success: true, studyNote: created });
  } catch (error) {
    console.error("Error creating study note:", error);
    res.status(500).json({ error: error.message || "Failed to create study note" });
  }
});
apiRouter.put("/study-notes/:id", requireContentCurator, async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const updated = await updateStudyNoteInDb(id, body, req.user?.uid);
    if (!updated) return res.status(404).json({ error: "Study note not found" });
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "UPDATE_STUDY_NOTE",
      targetType: "STUDY_NOTE",
      targetId: id,
      details: `Updated study note: ${updated.title}`,
      subject: updated.subject,
      classLevel: updated.classLevel,
      board: updated.board,
      ipAddress: req.ip
    });
    res.json({ success: true, studyNote: updated });
  } catch (error) {
    console.error("Error updating study note:", error);
    res.status(500).json({ error: error.message || "Failed to update study note" });
  }
});
apiRouter.delete("/study-notes/:id", requireContentCurator, async (req, res) => {
  try {
    const id = req.params.id;
    await deleteStudyNoteInDb(id);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "DELETE_STUDY_NOTE",
      targetType: "STUDY_NOTE",
      targetId: id,
      details: `Deleted study note ${id}`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: "Study note deleted successfully" });
  } catch (error) {
    console.error("Error deleting study note:", error);
    res.status(500).json({ error: error.message || "Failed to delete study note" });
  }
});
apiRouter.post("/study-notes/bulk", requireContentCurator, async (req, res) => {
  try {
    const items = req.body?.studyNotes;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid or empty studyNotes array" });
    }
    const count3 = await bulkInsertStudyNotesInDb(items, req.user?.uid);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_IMPORT_STUDY_NOTES",
      targetType: "STUDY_NOTE_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Bulk imported ${count3} study notes`,
      ipAddress: req.ip
    });
    res.json({ success: true, count: count3 });
  } catch (error) {
    console.error("Error bulk importing study notes:", error);
    res.status(500).json({ error: error.message || "Failed to bulk import study notes" });
  }
});
apiRouter.post("/study-notes/bulk-status", requireContentCurator, async (req, res) => {
  try {
    const { ids, status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }
    if (!["Published", "Draft", "Archived"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be Published, Draft, or Archived" });
    }
    const updatedCount = await bulkUpdateStudyNoteStatusInDb(ids, status, req.user?.uid);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_STATUS_STUDY_NOTES",
      targetType: "STUDY_NOTE_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Updated status to "${status}" for ${updatedCount} study notes`,
      ipAddress: req.ip
    });
    res.json({ success: true, count: updatedCount });
  } catch (error) {
    console.error("Error in bulk status update for study notes:", error);
    res.status(500).json({ error: "Failed to update study note status" });
  }
});
apiRouter.post("/study-notes/bulk-delete", requireContentCurator, async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }
    const deletedCount = await bulkDeleteStudyNotesInDb(ids);
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "staff@taleemguru.pk",
      adminName: req.user?.name || "Staff",
      action: "BULK_DELETE_STUDY_NOTES",
      targetType: "STUDY_NOTE_BATCH",
      targetId: `batch-${Date.now()}`,
      details: `Bulk deleted ${deletedCount} study notes`,
      ipAddress: req.ip
    });
    res.json({ success: true, count: deletedCount });
  } catch (error) {
    console.error("Error in bulk delete for study notes:", error);
    res.status(500).json({ error: "Failed to delete study notes" });
  }
});
apiRouter.get("/hierarchy/boards", async (req, res) => {
  try {
    const status = req.query.status;
    const items = await getBoardsFromDb2(status);
    res.json({ boards: items });
  } catch (error) {
    console.error("Error fetching hierarchy boards:", error);
    res.status(500).json({ error: "Failed to retrieve boards" });
  }
});
apiRouter.post("/hierarchy/boards", requireAdmin, async (req, res) => {
  try {
    const { name, status } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Board name is required." });
    }
    const created = await createBoardInDb(name, status);
    if (!created) return res.status(500).json({ error: "Failed to create board." });
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "admin@taleemguru.pk",
      adminName: req.user?.name || "Admin",
      action: "CREATE_BOARD",
      targetType: "HIERARCHY_BOARD",
      targetId: String(created.id),
      details: `Created board: ${created.name}`,
      ipAddress: req.ip
    });
    res.status(201).json({ success: true, board: created });
  } catch (error) {
    console.error("Error creating board:", error);
    res.status(500).json({ error: "Failed to create board" });
  }
});
apiRouter.put("/hierarchy/boards/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid board ID" });
    const { name, status } = req.body || {};
    const updated = await updateBoardInDb2(id, { name, status });
    if (!updated) return res.status(404).json({ error: "Board not found" });
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "admin@taleemguru.pk",
      adminName: req.user?.name || "Admin",
      action: "UPDATE_BOARD",
      targetType: "HIERARCHY_BOARD",
      targetId: String(id),
      details: `Updated board: ${updated.name} (Status: ${updated.status})`,
      ipAddress: req.ip
    });
    res.json({ success: true, board: updated });
  } catch (error) {
    console.error("Error updating board:", error);
    res.status(500).json({ error: "Failed to update board" });
  }
});
apiRouter.delete("/hierarchy/boards/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid board ID" });
    const result = await deleteBoardInDb(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "admin@taleemguru.pk",
      adminName: req.user?.name || "Admin",
      action: "DELETE_BOARD",
      targetType: "HIERARCHY_BOARD",
      targetId: String(id),
      details: `Deleted board ${id}`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: "Board deleted successfully" });
  } catch (error) {
    console.error("Error deleting board:", error);
    res.status(500).json({ error: "Failed to delete board" });
  }
});
apiRouter.get("/hierarchy/classes", async (req, res) => {
  try {
    const boardId = req.query.boardId ? parseInt(req.query.boardId) : void 0;
    const status = req.query.status;
    const items = await getClassesFromDb(boardId, status);
    res.json({ classes: items });
  } catch (error) {
    console.error("Error fetching hierarchy classes:", error);
    res.status(500).json({ error: "Failed to retrieve classes" });
  }
});
apiRouter.post("/hierarchy/classes", requireAdmin, async (req, res) => {
  try {
    const { boardId, name, status } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Class name is required." });
    }
    if (!boardId || isNaN(parseInt(boardId))) {
      return res.status(400).json({ error: "Valid board ID is required." });
    }
    const created = await createClassInDb(parseInt(boardId), name, status);
    if (!created) return res.status(500).json({ error: "Failed to create class." });
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "admin@taleemguru.pk",
      adminName: req.user?.name || "Admin",
      action: "CREATE_CLASS",
      targetType: "HIERARCHY_CLASS",
      targetId: String(created.id),
      details: `Created class: ${created.name}`,
      ipAddress: req.ip
    });
    res.status(201).json({ success: true, class: created });
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).json({ error: "Failed to create class" });
  }
});
apiRouter.put("/hierarchy/classes/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid class ID" });
    const { name, status, boardId } = req.body || {};
    const updated = await updateClassInDb2(id, { name, status, boardId: boardId ? parseInt(boardId) : void 0 });
    if (!updated) return res.status(404).json({ error: "Class not found" });
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "admin@taleemguru.pk",
      adminName: req.user?.name || "Admin",
      action: "UPDATE_CLASS",
      targetType: "HIERARCHY_CLASS",
      targetId: String(id),
      details: `Updated class: ${updated.name}`,
      ipAddress: req.ip
    });
    res.json({ success: true, class: updated });
  } catch (error) {
    console.error("Error updating class:", error);
    res.status(500).json({ error: "Failed to update class" });
  }
});
apiRouter.delete("/hierarchy/classes/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid class ID" });
    const result = await deleteClassInDb(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "admin@taleemguru.pk",
      adminName: req.user?.name || "Admin",
      action: "DELETE_CLASS",
      targetType: "HIERARCHY_CLASS",
      targetId: String(id),
      details: `Deleted class ${id}`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: "Class deleted successfully" });
  } catch (error) {
    console.error("Error deleting class:", error);
    res.status(500).json({ error: "Failed to delete class" });
  }
});
apiRouter.get("/hierarchy/subjects", async (req, res) => {
  try {
    const classId = req.query.classId ? parseInt(req.query.classId) : void 0;
    const status = req.query.status;
    const items = await getSubjectsFromDb2(classId, status);
    res.json({ subjects: items });
  } catch (error) {
    console.error("Error fetching hierarchy subjects:", error);
    res.status(500).json({ error: "Failed to retrieve subjects" });
  }
});
apiRouter.post("/hierarchy/subjects", requireAdmin, async (req, res) => {
  try {
    const { classId, name, status } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Subject name is required." });
    }
    if (!classId || isNaN(parseInt(classId))) {
      return res.status(400).json({ error: "Valid class ID is required." });
    }
    const created = await createSubjectInDb(parseInt(classId), name, status);
    if (!created) return res.status(500).json({ error: "Failed to create subject." });
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "admin@taleemguru.pk",
      adminName: req.user?.name || "Admin",
      action: "CREATE_SUBJECT",
      targetType: "HIERARCHY_SUBJECT",
      targetId: String(created.id),
      details: `Created subject: ${created.name}`,
      ipAddress: req.ip
    });
    res.status(201).json({ success: true, subject: created });
  } catch (error) {
    console.error("Error creating subject:", error);
    res.status(500).json({ error: "Failed to create subject" });
  }
});
apiRouter.put("/hierarchy/subjects/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid subject ID" });
    const { name, status, classId } = req.body || {};
    const updated = await updateSubjectInDb2(id, { name, status, classId: classId ? parseInt(classId) : void 0 });
    if (!updated) return res.status(404).json({ error: "Subject not found" });
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "admin@taleemguru.pk",
      adminName: req.user?.name || "Admin",
      action: "UPDATE_SUBJECT",
      targetType: "HIERARCHY_SUBJECT",
      targetId: String(id),
      details: `Updated subject: ${updated.name}`,
      ipAddress: req.ip
    });
    res.json({ success: true, subject: updated });
  } catch (error) {
    console.error("Error updating subject:", error);
    res.status(500).json({ error: "Failed to update subject" });
  }
});
apiRouter.delete("/hierarchy/subjects/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid subject ID" });
    const result = await deleteSubjectInDb(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "admin@taleemguru.pk",
      adminName: req.user?.name || "Admin",
      action: "DELETE_SUBJECT",
      targetType: "HIERARCHY_SUBJECT",
      targetId: String(id),
      details: `Deleted subject ${id}`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: "Subject deleted successfully" });
  } catch (error) {
    console.error("Error deleting subject:", error);
    res.status(500).json({ error: "Failed to delete subject" });
  }
});
apiRouter.get("/hierarchy/chapters", async (req, res) => {
  try {
    const subjectId = req.query.subjectId ? parseInt(req.query.subjectId) : void 0;
    const status = req.query.status;
    const items = await getChaptersFromDb(subjectId, status);
    res.json({ chapters: items });
  } catch (error) {
    console.error("Error fetching hierarchy chapters:", error);
    res.status(500).json({ error: "Failed to retrieve chapters" });
  }
});
apiRouter.post("/hierarchy/chapters", requireAdmin, async (req, res) => {
  try {
    const { subjectId, name, status, draftStatus } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Chapter name is required." });
    }
    if (!subjectId || isNaN(parseInt(subjectId))) {
      return res.status(400).json({ error: "Valid subject ID is required." });
    }
    const created = await createChapterInDb(parseInt(subjectId), name, status, draftStatus);
    if (!created) return res.status(500).json({ error: "Failed to create chapter." });
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "admin@taleemguru.pk",
      adminName: req.user?.name || "Admin",
      action: "CREATE_CHAPTER",
      targetType: "HIERARCHY_CHAPTER",
      targetId: String(created.id),
      details: `Created chapter: ${created.name}`,
      ipAddress: req.ip
    });
    res.status(201).json({ success: true, chapter: created });
  } catch (error) {
    console.error("Error creating chapter:", error);
    res.status(500).json({ error: "Failed to create chapter" });
  }
});
apiRouter.put("/hierarchy/chapters/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid chapter ID" });
    const { name, status, draftStatus, subjectId } = req.body || {};
    const updated = await updateChapterInDb2(id, {
      name,
      status,
      draftStatus,
      subjectId: subjectId ? parseInt(subjectId) : void 0
    });
    if (!updated) return res.status(404).json({ error: "Chapter not found" });
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "admin@taleemguru.pk",
      adminName: req.user?.name || "Admin",
      action: "UPDATE_CHAPTER",
      targetType: "HIERARCHY_CHAPTER",
      targetId: String(id),
      details: `Updated chapter: ${updated.name}`,
      ipAddress: req.ip
    });
    res.json({ success: true, chapter: updated });
  } catch (error) {
    console.error("Error updating chapter:", error);
    res.status(500).json({ error: "Failed to update chapter" });
  }
});
apiRouter.delete("/hierarchy/chapters/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid chapter ID" });
    const result = await deleteChapterInDb(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    await saveAuditLogToDb({
      adminUid: req.user?.uid || "unknown",
      adminEmail: req.user?.email || "admin@taleemguru.pk",
      adminName: req.user?.name || "Admin",
      action: "DELETE_CHAPTER",
      targetType: "HIERARCHY_CHAPTER",
      targetId: String(id),
      details: `Deleted chapter ${id}`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: "Chapter deleted successfully" });
  } catch (error) {
    console.error("Error deleting chapter:", error);
    res.status(500).json({ error: "Failed to delete chapter" });
  }
});
apiRouter.get("/admin/verify", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;
    if (!uid) {
      return res.status(401).json({ authorized: false, error: "Unauthorized: Missing UID" });
    }
    const normalizedEmail = (email || "").toLowerCase().trim();
    const isBootstrap = isTrustedBootstrapAdminEmail(normalizedEmail);
    const bootstrapAdmins = getTrustedBootstrapAdmins();
    const bootstrapConfig = bootstrapAdmins[normalizedEmail];
    let dbUser = null;
    try {
      dbUser = await getUserByUid(uid);
      if (!dbUser && normalizedEmail) {
        dbUser = await getOrCreateUser(uid, normalizedEmail, {
          name: isBootstrap ? bootstrapConfig?.name || "Admin" : req.user?.name
        });
      } else if (dbUser && isBootstrap && (!dbUser.roles || !dbUser.roles.includes("Admin") || dbUser.name !== (bootstrapConfig?.name || "Admin"))) {
        dbUser = await getOrCreateUser(uid, normalizedEmail, {
          name: bootstrapConfig?.name || "Admin"
        });
      }
    } catch (dbErr) {
      console.warn("Notice in /api/admin/verify database lookup:", dbErr);
    }
    const userRoles = dbUser?.roles && Array.isArray(dbUser.roles) && dbUser.roles.length > 0 ? dbUser.roles : dbUser?.role ? [dbUser.role] : isBootstrap ? ["Admin"] : ["Student"];
    const primaryRole = isBootstrap ? "Admin" : userRoles[0] || "Student";
    const staffRolesToCheck = [
      "admin",
      "superadmin",
      "super_admin",
      "administrator",
      "teacher",
      "editor",
      "contentmanager",
      "content_manager",
      "moderator"
    ];
    const isAdmin = isBootstrap || userRoles.some((r) => staffRolesToCheck.includes(r.trim().toLowerCase().replace(/\s+/g, "_")));
    if (isBootstrap) {
      console.log("[/api/admin/verify Diagnostic]", {
        normalizedEmail,
        tokenVerificationSuccess: true,
        trustedAdminMatch: true,
        dbProfileRoles: dbUser?.roles || [],
        finalAuthoritativeRole: "Admin",
        finalIsAdminBoolean: true
      });
      return res.json({
        authorized: true,
        uid: dbUser?.uid || uid,
        role: "Admin",
        name: dbUser?.name || bootstrapConfig?.name || "Admin",
        email: dbUser?.email || normalizedEmail
      });
    }
    if (!dbUser) {
      return res.status(403).json({ authorized: false, role: "Student", error: "User record not found in system" });
    }
    console.log("[/api/admin/verify Diagnostic]", {
      normalizedEmail,
      tokenVerificationSuccess: true,
      trustedAdminMatch: false,
      dbProfileRoles: userRoles,
      finalAuthoritativeRole: isAdmin ? primaryRole : "Student",
      finalIsAdminBoolean: isAdmin
    });
    if (!isAdmin) {
      return res.status(403).json({
        authorized: false,
        role: primaryRole,
        message: "Account does not possess administrative privileges."
      });
    }
    res.json({
      authorized: true,
      uid: dbUser.uid,
      role: primaryRole,
      name: dbUser.name,
      email: dbUser.email
    });
  } catch (error) {
    console.error("Error in /api/admin/verify:", error);
    res.status(500).json({ authorized: false, error: "Failed to verify admin status" });
  }
});
apiRouter.get("/admin/users", requireHighAdmin, async (req, res) => {
  try {
    const allDbUsers = await getAllUsersFromDb(200);
    res.json({ users: allDbUsers });
  } catch (error) {
    console.error("Admin users fetch error:", error);
    res.status(500).json({ error: "Failed to fetch admin users" });
  }
});
apiRouter.post("/admin/users", requireHighAdmin, async (req, res) => {
  try {
    const { name, email, roles, role, password, status } = req.body || {};
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanName = (name || "").trim();
    const cleanRoles = Array.isArray(roles) ? roles.map((r) => r.trim()) : typeof role === "string" && role.trim() ? [role.trim()] : ["Teacher"];
    const initialStatus = status === "Inactive" || status === "Suspended" ? status : "Active";
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(400).json({ error: "A valid email address is required." });
    }
    if (!cleanName) {
      return res.status(400).json({ error: "Full name is required." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }
    const allowedRoles = ["Student", "Teacher", "Staff", "Editor", "ContentManager", "Moderator", "Admin", "SuperAdmin"];
    const invalidRoles = cleanRoles.filter((r) => !allowedRoles.includes(r));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ error: `Invalid roles: ${invalidRoles.join(", ")}. Allowed roles: ${allowedRoles.join(", ")}` });
    }
    const callerRoles = (req.user?.roles || []).map((r) => r.toLowerCase().trim());
    const isCallerSuperAdmin = callerRoles.includes("superadmin") || callerRoles.includes("super_admin") || isTrustedBootstrapAdminEmail(req.user?.email);
    if (cleanRoles.includes("SuperAdmin") && !isCallerSuperAdmin) {
      return res.status(403).json({ error: "Forbidden: Only a SuperAdmin can create SuperAdmin accounts." });
    }
    const existingUser = await getUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({ error: `A user with email ${cleanEmail} already exists in the system.` });
    }
    let authUid = `staff-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const supabaseClient = getSupabaseServerClient();
    if (supabaseClient) {
      try {
        if (supabaseClient.auth?.admin?.createUser) {
          const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
            email: cleanEmail,
            password,
            email_confirm: true,
            user_metadata: {
              name: cleanName,
              role: cleanRoles[0] || "Teacher"
            }
          });
          if (!authError && authData?.user?.id) {
            authUid = authData.user.id;
          }
        }
        if (!authUid || authUid.startsWith("staff-")) {
          const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                name: cleanName,
                role: cleanRoles[0] || "Teacher"
              }
            }
          });
          if (!signUpError && signUpData?.user?.id) {
            authUid = signUpData.user.id;
          } else if (signUpError) {
            console.warn("Notice from Supabase signUp:", signUpError.message);
          }
        }
      } catch (authCreateErr) {
        console.warn("Notice during Supabase user registration execution:", authCreateErr);
      }
    }
    const createdUser = await createUserInDb({
      uid: authUid,
      email: cleanEmail,
      name: cleanName,
      roles: cleanRoles,
      password,
      status: initialStatus
    });
    await saveAuditLogToDb({
      adminUid: req.user.uid,
      adminEmail: req.user.email || "admin@taleemguru.pk",
      adminName: req.user.name,
      action: "STAFF_USER_CREATED",
      targetType: "user",
      targetId: authUid,
      details: `Created new ${cleanRoles.join(", ")} account (${initialStatus}) for ${cleanEmail} (${cleanName})`,
      ipAddress: req.ip
    });
    return res.status(201).json({
      success: true,
      user: sanitizeUserForClient(createdUser)
    });
  } catch (error) {
    console.error("Error creating staff user:", error);
    return res.status(500).json({ error: "Failed to create staff account" });
  }
});
apiRouter.patch("/admin/users/:uid/roles", requireHighAdmin, async (req, res) => {
  try {
    const targetUid = req.params.uid;
    const { roles } = req.body;
    if (req.user?.uid === targetUid) {
      return res.status(403).json({ error: "Forbidden: You cannot modify your own roles." });
    }
    const allowedRoles = ["Student", "Staff", "Admin", "Teacher", "Editor", "ContentManager", "Moderator", "SuperAdmin"];
    if (!roles || !Array.isArray(roles) || !roles.every((r) => allowedRoles.includes(r))) {
      return res.status(400).json({ error: `Invalid roles. Allowed roles: ${allowedRoles.join(", ")}` });
    }
    const previousUser = await getUserByUid(targetUid);
    if (!previousUser) {
      return res.status(404).json({ error: "Target user not found" });
    }
    const previousRoles = previousUser.roles || [];
    const callerRoles = (req.user?.roles || []).map((r) => r.toLowerCase().trim());
    const isCallerSuperAdmin = callerRoles.includes("superadmin") || callerRoles.includes("super_admin") || isTrustedBootstrapAdminEmail(req.user?.email);
    const targetIsSuperAdmin = previousRoles.some((r) => r.toLowerCase() === "superadmin" || r.toLowerCase() === "super_admin") || isTrustedBootstrapAdminEmail(previousUser.email);
    if (targetIsSuperAdmin && !isCallerSuperAdmin) {
      return res.status(403).json({ error: "Forbidden: Administrators cannot modify or demote a SuperAdmin." });
    }
    if (roles.includes("SuperAdmin") && !isCallerSuperAdmin) {
      return res.status(403).json({ error: "Forbidden: Only SuperAdmin can grant the SuperAdmin role." });
    }
    const updatedUser = await updateUserRolesInDb(targetUid, roles);
    if (!updatedUser) {
      return res.status(404).json({ error: "Target user not found" });
    }
    await saveAuditLogToDb({
      adminUid: req.user.uid,
      adminEmail: req.user.email || "admin@taleemguru.pk",
      adminName: req.user.name,
      action: "USER_ROLES_CHANGED",
      targetType: "user",
      targetId: targetUid,
      details: `Roles changed from [${previousRoles.join(", ")}] to [${roles.join(", ")}] for user ${updatedUser.email}`,
      ipAddress: req.ip
    });
    res.json({ success: true, user: sanitizeUserForClient(updatedUser), previousRoles });
  } catch (error) {
    console.error("Error updating user roles:", error);
    res.status(500).json({ error: "Failed to update user roles" });
  }
});
apiRouter.patch("/admin/users/:uid/status", requireHighAdmin, async (req, res) => {
  try {
    const targetUid = req.params.uid;
    const { status } = req.body;
    if (req.user?.uid === targetUid) {
      return res.status(403).json({ error: "Forbidden: You cannot change your own account status." });
    }
    const validStatuses = ["Active", "Inactive", "Suspended"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed statuses: ${validStatuses.join(", ")}` });
    }
    const targetUser = await getUserByUid(targetUid);
    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }
    const callerRoles = (req.user?.roles || []).map((r) => r.toLowerCase().trim());
    const isCallerSuperAdmin = callerRoles.includes("superadmin") || callerRoles.includes("super_admin") || isTrustedBootstrapAdminEmail(req.user?.email);
    const targetIsSuperAdmin = targetUser.roles.some((r) => r.toLowerCase() === "superadmin" || r.toLowerCase() === "super_admin") || isTrustedBootstrapAdminEmail(targetUser.email);
    if (targetIsSuperAdmin && !isCallerSuperAdmin) {
      return res.status(403).json({ error: "Forbidden: Administrators cannot modify status of a SuperAdmin." });
    }
    const updated = await updateUserStatusInDb(targetUid, status);
    if (!updated) {
      return res.status(404).json({ error: "Target user not found" });
    }
    await saveAuditLogToDb({
      adminUid: req.user.uid,
      adminEmail: req.user.email || "admin@taleemguru.pk",
      adminName: req.user.name,
      action: "USER_STATUS_CHANGED",
      targetType: "user",
      targetId: targetUid,
      details: `Status changed to ${status} for user ${updated.email}`,
      ipAddress: req.ip
    });
    res.json({ success: true, user: sanitizeUserForClient(updated) });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ error: "Failed to update user status" });
  }
});
apiRouter.patch("/admin/users/:uid/profile", requireHighAdmin, async (req, res) => {
  try {
    const targetUid = req.params.uid;
    const { name, classLevel, board, targetExam } = req.body;
    const targetUser = await getUserByUid(targetUid);
    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }
    const updated = await updateUserProfile(targetUid, {
      name: name?.trim() || targetUser.name,
      classLevel: classLevel?.trim() || targetUser.classLevel,
      board: board?.trim() || targetUser.board,
      targetExam: targetExam?.trim() || targetUser.targetExam
    });
    await saveAuditLogToDb({
      adminUid: req.user.uid,
      adminEmail: req.user.email || "admin@taleemguru.pk",
      adminName: req.user.name,
      action: "USER_PROFILE_EDITED_BY_ADMIN",
      targetType: "user",
      targetId: targetUid,
      details: `Admin updated profile info for user ${targetUser.email}`,
      ipAddress: req.ip
    });
    res.json({ success: true, user: sanitizeUserForClient(updated) });
  } catch (error) {
    console.error("Error editing user profile by admin:", error);
    res.status(500).json({ error: "Failed to update user profile" });
  }
});
apiRouter.post("/admin/users/:uid/reset-password", requireHighAdmin, async (req, res) => {
  try {
    const targetUid = req.params.uid;
    const { password } = req.body || {};
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }
    const targetUser = await getUserByUid(targetUid);
    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found." });
    }
    const callerRoles = (req.user?.roles || []).map((r) => r.toLowerCase().trim());
    const isCallerSuperAdmin = callerRoles.includes("superadmin") || callerRoles.includes("super_admin") || isTrustedBootstrapAdminEmail(req.user?.email);
    const targetRoles = (targetUser.roles || []).map((r) => r.toLowerCase().trim());
    const targetIsSuperAdmin = targetRoles.includes("superadmin") || targetRoles.includes("super_admin") || isTrustedBootstrapAdminEmail(targetUser.email);
    if (targetIsSuperAdmin && !isCallerSuperAdmin) {
      return res.status(403).json({ error: "Forbidden: Administrators cannot reset credentials for a SuperAdmin." });
    }
    const supabaseClient = getSupabaseServerClient();
    if (supabaseClient && supabaseClient.auth?.admin?.updateUserById) {
      try {
        await supabaseClient.auth.admin.updateUserById(targetUid, { password });
      } catch (authErr) {
        console.warn("Supabase admin updateUserById notice:", authErr);
      }
    }
    const updated = await setUserPasswordInDb(targetUid, password);
    if (!updated) {
      return res.status(500).json({ error: "Failed to update user password in database." });
    }
    await saveAuditLogToDb({
      adminUid: req.user.uid,
      adminEmail: req.user.email || "admin@taleemguru.pk",
      adminName: req.user.name,
      action: "STAFF_PASSWORD_RESET_BY_ADMIN",
      targetType: "user",
      targetId: targetUid,
      details: `Admin reset password for account ${targetUser.email} (${targetUser.name})`,
      ipAddress: req.ip
    });
    return res.json({ success: true, message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Error resetting staff password by admin:", error);
    return res.status(500).json({ error: "Failed to reset user password." });
  }
});
apiRouter.patch("/admin/users/:uid/permissions", requireHighAdmin, async (req, res) => {
  try {
    const targetUid = req.params.uid;
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: "Permissions must be an array of strings." });
    }
    const targetUser = await getUserByUid(targetUid);
    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }
    const updated = await updateUserPermissionsInDb(targetUid, permissions);
    await saveAuditLogToDb({
      adminUid: req.user.uid,
      adminEmail: req.user.email || "admin@taleemguru.pk",
      adminName: req.user.name,
      action: "USER_PERMISSIONS_OVERRIDDEN",
      targetType: "user",
      targetId: targetUid,
      details: `Updated granular permissions (${permissions.length} items) for user ${targetUser.email}`,
      ipAddress: req.ip
    });
    res.json({ success: true, user: sanitizeUserForClient(updated) });
  } catch (error) {
    console.error("Error updating user permissions:", error);
    res.status(500).json({ error: "Failed to update user permissions" });
  }
});
apiRouter.get("/admin/users/:uid/assignments", requireHighAdmin, async (req, res) => {
  try {
    const targetUid = req.params.uid;
    const assignments = await getStaffAssignmentsFromDb(targetUid);
    res.json({ success: true, assignments });
  } catch (error) {
    console.error("Error fetching staff assignments:", error);
    res.status(500).json({ error: "Failed to fetch staff assignments" });
  }
});
apiRouter.post("/admin/users/:uid/assignments", requireHighAdmin, async (req, res) => {
  try {
    const targetUid = req.params.uid;
    const { role, board, classLevel, subject, contentTypes } = req.body;
    if (!board || !classLevel || !subject) {
      return res.status(400).json({ error: "Board, classLevel, and subject are required for assignment." });
    }
    const targetUser = await getUserByUid(targetUid);
    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }
    const created = await addStaffAssignmentToDb({
      userUid: targetUid,
      role: role || (targetUser.roles && targetUser.roles.length > 0 ? targetUser.roles[0] : "Teacher"),
      board,
      classLevel,
      subject,
      contentTypes: Array.isArray(contentTypes) ? contentTypes : ["all"]
    });
    await saveAuditLogToDb({
      adminUid: req.user.uid,
      adminEmail: req.user.email || "admin@taleemguru.pk",
      adminName: req.user.name,
      action: "STAFF_ACADEMIC_ASSIGNMENT_ADDED",
      targetType: "staff_assignment",
      targetId: String(created.id),
      details: `Assigned ${targetUser.email} to ${subject} (${classLevel}, ${board})`,
      ipAddress: req.ip
    });
    res.status(201).json({ success: true, assignment: created });
  } catch (error) {
    console.error("Error adding staff assignment:", error);
    res.status(500).json({ error: "Failed to add staff assignment" });
  }
});
apiRouter.delete("/admin/assignments/:id", requireHighAdmin, async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: "Valid assignment ID required." });
    }
    await deleteStaffAssignmentFromDb(assignmentId);
    await saveAuditLogToDb({
      adminUid: req.user.uid,
      adminEmail: req.user.email || "admin@taleemguru.pk",
      adminName: req.user.name,
      action: "STAFF_ACADEMIC_ASSIGNMENT_DELETED",
      targetType: "staff_assignment",
      targetId: String(assignmentId),
      details: `Deleted staff assignment ID ${assignmentId}`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: "Assignment removed." });
  } catch (error) {
    console.error("Error removing staff assignment:", error);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});
apiRouter.get("/admin/roles", requireAdmin, async (req, res) => {
  try {
    const roles = [
      {
        id: "SuperAdmin",
        name: "Super Administrator",
        level: 100,
        description: "Full master access to all system functions, database security, and administrator delegation.",
        permissions: ["all", "manage_admins", "manage_staff", "manage_content", "manage_tests", "view_reports", "view_audit_logs"]
      },
      {
        id: "Admin",
        name: "Administrator",
        level: 90,
        description: "Full administrative access to manage staff users, review test analytics, and audit content.",
        permissions: ["manage_staff", "manage_content", "manage_tests", "view_reports", "view_audit_logs", "system_health"]
      },
      {
        id: "ContentManager",
        name: "Content Manager",
        level: 60,
        description: "Full management over questions, study notes, past papers, test configurations, and syllabus.",
        permissions: ["manage_content", "manage_tests", "view_results", "view_reports"]
      },
      {
        id: "Teacher",
        name: "Teacher / Instructor",
        level: 50,
        description: "Create custom classroom tests, review test analytics, and track student scores.",
        permissions: ["create_tests", "view_results", "view_quizzes"]
      },
      {
        id: "Staff",
        name: "Staff / Operations",
        level: 45,
        description: "Manage institutional operations, content maintenance, and administrative assistance.",
        permissions: ["manage_content", "view_reports", "view_results"]
      },
      {
        id: "Editor",
        name: "Curriculum Editor",
        level: 40,
        description: "Author, edit, and audit MCQs, chapter notes, and past paper answers.",
        permissions: ["edit_mcqs", "edit_notes", "view_reports", "view_results"]
      },
      {
        id: "Moderator",
        name: "Community Moderator",
        level: 30,
        description: "Review student feedback, investigate reported question errors, and monitor audit logs.",
        permissions: ["view_reports", "update_reports", "view_feedback", "view_audit_logs"]
      },
      {
        id: "Student",
        name: "Candidate / Student",
        level: 10,
        description: "Take tests, track personalized performance, bookmark questions, and earn verified certificates.",
        permissions: ["take_tests", "view_profile", "save_bookmarks", "earn_certificates"]
      }
    ];
    res.json({ success: true, roles });
  } catch (error) {
    console.error("Error fetching admin roles:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});
apiRouter.get("/admin/permissions", requireAdmin, async (req, res) => {
  try {
    const userRoles = req.user?.roles || ["Student"];
    const roleLower = userRoles.map((r) => r.toLowerCase());
    const isSuperAdmin = roleLower.includes("superadmin") || roleLower.includes("super_admin") || isTrustedBootstrapAdminEmail(req.user?.email);
    const isAdmin = isSuperAdmin || roleLower.includes("admin") || roleLower.includes("administrator");
    const isContentManager = isAdmin || roleLower.includes("contentmanager") || roleLower.includes("content_manager");
    const isTeacher = isContentManager || roleLower.includes("teacher");
    const isEditor = isContentManager || roleLower.includes("editor");
    const isModerator = isAdmin || roleLower.includes("moderator");
    res.json({
      success: true,
      user: {
        uid: req.user?.uid,
        email: req.user?.email,
        roles: userRoles
      },
      permissions: {
        canManageUsers: isAdmin,
        canManageAdmins: isSuperAdmin,
        canCreateStaff: isAdmin,
        canModifyRoles: isAdmin,
        canManageCurriculum: isContentManager,
        canCreateTests: isTeacher,
        canViewResults: isTeacher || isEditor || isContentManager || isAdmin,
        canModerateReports: isModerator || isEditor || isAdmin,
        canViewAuditLogs: isModerator || isAdmin,
        canViewSystemHealth: isAdmin
      }
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});
apiRouter.get("/admin/comprehensive-stats", requireAdmin, async (req, res) => {
  try {
    const stats = await getComprehensiveStatsFromDb();
    res.json({
      success: true,
      stats,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Admin comprehensive stats error:", error);
    res.status(500).json({ error: "Failed to fetch platform stats" });
  }
});
apiRouter.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const allDbUsers = await getAllUsersFromDb(1e3);
    const totalUsers = allDbUsers.length;
    const adminsCount = allDbUsers.filter(
      (u) => u.roles.some((r) => ["admin", "superadmin", "administrator", "editor", "moderator"].includes(r.toLowerCase().replace(/\s+/g, "_")))
    ).length;
    const studentsCount = allDbUsers.filter((u) => u.roles.some((r) => r.toLowerCase() === "student")).length;
    res.json({
      totalUsers,
      adminsCount,
      studentsCount,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});
apiRouter.get("/admin/results", requireAdmin, async (req, res) => {
  try {
    const roles = (req.user?.roles || []).map((r) => r.toLowerCase().trim());
    if (roles.includes("moderator")) {
      return res.status(403).json({ error: "Forbidden: Community moderators cannot access student test submissions." });
    }
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 150));
    const allResults = await getAllTestResultsFromDb(limit);
    res.json({ results: allResults });
  } catch (error) {
    console.error("Admin test results fetch error:", error);
    res.status(500).json({ error: "Failed to fetch test submissions" });
  }
});
apiRouter.get("/admin/reports", requireAdmin, async (req, res) => {
  try {
    const roles = (req.user?.roles || []).map((r) => r.toLowerCase().trim());
    if (roles.includes("teacher")) {
      return res.status(403).json({ error: "Forbidden: Teachers cannot manage platform content issue reports." });
    }
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 100));
    const reports = await getAllContentReportsFromDb(limit);
    res.json({ reports });
  } catch (error) {
    console.error("Admin reports fetch error:", error);
    res.status(500).json({ error: "Failed to fetch content reports" });
  }
});
apiRouter.patch("/admin/reports/:reportId", requireAdmin, async (req, res) => {
  try {
    const roles = (req.user?.roles || []).map((r) => r.toLowerCase().trim());
    if (roles.includes("teacher")) {
      return res.status(403).json({ error: "Forbidden: Teachers cannot modify platform content issue reports." });
    }
    const reportId = req.params.reportId;
    const { status, adminNotes } = req.body;
    const validStatuses = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }
    const updated = await updateContentReportStatusInDb(
      reportId,
      status,
      adminNotes,
      req.user?.email || "admin@taleemguru.pk"
    );
    if (!updated) {
      return res.status(404).json({ error: "Report not found" });
    }
    await saveAuditLogToDb({
      adminUid: req.user.uid,
      adminEmail: req.user.email || "admin@taleemguru.pk",
      adminName: req.user.name,
      action: "REPORT_STATUS_CHANGED",
      targetType: "report",
      targetId: reportId,
      details: `Status set to ${status}. Notes: ${adminNotes || "None"}`,
      ipAddress: req.ip
    });
    res.json({ success: true, report: updated });
  } catch (error) {
    console.error("Admin update report error:", error);
    res.status(500).json({ error: "Failed to update report" });
  }
});
apiRouter.get("/admin/audit-logs", requireAdmin, async (req, res) => {
  try {
    const roles = (req.user?.roles || []).map((r) => r.toLowerCase().trim());
    if (["teacher", "editor", "contentmanager", "content_manager"].some((r) => roles.includes(r))) {
      return res.status(403).json({ error: "Forbidden: Access to platform audit logs requires administrative or moderation privileges." });
    }
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 100));
    const logs = await getAllAuditLogsFromDb({
      limit,
      adminUid: req.query.staffUid,
      board: req.query.board,
      classLevel: req.query.classLevel,
      subject: req.query.subject
    });
    res.json({ logs });
  } catch (error) {
    console.error("Admin audit logs fetch error:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});
apiRouter.post("/admin/audit-logs", requireAdmin, async (req, res) => {
  try {
    const roles = (req.user?.roles || []).map((r) => r.toLowerCase().trim());
    if (["teacher", "editor", "contentmanager", "content_manager"].some((r) => roles.includes(r))) {
      return res.status(403).json({ error: "Forbidden: Access to record platform audit logs requires administrative or moderation privileges." });
    }
    const { action, targetType, targetId, details, board, classLevel, subject } = req.body;
    if (!action || !targetType) {
      return res.status(400).json({ error: "Action and targetType are required" });
    }
    const logEntry = await saveAuditLogToDb({
      adminUid: req.user.uid,
      adminEmail: req.user.email || "admin@taleemguru.pk",
      adminName: req.user.name,
      action: String(action).slice(0, 100),
      targetType: String(targetType).slice(0, 50),
      targetId: targetId ? String(targetId).slice(0, 100) : void 0,
      details: details ? String(details).slice(0, 1e3) : void 0,
      board: board ? String(board).slice(0, 50) : void 0,
      classLevel: classLevel ? String(classLevel).slice(0, 50) : void 0,
      subject: subject ? String(subject).slice(0, 50) : void 0,
      ipAddress: req.ip
    });
    res.json({ success: true, log: logEntry });
  } catch (error) {
    console.error("Error creating audit log:", error);
    res.status(500).json({ error: "Failed to create audit log" });
  }
});
apiRouter.get("/analytics", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const roles = (user.roles || []).map((r) => r.toLowerCase());
    const isAdmin = roles.includes("admin") || roles.includes("superadmin") || roles.includes("administrator");
    const isTeacher = roles.includes("teacher") || roles.includes("contentmanager") || roles.includes("editor");
    const range = req.query.range || "all";
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const filter = { range, startDate, endDate };
    if (isAdmin) {
      const analytics = await getAdminAnalytics(filter);
      return res.json({ success: true, analytics });
    } else if (isTeacher) {
      const analytics = await getTeacherAnalytics(user.uid, filter);
      return res.json({ success: true, analytics });
    } else {
      const requestedUid = req.query.userUid || user.uid;
      if (requestedUid !== user.uid) {
        return res.status(403).json({ error: "Access denied: Cannot view another student's analytics (IDOR protection)" });
      }
      const analytics = await getStudentAnalytics(user.uid, filter);
      return res.json({ success: true, analytics });
    }
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to retrieve analytics" });
  }
});
apiRouter.get("/notifications", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const notificationsList = await getNotificationsForUser(user.uid);
    const unreadCount = await getUnreadNotificationCount(user.uid);
    res.json({ success: true, notifications: notificationsList, unreadCount });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to retrieve notifications" });
  }
});
apiRouter.post("/notifications/:notificationId/read", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { notificationId } = req.params;
    const updated = await markNotificationRead(notificationId, user.uid);
    res.json({ success: true, notification: updated });
  } catch (error) {
    console.error("Error marking notification read:", error);
    if (error.message.includes("Unauthorized")) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to update notification" });
  }
});
apiRouter.post("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    await markAllNotificationsRead(user.uid);
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications read:", error);
    res.status(500).json({ error: "Failed to update notifications" });
  }
});
apiRouter.post("/notifications/send", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const roles = (user.roles || []).map((r) => r.toLowerCase());
    const isAdmin = roles.includes("admin") || roles.includes("superadmin") || roles.includes("administrator");
    const isTeacher = roles.includes("teacher") || roles.includes("contentmanager") || roles.includes("editor");
    if (!isAdmin && !isTeacher) {
      return res.status(403).json({ error: "Access denied: Only admins and teachers can dispatch notifications" });
    }
    const { recipientUid, title, message, category, actionUrl } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" });
    }
    const notification = await createNotification({
      recipientUid: recipientUid || "ALL",
      title: String(title).slice(0, 200),
      message: String(message).slice(0, 1e3),
      category: category || "Announcement",
      actionUrl: actionUrl ? String(actionUrl).slice(0, 500) : void 0,
      senderUid: user.uid,
      senderName: user.name || user.email
    });
    res.json({ success: true, notification });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});
apiRouter.get("/admin/system-health", requireHighAdmin, async (req, res) => {
  try {
    const hasDb = Boolean(process.env.SQL_HOST && process.env.SQL_DB_NAME);
    const hasSupabase = Boolean(
      (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
    );
    res.json({
      status: "healthy",
      database: {
        type: "PostgreSQL (Cloud SQL)",
        status: hasDb ? "Connected" : "Not configured"
      },
      auth: {
        provider: "Supabase Auth",
        status: hasSupabase ? "Configured" : "Not configured"
      },
      uptime: process.uptime(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      nodeVersion: process.version
    });
  } catch (error) {
    console.error("System health check error:", error);
    res.status(500).json({ error: "Failed to query system health" });
  }
});
apiRouter.get("/admin/integrity-check", requireHighAdmin, async (req, res) => {
  try {
    const report = await runDatabaseIntegrityCheck();
    res.json({ success: true, report });
  } catch (error) {
    console.error("Integrity check error:", error);
    res.status(500).json({ error: "Failed to run database integrity check" });
  }
});
apiRouter.get("/admin/backup-export", requireHighAdmin, async (req, res) => {
  try {
    const exportData = await generateSystemBackupExport();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="taleemguru-backup-${Date.now()}.json"`);
    res.json({ success: true, backup: exportData });
  } catch (error) {
    console.error("Backup export error:", error);
    res.status(500).json({ error: "Failed to generate system backup export" });
  }
});
app.get("/sitemap.xml", async (req, res) => {
  try {
    const xml = await generateDynamicSitemap();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
    res.send(xml);
  } catch (error) {
    console.error("Error generating dynamic sitemap:", error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});
app.get("/robots.txt", (req, res) => {
  try {
    const robots = generateRobotsTxt();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400");
    res.send(robots);
  } catch (error) {
    console.error("Error generating robots.txt:", error);
    res.status(500).send("User-agent: *\nDisallow: /admin\nDisallow: /api/");
  }
});
apiRouter.get("/seo/metadata", async (req, res) => {
  try {
    const meta = await getDynamicSeoMetadata({
      view: req.query.view,
      subFilter: req.query.subFilter,
      testId: req.query.testId,
      paperId: req.query.paperId,
      noteId: req.query.noteId,
      mcqId: req.query.mcqId,
      path: req.query.path
    });
    res.json(meta);
  } catch (error) {
    console.error("Error resolving SEO metadata:", error);
    res.status(500).json({ error: "Failed to resolve SEO metadata" });
  }
});
apiRouter.get("/seo/sitemap", async (req, res) => {
  try {
    const xml = await generateDynamicSitemap();
    res.json({ success: true, sitemapXml: xml });
  } catch (error) {
    console.error("Error generating dynamic sitemap:", error);
    res.status(500).json({ error: "Failed to generate sitemap" });
  }
});
app.use("/api", apiRouter);
app.use(apiRouter);
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found` });
});
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    error: "Internal server error. Please try again later."
  });
});
var serverApp_default = app;

// src/server/migrateDocuments.ts
import fs5 from "fs";
import path4 from "path";
import { eq as eq9 } from "drizzle-orm";
async function migrateExistingDocuments() {
  const summary = {
    pastPapersProcessed: 0,
    pastPapersMigrated: 0,
    pastPapersSkipped: 0,
    studyNotesProcessed: 0,
    studyNotesMigrated: 0,
    studyNotesSkipped: 0,
    errors: []
  };
  if (!db) {
    console.warn("Database not available for document migration");
    return summary;
  }
  try {
    const existingPapers = await db.select().from(pastPapers);
    for (const paper of existingPapers) {
      summary.pastPapersProcessed++;
      try {
        const existingDoc = await getDocumentByIdFromDb(paper.id, true);
        if (existingDoc && existingDoc.brandingStatus === "Completed" && existingDoc.brandedFileHash) {
          summary.pastPapersSkipped++;
          continue;
        }
        const sourcePath = paper.fileUrl || paper.downloadUrl;
        if (!sourcePath) {
          summary.pastPapersSkipped++;
          continue;
        }
        let buffer = null;
        if (sourcePath.startsWith("/")) {
          const resolved = resolveSafeLocalFilePath(sourcePath);
          if (resolved.valid && resolved.absolutePath && fs5.existsSync(resolved.absolutePath)) {
            buffer = fs5.readFileSync(resolved.absolutePath);
          }
        }
        if (!buffer) {
          const possibleOriginal = path4.join(ORIGINALS_DIR, `${paper.id}.pdf`);
          if (fs5.existsSync(possibleOriginal)) {
            buffer = fs5.readFileSync(possibleOriginal);
          }
        }
        if (!buffer) {
          summary.pastPapersSkipped++;
          continue;
        }
        const rawFilename = path4.basename(sourcePath) || `${paper.title || "past_paper"}.pdf`;
        const paperStatus = paper.status === "Draft" || paper.status === "Archived" ? paper.status : "Published";
        const result = await processAndStoreDocument(
          buffer,
          rawFilename,
          {
            title: paper.title,
            documentType: "Past Paper",
            board: paper.board,
            classLevel: paper.classLevel,
            subject: paper.subject,
            year: paper.year,
            language: paper.language || "English",
            status: paperStatus,
            associatedEntityId: paper.id,
            allowDuplicate: true
          }
        );
        if (result.success && result.document) {
          summary.pastPapersMigrated++;
          await db.update(pastPapers).set({
            brandingStatus: "Completed",
            brandingVersion: "2.0",
            brandedFileUrl: `/api/documents/${result.document.id}/download`,
            originalFileHash: result.document.originalFileHash,
            brandedFileHash: result.document.brandedFileHash,
            brandedAt: /* @__PURE__ */ new Date()
          }).where(eq9(pastPapers.id, paper.id));
        } else {
          summary.errors.push({ id: paper.id, type: "past_paper", error: result.error || "Failed" });
        }
      } catch (err) {
        summary.errors.push({ id: paper.id, type: "past_paper", error: err.message });
      }
    }
  } catch (err) {
    console.error("Error during past papers migration:", err);
  }
  try {
    const existingNotes = await db.select().from(studyNotes);
    for (const note of existingNotes) {
      summary.studyNotesProcessed++;
      try {
        const existingDoc = await getDocumentByIdFromDb(note.id, true);
        if (existingDoc && existingDoc.brandingStatus === "Completed" && existingDoc.brandedFileHash) {
          summary.studyNotesSkipped++;
          continue;
        }
        const sourcePath = note.pdfUrl || note.fileUrl;
        if (!sourcePath) {
          summary.studyNotesSkipped++;
          continue;
        }
        let buffer = null;
        if (sourcePath.startsWith("/")) {
          const resolved = resolveSafeLocalFilePath(sourcePath);
          if (resolved.valid && resolved.absolutePath && fs5.existsSync(resolved.absolutePath)) {
            buffer = fs5.readFileSync(resolved.absolutePath);
          }
        }
        if (!buffer) {
          const possibleOriginal = path4.join(ORIGINALS_DIR, `${note.id}.pdf`);
          if (fs5.existsSync(possibleOriginal)) {
            buffer = fs5.readFileSync(possibleOriginal);
          }
        }
        if (!buffer) {
          summary.studyNotesSkipped++;
          continue;
        }
        const rawFilename = path4.basename(sourcePath) || `${note.title || "study_note"}.pdf`;
        const noteStatus = note.status === "Draft" || note.status === "Archived" ? note.status : "Published";
        const result = await processAndStoreDocument(
          buffer,
          rawFilename,
          {
            title: note.title,
            documentType: "Study Note",
            board: note.board || void 0,
            classLevel: note.classLevel,
            subject: note.subject,
            chapter: note.chapter,
            topic: note.topic || void 0,
            language: note.language || "English",
            status: noteStatus,
            associatedEntityId: note.id,
            allowDuplicate: true
          }
        );
        if (result.success && result.document) {
          summary.studyNotesMigrated++;
          await db.update(studyNotes).set({
            brandingStatus: "Completed",
            brandingVersion: "2.0",
            brandedFileUrl: `/api/documents/${result.document.id}/download`,
            originalFileHash: result.document.originalFileHash,
            brandedFileHash: result.document.brandedFileHash,
            brandedAt: /* @__PURE__ */ new Date()
          }).where(eq9(studyNotes.id, note.id));
        } else {
          summary.errors.push({ id: note.id, type: "study_note", error: result.error || "Failed" });
        }
      } catch (err) {
        summary.errors.push({ id: note.id, type: "study_note", error: err.message });
      }
    }
  } catch (err) {
    console.error("Error during study notes migration:", err);
  }
  return summary;
}

// server.ts
if (process.env.VITE_SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}
if (process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}
async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    serverApp_default.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = fs6.existsSync(path5.join(process.cwd(), "dist", "index.html")) ? path5.join(process.cwd(), "dist") : path5.join(process.cwd(), "build");
    serverApp_default.use(express2.static(distPath));
    serverApp_default.get("*", (req, res) => {
      res.sendFile(path5.join(distPath, "index.html"));
    });
  }
  serverApp_default.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    migrateExistingDocuments().then((summary) => {
      console.log(
        `[Document Migration] Finished. Papers migrated: ${summary.pastPapersMigrated} (skipped: ${summary.pastPapersSkipped}), Notes migrated: ${summary.studyNotesMigrated} (skipped: ${summary.studyNotesSkipped})`
      );
    }).catch((err) => {
      console.error("[Document Migration] Error during background migration:", err);
    });
  });
}
if (!process.env.VERCEL) {
  startServer();
}
var server_default = serverApp_default;
export {
  server_default as default
};
//# sourceMappingURL=server.js.map
