import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, X, Clock, Tv, Film, Loader2, Mic, MicOff } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { useChannels } from '@/features/livetv/useChannels'
import { useFuzzy, useDebounced, getSearchHistory, pushSearchHistory, clearSearchHistory } from '@/features/search/useSearch'
import { useVoiceSearch } from '@/hooks/useVoiceSearch'
import { tmdbApi } from '@/services/tmdb'
import { posterUrl, type TmdbMovie, type TmdbTv } from '@shared/tmdb'
import type { Channel } from '@shared/types'
import { usePlayerStore } from '@/stores/playerStore'

type TmdbResult = (TmdbMovie & { media_type?: 'movie' }) | (TmdbTv & { media_type?: 'tv' })

function isTv(r: TmdbResult): r is TmdbTv & { media_type?: 'tv' } {
  return 'name' in r
}

export default function SearchPage() {
  const { t, i18n } = useTranslation()
  const { channels } = useChannels()
  const [searchParams] = useSearchParams()
  const initialQ = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQ)

  // Sync external (?q=) → input
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    if (q !== query) setQuery(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
  const [history, setHistory] = useState<string[]>(() => getSearchHistory())
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv' | 'channel'>('all')
  const debounced = useDebounced(query, 300)
  const lang = i18n.language === 'ku' ? 'ar' : i18n.language

  const channelHits = useFuzzy<Channel>(channels, ['name', 'category'], debounced, 20)

  const [tmdbResults, setTmdbResults] = useState<TmdbResult[]>([])
  const [tmdbLoading, setTmdbLoading] = useState(false)
  const [tmdbError, setTmdbError] = useState<string | null>(null)

  const open = usePlayerStore((s) => s.open)
  const navigate = useNavigate()
  const voiceLang = lang === 'ar' ? 'ar-SA' : lang === 'ku' ? 'ar-SA' : 'en-US'
  const voice = useVoiceSearch((text) => setQuery(text), voiceLang)

  useEffect(() => {
    if (!debounced.trim()) {
      setTmdbResults([])
      setTmdbError(null)
      return
    }
    let cancelled = false
    setTmdbLoading(true)
    tmdbApi
      .searchMulti(debounced, lang)
      .then((res) => {
        if (cancelled) return
        const filtered = (res.results || []).filter(
          (r: any) => r.media_type === 'movie' || r.media_type === 'tv'
        ) as TmdbResult[]
        setTmdbResults(filtered.slice(0, 24))
        setTmdbError(null)
        pushSearchHistory(debounced)
        setHistory(getSearchHistory())
      })
      .catch((err: Error) => {
        if (!cancelled) setTmdbError(err.message)
      })
      .finally(() => {
        if (!cancelled) setTmdbLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debounced, lang])

  const showHistory = !query.trim() && history.length > 0

  // Apply the active type filter. TMDB rows carry media_type; channels are a
  // separate bucket. 'all' shows everything.
  const visibleTmdb = tmdbResults.filter((r) =>
    filter === 'all' ? true : (r as any).media_type === filter
  )
  const showChannels = filter === 'all' || filter === 'channel'
  const showTmdb = filter === 'all' || filter === 'movie' || filter === 'tv'

  const FILTERS: Array<{ id: typeof filter; label: string }> = [
    { id: 'all', label: 'الكل' },
    { id: 'movie', label: 'أفلام' },
    { id: 'tv', label: 'مسلسلات' },
    { id: 'channel', label: 'قنوات' }
  ]

  return (
    <div>
      <PageHeader title={t('nav.search')} />
      <div className="px-8">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-ink-300" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في القنوات، الأفلام، المسلسلات…"
              className="w-full bg-ink-700/40 ring-1 ring-ink-600/50 rounded-2xl ps-12 pe-12 py-4 text-lg placeholder:text-ink-300 focus:outline-none focus:ring-brand-500 transition-colors"
            />
            {query ? (
              <button
                onClick={() => setQuery('')}
                className="absolute top-1/2 -translate-y-1/2 end-4 w-8 h-8 grid place-items-center rounded-full hover:bg-ink-700/60"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              voice.supported && (
                <button
                  onClick={() => (voice.listening ? voice.stop() : voice.start())}
                  title={voice.listening ? 'إيقاف' : 'بحث صوتي'}
                  className={`absolute top-1/2 -translate-y-1/2 end-4 w-9 h-9 grid place-items-center rounded-full transition-colors ${
                    voice.listening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-ink-700/40 hover:bg-ink-700/70'
                  }`}
                >
                  {voice.listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )
            )}
          </div>

          {debounced.trim() && (
            <div className="mt-4 flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    filter === f.id
                      ? 'bg-brand-500 text-white'
                      : 'bg-ink-700/40 text-ink-200 hover:bg-ink-700/70'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {showHistory && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-ink-200">عمليات بحث سابقة</h3>
                <button
                  onClick={() => {
                    clearSearchHistory()
                    setHistory([])
                  }}
                  className="text-xs text-ink-300 hover:text-rose-400"
                >
                  مسح
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((h) => (
                  <button
                    key={h}
                    onClick={() => setQuery(h)}
                    className="flex items-center gap-1.5 bg-ink-700/40 hover:bg-ink-700/70 px-3 py-1.5 rounded-full text-xs"
                  >
                    <Clock className="w-3 h-3" />
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {debounced.trim() && (
          <div className="mt-8 max-w-7xl mx-auto space-y-8 pb-10">
            {showChannels && channelHits.length > 0 && (
              <section>
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <Tv className="w-5 h-5 text-brand-400" />
                  قنوات ({channelHits.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {channelHits.map((c) => (
                    <button
                      key={c.id}
                      onClick={() =>
                        open({
                          title: c.name,
                          subtitle: c.category,
                          logo: c.logo,
                          url: c.streamUrl || c.url
                        })
                      }
                      className="flex items-center gap-3 p-3 bg-ink-700/30 hover:bg-ink-700/60 rounded-xl text-start ring-1 ring-ink-600/40"
                    >
                      {c.logo ? (
                        <img src={c.logo} alt="" className="w-12 h-12 rounded-md object-contain bg-ink-800 p-1" />
                      ) : (
                        <Tv className="w-12 h-12 text-ink-300" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{c.name}</p>
                        <p className="text-xs text-ink-300 truncate">{c.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {showTmdb && (
            <section>
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Film className="w-5 h-5 text-brand-400" />
                أفلام ومسلسلات {tmdbLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              </h2>
              {tmdbError && <p className="text-rose-400 text-sm">{tmdbError}</p>}
              {!tmdbLoading && visibleTmdb.length === 0 && !tmdbError && (
                <p className="text-ink-300 text-sm">لا توجد نتائج TMDB</p>
              )}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {visibleTmdb.map((r) => {
                  const title = isTv(r) ? r.name : (r as TmdbMovie).title
                  const year = isTv(r)
                    ? r.first_air_date?.slice(0, 4)
                    : (r as TmdbMovie).release_date?.slice(0, 4)
                  return (
                    <button
                      key={`${(r as any).media_type}-${r.id}`}
                      onClick={() => {
                        if (isTv(r)) navigate(`/details/tv/${r.id}`)
                        else navigate(`/details/movie/${r.id}`)
                      }}
                      className="text-start group"
                    >
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-ink-700/40 ring-1 ring-ink-600/40 group-hover:ring-brand-500">
                        {r.poster_path ? (
                          <img src={posterUrl(r.poster_path)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-ink-700 to-ink-800" />
                        )}
                      </div>
                      <p className="mt-2 text-xs font-medium line-clamp-1">{title}</p>
                      {year && <p className="text-[10px] text-ink-300">{year}</p>}
                    </button>
                  )
                })}
              </div>
            </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
