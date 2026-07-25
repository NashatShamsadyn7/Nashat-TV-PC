import i18n, { currentLanguage, type Language } from './index'

/**
 * Locale-aware formatting helpers.
 *
 * The app previously did all of this by hand — string concatenation for dates,
 * bare `.toFixed()` for ratings, manual "س/د" suffixes for runtimes. That reads
 * correctly only in Arabic and produces Western digits, Gregorian month names
 * and Arabic unit labels no matter which language is active.
 *
 * `Intl` is built into Chromium, so none of this adds bundle weight.
 */

/**
 * BCP-47 tags for `Intl`. The bare language subtags we use internally are valid
 * but under-specified; pinning a region gives stable output instead of letting
 * the runtime pick a default that varies by machine.
 *
 * The `-u-nu-latn` extension forces Latin digits. Without it `ar-EG` renders
 * ١٬٢٣٤٬٥٦٧ and `ckb-IQ` does the same, which would clash with the parts of the
 * UI that cannot be localized — timecodes, version numbers, stream qualities —
 * leaving two different digit systems on screen at once.
 */
const INTL_LOCALES: Record<Language, string> = {
  ar: 'ar-EG-u-nu-latn',
  ku: 'ckb-IQ-u-nu-latn',
  en: 'en-US'
}

/**
 * Languages where ICU reports support but only carries root data, so output
 * degrades to untranslated stubs ("-3 d", "2 h"). Verified against this
 * Chromium's ICU: `RelativeTimeFormat.supportedLocalesOf(['ckb-IQ'])` returns
 * the locale, so passing a fallback array does not help — these have to be
 * formatted from our own translation keys instead.
 */
const ICU_INCOMPLETE: readonly Language[] = ['ku']

export function intlLocale(lang: Language = currentLanguage()): string {
  return INTL_LOCALES[lang] ?? 'en-US'
}

// Intl constructors are comparatively expensive; reuse them per locale+shape.
const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>()

function memo<T extends Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>(
  key: string,
  make: () => T
): T {
  const hit = cache.get(key)
  if (hit) return hit as T
  const made = make()
  cache.set(key, made)
  return made
}

/** Plain integer/decimal number: 1234567 → "1,234,567". */
export function formatNumber(value: number, lang: Language = currentLanguage()): string {
  if (!Number.isFinite(value)) return '—'
  const loc = intlLocale(lang)
  return memo(`n:${loc}`, () => new Intl.NumberFormat(loc)).format(value)
}

/** Compact number for vote counts and view counts: 12345 → "12K". */
export function formatCompact(value: number, lang: Language = currentLanguage()): string {
  if (!Number.isFinite(value)) return '—'
  const loc = intlLocale(lang)
  return memo(
    `c:${loc}`,
    () => new Intl.NumberFormat(loc, { notation: 'compact', maximumFractionDigits: 1 })
  ).format(value)
}

/** TMDB rating, always one decimal place: 7.8 → "7.8" / "٧٫٨". */
export function formatRating(value: number, lang: Language = currentLanguage()): string {
  if (!Number.isFinite(value)) return '—'
  const loc = intlLocale(lang)
  return memo(
    `r:${loc}`,
    () =>
      new Intl.NumberFormat(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  ).format(value)
}

/** Percentage from a 0–1 ratio: 0.734 → "73%". */
export function formatPercent(ratio: number, lang: Language = currentLanguage()): string {
  if (!Number.isFinite(ratio)) return '—'
  const loc = intlLocale(lang)
  return memo(
    `p:${loc}`,
    () => new Intl.NumberFormat(loc, { style: 'percent', maximumFractionDigits: 0 })
  ).format(ratio)
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Full date: "12 March 2024" / "١٢ مارس ٢٠٢٤". */
export function formatDate(
  value: string | number | Date | null | undefined,
  lang: Language = currentLanguage()
): string {
  const d = toDate(value)
  if (!d) return '—'
  const loc = intlLocale(lang)
  return memo(
    `d:${loc}`,
    () => new Intl.DateTimeFormat(loc, { year: 'numeric', month: 'long', day: 'numeric' })
  ).format(d)
}

/** Date + time, for chat messages and watch history. */
export function formatDateTime(
  value: string | number | Date | null | undefined,
  lang: Language = currentLanguage()
): string {
  const d = toDate(value)
  if (!d) return '—'
  const loc = intlLocale(lang)
  return memo(
    `dt:${loc}`,
    () =>
      new Intl.DateTimeFormat(loc, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
  ).format(d)
}

/** Clock time only — EPG rows, chat timestamps. */
export function formatTime(
  value: string | number | Date | null | undefined,
  lang: Language = currentLanguage()
): string {
  const d = toDate(value)
  if (!d) return '—'
  const loc = intlLocale(lang)
  return memo(
    `t:${loc}`,
    () => new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit' })
  ).format(d)
}

/** Release year alone: "2024". */
export function formatYear(
  value: string | number | Date | null | undefined,
  lang: Language = currentLanguage()
): string {
  const d = toDate(value)
  if (!d) return '—'
  const loc = intlLocale(lang)
  return memo(`y:${loc}`, () => new Intl.DateTimeFormat(loc, { year: 'numeric' })).format(d)
}

const MINUTE = 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24
const WEEK = DAY * 7
const MONTH = DAY * 30
const YEAR = DAY * 365

/**
 * "3 days ago" / "in 2 hours", localized and correctly pluralized.
 * Replaces hand-rolled Arabic-only relative strings.
 */
export function formatRelative(
  value: string | number | Date | null | undefined,
  lang: Language = currentLanguage()
): string {
  const d = toDate(value)
  if (!d) return '—'

  const deltaSec = Math.round((d.getTime() - Date.now()) / 1000)
  const abs = Math.abs(deltaSec)

  const [unit, perUnit]: [Intl.RelativeTimeFormatUnit, number] =
    abs < MINUTE ? ['second', 1]
    : abs < HOUR ? ['minute', MINUTE]
    : abs < DAY ? ['hour', HOUR]
    : abs < WEEK ? ['day', DAY]
    : abs < MONTH ? ['week', WEEK]
    : abs < YEAR ? ['month', MONTH]
    : ['year', YEAR]

  const amount = Math.round(deltaSec / perUnit)

  if (ICU_INCOMPLETE.includes(lang)) {
    return i18n.t(amount < 0 ? 'format.relative.past' : 'format.relative.future', {
      value: formatNumber(Math.abs(amount), lang),
      unit: i18n.t(`format.unit.${unit}`),
      lng: lang
    })
  }

  const loc = intlLocale(lang)
  const rtf = memo(
    `rel:${loc}`,
    () => new Intl.RelativeTimeFormat(loc, { numeric: 'auto' })
  ) as Intl.RelativeTimeFormat
  return rtf.format(amount, unit)
}

/**
 * Runtime in minutes → localized duration, e.g. "2h 14m" / "٢ س ١٤ د".
 *
 * `Intl.DurationFormat` is not yet available in this Chromium, so the unit
 * labels come from `Intl.NumberFormat` with `style: 'unit'` — which gives
 * properly localized abbreviations instead of hardcoded "س"/"د".
 */
export function formatRuntime(
  minutes: number | null | undefined,
  lang: Language = currentLanguage()
): string {
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)

  if (ICU_INCOMPLETE.includes(lang)) {
    const parts: string[] = []
    if (h > 0) parts.push(`${formatNumber(h, lang)} ${i18n.t('format.unit.hour', { lng: lang })}`)
    if (m > 0) parts.push(`${formatNumber(m, lang)} ${i18n.t('format.unit.minute', { lng: lang })}`)
    return parts.join(' ')
  }

  const loc = intlLocale(lang)
  const hourFmt = memo(
    `uh:${loc}`,
    () => new Intl.NumberFormat(loc, { style: 'unit', unit: 'hour', unitDisplay: 'short' })
  )
  const minFmt = memo(
    `um:${loc}`,
    () => new Intl.NumberFormat(loc, { style: 'unit', unit: 'minute', unitDisplay: 'short' })
  )

  if (h === 0) return minFmt.format(m)
  if (m === 0) return hourFmt.format(h)
  return `${hourFmt.format(h)} ${minFmt.format(m)}`
}

/**
 * Player position/duration → "1:23:45" or "4:07".
 * Deliberately NOT localized: timecodes are conventionally colon-separated
 * Western digits in every locale's video UI, and aligning them matters more
 * than translating them.
 */
export function formatTimecode(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00'
  const s = Math.floor(totalSeconds % 60)
  const m = Math.floor((totalSeconds / 60) % 60)
  const h = Math.floor(totalSeconds / 3600)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Byte size for downloads/update progress: 1536 → "1.5 kB". */
export function formatBytes(bytes: number, lang: Language = currentLanguage()): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const
  let value = bytes
  let unitIdx = 0
  while (value >= 1024 && unitIdx < units.length - 1) {
    value /= 1024
    unitIdx++
  }
  const loc = intlLocale(lang)
  return memo(
    `b:${loc}:${units[unitIdx]}`,
    () =>
      new Intl.NumberFormat(loc, {
        style: 'unit',
        unit: units[unitIdx],
        unitDisplay: 'short',
        maximumFractionDigits: unitIdx === 0 ? 0 : 1
      })
  ).format(value)
}

/** Join a list with locale-correct conjunctions: "A, B and C" / "أ وب وج". */
export function formatList(items: string[], lang: Language = currentLanguage()): string {
  if (items.length === 0) return ''
  const loc = intlLocale(lang)
  return new Intl.ListFormat(loc, { style: 'long', type: 'conjunction' }).format(items)
}
