import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ar from './locales/ar.json'
import ku from './locales/ku.json'
import en from './locales/en.json'

export const SUPPORTED_LANGUAGES = ['ar', 'ku', 'en'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const RTL_LANGUAGES: Language[] = ['ar', 'ku']

export const isRtl = (lang: Language): boolean => RTL_LANGUAGES.includes(lang)

const STORAGE_KEY = 'nashat.lang'

function detectInitialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
    return stored as Language
  }
  return 'ar'
}

const initial = detectInitialLanguage()

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    ku: { translation: ku },
    en: { translation: en }
  },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

document.documentElement.lang = initial
document.documentElement.dir = isRtl(initial) ? 'rtl' : 'ltr'

export function changeLanguage(lang: Language): void {
  i18n.changeLanguage(lang)
  localStorage.setItem(STORAGE_KEY, lang)
  document.documentElement.lang = lang
  document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr'
}

export default i18n
