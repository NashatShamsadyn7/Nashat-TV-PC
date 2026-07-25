import { useTranslation } from 'react-i18next'
import { currentLanguage, type Language } from './index'

/**
 * Maps our UI language to the `language` parameter TMDB expects.
 *
 * TMDB has no Kurdish catalogue at all — requesting `ku` returns empty
 * overviews and null titles rather than an error, which silently blanks the
 * detail pages. Arabic is the closest catalogue with real coverage for this
 * audience, matching the app's own ku → ar → en fallback chain.
 *
 * This replaces a `i18n.language === 'ku' ? 'ar' : i18n.language` expression
 * that was copy-pasted across Home, Movies, Details and ActorDetail — and
 * omitted entirely in Arabic.tsx and MoviePlayerModal, which hardcoded 'ar'.
 */
const TMDB_LANGUAGE: Record<Language, string> = {
  ar: 'ar',
  ku: 'ar',
  en: 'en-US'
}

/**
 * `region` affects release dates and the /movie/now_playing catalogue, so a
 * user in Germany sees what is actually in cinemas there. TMDB wants an
 * ISO-3166-1 country, which our language tags do not carry.
 */
const TMDB_REGION: Record<Language, string> = {
  ar: 'EG',
  ku: 'IQ',
  en: 'US'
}

/** Non-reactive read — for use inside API defaults and event handlers. */
export function tmdbLanguage(lang: Language = currentLanguage()): string {
  return TMDB_LANGUAGE[lang] ?? 'en-US'
}

export function tmdbRegion(lang: Language = currentLanguage()): string {
  return TMDB_REGION[lang] ?? 'US'
}

/**
 * Reactive read — components using this re-render and refetch when the user
 * switches language, because `useTranslation` subscribes to i18next.
 */
export function useTmdbLanguage(): string {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return TMDB_LANGUAGE[lang as Language] ?? 'en-US'
}

export function useTmdbRegion(): string {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return TMDB_REGION[lang as Language] ?? 'US'
}
