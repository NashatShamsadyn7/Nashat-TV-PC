import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import PosterCard from '@/components/cards/PosterCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { tmdbApi } from '@/services/tmdb'
import { posterUrl, backdropUrl, type TmdbMovie, type TmdbTv } from '@shared/tmdb'
import { ARABIC_DUB_MOVIE_IDS, ARABIC_DUB_TV_IDS } from '@/features/arabic/dubs'
import { useDubVotes } from '@/features/arabic/useDubVotes'

type Tab = 'originals-movies' | 'originals-tv' | 'dubbed-movies' | 'dubbed-tv'

const TABS: Array<{ id: Tab; label: string; group: 'originals' | 'dubbed' }> = [
  { id: 'originals-movies', label: 'أفلام عربية', group: 'originals' },
  { id: 'originals-tv', label: 'مسلسلات عربية', group: 'originals' },
  { id: 'dubbed-movies', label: 'أفلام مدبلجة', group: 'dubbed' },
  { id: 'dubbed-tv', label: 'مسلسلات مدبلجة', group: 'dubbed' }
]

// Fetch a curated list of titles by id, in parallel. Settled so one missing
// title doesn't take the whole grid down.
async function fetchByIds<T>(
  ids: number[],
  fetcher: (id: number) => Promise<T>
): Promise<T[]> {
  const results = await Promise.allSettled(ids.map((id) => fetcher(id)))
  const out: T[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') out.push(r.value as T)
  }
  return out
}

export default function Arabic() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('originals-movies')

  // Arabic-originals come from TMDB discover (Egyptian / Lebanese / Saudi /
  // Gulf cinema and series — guaranteed Arabic audio).
  const [origMovies, setOrigMovies] = useState<TmdbMovie[] | null>(null)
  const [origTv, setOrigTv] = useState<TmdbTv[] | null>(null)
  // Dubbed lists are curated TMDB ids — fetched in parallel for posters/titles.
  const [dubMovies, setDubMovies] = useState<TmdbMovie[] | null>(null)
  const [dubTv, setDubTv] = useState<TmdbTv[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Live community votes — merged into the dubbed tabs alongside the seed
  // list. Subscribing to both kinds is cheap (one shallow path each).
  const movieVotes = useDubVotes('movie')
  const tvVotes = useDubVotes('tv')
  // Union of (curated seed) + (community-voted ids). Recomputes when the
  // votes change so a fresh user vote shows immediately.
  const dubbedMovieIds = useMemo(
    () => Array.from(new Set([...ARABIC_DUB_MOVIE_IDS, ...movieVotes.topIds])),
    [movieVotes.topIds]
  )
  const dubbedTvIds = useMemo(
    () => Array.from(new Set([...ARABIC_DUB_TV_IDS, ...tvVotes.topIds])),
    [tvVotes.topIds]
  )

  // Lazy-fetch each tab the first time it's opened. Cached afterwards.
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        setError(null)
        if (tab === 'originals-movies' && !origMovies) {
          setLoading(true)
          const r = await tmdbApi.discoverArabicMovies(1, 'ar')
          if (!cancelled) setOrigMovies(r.results ?? [])
        } else if (tab === 'originals-tv' && !origTv) {
          setLoading(true)
          const r = await tmdbApi.discoverArabicTv(1, 'ar')
          if (!cancelled) setOrigTv(r.results ?? [])
        } else if (tab === 'dubbed-movies' && !dubMovies) {
          setLoading(true)
          // Convert detail responses into TmdbMovie shape. movieDetails returns
          // a richer object but the keys we use (id, title, poster_path,
          // backdrop_path, release_date, vote_average) are present.
          const items = await fetchByIds(dubbedMovieIds, (id) =>
            tmdbApi.movieDetails(id, 'ar')
          )
          if (!cancelled) {
            setDubMovies(
              items
                .map((m) => m as unknown as TmdbMovie)
                .sort(
                  (a, b) =>
                    ((b as { popularity?: number }).popularity ?? 0) -
                    ((a as { popularity?: number }).popularity ?? 0)
                )
            )
          }
        } else if (tab === 'dubbed-tv' && !dubTv) {
          setLoading(true)
          const items = await fetchByIds(dubbedTvIds, (id) =>
            tmdbApi.tvDetails(id, 'ar')
          )
          if (!cancelled) {
            setDubTv(
              items
                .map((t) => t as unknown as TmdbTv)
                .sort(
                  (a, b) =>
                    ((b as { popularity?: number }).popularity ?? 0) -
                    ((a as { popularity?: number }).popularity ?? 0)
                )
            )
          }
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [tab, origMovies, origTv, dubMovies, dubTv, dubbedMovieIds, dubbedTvIds])

  // When community votes change the dubbed id set, drop the cached lists so
  // the effect above refetches with the expanded ids. Votes are rare, so the
  // refetch cost is negligible.
  useEffect(() => {
    setDubMovies(null)
  }, [dubbedMovieIds.length])
  useEffect(() => {
    setDubTv(null)
  }, [dubbedTvIds.length])

  const grid = useMemo(() => {
    if (tab === 'originals-movies') return origMovies
    if (tab === 'originals-tv') return origTv
    if (tab === 'dubbed-movies') return dubMovies
    return dubTv
  }, [tab, origMovies, origTv, dubMovies, dubTv])

  const isTvTab = tab === 'originals-tv' || tab === 'dubbed-tv'
  const openDetails = (id: number) => navigate(`/details/${isTvTab ? 'tv' : 'movie'}/${id}`)

  return (
    <div className="pb-10">
      <PageHeader
        title="محتوى عربي"
        subtitle="أفلام ومسلسلات عربية أصلية، وأخرى مدبلجة بالعربية"
      />

      <div className="px-8 mb-4">
        <p className="text-xs text-ink-300 mb-2 max-w-3xl leading-relaxed">
          <strong className="text-ink-100">عربي أصلي:</strong> أفلام ومسلسلات لغتها
          الأصلية عربية (مصرية، لبنانية، سعودية، خليجية…) من قاعدة بيانات TMDB.
          {' '}
          <strong className="text-ink-100">مدبلجة:</strong> قائمة منتقاة من الأفلام
          والمسلسلات الأجنبية المعروفة بتوفّر دبلجة عربية لها.
        </p>
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-brand-500 text-white'
                  : 'bg-ink-700/40 text-ink-200 hover:bg-ink-700/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <section className="px-8">
        {error && (
          <div className="flex items-center gap-2 text-rose-300 text-sm mb-3">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {loading && (!grid || grid.length === 0) && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[2/3]" />
                <Skeleton className="h-4 mt-2 w-3/4" />
              </div>
            ))}
          </div>
        )}
        {!loading && grid && grid.length === 0 && (
          <p className="text-ink-300 text-sm">لا توجد نتائج في هذا القسم.</p>
        )}
        {grid && grid.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {grid.map((item) => {
              const isMovie = !('name' in item)
              const title = isMovie ? (item as TmdbMovie).title : (item as TmdbTv).name
              const year = isMovie
                ? (item as TmdbMovie).release_date?.slice(0, 4)
                : (item as TmdbTv).first_air_date?.slice(0, 4)
              return (
                <PosterCard
                  key={item.id}
                  title={title}
                  imageUrl={posterUrl(item.poster_path)}
                  rating={item.vote_average}
                  onClick={() => openDetails(item.id)}
                  libItem={{
                    kind: isMovie ? 'movie' : 'tv',
                    tmdbId: item.id,
                    title,
                    poster: posterUrl(item.poster_path),
                    backdrop: backdropUrl(item.backdrop_path, 'w780'),
                    year
                  }}
                />
              )
            })}
          </div>
        )}
        {loading && grid && grid.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-ink-300 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            تحديث…
          </div>
        )}
      </section>
    </div>
  )
}
