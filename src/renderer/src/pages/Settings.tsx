import { useTranslation } from 'react-i18next'
import PageHeader from '@/components/ui/PageHeader'

export default function Settings() {
  const { t } = useTranslation()

  return (
    <div>
      <PageHeader title={t('nav.settings')} />
      <div className="px-8 max-w-3xl space-y-6">
        <section className="bg-ink-700/30 rounded-2xl p-6">
          <h3 className="font-semibold text-lg mb-2">إصدار التطبيق</h3>
          <p className="text-ink-300 text-sm">v0.1.0 — مرحلة التطوير المبكّر</p>
        </section>
      </div>
    </div>
  )
}
