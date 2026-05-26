import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Search as SearchIcon, Loader2, X } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import PosterCard from '@/components/cards/PosterCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { usePopularMovies, useTopRatedMovies, useTrendingMovies } from '@/features/tmdb/hooks'
import { useDebounced } from '@/features/search/useSearch'
import { tmdbApi } from '@/services/tmdb'
import { posterUrl, backdropUrl, type TmdbMovie } from '@shared/tmdb'

function MovieSection({
  title,
  data,
  loading,
  error,
  onOpen
}: {
  title: string
  data: TmdbMovie[] | null
  loading: boolean
  error: string | null
  onOpen: (m: TmdbMovie) => void
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
          : (data ?? []).map((m) => (
              <PosterCard
                key={m.id}
                title={m.title}
                imageUrl={posterUrl(m.poster_path)}
                rating={m.vote_average}
                onClick={() => onOpen(m)}
                libItem={{
                  kind: 'movie',
                  tmdbId: m.id,
                  title: m.title,
                  poster: posterUrl(m.poster_path),
                  backdrop: backdropUrl(m.backdrop_path, 'w780'),
                  year: m.release_date?.slice(0, 4)
                }}
              />
            ))}
      </div>
    </section>
  )
}

export default function Movies() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const lang = i18n.language === 'ku' ? 'ar' : i18n.language

  const trending = useTrendingMovies(lang)
  const popular = usePopularMovies(lang)
  const topRated = useTopRatedMovies(lang)

  const [query, setQuery] = useState('')
  const debounced = useDebounced(query, 300)
  const [results, setResults] = useState<TmdbMovie[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState<string | null>(null)

  useEffect(() => {
    if (!debounced.trim()) {
      setResults(null)
      setSearchErr(null)
      return
    }
    let cancelled = false
    setSearching(true)
    tmdbApi
      .searchMovies(debounced, lang)
      .then((res) => {
        if (cancelled) return
        setResults(res.results || [])
        setSearchErr(null)
      })
      .catch((err: Error) => {
        if (!cancelled) setSearchErr(err.message)
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [debounced, lang])

  const openDetails = (m: TmdbMovie) => navigate(`/details/movie/${m.id}`)

  return (
    <div className="pb-10">
      <PageHeader title={t('nav.movies')} />

      <div className="px-8 mb-6 max-w-md">
        <div className="relative">
          <SearchIcon className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-ink-300" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في الأفلام…"
            className="w-full bg-ink-700/40 ring-1 ring-ink-600/50 rounded-xl ps-10 pe-9 py-2 text-sm placeholder:text-ink-300 focus:outline-none focus:ring-brand-500"
          />
          {searching ? (
            <Loader2 className="absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 animate-spin text-ink-300" />
          ) : query ? (
            <button
              onClick={() => setQuery('')}
              className="absolute top-1/2 -translate-y-1/2 end-2 w-6 h-6 grid place-items-center rounded-full hover:bg-ink-700/60"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {results !== null ? (
        <section className="px-8">
          <h2 className="text-xl font-bold mb-3">
            نتائج البحث ({results.length})
          </h2>
          {searchErr && <p className="text-rose-300 text-sm mb-3">{searchErr}</p>}
          {results.length === 0 && !searching && (
            <p className="text-ink-300">لا توجد نتائج</p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {results.map((m) => (
              <PosterCard
                key={m.id}
                title={m.title}
                imageUrl={posterUrl(m.poster_path)}
                rating={m.vote_average}
                onClick={() => openDetails(m)}
                libItem={{
                  kind: 'movie',
                  tmdbId: m.id,
                  title: m.title,
                  poster: posterUrl(m.poster_path),
                  backdrop: backdropUrl(m.backdrop_path, 'w780'),
                  year: m.release_date?.slice(0, 4)
                }}
              />
            ))}
          </div>
        </section>
      ) : (
        <>
          <MovieSection
            title={t('home.trending')}
            data={trending.data?.results ?? null}
            loading={trending.loading}
            error={trending.error}
            onOpen={openDetails}
          />
          <MovieSection
            title="الأكثر شعبية"
            data={popular.data?.results ?? null}
            loading={popular.loading}
            error={popular.error}
            onOpen={openDetails}
          />
          <MovieSection
            title={t('home.topRated')}
            data={topRated.data?.results ?? null}
            loading={topRated.loading}
            error={topRated.error}
            onOpen={openDetails}
          />
        </>
      )}
    </div>
  )
}
