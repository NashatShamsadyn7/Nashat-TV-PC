import { useTranslation } from 'react-i18next'
import Hero from '@/components/layout/Hero'
import Carousel from '@/components/layout/Carousel'
import PosterCard from '@/components/cards/PosterCard'
import { Skeleton } from '@/components/ui/Skeleton'

const PLACEHOLDER_ITEMS = Array.from({ length: 12 }, (_, i) => i)

function CarouselSkeleton() {
  return (
    <>
      {PLACEHOLDER_ITEMS.map((i) => (
        <div key={i} className="w-40 shrink-0">
          <Skeleton className="aspect-[2/3]" />
          <Skeleton className="h-4 mt-2 w-3/4" />
        </div>
      ))}
    </>
  )
}

export default function Home() {
  const { t } = useTranslation()

  return (
    <div className="pb-10">
      <Hero />
      <Carousel title={t('home.trending')}>
        <CarouselSkeleton />
      </Carousel>
      <Carousel title={t('home.topRated')}>
        {PLACEHOLDER_ITEMS.map((i) => (
          <PosterCard key={i} title={`Placeholder ${i + 1}`} rating={8.0 + i * 0.1} />
        ))}
      </Carousel>
      <Carousel title={t('home.nowPlaying')}>
        <CarouselSkeleton />
      </Carousel>
    </div>
  )
}
