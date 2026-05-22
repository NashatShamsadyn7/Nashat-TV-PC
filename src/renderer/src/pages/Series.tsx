import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import PosterCard from '@/components/cards/PosterCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { usePopularTv, useTrendingTv } from '@/features/tmdb/hooks'
import { posterUrl, type TmdbTv } from '@shared/tmdb'

function TvSection({
  title,
  data,
  loading,
  error
}: {
  title: string
  data: TmdbTv[] | null
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
      <div
        className="flex gap-4 px-8 overflow-x-auto snap-x scroll-smooth pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="w-40 shrink-0">
                <Skeleton className="aspect-[2/3]" />
                <Skeleton className="h-4 mt-2 w-3/4" />
              </div>
            ))
          : (data ?? []).map((s) => (
              <PosterCard
                key={s.id}
                title={s.name}
                imageUrl={posterUrl(s.poster_path)}
                rating={s.vote_average}
              />
            ))}
      </div>
    </section>
  )
}

export default function Series() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'ku' ? 'ar' : i18n.language

  const trending = useTrendingTv(lang)
  const popular = usePopularTv(lang)

  return (
    <div className="pb-10">
      <PageHeader title={t('nav.series')} />
      <TvSection
        title={t('home.trending')}
        data={trending.data?.results ?? null}
        loading={trending.loading}
        error={trending.error}
      />
      <TvSection
        title="الأكثر شعبية"
        data={popular.data?.results ?? null}
        loading={popular.loading}
        error={popular.error}
      />
    </div>
  )
}
