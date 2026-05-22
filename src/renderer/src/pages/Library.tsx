import { useTranslation } from 'react-i18next'
import PageHeader from '@/components/ui/PageHeader'
import { Heart, History, Download } from 'lucide-react'

const SECTIONS = [
  { icon: Heart, key: 'المفضّلة' },
  { icon: History, key: 'تاريخ المشاهدة' },
  { icon: Download, key: 'التنزيلات' }
]

export default function Library() {
  const { t } = useTranslation()

  return (
    <div>
      <PageHeader title={t('nav.library')} subtitle="مفضّلتك وتاريخ مشاهدتك وتنزيلاتك" />
      <div className="px-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {SECTIONS.map(({ icon: Icon, key }) => (
          <button
            key={key}
            className="bg-ink-700/30 hover:bg-ink-700/50 rounded-2xl p-6 text-start transition-colors"
          >
            <Icon className="w-8 h-8 text-brand-400 mb-3" />
            <h3 className="font-semibold text-lg">{key}</h3>
            <p className="text-ink-300 text-sm mt-1">0 عنصر</p>
          </button>
        ))}
      </div>
    </div>
  )
}
