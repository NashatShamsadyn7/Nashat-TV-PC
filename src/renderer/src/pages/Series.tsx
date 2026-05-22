import { useTranslation } from 'react-i18next'
import PageHeader from '@/components/ui/PageHeader'
import PosterCard from '@/components/cards/PosterCard'

export default function Series() {
  const { t } = useTranslation()

  return (
    <div>
      <PageHeader title={t('nav.series')} />
      <div className="px-8 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-5">
        {Array.from({ length: 21 }).map((_, i) => (
          <PosterCard key={i} title={`Series ${i + 1}`} rating={7 + (i % 4)} />
        ))}
      </div>
    </div>
  )
}
