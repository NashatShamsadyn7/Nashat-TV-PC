import type { TFunction } from 'i18next'

/**
 * Channel categories arrive from RTDB as raw English strings ("Kurdish",
 * "Kids", …). They cannot be translated at the source: the same
 * `/live_tv_channels` list is read by the Android client, and rewriting the
 * stored values would break it. So the mapping lives here instead.
 *
 * Matching is case-insensitive because the database is hand-edited. Anything
 * not in this table falls back to the raw value, so a category added later
 * still renders — untranslated, but never blank.
 */
const CATEGORY_KEYS: Record<string, string> = {
  kids: 'kids',
  kurdish: 'kurdish',
  music: 'music',
  religious: 'religious',
  sports: 'sports',
  uncategorized: 'uncategorized'
}

export function categoryLabel(t: TFunction, raw: string | undefined | null): string {
  const value = (raw ?? '').trim()
  if (!value) return ''
  const key = CATEGORY_KEYS[value.toLowerCase()]
  return key ? t(`livetv.categories.${key}`) : value
}
