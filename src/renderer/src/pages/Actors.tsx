import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, Loader2, UserRound } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { tmdbApi } from '@/services/tmdb'
import { profileUrl, type TmdbPerson } from '@shared/tmdb'
import { useDebounced } from '@/features/search/useSearch'

export default function Actors() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'ku' ? 'ar' : i18n.language
  const [popular, setPopular] = useState<TmdbPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query, 300)
  const [searchResults, setSearchResults] = useState<TmdbPerson[] | null>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    tmdbApi
      .popularPeople(1, lang)
      .then((res) => {
        if (!cancelled) {
          setPopular(res.results || [])
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
  }, [lang])

  useEffect(() => {
    if (!debounced.trim()) {
      setSearchResults(null)
      return
    }
    let cancelled = false
    setSearching(true)
    tmdbApi
      .searchPeople(debounced, lang)
      .then((res) => {
        if (!cancelled) {
          setSearchResults(res.results || [])
          setSearching(false)
        }
      })
      .catch(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [debounced, lang])

  const list = useMemo(() => searchResults ?? popular, [searchResults, popular])

  return (
    <div>
      <PageHeader title={t('nav.actors')} />
      <div className="px-8 mb-6 max-w-md">
        <div className="relative">
          <SearchIcon className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-ink-300" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن ممثّل…"
            className="w-full bg-ink-700/40 ring-1 ring-ink-600/50 rounded-xl ps-10 pe-3 py-2 text-sm placeholder:text-ink-300 focus:outline-none focus:ring-brand-500"
          />
          {searching && (
            <Loader2 className="absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 animate-spin text-ink-300" />
          )}
        </div>
      </div>

      {error && (
        <p className="px-8 text-rose-300 text-sm">{error}</p>
      )}

      <div className="px-8 grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-5 pb-10">
        {loading
          ? Array.from({ length: 27 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <Skeleton className="w-24 h-24 rounded-full" />
                <Skeleton className="h-3 w-20 mt-3" />
              </div>
            ))
          : list.map((p) => (
              <Link
                key={p.id}
                to={`/actors/${p.id}`}
                className="flex flex-col items-center group"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden bg-ink-700/40 ring-1 ring-ink-600/40 group-hover:ring-brand-500 transition">
                  {p.profile_path ? (
                    <img
                      src={profileUrl(p.profile_path)}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-ink-300">
                      <UserRound className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <p className="mt-3 text-xs font-semibold text-center line-clamp-1">
                  {p.name}
                </p>
                {p.known_for_department && (
                  <p className="text-[10px] text-ink-300 text-center">
                    {p.known_for_department}
                  </p>
                )}
              </Link>
            ))}
        {!loading && list.length === 0 && (
          <p className="col-span-full text-center text-ink-300 py-10">لا توجد نتائج</p>
        )}
      </div>
    </div>
  )
}
