import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { changeLanguage, SUPPORTED_LANGUAGES, type Language } from '@/i18n'
import { THEMES, type ThemeId } from '@/features/themes'
import { cn } from '@/lib/cn'

const STATUS_LABEL = {
  connecting: { tone: 'info' as const, label: 'جارٍ الاتصال…' },
  connected: { tone: 'success' as const, label: 'متصل' },
  disconnected: { tone: 'error' as const, label: 'غير متصل' }
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

  const s = STATUS_LABEL[status]
  const update = useUpdater()
  const userLabel = user ? user.displayName || user.email || user.uid : 'غير مسجّل'
  const photoUrl = user?.photoURL

  return (
    <div>
      <PageHeader title={t('nav.settings')} />
      <div className="px-8 max-w-4xl space-y-6 pb-10">
        {/* Account */}
        <Section title="الحساب">
          <div className="flex items-center gap-4">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-12 h-12 rounded-full ring-2 ring-brand-500/40" />
            ) : (
              <UserCircle2 className="w-12 h-12 text-brand-400" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{userLabel}</p>
              <p className="text-xs text-ink-300 truncate">
                {authLoading ? 'جارٍ التحقّق…' : user ? `${user.email} — مُزامن مع Android` : 'سجّل الدخول للمزامنة'}
              </p>
            </div>
            {user ? (
              <button
                onClick={() => authApi.signOut()}
                className="flex items-center gap-2 bg-ink-700/40 hover:bg-rose-500/20 hover:text-rose-300 px-4 py-2 rounded-xl text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                خروج
              </button>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-xl text-sm font-semibold"
              >
                <LogIn className="w-4 h-4" />
                دخول
              </button>
            )}
          </div>
          <div className="pt-2 border-t border-ink-700/40">
            <Row label="Firebase RTDB" description="مشروع nashat-tv">
              <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
            </Row>
          </div>
        </Section>

        {/* Profiles */}
        <Section title="الملفّات الشخصيّة" icon={UserCircle2}>
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
              إدارة الملفات →
            </a>
          </div>
        </Section>

        {/* Playback */}
        <Section title="التشغيل" icon={Volume2}>
          <Row label="تشغيل تلقائي للحلقة التالية">
            <Toggle value={settings.autoplayNext} onChange={(v) => settings.set('autoplayNext', v)} />
          </Row>
          <Row label="تذكّر مكان التوقّف">
            <Toggle value={settings.rememberPosition} onChange={(v) => settings.set('rememberPosition', v)} />
          </Row>
          <Row label="مستوى الصوت الافتراضي" description={`${Math.round(settings.defaultVolume * 100)}%`}>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.defaultVolume * 100}
              onChange={(e) => settings.set('defaultVolume', Number(e.target.value) / 100)}
              className="w-32 accent-brand-500"
            />
          </Row>
          <Row label="القفز" description={`${settings.seekStep} ثانية`}>
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
          <Row label="جودة مفضّلة">
            <select
              value={settings.preferredQuality}
              onChange={(e) => settings.set('preferredQuality', e.target.value as any)}
              className="bg-ink-700 ring-1 ring-ink-600 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="auto">تلقائي</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </Row>
        </Section>

        {/* Subtitles */}
        <Section title="الترجمة" icon={Captions}>
          <Row label="حجم الخط" description={`${settings.subtitleStyle.fontSize}px`}>
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
          <Row label="الخلفية">
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
                  {bg === 'none' ? 'بدون' : bg === 'shadow' ? 'ظل' : 'صندوق'}
                </button>
              ))}
            </div>
          </Row>
          <Row label="لون النص">
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
            💡 اسحب ملف SRT أو VTT داخل المشغّل لتفعيل الترجمة فوراً
          </p>
        </Section>

        {/* UI */}
        <Section title="الواجهة" icon={Sparkles}>
          <Row label="معاينة الفأرة (Hover peek)" description="إظهار معاينة عند تمرير الفأرة فوق البطاقات">
            <Toggle value={settings.hoverPeek} onChange={(v) => settings.set('hoverPeek', v)} />
          </Row>
          <Row label="تقليل الحركة">
            <Toggle value={settings.reduceMotion} onChange={(v) => settings.set('reduceMotion', v)} />
          </Row>
          <div>
            <p className="text-sm font-medium mb-2">السمة</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(Object.entries(THEMES) as [ThemeId, typeof THEMES[ThemeId]][]).map(([id, t]) => {
                const active = settings.theme === id
                return (
                  <button
                    key={id}
                    onClick={() => settings.set('theme', id as any)}
                    className={cn(
                      'p-2 rounded-xl text-xs font-medium transition-all ring-2',
                      active ? 'ring-brand-500' : 'ring-transparent hover:ring-ink-600'
                    )}
                    title={t.label}
                  >
                    <div
                      className="w-full h-12 rounded-lg mb-1"
                      style={{
                        background: `linear-gradient(135deg, rgb(${t.vars['--ink-900']}) 0%, rgb(${t.vars['--ink-700']}) 50%, rgb(${t.vars['--brand-500']}) 100%)`
                      }}
                    />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
          <Row label="اللغة">
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value as Language)}
              className="bg-ink-700 ring-1 ring-ink-600 rounded-lg px-3 py-1.5 text-sm"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l === 'ar' ? 'العربية' : l === 'ku' ? 'کوردی' : 'English'}
                </option>
              ))}
            </select>
          </Row>
        </Section>

        {/* Multi-live */}
        <Section title="مشاهدة متعددة">
          <Row label="الشكل الافتراضي">
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
        <Section title="الاختصارات" icon={Keyboard}>
          <button
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-2 bg-ink-700/40 hover:bg-ink-700/70 px-4 py-2 rounded-xl text-sm font-semibold"
          >
            <Keyboard className="w-4 h-4" />
            عرض جميع الاختصارات
          </button>
          <p className="text-xs text-ink-300">اضغط <kbd className="bg-ink-700/60 rounded px-1.5">?</kbd> في أي وقت</p>
        </Section>

        {/* Updater */}
        <Section title="إصدار التطبيق">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">v{appVersion} — Nashat TV PC</p>
              <p className="text-xs text-ink-300">التحديث يصل تلقائياً من GitHub Releases</p>
            </div>
            {update.status === 'checking' && <StatusBadge tone="info">جارٍ الفحص…</StatusBadge>}
            {update.status === 'available' && (
              <StatusBadge tone="warning">تحديث متاح {update.version && `v${update.version}`}</StatusBadge>
            )}
            {update.status === 'not-available' && <StatusBadge tone="success">محدّث</StatusBadge>}
            {update.status === 'progress' && <StatusBadge tone="info">{Math.round(update.percent)}%</StatusBadge>}
            {update.status === 'downloaded' && <StatusBadge tone="success">جاهز للتثبيت</StatusBadge>}
            {update.status === 'error' && <StatusBadge tone="error">خطأ</StatusBadge>}
          </div>
          {update.status === 'downloaded' && (
            <button
              onClick={() => window.nashat.installUpdate()}
              className="mt-3 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl text-sm"
            >
              <Download className="w-4 h-4" />
              إعادة التشغيل وتثبيت التحديث
            </button>
          )}
          {update.status === 'progress' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-ink-200">
              <RefreshCw className="w-4 h-4 animate-spin" />
              جارٍ تنزيل {Math.round(update.percent)}%
            </div>
          )}
        </Section>

        <button
          onClick={() => {
            if (confirm('إعادة كل الإعدادات إلى الافتراضي؟')) settings.reset()
          }}
          className="flex items-center gap-2 text-sm text-rose-400 hover:text-rose-300"
        >
          <RotateCcw className="w-4 h-4" />
          إعادة الإعدادات إلى الافتراضي
        </button>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
