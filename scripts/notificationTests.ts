import {
  createNotification,
  getNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
} from '../src/db/notifications.ts';
import { db } from '../src/db/index.ts';
import { auditLogs, users } from '../src/db/schema.ts';
import { eq, or, like } from 'drizzle-orm';

async function runNotificationTestSuite() {
  console.log('==================================================');
  console.log('  TALEEMGURU PROFESSIONAL NOTIFICATIONS TEST SUITE');
  console.log('==================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  const suffix = Date.now();
  const userA = `user-a-${suffix}`;
  const userB = `user-b-${suffix}`;

  try {
    // Cleanup any prior left-overs
    await db.delete(auditLogs).where(or(like(auditLogs.adminUid, '%user-a-%'), like(auditLogs.adminUid, '%user-b-%')));

    // 0. Setup test users
    await db.insert(users).values({
      uid: userA,
      email: 'user-a-notif@taleemguru.pk',
      name: 'User A',
      roles: ['Student'],
    }).onConflictDoNothing();

    await db.insert(users).values({
      uid: userB,
      email: 'user-b-notif@taleemguru.pk',
      name: 'User B',
      roles: ['Student'],
    }).onConflictDoNothing();

    // TEST 1: Empty state handling for new user
    const emptyUser = `empty-user-${Date.now()}-${Math.random()}`;
    const initialListEmpty = await getNotificationsForUser(emptyUser);
    const privateForEmpty = initialListEmpty.filter(n => n.recipientUid === emptyUser);
    assert(
      Array.isArray(initialListEmpty) && privateForEmpty.length === 0,
      'Test 1: Empty state handling returns 0 private notifications cleanly'
    );

    // TEST 2: Notification creation & targeted delivery
    const notif1 = await createNotification({
      recipientUid: userA,
      title: 'Exam Result Published',
      message: 'Your Physics test result is ready.',
      category: 'Result',
    });
    assert(
      notif1 && notif1.recipientUid === userA && notif1.isRead === false,
      'Test 2: Notification created successfully with unread status'
    );

    // TEST 3: Recipient isolation (User B should not see User A's private notification)
    const listB = await getNotificationsForUser(userB);
    assert(
      listB.filter(n => n.recipientUid === userA).length === 0,
      'Test 3: Recipient isolation - User B cannot view User A private notifications'
    );

    // TEST 4: Broadcast notification ('ALL') is received by both User A and User B
    await createNotification({
      recipientUid: 'ALL',
      title: 'System Maintenance Notice',
      message: 'Platform scheduled for brief update tonight.',
      category: 'Announcement',
    });

    const listAAfterBroadcast = await getNotificationsForUser(userA);
    const listBAfterBroadcast = await getNotificationsForUser(userB);
    assert(
      listAAfterBroadcast.length >= 2 && listBAfterBroadcast.length >= 1,
      'Test 4: Broadcast notification (recipientUid = ALL) is visible to all users'
    );

    // TEST 5: Duplicate prevention
    const duplicateNotif = await createNotification({
      recipientUid: userA,
      title: 'Exam Result Published',
      message: 'Your Physics test result is ready.',
      category: 'Result',
    });
    assert(
      duplicateNotif.notificationId === notif1.notificationId,
      'Test 5: Duplicate prevention successfully deduplicates identical rapid notifications'
    );

    // TEST 6: Mark single notification read & unread count update
    const unreadBefore = await getUnreadNotificationCount(userA);
    await markNotificationRead(notif1.notificationId, userA);
    const unreadAfter = await getUnreadNotificationCount(userA);
    assert(
      unreadBefore > unreadAfter,
      'Test 6: Marking single notification read decrements unread count accurately'
    );

    // TEST 7: IDOR Protection on mark read (User B cannot mark User A private notification read)
    let idorCaught = false;
    try {
      await markNotificationRead(notif1.notificationId, userB);
    } catch {
      idorCaught = true;
    }
    assert(
      idorCaught,
      'Test 7: IDOR Protection blocks User B from modifying User A private notification'
    );

    // TEST 8: Mark all notifications read
    await markAllNotificationsRead(userA);
    const finalUnreadA = await getUnreadNotificationCount(userA);
    assert(
      finalUnreadA === 0,
      'Test 8: Mark all notifications read sets all items to read and unread count to 0'
    );

  } catch (error: any) {
    console.error('Unexpected error during notification tests:', error);
    assert(false, `Unexpected notification test failure: ${error.message}`);
  } finally {
    // Cleanup
    try {
      await db.delete(auditLogs).where(or(like(auditLogs.adminUid, '%user-a-%'), like(auditLogs.adminUid, '%user-b-%'), like(auditLogs.adminUid, '%empty-user-%')));
      await db.delete(users).where(or(like(users.uid, '%user-a-%'), like(users.uid, '%user-b-%')));
    } catch {}
  }

  console.log('==================================================');
  console.log(`NOTIFICATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runNotificationTestSuite();
