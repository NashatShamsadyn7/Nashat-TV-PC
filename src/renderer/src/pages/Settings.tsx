import { useTranslation } from 'react-i18next'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import { useFirebaseConnection } from '@/hooks/useFirebaseConnection'
import { useAuthStore } from '@/stores/authStore'

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

  const s = STATUS_LABEL[status]

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
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">المستخدم</h3>
            <StatusBadge tone={user ? 'success' : 'warning'}>
              {authLoading ? 'جارٍ التحقّق…' : user ? 'مُسجَّل دخول' : 'زائر'}
            </StatusBadge>
          </div>
          <p className="text-ink-300 text-sm">
            {user
              ? user.email || user.uid
              : 'لم يتم تسجيل الدخول بعد. سيُضاف لاحقاً للمزامنة مع تطبيق Android.'}
          </p>
        </section>

        <section className="bg-ink-700/30 rounded-2xl p-6">
          <h3 className="font-semibold text-lg mb-2">إصدار التطبيق</h3>
          <p className="text-ink-300 text-sm">v0.1.0 — مرحلة التطوير المبكّر</p>
        </section>
      </div>
    </div>
  )
}
