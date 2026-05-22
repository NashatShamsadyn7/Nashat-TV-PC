import { useTranslation } from 'react-i18next'
import { Search as SearchIcon } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'

export default function SearchPage() {
  const { t } = useTranslation()

  return (
    <div>
      <PageHeader title={t('nav.search')} />
      <div className="px-8">
        <div className="max-w-2xl mx-auto mt-8">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-ink-300" />
            <input
              autoFocus
              type="text"
              placeholder={t('nav.search')}
              className="w-full bg-ink-700/40 border border-ink-600/50 rounded-2xl ps-12 pe-4 py-4 text-lg placeholder:text-ink-300 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <p className="text-center text-ink-300 text-sm mt-8">
            ابحث عبر كل المصادر — قنوات، أفلام، مسلسلات، ممثلين
          </p>
        </div>
      </div>
    </div>
  )
}
