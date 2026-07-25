import { useEffect, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import {
  LogIn,
  LogOut,
  UserCircle2,
  Download,
  RefreshCw,
  Keyboard,
  Sparkles,
  Captions,
  Volume2,
  RotateCcw
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import AuthModal from '@/components/modals/AuthModal'
import ShortcutHelp from '@/components/ui/ShortcutHelp'
import { useFirebaseConnection } from '@/hooks/useFirebaseConnection'
import { useUpdater } from '@/hooks/useUpdater'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useProfilesStore } from '@/stores/profilesStore'
import { authApi } from '@/features/auth/api'
import { changeLanguage, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, type Language } from '@/i18n'
import { formatPercent } from '@/i18n/format'
import { THEMES, type ThemeId } from '@/features/themes'
import { cn } from '@/lib/cn'

// Tone is static; the label is resolved per-render so it follows the language.
const STATUS_TONE = {
  connecting: 'info' as const,
  connected: 'success' as const,
  disconnected: 'error' as const
}

function Section({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: typeof Sparkles }) {
  return (
    <section className="bg-ink-700/30 rounded-2xl p-6">
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-brand-400" />}
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Row({
  label,
  description,
  children
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-ink-300 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      className={cn(
        'w-11 h-6 rounded-full relative transition-colors',
        value ? 'bg-brand-500' : 'bg-ink-600'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all',
          value ? 'start-5' : 'start-0.5'
        )}
      />
    </button>
  )
}

export default function Settings() {
  const { t, i18n } = useTranslation()
  const status = useFirebaseConnection()
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const [authOpen, setAuthOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  // Real app version from the main process (was hardcoded for ages).
  const [appVersion, setAppVersion] = useState<string>('…')
  useEffect(() => {
    window.nashat.getAppVersion().then(setAppVersion).catch(() => setAppVersion('?'))
  }, [])

  const settings = useSettingsStore()
  const profiles = useProfilesStore((s) => s.profiles)
  const activeProfileId = useProfilesStore((s) => s.activeId)

  const s = { tone: STATUS_TONE[status], label: t(`connection.${status}`) }
  const update = useUpdater()
  const userLabel = user ? user.displayName || user.email || user.uid : t('common.notSignedIn')
  const photoUrl = user?.photoURL

  return (
    <div>
      <PageHeader title={t('nav.settings')} />
      <div className="px-8 max-w-4xl space-y-6 pb-10">
        {/* Account */}
        <Section title={t('settings.account')}>
          <div className="flex items-center gap-4">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-12 h-12 rounded-full ring-2 ring-brand-500/40" />
            ) : (
              <UserCircle2 className="w-12 h-12 text-brand-400" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{userLabel}</p>
              <p className="text-xs text-ink-300 truncate">
                {authLoading ? t('auth.checking') : user ? t('auth.syncedWithAndroid', { email: user.email }) : t('auth.signInToSync')}
              </p>
            </div>
            {user ? (
              <button
                onClick={() => authApi.signOut()}
                className="flex items-center gap-2 bg-ink-700/40 hover:bg-rose-500/20 hover:text-rose-300 px-4 py-2 rounded-xl text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                {t('auth.signOut')}
              </button>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-xl text-sm font-semibold"
              >
                <LogIn className="w-4 h-4" />
                {t('auth.signIn')}
              </button>
            )}
          </div>
          <div className="pt-2 border-t border-ink-700/40">
            <Row label="Firebase RTDB" description={t('settings.firebaseProject', { project: 'nashat-tv' })}>
              <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
            </Row>
          </div>
        </Section>

        {/* Profiles */}
        <Section title={t('settings.profiles')} icon={UserCircle2}>
          <div className="flex flex-wrap gap-3">
            {profiles.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm',
                  p.id === activeProfileId ? 'bg-brand-500 text-white' : 'bg-ink-700/40 text-ink-200'
                )}
              >
                <span className="text-lg">{p.avatar}</span>
                <span>{p.name}</span>
                {p.isKid && <span className="text-[10px] bg-emerald-500/30 px-1 rounded">KIDS</span>}
                {p.pinHash && <span className="text-[10px] bg-amber-500/30 px-1 rounded">PIN</span>}
              </div>
            ))}
            <a
              href="#/profiles"
              className="px-3 py-2 rounded-xl bg-ink-700/30 hover:bg-ink-700/60 text-sm text-brand-400"
            >
              {t('settings.manageProfiles')}
            </a>
          </div>
        </Section>

        {/* Playback */}
        <Section title={t('settings.playback')} icon={Volume2}>
          {/* Automatic advance needs an `ended` event from the video. Series
              play inside cross-origin embed iframes, which never expose one, so
              this cannot be honoured — say that instead of shipping a switch
              that silently does nothing. Episode navigation is a button in the
              player instead. */}
          <Row
            label={t('settings.autoplayNext')}
            description={t('settings.autoplayNextUnavailable')}
          >
            <div className="opacity-40 pointer-events-none" aria-disabled>
              <Toggle value={false} onChange={() => {}} />
            </div>
          </Row>
          <Row label={t('settings.rememberPosition')}>
            <Toggle value={settings.rememberPosition} onChange={(v) => settings.set('rememberPosition', v)} />
          </Row>
          <Row label={t('settings.defaultVolume')} description={`${Math.round(settings.defaultVolume * 100)}%`}>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.defaultVolume * 100}
              onChange={(e) => settings.set('defaultVolume', Number(e.target.value) / 100)}
              className="w-32 accent-brand-500"
            />
          </Row>
          <Row label={t('settings.seekStep')} description={t('settings.seekStepValue', { count: settings.seekStep })}>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={settings.seekStep}
              onChange={(e) => settings.set('seekStep', Number(e.target.value))}
              className="w-32 accent-brand-500"
            />
          </Row>
          <Row label={t('settings.preferredQuality')}>
            <select
              value={settings.preferredQuality}
              onChange={(e) => settings.set('preferredQuality', e.target.value as any)}
              className="bg-ink-700 ring-1 ring-ink-600 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="auto">{t('settings.qualityAuto')}</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </Row>
        </Section>

        {/* Subtitles */}
        <Section title={t('settings.subtitles')} icon={Captions}>
          <Row label={t('settings.fontSize')} description={`${settings.subtitleStyle.fontSize}px`}>
            <input
              type="range"
              min={14}
              max={48}
              value={settings.subtitleStyle.fontSize}
              onChange={(e) =>
                settings.set('subtitleStyle', {
                  ...settings.subtitleStyle,
                  fontSize: Number(e.target.value)
                })
              }
              className="w-32 accent-brand-500"
            />
          </Row>
          <Row label={t('settings.background')}>
            <div className="flex gap-1">
              {(['none', 'shadow', 'box'] as const).map((bg) => (
                <button
                  key={bg}
                  onClick={() =>
                    settings.set('subtitleStyle', { ...settings.subtitleStyle, background: bg })
                  }
                  className={cn(
                    'px-3 py-1 rounded-md text-xs',
                    settings.subtitleStyle.background === bg
                      ? 'bg-brand-500 text-white'
                      : 'bg-ink-700/40 text-ink-200'
                  )}
                >
                  {bg === 'none' ? t('settings.backgroundNone') : bg === 'shadow' ? t('settings.backgroundShadow') : t('settings.backgroundBox')}
                </button>
              ))}
            </div>
          </Row>
          <Row label={t('settings.textColor')}>
            <input
              type="color"
              value={settings.subtitleStyle.color}
              onChange={(e) =>
                settings.set('subtitleStyle', { ...settings.subtitleStyle, color: e.target.value })
              }
              className="w-10 h-8 rounded bg-transparent border-0"
            />
          </Row>
          <p className="text-xs text-ink-300 mt-2">
            💡 {t('settings.subtitleHint')}
          </p>
        </Section>

        {/* UI */}
        <Section title={t('settings.appearance')} icon={Sparkles}>
          <Row label={t('settings.hoverPeek')} description={t('settings.hoverPeekHint')}>
            <Toggle value={settings.hoverPeek} onChange={(v) => settings.set('hoverPeek', v)} />
          </Row>
          <Row label={t('settings.reduceMotion')}>
            <Toggle value={settings.reduceMotion} onChange={(v) => settings.set('reduceMotion', v)} />
          </Row>
          <div>
            <p className="text-sm font-medium mb-2">{t('settings.theme')}</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {/* Map variable renamed from `t` — it shadowed the translation fn. */}
              {(Object.entries(THEMES) as [ThemeId, typeof THEMES[ThemeId]][]).map(([id, theme]) => {
                const active = settings.theme === id
                const label = t(theme.labelKey)
                return (
                  <button
                    key={id}
                    onClick={() => settings.set('theme', id as any)}
                    className={cn(
                      'p-2 rounded-xl text-xs font-medium transition-all ring-2',
                      active ? 'ring-brand-500' : 'ring-transparent hover:ring-ink-600'
                    )}
                    title={label}
                  >
                    <div
                      className="w-full h-12 rounded-lg mb-1"
                      style={{
                        background: `linear-gradient(135deg, rgb(${theme.vars['--ink-900']}) 0%, rgb(${theme.vars['--ink-700']}) 50%, rgb(${theme.vars['--brand-500']}) 100%)`
                      }}
                    />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          <Row label={t('settings.language')}>
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value as Language)}
              className="bg-ink-700 ring-1 ring-ink-600 rounded-lg px-3 py-1.5 text-sm"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_NAMES[l]}
                </option>
              ))}
            </select>
          </Row>
        </Section>

        {/* Multi-live */}
        <Section title={t('settings.multiLive')}>
          <Row label={t('settings.defaultLayout')}>
            <div className="flex gap-1">
              {(['2x2', '1+3', '3x1'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => settings.set('multiLiveLayout', l)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs',
                    settings.multiLiveLayout === l
                      ? 'bg-brand-500 text-white'
                      : 'bg-ink-700/40 text-ink-200'
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        {/* Shortcuts */}
        <Section title={t('settings.shortcuts')} icon={Keyboard}>
          <button
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-2 bg-ink-700/40 hover:bg-ink-700/70 px-4 py-2 rounded-xl text-sm font-semibold"
          >
            <Keyboard className="w-4 h-4" />
            {t('settings.showAllShortcuts')}
          </button>
          {/* <1> in the translation marks where the <kbd> element goes, so
              translators can move it within the sentence as their grammar needs. */}
          <p className="text-xs text-ink-300">
            <Trans
              i18nKey="settings.pressAnytime"
              components={{ 1: <kbd className="bg-ink-700/60 rounded px-1.5" /> }}
            />
          </p>
        </Section>

        {/* Updater */}
        <Section title={t('settings.appVersion')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">v{appVersion} — Nashat TV PC</p>
              <p className="text-xs text-ink-300">{t('settings.autoUpdateHint')}</p>
            </div>
            {update.status === 'checking' && <StatusBadge tone="info">{t('updater.checking')}</StatusBadge>}
            {update.status === 'available' && (
              <StatusBadge tone="warning">
                {t('updater.available', { version: update.version ? `v${update.version}` : '' })}
              </StatusBadge>
            )}
            {update.status === 'not-available' && <StatusBadge tone="success">{t('updater.upToDate')}</StatusBadge>}
            {update.status === 'progress' && <StatusBadge tone="info">{Math.round(update.percent)}%</StatusBadge>}
            {update.status === 'downloaded' && <StatusBadge tone="success">{t('updater.readyToInstall')}</StatusBadge>}
            {update.status === 'error' && <StatusBadge tone="error">{t('updater.error')}</StatusBadge>}
          </div>
          {update.status === 'downloaded' && (
            <button
              onClick={() => window.nashat.installUpdate()}
              className="mt-3 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl text-sm"
            >
              <Download className="w-4 h-4" />
              {t('updater.restartAndInstall')}
            </button>
          )}
          {update.status === 'progress' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-ink-200">
              <RefreshCw className="w-4 h-4 animate-spin" />
              {t('updater.downloading', { percent: formatPercent(update.percent / 100) })}
            </div>
          )}
        </Section>

        <button
          onClick={() => {
            if (confirm(t('settings.resetConfirm'))) settings.reset()
          }}
          className="flex items-center gap-2 text-sm text-rose-400 hover:text-rose-300"
        >
          <RotateCcw className="w-4 h-4" />
          {t('settings.reset')}
        </button>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
