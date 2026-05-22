import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogIn, LogOut, UserCircle2 } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import AuthModal from '@/components/modals/AuthModal'
import { useFirebaseConnection } from '@/hooks/useFirebaseConnection'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/features/auth/api'

const STATUS_LABEL = {
  connecting: { tone: 'info' as const, label: 'جارٍ الاتصال…' },
  connected: { tone: 'success' as const, label: 'متصل' },
  disconnected: { tone: 'error' as const, label: 'غير متصل' }
}

export default function Settings() {
  const { t } = useTranslation()
  const status = useFirebaseConnection()
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const [authOpen, setAuthOpen] = useState(false)

  const s = STATUS_LABEL[status]
  const userLabel = user
    ? user.displayName || user.email || user.uid
    : 'غير مسجّل'
  const photoUrl = user?.photoURL

  return (
    <div>
      <PageHeader title={t('nav.settings')} />
      <div className="px-8 max-w-3xl space-y-6">
        <section className="bg-ink-700/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">Firebase (Realtime Database)</h3>
            <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
          </div>
          <p className="text-ink-300 text-sm">
            مشروع <code className="text-brand-300">nashat-tv</code> — نفس قاعدة بيانات
            تطبيق Android.
          </p>
        </section>

        <section className="bg-ink-700/30 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                className="w-12 h-12 rounded-full ring-2 ring-brand-500/40"
              />
            ) : (
              <UserCircle2 className="w-12 h-12 text-brand-400" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{userLabel}</h3>
              <p className="text-ink-300 text-sm truncate">
                {authLoading
                  ? 'جارٍ التحقّق…'
                  : user
                    ? `${user.email} — مُزامن مع Android`
                    : 'سجّل الدخول بحساب Gmail للمزامنة'}
              </p>
            </div>
            {user ? (
              <button
                onClick={() => authApi.signOut()}
                className="flex items-center gap-2 bg-ink-700/40 hover:bg-rose-500/20 hover:text-rose-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                خروج
              </button>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                <LogIn className="w-4 h-4" />
                دخول
              </button>
            )}
          </div>
        </section>

        <section className="bg-ink-700/30 rounded-2xl p-6">
          <h3 className="font-semibold text-lg mb-2">إصدار التطبيق</h3>
          <p className="text-ink-300 text-sm">v0.1.0 — مرحلة التطوير المبكّر</p>
        </section>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
