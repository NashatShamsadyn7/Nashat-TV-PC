import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2, AlertCircle, UserRound, Film, Tv as TvIcon } from 'lucide-react'
import { tmdbApi } from '@/services/tmdb'
import {
  profileUrl,
  posterUrl,
  type TmdbPersonDetails,
  type TmdbPersonCredits
} from '@shared/tmdb'

export default function ActorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const lang = i18n.language === 'ku' ? 'ar' : i18n.language
  const personId = Number(id)

  const [person, setPerson] = useState<TmdbPersonDetails | null>(null)
  const [credits, setCredits] = useState<TmdbPersonCredits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!personId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      tmdbApi.personDetails(personId, lang),
      tmdbApi.personCombinedCredits(personId, lang)
    ])
      .then(([p, c]) => {
        if (!cancelled) {
          setPerson(p)
          setCredits(c)
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
  }, [personId, lang])

  const filmography = useMemo(() => {
    if (!credits) return []
    return [...credits.cast]
      .filter((c) => c.poster_path)
      .sort((a: any, b: any) => {
        const da = a.release_date || a.first_air_date || ''
        const db = b.release_date || b.first_air_date || ''
        return db.localeCompare(da)
      })
      .slice(0, 40)
  }, [credits])

  if (!personId) return <div className="p-8 text-rose-300">معرّف غير صحيح</div>

  if (loading) {
    return (
      <div className="p-16 text-center text-ink-300">
        <Loader2 className="w-10 h-10 mx-auto animate-spin mb-3" />
        جارٍ التحميل…
      </div>
    )
  }

  if (error || !person) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <p className="font-semibold mb-2">تعذّر تحميل بيانات الممثّل</p>
        <p className="text-ink-300 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="pb-16">
      <button
        onClick={() => navigate(-1)}
        className="m-4 w-10 h-10 grid place-items-center rounded-full bg-ink-700/40 hover:bg-ink-700/80"
      >
        <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
      </button>

      <div className="px-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 items-start">
        <div className="w-full max-w-[200px] aspect-[2/3] rounded-xl overflow-hidden bg-ink-700/40 ring-1 ring-ink-600/40">
          {person.profile_path ? (
            <img src={profileUrl(person.profile_path, 'h632')} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-ink-300">
              <UserRound className="w-16 h-16" />
            </div>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-extrabold">{person.name}</h1>
          {person.known_for_department && (
            <p className="text-ink-300 mt-1">{person.known_for_department}</p>
          )}
          <div className="mt-3 text-sm text-ink-200 space-y-1">
            {person.birthday && (
              <p>
                <span className="text-ink-300">تاريخ الميلاد: </span>
                {person.birthday}
                {person.deathday && ` — ${person.deathday}`}
              </p>
            )}
            {person.place_of_birth && (
              <p>
                <span className="text-ink-300">مكان الميلاد: </span>
                {person.place_of_birth}
              </p>
            )}
          </div>
          {person.biography && (
            <p className="mt-4 text-ink-100 leading-relaxed max-w-3xl whitespace-pre-line">
              {person.biography}
            </p>
          )}
        </div>
      </div>

      {filmography.length > 0 && (
        <section className="mt-10">
          <h2 className="px-8 text-xl font-bold mb-3">الأعمال الفنية</h2>
          <div className="px-8 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {filmography.map((c: any) => {
              const isTv = c.media_type === 'tv'
              const title = isTv ? c.name : c.title
              const date = isTv ? c.first_air_date : c.release_date
              return (
                <Link
                  key={`${c.media_type}-${c.id}-${c.character}`}
                  to={`/details/${isTv ? 'tv' : 'movie'}/${c.id}`}
                  className="group"
                >
                  <div className="aspect-[2/3] rounded-xl overflow-hidden bg-ink-700/40 ring-1 ring-ink-600/40 group-hover:ring-brand-500 transition">
                    {c.poster_path ? (
                      <img
                        src={posterUrl(c.poster_path)}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-ink-300">
                        {isTv ? <TvIcon className="w-6 h-6" /> : <Film className="w-6 h-6" />}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs font-semibold line-clamp-1">{title}</p>
                  {c.character && (
                    <p className="text-[10px] text-ink-300 line-clamp-1">{c.character}</p>
                  )}
                  {date && <p className="text-[10px] text-ink-400">{date.slice(0, 4)}</p>}
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
