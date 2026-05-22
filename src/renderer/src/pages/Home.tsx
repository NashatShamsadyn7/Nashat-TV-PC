import { useTranslation } from 'react-i18next'
import Hero from '@/components/layout/Hero'
import Carousel from '@/components/layout/Carousel'
import PosterCard from '@/components/cards/PosterCard'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  useNowPlayingMovies,
  useTopRatedMovies,
  useTrendingMovies,
  useTrendingTv
} from '@/features/tmdb/hooks'
import { posterUrl } from '@shared/tmdb'

function CarouselSkeleton() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="w-40 shrink-0">
          <Skeleton className="aspect-[2/3]" />
          <Skeleton className="h-4 mt-2 w-3/4" />
        </div>
      ))}
    </>
  )
}

export default function Home() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'ku' ? 'ar' : i18n.language

  const trending = useTrendingMovies(lang)
  const topRated = useTopRatedMovies(lang)
  const nowPlaying = useNowPlayingMovies(lang)
  const trendingTv = useTrendingTv(lang)

  const heroMovie = trending.data?.results?.[0] ?? null

  return (
    <div className="pb-10">
      <Hero movie={heroMovie} />

      <Carousel title={t('home.trending')}>
        {trending.loading ? (
          <CarouselSkeleton />
        ) : (
          (trending.data?.results ?? []).map((m) => (
            <PosterCard
              key={m.id}
              title={m.title}
              imageUrl={posterUrl(m.poster_path)}
              rating={m.vote_average}
            />
          ))
        )}
      </Carousel>

      <Carousel title={t('home.topRated')}>
        {topRated.loading ? (
          <CarouselSkeleton />
        ) : (
          (topRated.data?.results ?? []).map((m) => (
            <PosterCard
              key={m.id}
              title={m.title}
              imageUrl={posterUrl(m.poster_path)}
              rating={m.vote_average}
            />
          ))
        )}
      </Carousel>

      <Carousel title={t('home.nowPlaying')}>
        {nowPlaying.loading ? (
          <CarouselSkeleton />
        ) : (
          (nowPlaying.data?.results ?? []).map((m) => (
            <PosterCard
              key={m.id}
              title={m.title}
              imageUrl={posterUrl(m.poster_path)}
              rating={m.vote_average}
            />
          ))
        )}
      </Carousel>

      <Carousel title="مسلسلات رائجة">
        {trendingTv.loading ? (
          <CarouselSkeleton />
        ) : (
          (trendingTv.data?.results ?? []).map((s) => (
            <PosterCard
              key={s.id}
              title={s.name}
              imageUrl={posterUrl(s.poster_path)}
              rating={s.vote_average}
            />
          ))
        )}
      </Carousel>
    </div>
  )
}
