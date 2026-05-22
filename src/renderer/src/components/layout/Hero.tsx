import { motion } from 'framer-motion'
import { Play, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TmdbMovie } from '@shared/tmdb'
import { backdropUrl } from '@shared/tmdb'

type Props = {
  movie?: TmdbMovie | null
  onPlay?: () => void
}

export default function Hero({ movie, onPlay }: Props) {
  const { t } = useTranslation()
  const backdrop = movie ? backdropUrl(movie.backdrop_path, 'w1280') : ''
  const title = movie?.title ?? t('app.name')
  const overview =
    movie?.overview ??
    'منصة شاملة للقنوات المباشرة والأفلام والمسلسلات. ابدأ المشاهدة الآن.'

  return (
    <section className="relative h-[58vh] min-h-[420px] overflow-hidden">
      {backdrop && (
        <motion.img
          key={backdrop}
          src={backdrop}
          alt=""
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-transparent to-ink-900/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-transparent" />
      <div className="absolute inset-y-0 start-0 w-2/3 bg-gradient-to-e from-ink-900/90 via-ink-900/40 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative h-full flex flex-col justify-end p-10 max-w-3xl"
      >
        <span className="inline-block text-xs font-bold tracking-widest text-brand-400 uppercase mb-3">
          {movie ? 'الأكثر رواجاً' : 'Featured'}
        </span>
        <h2 className="text-5xl font-extrabold leading-tight mb-4 line-clamp-2">{title}</h2>
        {movie && (
          <div className="flex items-center gap-3 text-sm text-ink-200 mb-3">
            {movie.vote_average > 0 && (
              <span className="font-semibold text-amber-300">
                ★ {movie.vote_average.toFixed(1)}
              </span>
            )}
            {movie.release_date && <span>{movie.release_date.slice(0, 4)}</span>}
          </div>
        )}
        <p className="text-ink-200 max-w-xl mb-6 leading-relaxed line-clamp-3">{overview}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={onPlay}
            disabled={!onPlay}
            className="flex items-center gap-2 bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-ink-100 disabled:opacity-60 transition-colors"
          >
            <Play className="w-5 h-5 fill-black" />
            {t('common.play')}
          </button>
          <button className="flex items-center gap-2 bg-ink-700/60 backdrop-blur text-white font-semibold px-6 py-3 rounded-xl hover:bg-ink-700/90 transition-colors">
            <Info className="w-5 h-5" />
            {t('common.moreInfo')}
          </button>
        </div>
      </motion.div>
    </section>
  )
}
