import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ar from './locales/ar.json'
import ku from './locales/ku.json'
import en from './locales/en.json'

export const SUPPORTED_LANGUAGES = ['ar', 'ku', 'en'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const RTL_LANGUAGES: Language[] = ['ar', 'ku']

export const isRtl = (lang: Language): boolean => RTL_LANGUAGES.includes(lang)

/** Endonyms — a language picker should always name each language in itself. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  ar: 'العربية',
  ku: 'کوردی',
  en: 'English'
}

const STORAGE_KEY = 'nashat.lang'

function isSupported(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

/**
 * Match a BCP-47 tag reported by the OS against our supported set. Compares the
 * base subtag, so 'en-US', 'en-GB' and 'en' all resolve to 'en'. Kurdish shows
 * up under several tags depending on platform and script: ckb = Central
 * Kurdish (Sorani), kmr = Northern Kurdish (Kurmanji).
 */
function matchTag(tag: string): Language | null {
  const base = tag.toLowerCase().split('-')[0]
  if (base === 'ckb' || base === 'kmr') return 'ku'
  return isSupported(base) ? base : null
}

/**
 * Resolution order: saved choice → OS languages → English.
 *
 * This previously returned 'ar' unconditionally, so every first launch opened
 * in Arabic no matter what locale the machine was set to. English is the right
 * final fallback because it matches `fallbackLng` — landing a user in a UI
 * whose strings resolve and whose direction is LTR beats guessing Arabic.
 */
function detectInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && isSupported(stored)) return stored
  } catch {
    /* localStorage blocked — fall through to OS detection */
  }

  const candidates: string[] =
    typeof navigator !== 'undefined'
      ? [...(navigator.languages ?? []), navigator.language].filter(Boolean)
      : []

  for (const tag of candidates) {
    const match = matchTag(tag)
    if (match) return match
  }

  return 'en'
}

/** Keep <html lang>/<html dir> in sync — CSS logical properties depend on dir. */
function applyDocumentLanguage(lang: Language): void {
  document.documentElement.lang = lang
  document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr'
}

const initial = detectInitialLanguage()

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    ku: { translation: ku },
    en: { translation: en }
  },
  lng: initial,
  // Kurdish coverage still trails the other two; try Arabic before English
  // since that audience overlaps far more than the English one does.
  fallbackLng: { ku: ['ar', 'en'], default: ['en'] },
  interpolation: { escapeValue: false },
  // Treat an empty string in a locale file as "not translated yet" so it falls
  // back instead of rendering a blank label.
  returnEmptyString: false
})

applyDocumentLanguage(initial)

export function changeLanguage(lang: Language): void {
  i18n.changeLanguage(lang)
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* non-fatal: the choice just won't survive a restart */
  }
  applyDocumentLanguage(lang)
}

/** Current language, always narrowed to one we actually ship. */
export function currentLanguage(): Language {
  const lang = i18n.language
  return lang && isSupported(lang) ? lang : 'en'
}

export default i18n
