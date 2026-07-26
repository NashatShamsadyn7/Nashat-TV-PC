import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Tv,
  Film,
  PartyPopper,
  LayoutGrid,
  Baby,
  Headphones,
  History,
  MessageCircle,
  Globe,
  Github,
  Share2,
  Check,
  Languages,
  type LucideIcon
} from 'lucide-react'
import logoFull from '@/assets/logo-full.png'
import { useUpdater } from '@/hooks/useUpdater'

const SITE_URL = 'https://nashat-tv.web.app'
const REPO_URL = 'https://github.com/NashatShamsadyn7/Nashat-TV-PC'
// Same developer credit the Android app carries in its own About screen.
const DEVELOPER = 'Nashat Shamsadyn'
const CONTACT = 'nashatgameryt17@gmail.com'

// Same eight features the landing page advertises, in the same order. The copy
// is shared through i18n (`about.*`) so the two never drift apart.
const FEATURES: { key: string; icon: LucideIcon }[] = [
  { key: 'live', icon: Tv },
  { key: 'vod', icon: Film },
  { key: 'together', icon: PartyPopper },
  { key: 'multi', icon: LayoutGrid },
  { key: 'kids', icon: Baby },
  { key: 'media', icon: Headphones },
  { key: 'sync', icon: History },
  { key: 'social', icon: MessageCircle }
]

function useAppVersion(): string {
  const [version, setVersion] = useState('')
  useEffect(() => {
    window.nashat.getAppVersion().then(setVersion).catch(() => setVersion(''))
  }, [])
  return version
}

export default function About() {
  const { t } = useTranslation()
  const version = useAppVersion()
  const update = useUpdater()
  const [copied, setCopied] = useState(false)

  const openExternal = (url: string) => {
    window.nashat.openExternal(url).catch(() => {})
  }

  const share = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be denied; falling back to opening the site still lets
      // the user copy the URL themselves rather than leaving the button dead.
      openExternal(SITE_URL)
    }
  }

  const updateLabel =
    update.status === 'checking'
      ? '…'
      : update.status === 'available'
        ? update.version ?? ''
        : update.status === 'downloaded'
          ? '✓'
          : ''

  return (
    <div className="pb-16">
      {/* Hero — mirrors the landing page: crimson glow, mark, gradient accent. */}
      <div className="relative overflow-hidden px-8 pt-14 pb-12 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-80 blur-3xl opacity-30
                     bg-[radial-gradient(closest-side,theme(colors.brand.500),transparent)]"
        />
        {/* The official mark, brought over from the Android app. It is drawn on
            white, so it sits on a light plaque rather than bleeding into the
            dark hero. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative w-40 mx-auto p-5 rounded-3xl bg-white ring-1 ring-ink-600/40
                     shadow-2xl shadow-brand-500/20"
        >
          <img src={logoFull} alt={t('app.name')} className="w-full h-auto" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="relative mt-6 text-4xl font-black leading-tight max-w-2xl mx-auto"
        >
          {t('about.tagline')}
        </motion.h1>
        <p className="relative mt-4 text-ink-200 max-w-2xl mx-auto leading-relaxed">
          {t('about.lede')}
        </p>

        <div className="relative mt-7 flex flex-wrap items-center justify-center gap-2">
          <Action icon={Globe} label={t('about.website')} onClick={() => openExternal(SITE_URL)} />
          <Action icon={Github} label={t('about.source')} onClick={() => openExternal(REPO_URL)} />
          <Action
            icon={copied ? Check : Share2}
            label={copied ? t('about.copied') : t('about.share')}
            onClick={share}
            active={copied}
          />
        </div>

        {version && (
          <p className="relative mt-5 text-xs text-ink-300">
            <span className="font-bold text-ink-100">v{version}</span>
            {updateLabel && <span className="ms-2 text-brand-400">{updateLabel}</span>}
            <span className="mx-2">·</span>
            {t('about.licence')}
          </p>
        )}
      </div>

      {/* Feature grid */}
      <section className="px-8">
        <div className="text-center mb-8">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-400">
            {t('about.eyebrow')}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold">{t('about.heading')}</h2>
          <p className="mt-2 text-sm text-ink-300">{t('about.sub')}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 max-w-6xl mx-auto">
          {FEATURES.map(({ key, icon: Icon }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i, 6) * 0.04 }}
              className="p-5 rounded-2xl bg-ink-700/30 ring-1 ring-ink-600/40 hover:ring-brand-500/50
                         hover:bg-ink-700/50 transition-colors"
            >
              <div className="w-10 h-10 grid place-items-center rounded-xl bg-brand-500/12 text-brand-400 mb-3">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold mb-1.5">{t(`about.${key}T`)}</h3>
              <p className="text-sm text-ink-300 leading-relaxed">{t(`about.${key}D`)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Languages */}
      <section className="px-8 mt-10">
        <div
          className="max-w-6xl mx-auto p-7 rounded-2xl text-center ring-1 ring-brand-500/20
                     bg-gradient-to-b from-brand-500/10 to-transparent"
        >
          <Languages className="w-7 h-7 mx-auto text-brand-400" />
          <h2 className="mt-3 text-xl font-extrabold">{t('about.langTitle')}</h2>
          <p className="mt-2 text-sm text-ink-300 max-w-2xl mx-auto leading-relaxed">
            {t('about.langSub')}
          </p>
          <p className="mt-4 text-lg font-bold text-ink-100" dir="auto">
            {t('about.langs')}
          </p>
        </div>
      </section>

      {/* Developer credit — the same information the Android app shows. */}
      <section className="px-8 mt-6">
        <div className="max-w-6xl mx-auto p-7 rounded-2xl bg-ink-700/30 ring-1 ring-ink-600/40
                        flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-center">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-ink-300">
              {t('about.developer')}
            </p>
            <p className="mt-1 font-bold text-ink-100" dir="ltr">
              {DEVELOPER}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-ink-300">
              {t('about.contact')}
            </p>
            <button
              onClick={() => openExternal(`mailto:${CONTACT}`)}
              className="mt-1 font-bold text-brand-400 hover:text-brand-300 transition-colors"
              dir="ltr"
            >
              {CONTACT}
            </button>
          </div>
        </div>
      </section>

      {/* TMDB attribution — required by their terms of use. */}
      <p className="px-8 mt-8 text-center text-xs text-ink-300/70 max-w-2xl mx-auto leading-relaxed">
        {t('about.tmdb')}
      </p>
    </div>
  )
}

function Action({
  icon: Icon,
  label,
  onClick,
  active
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={
        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ' +
        (active
          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
          : 'bg-ink-700/50 text-ink-100 hover:bg-ink-700 ring-1 ring-ink-600/50')
      }
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}
