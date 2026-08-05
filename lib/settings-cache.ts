/**
 * lib/settings-cache.ts
 * Enterprise Upgrade — Phase 7: Caching Strategy
 *
 * In-memory TTL cache for platform settings.
 * Prevents hot-loop SQL queries on every matching run.
 *
 * The matching engine previously called `getNumericSettings()` on every
 * individual lead match calculation, which resulted in redundant DB reads
 * (especially during batch radius-expansion runs across 50+ leads).
 *
 * This module provides a cached wrapper with a 10-minute TTL that is
 * automatically invalidated whenever an admin updates platform settings.
 */

import {
  getNumericSettings,
  PLATFORM_SETTING_DEFAULTS,
  type PlatformSettingKey,
} from "@/lib/platform-settings";

export type { PlatformSettingKey };

// ── In-Memory Cache Store ────────────────────────────────────────────────────

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

const SETTINGS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SETTINGS_CACHE_KEY = "platform_settings_all";

// ── Cached Settings Accessors ─────────────────────────────────────────────────

/**
 * Returns ALL platform setting defaults merged with DB overrides.
 * Result is cached in Node.js process memory for 10 minutes.
 *
 * Call `invalidateSettingsCache()` after admin updates to force refresh.
 */
export async function getCachedSettings(): Promise<
  Record<PlatformSettingKey, number>
> {
  const cached = cache.get(SETTINGS_CACHE_KEY) as
    | CacheEntry<Record<PlatformSettingKey, number>>
    | undefined;

  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  // Cache miss — fetch from DB
  const allKeys = Object.keys(
    PLATFORM_SETTING_DEFAULTS
  ) as PlatformSettingKey[];
  const settings = await getNumericSettings(allKeys);

  cache.set(SETTINGS_CACHE_KEY, {
    value: settings,
    expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS,
  });

  return settings;
}

/**
 * Returns a single cached setting value by key.
 */
export async function getCachedSetting(
  key: PlatformSettingKey
): Promise<number> {
  const settings = await getCachedSettings();
  return settings[key];
}

/**
 * Invalidates the settings cache immediately.
 * Call this inside `updatePlatformSettingAction` after admin saves changes.
 */
export function invalidateSettingsCache(): void {
  cache.delete(SETTINGS_CACHE_KEY);
  console.info("[settings-cache] Cache invalidated.");
}

/**
 * Returns cache status for health checks.
 */
export function getSettingsCacheStatus(): {
  cached: boolean;
  expiresInMs: number | null;
} {
  const entry = cache.get(SETTINGS_CACHE_KEY);
  if (!entry) return { cached: false, expiresInMs: null };
  return {
    cached: true,
    expiresInMs: Math.max(0, entry.expiresAt - Date.now()),
  };
}
