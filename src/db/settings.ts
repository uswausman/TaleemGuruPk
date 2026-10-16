import { sql, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { siteSettings } from './schema.ts';
import { type SiteSettingItem, DEFAULT_SITE_SETTINGS } from '../data/defaultSettings.ts';

export type { SiteSettingItem };
export { DEFAULT_SITE_SETTINGS };

let isTableVerified = false;

function coerceSettingValue(val: unknown): string | null {
  if (val === null || val === undefined) {
    return null;
  }
  if (typeof val === 'string') {
    return val;
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (typeof val === 'object') {
    try {
      const serialized = JSON.stringify(val);
      return typeof serialized === 'string' ? serialized : null;
    } catch {
      return null;
    }
  }
  return String(val);
}

export async function ensureSettingsTableExists() {
  if (isTableVerified) return;
  try {
    await db.select({ key: siteSettings.key }).from(siteSettings).limit(1);
    isTableVerified = true;
  } catch (error) {
    // Graceful fallback to default configuration if database is unreachable
    isTableVerified = false;
  }
}

/**
 * Fetch all settings from PostgreSQL, merged over DEFAULT_SITE_SETTINGS
 */
export async function getAllSettingsFromDb(): Promise<Record<string, string>> {
  await ensureSettingsTableExists();
  const settingsMap: Record<string, string> = {};

  // Populate default fallback values
  Object.entries(DEFAULT_SITE_SETTINGS).forEach(([k, def]) => {
    settingsMap[k] = def.value;
  });

  try {
    const rows = await db.select().from(siteSettings);
    if (Array.isArray(rows)) {
      rows.forEach((row) => {
        const coerced = coerceSettingValue(row.value);
        if (row.key && coerced !== null) {
          settingsMap[row.key] = coerced;
        }
      });
    }
  } catch (error) {
    console.warn('Notice: Unable to query site_settings table directly, using defaults:', error);
  }

  // Authoritative Single Source of Truth for Platform / Website Name
  const authoritativeName =
    settingsMap['site_name'] ||
    settingsMap['general.websiteName'] ||
    settingsMap['branding.siteName'] ||
    DEFAULT_SITE_SETTINGS['branding.siteName']?.value ||
    'Taleem Guru';
  settingsMap['general.websiteName'] = authoritativeName;
  settingsMap['branding.siteName'] = authoritativeName;
  settingsMap['site_name'] = authoritativeName;

  const authoritativePrimaryColor =
    settingsMap['site_name_primary_color'] ||
    settingsMap['branding.siteNamePrimaryColor'] ||
    DEFAULT_SITE_SETTINGS['branding.siteNamePrimaryColor']?.value ||
    '#FFFFFF';
  settingsMap['branding.siteNamePrimaryColor'] = authoritativePrimaryColor;
  settingsMap['site_name_primary_color'] = authoritativePrimaryColor;

  const authoritativeSecondaryColor =
    settingsMap['site_name_secondary_color'] ||
    settingsMap['branding.siteNameSecondaryColor'] ||
    DEFAULT_SITE_SETTINGS['branding.siteNameSecondaryColor']?.value ||
    '#3B82F6';
  settingsMap['branding.siteNameSecondaryColor'] = authoritativeSecondaryColor;
  settingsMap['site_name_secondary_color'] = authoritativeSecondaryColor;

  return settingsMap;
}

/**
 * Fetch public settings only for public client consumption
 */
export async function getPublicSettingsFromDb(): Promise<Record<string, string>> {
  await ensureSettingsTableExists();
  const publicMap: Record<string, string> = {};

  // Populate default fallback values marked public
  Object.entries(DEFAULT_SITE_SETTINGS).forEach(([k, def]) => {
    if (def.isPublic) {
      publicMap[k] = def.value;
    }
  });

  try {
    const rows = await db.select().from(siteSettings).where(eq(siteSettings.isPublic, true));
    if (Array.isArray(rows)) {
      rows.forEach((row) => {
        const coerced = coerceSettingValue(row.value);
        if (row.key && coerced !== null) {
          publicMap[row.key] = coerced;
        }
      });
    }
  } catch (error) {
    console.warn('Notice: Unable to query public site_settings table, using defaults:', error);
  }

  // Authoritative Single Source of Truth for Platform / Website Name
  const authoritativeName =
    publicMap['site_name'] ||
    publicMap['general.websiteName'] ||
    publicMap['branding.siteName'] ||
    DEFAULT_SITE_SETTINGS['branding.siteName']?.value ||
    'Taleem Guru';
  publicMap['general.websiteName'] = authoritativeName;
  publicMap['branding.siteName'] = authoritativeName;
  publicMap['site_name'] = authoritativeName;

  const authoritativePrimaryColor =
    publicMap['site_name_primary_color'] ||
    publicMap['branding.siteNamePrimaryColor'] ||
    DEFAULT_SITE_SETTINGS['branding.siteNamePrimaryColor']?.value ||
    '#FFFFFF';
  publicMap['branding.siteNamePrimaryColor'] = authoritativePrimaryColor;
  publicMap['site_name_primary_color'] = authoritativePrimaryColor;

  const authoritativeSecondaryColor =
    publicMap['site_name_secondary_color'] ||
    publicMap['branding.siteNameSecondaryColor'] ||
    DEFAULT_SITE_SETTINGS['branding.siteNameSecondaryColor']?.value ||
    '#3B82F6';
  publicMap['branding.siteNameSecondaryColor'] = authoritativeSecondaryColor;
  publicMap['site_name_secondary_color'] = authoritativeSecondaryColor;

  return publicMap;
}

/**
 * Bulk insert or update settings in PostgreSQL database
 */
export async function updateSettingsInDb(
  updates: Record<string, string>,
  updatedBy: string = 'admin@taleemguru.pk'
): Promise<{ success: boolean; count: number; error?: string }> {
  await ensureSettingsTableExists();
  let updatedCount = 0;

  // Single Source of Truth Synchronization
  const finalUpdates: Record<string, string> = { ...updates };

  const nameVal =
    finalUpdates['site_name'] ||
    finalUpdates['branding.siteName'] ||
    finalUpdates['general.websiteName'];
  if (nameVal) {
    finalUpdates['site_name'] = nameVal;
    finalUpdates['branding.siteName'] = nameVal;
    finalUpdates['general.websiteName'] = nameVal;
  }

  const primaryColorVal =
    finalUpdates['site_name_primary_color'] ||
    finalUpdates['branding.siteNamePrimaryColor'];
  if (primaryColorVal) {
    finalUpdates['site_name_primary_color'] = primaryColorVal;
    finalUpdates['branding.siteNamePrimaryColor'] = primaryColorVal;
  }

  const secondaryColorVal =
    finalUpdates['site_name_secondary_color'] ||
    finalUpdates['branding.siteNameSecondaryColor'];
  if (secondaryColorVal) {
    finalUpdates['site_name_secondary_color'] = secondaryColorVal;
    finalUpdates['branding.siteNameSecondaryColor'] = secondaryColorVal;
  }

  try {
    for (const [key, rawValue] of Object.entries(finalUpdates)) {
      const valStr = rawValue !== null && rawValue !== undefined ? String(rawValue) : '';
      const def = DEFAULT_SITE_SETTINGS[key];
      const isPublic = def ? def.isPublic : true;

      try {
        await db.execute(sql`
          INSERT INTO site_settings (key, value, is_public, updated_by, updated_at)
          VALUES (${key}, to_jsonb(${valStr}::text), ${isPublic}, ${updatedBy}, NOW())
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            is_public = EXCLUDED.is_public,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW();
        `);
        updatedCount++;
      } catch (rowErr) {
        console.warn(`Notice updating setting key [${key}]:`, rowErr);
      }
    }

    return { success: true, count: updatedCount };
  } catch (error: any) {
    console.error('Error updating site settings in DB:', error);
    return { success: false, count: updatedCount, error: error.message || 'Failed to update settings' };
  }
}
