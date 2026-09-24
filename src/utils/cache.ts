/**
 * TaleemGuru High-Performance Safe In-Memory TTL Cache
 * Used exclusively for public reference data (boards, classes, subjects, category metadata)
 * Strict rules:
 * - NEVER cache private user data, tokens, session state, certificates, or role permissions.
 * - NEVER bypass RBAC through caching.
 * - Always respect PostgreSQL as the authoritative source.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SafeMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTtlMs = 60 * 1000; // 60 seconds default TTL for public reference items

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = this.defaultTtlMs): void {
    // Safety check: prevent caching anything containing user tokens, UIDs, or private keys
    if (typeof key === 'string' && (key.includes('user') || key.includes('auth') || key.includes('token') || key.includes('private'))) {
      console.warn('Security Warning: Attempted to cache private or user-specific key in SafeMemoryCache. Rejected.');
      return;
    }
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

export const publicCache = new SafeMemoryCache();
