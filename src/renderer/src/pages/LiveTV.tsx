import { useTranslation } from 'react-i18next'
import PageHeader from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'

export default function LiveTV() {
  const { t } = useTranslation()

  return (
    <div>
      <PageHeader title={t('nav.livetv')} subtitle="قنوات كردية وعربية وعالمية" />
      <div className="px-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-ink-700/30 rounded-xl p-4 flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
