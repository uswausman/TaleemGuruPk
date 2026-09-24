import { db } from './index.ts';
import { auditLogs } from './schema.ts';
import { eq, or, and, desc, count, sql } from 'drizzle-orm';

export interface CreateNotificationParams {
  recipientUid: string; // 'ALL' or specific user UID
  title: string;
  message: string;
  category?: string;
  actionUrl?: string;
  senderUid?: string;
  senderName?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  // Prevent duplicate notification if identical title/message sent to same recipient in last 30 seconds
  const thirtySecondsAgo = new Date(Date.now() - 30000);
  const recent = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.targetType, 'NOTIFICATION'),
        eq(auditLogs.adminUid, params.recipientUid),
        eq(auditLogs.action, params.title),
        eq(auditLogs.details, params.message),
        sql`${auditLogs.createdAt} >= ${thirtySecondsAgo}`
      )
    );

  if (recent.length > 0) {
    const r = recent[0];
    return {
      notificationId: r.targetId || `notif-${r.id}`,
      recipientUid: r.adminUid,
      title: r.action,
      message: r.details || '',
      category: r.subject || 'System',
      isRead: r.classLevel === 'READ',
      actionUrl: r.board,
      senderUid: r.ipAddress,
      senderName: r.adminName,
      createdAt: r.createdAt,
    };
  }

  const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const [inserted] = await db
    .insert(auditLogs)
    .values({
      adminUid: params.recipientUid,
      adminEmail: 'system@taleemguru.pk',
      adminName: params.senderName || 'System',
      action: params.title,
      targetType: 'NOTIFICATION',
      targetId: notificationId,
      details: params.message,
      board: params.actionUrl || '',
      classLevel: 'UNREAD',
      subject: params.category || 'System',
      ipAddress: params.senderUid || 'system',
    })
    .returning();

  return {
    notificationId: inserted.targetId || notificationId,
    recipientUid: inserted.adminUid,
    title: inserted.action,
    message: inserted.details || '',
    category: inserted.subject || 'System',
    isRead: false,
    actionUrl: inserted.board,
    senderUid: inserted.ipAddress,
    senderName: inserted.adminName,
    createdAt: inserted.createdAt,
  };
}

export async function getNotificationsForUser(userUid: string) {
  const rows = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.targetType, 'NOTIFICATION'),
        or(eq(auditLogs.adminUid, userUid), eq(auditLogs.adminUid, 'ALL'))
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);

  return rows.map((r) => ({
    notificationId: r.targetId || `notif-${r.id}`,
    recipientUid: r.adminUid,
    title: r.action,
    message: r.details || '',
    category: r.subject || 'System',
    isRead: r.classLevel === 'READ',
    actionUrl: r.board,
    senderUid: r.ipAddress,
    senderName: r.adminName,
    createdAt: r.createdAt,
  }));
}

export async function markNotificationRead(notificationId: string, userUid: string) {
  const rows = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.targetType, 'NOTIFICATION'),
        eq(auditLogs.targetId, notificationId)
      )
    );

  if (rows.length === 0) {
    throw new Error('Notification not found');
  }

  const target = rows[0];
  if (target.adminUid !== userUid && target.adminUid !== 'ALL') {
    throw new Error('Unauthorized: Cannot modify notification for another user');
  }

  const [updated] = await db
    .update(auditLogs)
    .set({ classLevel: 'READ' })
    .where(eq(auditLogs.id, target.id))
    .returning();

  return {
    notificationId: updated.targetId || notificationId,
    recipientUid: updated.adminUid,
    title: updated.action,
    message: updated.details || '',
    category: updated.subject || 'System',
    isRead: true,
    actionUrl: updated.board,
    senderUid: updated.ipAddress,
    senderName: updated.adminName,
    createdAt: updated.createdAt,
  };
}

export async function markAllNotificationsRead(userUid: string) {
  await db
    .update(auditLogs)
    .set({ classLevel: 'READ' })
    .where(
      and(
        eq(auditLogs.targetType, 'NOTIFICATION'),
        or(eq(auditLogs.adminUid, userUid), eq(auditLogs.adminUid, 'ALL'))
      )
    );

  return { success: true };
}

export async function getUnreadNotificationCount(userUid: string) {
  const rows = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.targetType, 'NOTIFICATION'),
        or(eq(auditLogs.adminUid, userUid), eq(auditLogs.adminUid, 'ALL')),
        eq(auditLogs.classLevel, 'UNREAD')
      )
    );

  return Number(rows[0]?.count || 0);
}
