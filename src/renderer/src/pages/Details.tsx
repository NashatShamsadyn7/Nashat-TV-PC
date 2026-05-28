import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Play,
  Film,
  Heart,
  Plus,
  Check,
  Star,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Tv as TvIcon,
  ListVideo,
  Users,
  Languages
} from 'lucide-react'
import { useDubVotes } from '@/features/arabic/useDubVotes'
import { tmdbApi } from '@/services/tmdb'
import {
  posterUrl,
  backdropUrl,
  profileUrl,
  stillUrl,
  youtubeEmbedUrl,
  type TmdbMovieDetails,
  type TmdbTvDetails,
  type TmdbSeasonDetails,
  type TmdbCastMember,
  type TmdbVideo
} from '@shared/tmdb'
import { usePlayerStore } from '@/stores/playerStore'
import { useLibraryStore, libraryActions } from '@/stores/libraryStore'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { createRoom } from '@/features/watchTogether/useRoom'
import { makeLibraryId, type LibraryItem } from '@/features/library/types'
import { cn } from '@/lib/cn'

type Kind = 'movie' | 'tv'

function pickTrailer(videos: TmdbVideo[] | undefined): TmdbVideo | null {
  if (!videos || videos.length === 0) return null
  const youtube = videos.filter((v) => v.site === 'YouTube')
  const officialTrailer = youtube.find((v) => v.type === 'Trailer' && v.official)
  if (officialTrailer) return officialTrailer
  const anyTrailer = youtube.find((v) => v.type === 'Trailer')
  if (anyTrailer) return anyTrailer
  const teaser = youtube.find((v) => v.type === 'Teaser')
  if (teaser) return teaser
  return youtube[0] ?? null
}

function TrailerModal({ videoKey, onClose }: { videoKey: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm grid place-items-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden ring-1 ring-ink-600/40 bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={youtubeEmbedUrl(videoKey, true)}
          title="Trailer"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    </div>
  )
}

function CastRow({ cast }: { cast: TmdbCastMember[] }) {
  const navigate = useNavigate()
  if (!cast || cast.length === 0) return null
  return (
    <section className="mt-8">
      <h2 className="px-8 text-xl font-bold mb-3">طاقم العمل</h2>
      <div
        className="flex gap-4 px-8 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {cast.slice(0, 30).map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/actors/${p.id}`)}
            className="w-28 shrink-0 text-center group"
          >
            <div className="w-28 h-28 rounded-full overflow-hidden bg-ink-700/40 ring-1 ring-ink-600/40 group-hover:ring-brand-500 transition">
              {p.profile_path ? (
                <img
                  src={profileUrl(p.profile_path)}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-ink-700 to-ink-800" />
              )}
            </div>
            <p className="mt-2 text-xs font-semibold line-clamp-1">{p.name}</p>
            {p.character && (
              <p className="text-[10px] text-ink-300 line-clamp-1">{p.character}</p>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}

function EpisodesPanel({
  tvId,
  totalSeasons,
  title,
  backdrop,
  initialSeason,
  language
}: {
  tvId: number
  totalSeasons: number
  title: string
  backdrop?: string
  initialSeason: number
  language: string
}) {
  const seasons = useMemo(
    () => Array.from({ length: totalSeasons }, (_, i) => i + 1),
    [totalSeasons]
  )
  const [season, setSeason] = useState(initialSeason || 1)
  const [data, setData] = useState<TmdbSeasonDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const openTmdb = usePlayerStore((s) => s.openTmdb)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    tmdbApi
      .tvSeason(tvId, season, language)
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [tvId, season, language])

  const playEpisode = (epNumber: number) => {
    openTmdb({
      kind: 'tv',
      tmdbId: tvId,
      title,
      backdrop,
      season,
      episode: epNumber,
      subtitle: `S${season} · E${epNumber}`
    })
  }

  return (
    <section className="mt-10 px-8">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ListVideo className="w-5 h-5 text-brand-400" />
          الحلقات
        </h2>
        {seasons.length > 1 ? (
          <select
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="bg-ink-700/60 ring-1 ring-ink-600/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-brand-500"
          >
            {seasons.map((s) => (
              <option key={s} value={s}>
                الموسم {s}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-ink-300">الموسم {season}</span>
        )}
      </div>

      {loading && (
        <div className="py-8 text-center text-ink-300 text-sm">
          <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
          جارٍ تحميل حلقات الموسم {season}…
        </div>
      )}

      {error && (
        <div className="text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {!loading && data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.episodes.map((ep) => (
            <button
              key={ep.id}
              onClick={() => playEpisode(ep.episode_number)}
              className="group flex gap-3 p-3 rounded-xl bg-ink-700/30 hover:bg-ink-700/60 ring-1 ring-ink-600/40 hover:ring-brand-500/60 text-start transition"
            >
              <div className="relative w-32 aspect-video rounded-lg overflow-hidden bg-ink-800 shrink-0">
                {ep.still_path ? (
                  <img
                    src={stillUrl(ep.still_path)}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-ink-700 to-ink-800" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 grid place-items-center transition">
                  <Play className="w-7 h-7 fill-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm line-clamp-1">
                  E{ep.episode_number} · {ep.name}
                </p>
                {ep.air_date && (
                  <p className="text-[11px] text-ink-300 mt-0.5">{ep.air_date}</p>
                )}
                <p className="text-xs text-ink-300 mt-1 line-clamp-2">{ep.overview}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

export default function Details() {
  const { kind, id } = useParams<{ kind: Kind; id: string }>()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const lang = i18n.language === 'ku' ? 'ar' : i18n.language
  const [data, setData] = useState<TmdbMovieDetails | TmdbTvDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trailerKey, setTrailerKey] = useState<string | null>(null)

  const tmdbId = Number(id)
  const isMovie = kind === 'movie'
  const isTv = kind === 'tv'

  const openTmdb = usePlayerStore((s) => s.openTmdb)
  const user = useAuthStore((s) => s.user)
  const setActiveRoom = useRoomStore((s) => s.setActive)
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [roomError, setRoomError] = useState<string | null>(null)
  const itemId = kind && tmdbId ? makeLibraryId(kind, tmdbId) : null
  const inWatchlist = useLibraryStore((s) =>
    itemId ? s.watchlist.some((i) => i.id === itemId) : false
  )
  const isFav = useLibraryStore((s) =>
    itemId ? s.favorites.some((i) => i.id === itemId) : false
  )
  // Community "this title has an Arabic dub" votes. Anyone can vote; the
  // Arabic page merges these with the curated seed list.
  const dubVotes = useDubVotes(kind === 'tv' ? 'tv' : 'movie')
  const isDubVoted = tmdbId ? dubVotes.mine.has(tmdbId) : false
  const dubCount = tmdbId ? dubVotes.counts[tmdbId] ?? 0 : 0

  useEffect(() => {
    if (!kind || !tmdbId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setData(null)
    const fetcher =
      kind === 'movie' ? tmdbApi.movieDetails(tmdbId, lang) : tmdbApi.tvDetails(tmdbId, lang)
    fetcher
      .then((d) => {
        if (!cancelled) {
          setData(d as TmdbMovieDetails | TmdbTvDetails)
          setLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [kind, tmdbId, lang])

  if (!kind || !tmdbId || (kind !== 'movie' && kind !== 'tv')) {
    return <div className="p-8 text-rose-300">معطيات غير صحيحة</div>
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-ink-300">
        <Loader2 className="w-10 h-10 mx-auto animate-spin mb-4" />
        جارٍ تحميل التفاصيل…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <p className="font-semibold mb-2">تعذّر تحميل التفاصيل</p>
        <p className="text-ink-300 text-sm">{error}</p>
      </div>
    )
  }

  const title = isMovie ? (data as TmdbMovieDetails).title : (data as TmdbTvDetails).name
  const releaseDate = isMovie
    ? (data as TmdbMovieDetails).release_date
    : (data as TmdbTvDetails).first_air_date
  const year = releaseDate?.slice(0, 4)
  const runtime = isMovie ? (data as TmdbMovieDetails).runtime : null
  const tvDetails = isTv ? (data as TmdbTvDetails) : null
  const trailer = pickTrailer(data.videos?.results)
  const cast = data.credits?.cast ?? []

  const playMain = () => {
    if (isMovie) {
      openTmdb({
        kind: 'movie',
        tmdbId,
        title,
        subtitle: year,
        backdrop: backdropUrl(data.backdrop_path)
      })
    } else {
      openTmdb({
        kind: 'tv',
        tmdbId,
        title,
        subtitle: year,
        backdrop: backdropUrl(data.backdrop_path),
        season: 1,
        episode: 1
      })
    }
  }

  const watchWithFriends = async () => {
    if (!user) {
      setRoomError('سجّل دخولك أولاً لإنشاء غرفة')
      return
    }
    setRoomError(null)
    setCreatingRoom(true)
    try {
      const mediaId = isMovie ? `movie:${tmdbId}` : `tv:${tmdbId}:1:1`
      const backdrop = backdropUrl(data.backdrop_path)
      // Firebase RTDB rejects writes containing undefined; only include
      // optional fields when they actually have a value.
      const media: Record<string, unknown> = {
        kind: isMovie ? 'movie' : 'tv',
        mediaId,
        title,
        tmdbId
      }
      if (!isMovie) {
        media.season = 1
        media.episode = 1
      }
      if (backdrop) media.backdrop = backdrop
      if (year) media.subtitle = year

      const id = await createRoom({
        mediaId,
        mediaTitle: title,
        kind: isMovie ? 'movie' : 'tv',
        media: media as Parameters<typeof createRoom>[0]['media']
      })
      setActiveRoom(id)
      navigate('/together')
    } catch (err) {
      console.error('[details] createRoom failed:', err)
      setRoomError((err as Error)?.message ?? 'فشل إنشاء الغرفة')
    } finally {
      setCreatingRoom(false)
    }
  }

  const libItem: LibraryItem = {
    id: itemId!,
    kind: kind as Kind,
    tmdbId,
    title,
    poster: posterUrl(data.poster_path),
    backdrop: backdropUrl(data.backdrop_path, 'w780'),
    year,
    addedAt: Date.now()
  }

  return (
    <div className="pb-16">
      <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
        {data.backdrop_path ? (
          <img
            src={backdropUrl(data.backdrop_path, 'original')}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-ink-700 to-ink-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/60 to-ink-900/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900/80 to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 start-4 w-10 h-10 grid place-items-center rounded-full bg-black/50 hover:bg-black/80 backdrop-blur"
        >
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </button>

        <div className="absolute bottom-0 inset-x-0 p-8 flex items-end gap-6">
          <div className="hidden md:block w-44 shrink-0 aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-ink-600/40 bg-ink-800">
            {data.poster_path ? (
              <img
                src={posterUrl(data.poster_path, 'w500')}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-ink-700 to-ink-800" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-extrabold drop-shadow">{title}</h1>
            <div className="mt-2 flex items-center flex-wrap gap-3 text-sm text-ink-200">
              {data.vote_average > 0 && (
                <span className="flex items-center gap-1 text-amber-300">
                  <Star className="w-4 h-4 fill-amber-300" />
                  {data.vote_average.toFixed(1)}
                </span>
              )}
              {year && <span>{year}</span>}
              {runtime && <span>{runtime} د</span>}
              {tvDetails && (
                <span>
                  {tvDetails.number_of_seasons} مواسم · {tvDetails.number_of_episodes} حلقة
                </span>
              )}
              {data.genres && data.genres.length > 0 && (
                <span className="opacity-80">
                  {data.genres
                    .slice(0, 3)
                    .map((g) => g.name)
                    .join(' · ')}
                </span>
              )}
            </div>
            <p className="mt-3 text-ink-100 max-w-3xl line-clamp-4">{data.overview}</p>

            <div className="mt-5 flex items-center flex-wrap gap-3">
              <button
                onClick={playMain}
                className="flex items-center gap-2 bg-white text-black hover:bg-ink-100 font-bold px-6 py-2.5 rounded-xl transition"
              >
                <Play className="w-5 h-5 fill-black" />
                تشغيل
              </button>
              <button
                onClick={watchWithFriends}
                disabled={creatingRoom}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl transition"
              >
                {creatingRoom ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Users className="w-5 h-5" />
                )}
                {creatingRoom ? 'جاري الإنشاء…' : 'مع الأصدقاء'}
              </button>
              <button
                onClick={() => trailer && setTrailerKey(trailer.key)}
                disabled={!trailer}
                className={cn(
                  'flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl transition',
                  trailer
                    ? 'bg-ink-700/60 hover:bg-ink-700/90 text-white'
                    : 'bg-ink-700/30 text-ink-400 cursor-not-allowed'
                )}
              >
                <Film className="w-5 h-5" />
                {trailer ? 'العرض الدعائي' : 'لا يوجد عرض'}
              </button>
              <button
                onClick={() => libraryActions.toggleFavorite(libItem)}
                title={isFav ? 'إزالة من المفضّلة' : 'إضافة للمفضّلة'}
                className={cn(
                  'w-11 h-11 grid place-items-center rounded-full transition ring-1',
                  isFav
                    ? 'bg-rose-500/20 ring-rose-500 text-rose-300'
                    : 'bg-ink-700/40 ring-ink-600/40 hover:bg-ink-700/70'
                )}
              >
                <Heart className={cn('w-5 h-5', isFav && 'fill-rose-400 text-rose-400')} />
              </button>
              <button
                onClick={() => libraryActions.toggleWatchlist(libItem)}
                title={inWatchlist ? 'إزالة من القائمة' : 'إضافة إلى قائمتي'}
                className={cn(
                  'w-11 h-11 grid place-items-center rounded-full transition ring-1',
                  inWatchlist
                    ? 'bg-brand-500/20 ring-brand-500 text-brand-300'
                    : 'bg-ink-700/40 ring-ink-600/40 hover:bg-ink-700/70'
                )}
              >
                {inWatchlist ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
              <button
                onClick={() => user && dubVotes.toggle(tmdbId)}
                disabled={!user}
                title={
                  !user
                    ? 'سجّل الدخول للتصويت'
                    : isDubVoted
                      ? 'إلغاء التصويت'
                      : 'هذا العمل له دبلجة عربية'
                }
                className={cn(
                  'h-11 px-3 flex items-center gap-2 rounded-full transition ring-1 text-xs font-semibold',
                  isDubVoted
                    ? 'bg-emerald-500/20 ring-emerald-500 text-emerald-300'
                    : 'bg-ink-700/40 ring-ink-600/40 hover:bg-ink-700/70 disabled:opacity-50'
                )}
              >
                <Languages className="w-4 h-4" />
                <span>{isDubVoted ? 'مدبلج ✓' : 'مدبلج؟'}</span>
                {dubCount > 0 && (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                    isDubVoted ? 'bg-emerald-500/30' : 'bg-ink-800/80'
                  )}>
                    {dubCount}
                  </span>
                )}
              </button>
            </div>
            {roomError && (
              <div className="mt-3 inline-block text-xs text-rose-300 bg-rose-500/10 ring-1 ring-rose-500/30 rounded-lg px-3 py-1.5">
                {roomError}
              </div>
            )}
          </div>
        </div>
      </div>

      {isTv && tvDetails && tvDetails.number_of_seasons > 0 && (
        <EpisodesPanel
          tvId={tmdbId}
          totalSeasons={tvDetails.number_of_seasons}
          title={title}
          backdrop={backdropUrl(data.backdrop_path)}
          initialSeason={1}
          language={lang}
        />
      )}

      <CastRow cast={cast} />

      {(() => {
        const recs = data.recommendations?.results ?? []
        if (recs.length === 0) return null
        return (
          <section className="mt-10">
            <h2 className="px-8 text-xl font-bold mb-3">قد يعجبك أيضاً</h2>
            <div
              className="flex gap-4 px-8 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none' }}
            >
              {recs.slice(0, 18).map((r: any) => {
                const rIsTv = !!r.name
                const rTitle = rIsTv ? r.name : r.title
                return (
                  <Link
                    key={`rec-${r.id}`}
                    to={`/details/${rIsTv ? 'tv' : 'movie'}/${r.id}`}
                    className="w-36 shrink-0 group"
                  >
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-ink-700/40 ring-1 ring-ink-600/40 group-hover:ring-brand-500 transition">
                      {r.poster_path ? (
                        <img
                          src={posterUrl(r.poster_path)}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-ink-700 to-ink-800 grid place-items-center text-ink-300">
                          {rIsTv ? <TvIcon className="w-6 h-6" /> : <Film className="w-6 h-6" />}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs font-medium line-clamp-1">{rTitle}</p>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })()}

      {trailerKey && <TrailerModal videoKey={trailerKey} onClose={() => setTrailerKey(null)} />}
    </div>
  )
}
