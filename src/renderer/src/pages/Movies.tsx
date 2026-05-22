import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import PosterCard from '@/components/cards/PosterCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { usePopularMovies, useTopRatedMovies, useTrendingMovies } from '@/features/tmdb/hooks'
import { posterUrl, type TmdbMovie } from '@shared/tmdb'

function MovieSection({
  title,
  data,
  loading,
  error
}: {
  title: string
  data: TmdbMovie[] | null
  loading: boolean
  error: string | null
}) {
  return (
    <section className="mb-8">
      <h2 className="px-8 text-xl font-bold mb-3">{title}</h2>
      {error && (
        <div className="mx-8 flex items-center gap-2 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      <div className="flex gap-4 px-8 overflow-x-auto snap-x scroll-smooth pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="w-40 shrink-0">
                <Skeleton className="aspect-[2/3]" />
                <Skeleton className="h-4 mt-2 w-3/4" />
              </div>
            ))
          : (data ?? []).map((m) => (
              <PosterCard
                key={m.id}
                title={m.title}
                imageUrl={posterUrl(m.poster_path)}
                rating={m.vote_average}
              />
            ))}
      </div>
    </section>
  )
}

export default function Movies() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'ku' ? 'ar' : i18n.language

  const trending = useTrendingMovies(lang)
  const popular = usePopularMovies(lang)
  const topRated = useTopRatedMovies(lang)

  return (
    <div className="pb-10">
      <PageHeader title={t('nav.movies')} />
      <MovieSection
        title={t('home.trending')}
        data={trending.data?.results ?? null}
        loading={trending.loading}
        error={trending.error}
      />
      <MovieSection
        title="الأكثر شعبية"
        data={popular.data?.results ?? null}
        loading={popular.loading}
        error={popular.error}
      />
      <MovieSection
        title={t('home.topRated')}
        data={topRated.data?.results ?? null}
        loading={topRated.loading}
        error={topRated.error}
      />
    </div>
  )
}
