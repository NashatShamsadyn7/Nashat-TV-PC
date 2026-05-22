import { useTranslation } from 'react-i18next'
import PageHeader from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'

export default function Actors() {
  const { t } = useTranslation()

  return (
    <div>
      <PageHeader title={t('nav.actors')} />
      <div className="px-8 grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-5">
        {Array.from({ length: 27 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <Skeleton className="w-24 h-24 rounded-full" />
            <Skeleton className="h-3 w-20 mt-3" />
          </div>
        ))}
      </div>
    </div>
  )
}
