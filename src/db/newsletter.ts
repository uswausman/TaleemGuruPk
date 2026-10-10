import { db } from './index.ts';
import { newsletterSubscribers, newsletterCampaigns, newsletterLogs } from './schema.ts';
import { eq, and } from 'drizzle-orm';

// Subscriber Management
export async function addSubscriber(email: string) {
  try {
    return await db.insert(newsletterSubscribers).values({ email }).returning();
  } catch (error: any) {
    if (error.code === '23505') return null; // Unique constraint violation
    throw error;
  }
}

export async function getSubscribers() {
  return await db.select().from(newsletterSubscribers).orderBy(newsletterSubscribers.subscribedAt);
}

export async function updateSubscriberStatus(id: number, status: 'active' | 'inactive') {
  return await db.update(newsletterSubscribers).set({ status, updatedAt: new Date() }).where(eq(newsletterSubscribers.id, id));
}

export async function removeSubscriber(id: number) {
  return await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id));
}

// Campaign Management
export async function createCampaign(data: any) {
  return await db.insert(newsletterCampaigns).values(data).returning();
}

export async function getCampaigns() {
  return await db.select().from(newsletterCampaigns).orderBy(newsletterCampaigns.createdAt);
}

// Sending Logic
export async function logNewsletterAttempt(data: any) {
  return await db.insert(newsletterLogs).values(data);
}
