import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
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
import { usePlayerStore } from '@/stores/playerStore'
import { useLibraryStore, libraryActions } from '@/stores/libraryStore'
import { useRecommendations } from '@/features/recommendations/useRecommendations'
import { posterUrl, backdropUrl, type TmdbMovie, type TmdbTv } from '@shared/tmdb'
import { X, Play, Tv as TvIcon } from 'lucide-react'

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

function ContinueCard({
  title,
  backdrop,
  position,
  duration,
  badge,
  onPlay,
  onRemove
}: {
  title: string
  backdrop?: string
  position: number
  duration: number
  badge?: string
  onPlay: () => void
  onRemove: () => void
}) {
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0
  return (
    <div className="group relative w-64 shrink-0 snap-start">
      <button onClick={onPlay} className="block text-start w-full">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-ink-700/40 ring-1 ring-ink-600/40 group-hover:ring-brand-500/60 transition">
          {backdrop ? (
            <img src={backdrop} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-ink-700 to-ink-800 grid place-items-center text-ink-300">
              <TvIcon className="w-8 h-8" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition" />
          <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition">
            <div className="w-12 h-12 rounded-full bg-brand-500 grid place-items-center">
              <Play className="w-6 h-6 fill-white" />
            </div>
          </div>
          {badge && (
            <span className="absolute top-2 start-2 text-[10px] font-bold bg-black/70 px-2 py-0.5 rounded">
              {badge}
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className="mt-2 text-sm font-medium line-clamp-1">{title}</p>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        title="إزالة"
        className="absolute top-2 end-2 w-7 h-7 grid place-items-center rounded-full bg-black/70 opacity-0 group-hover:opacity-100 hover:bg-rose-500 transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function Home() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const lang = i18n.language === 'ku' ? 'ar' : i18n.language

  const trending = useTrendingMovies(lang)
  const topRated = useTopRatedMovies(lang)
  const nowPlaying = useNowPlayingMovies(lang)
  const trendingTv = useTrendingTv(lang)

  const heroMovie = trending.data?.results?.[0] ?? null
  const openTmdb = usePlayerStore((s) => s.openTmdb)
  const open = usePlayerStore((s) => s.open)
  const progress = useLibraryStore((s) => s.progress)
  const watchlist = useLibraryStore((s) => s.watchlist)
  const favorites = useLibraryStore((s) => s.favorites)
  const recs = useRecommendations(lang)

  // Hero: keep direct-play behavior on its dedicated Play button
  const playMovieDirect = (m: TmdbMovie) =>
    openTmdb({
      kind: 'movie',
      tmdbId: m.id,
      title: m.title,
      subtitle: m.release_date ? m.release_date.slice(0, 4) : undefined,
      backdrop: backdropUrl(m.backdrop_path)
    })

  const openMovie = (m: TmdbMovie) => navigate(`/details/movie/${m.id}`)
  const openTv = (tv: TmdbTv) => navigate(`/details/tv/${tv.id}`)

  const movieLib = (m: TmdbMovie) => ({
    kind: 'movie' as const,
    tmdbId: m.id,
    title: m.title,
    poster: posterUrl(m.poster_path),
    backdrop: backdropUrl(m.backdrop_path, 'w780'),
    year: m.release_date?.slice(0, 4)
  })

  const tvLib = (s: TmdbTv) => ({
    kind: 'tv' as const,
    tmdbId: s.id,
    title: s.name,
    poster: posterUrl(s.poster_path),
    backdrop: backdropUrl(s.backdrop_path, 'w780'),
    year: s.first_air_date?.slice(0, 4)
  })

  return (
    <div className="pb-10">
      <Hero movie={heroMovie} onPlay={heroMovie ? () => playMovieDirect(heroMovie) : undefined} />

      {progress.length > 0 && (
        <Carousel title={t('home.continueWatching')}>
          {progress.slice(0, 12).map((p) => {
            const badge = p.kind === 'channel'
              ? 'قناة'
              : p.kind === 'tv' && p.season
                ? `S${p.season}·E${p.episode}`
                : undefined
            return (
              <ContinueCard
                key={p.id}
                title={p.title}
                backdrop={p.backdrop || p.poster}
                position={p.position}
                duration={p.duration}
                badge={badge}
                onPlay={() => {
                  if (p.kind === 'channel') {
                    if (p.streamUrl) {
                      open({
                        title: p.title,
                        subtitle: p.channelCategory,
                        logo: p.poster,
                        url: p.streamUrl
                      })
                    }
                  } else {
                    openTmdb({
                      kind: p.kind,
                      tmdbId: p.tmdbId!,
                      title: p.title,
                      backdrop: p.backdrop,
                      season: p.season,
                      episode: p.episode
                    })
                  }
                }}
                onRemove={() => libraryActions.clearProgress(p.id)}
              />
            )
          })}
        </Carousel>
      )}

      {watchlist.length > 0 && (
        <Carousel title={t('home.myList')}>
          {watchlist.map((it) => (
            <PosterCard
              key={it.id}
              title={it.title}
              imageUrl={it.poster}
              onClick={() => {
                if (it.kind === 'movie' && it.tmdbId) navigate(`/details/movie/${it.tmdbId}`)
                else if (it.kind === 'tv' && it.tmdbId) navigate(`/details/tv/${it.tmdbId}`)
              }}
              libItem={{
                kind: it.kind,
                tmdbId: it.tmdbId,
                title: it.title,
                poster: it.poster,
                backdrop: it.backdrop,
                year: it.year
              }}
            />
          ))}
        </Carousel>
      )}

      {favorites.length > 0 && (
        <Carousel title={t('home.favorites')}>
          {favorites.map((it) => (
            <PosterCard
              key={it.id}
              title={it.title}
              imageUrl={it.poster}
              onClick={() => {
                if (it.kind === 'movie' && it.tmdbId) navigate(`/details/movie/${it.tmdbId}`)
                else if (it.kind === 'tv' && it.tmdbId) navigate(`/details/tv/${it.tmdbId}`)
              }}
              libItem={{
                kind: it.kind,
                tmdbId: it.tmdbId,
                title: it.title,
                poster: it.poster,
                backdrop: it.backdrop,
                year: it.year
              }}
            />
          ))}
        </Carousel>
      )}

      {recs.items.length > 0 && (
        <Carousel title={t('home.becauseYouLiked')}>
          {recs.items.map((r: any) => {
            const isTv = r._kind === 'tv'
            const title = isTv ? r.name : r.title
            return (
              <PosterCard
                key={`rec-${r.id}`}
                title={title}
                imageUrl={posterUrl(r.poster_path)}
                rating={r.vote_average}
                onClick={() =>
                  navigate(`/details/${isTv ? 'tv' : 'movie'}/${r.id}`)
                }
                libItem={{
                  kind: isTv ? 'tv' : 'movie',
                  tmdbId: r.id,
                  title,
                  poster: posterUrl(r.poster_path),
                  backdrop: backdropUrl(r.backdrop_path, 'w780'),
                  year: (isTv ? r.first_air_date : r.release_date)?.slice(0, 4)
                }}
              />
            )
          })}
        </Carousel>
      )}

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
              onClick={() => openMovie(m)}
              libItem={movieLib(m)}
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
              onClick={() => openMovie(m)}
              libItem={movieLib(m)}
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
              onClick={() => openMovie(m)}
              libItem={movieLib(m)}
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
              onClick={() => openTv(s)}
              libItem={tvLib(s)}
            />
          ))
        )}
      </Carousel>
    </div>
  )
}
