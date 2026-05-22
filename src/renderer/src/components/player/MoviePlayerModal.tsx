import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Maximize2, RefreshCw } from 'lucide-react'
import { STREAM_SERVERS } from '@/features/player/servers'
import type { TmdbMediaSource } from '@/stores/playerStore'
import { cn } from '@/lib/cn'

type Props = {
  source: TmdbMediaSource | null
  onClose: () => void
}

export default function MoviePlayerModal({ source, onClose }: Props) {
  const [serverIdx, setServerIdx] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setServerIdx(0)
    setReloadKey(0)
  }, [source?.tmdbId, source?.season, source?.episode])

  const url = useMemo(() => {
    if (!source) return ''
    return STREAM_SERVERS[serverIdx].build({
      kind: source.kind,
      tmdbId: source.tmdbId,
      season: source.season,
      episode: source.episode
    })
  }, [source, serverIdx])

  useEffect(() => {
    if (!source) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ']') setServerIdx((i) => (i + 1) % STREAM_SERVERS.length)
      if (e.key === '[')
        setServerIdx((i) => (i - 1 + STREAM_SERVERS.length) % STREAM_SERVERS.length)
      if (e.key === 'r' || e.key === 'R') setReloadKey((k) => k + 1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [source, onClose])

  const goPrev = () =>
    setServerIdx((i) => (i - 1 + STREAM_SERVERS.length) % STREAM_SERVERS.length)
  const goNext = () => setServerIdx((i) => (i + 1) % STREAM_SERVERS.length)

  return createPortal(
    <AnimatePresence>
      {source && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col"
        >
          <header className="flex items-center gap-3 p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg truncate">{source.title}</h2>
              {source.subtitle && (
                <p className="text-xs text-ink-300">{source.subtitle}</p>
              )}
            </div>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              title="إعادة التحميل (R)"
              className="w-10 h-10 grid place-items-center rounded-xl text-ink-200 hover:text-white hover:bg-ink-700/40 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const iframe = document.getElementById('movie-iframe') as HTMLIFrameElement | null
                iframe?.requestFullscreen().catch(() => {})
              }}
              title="ملء الشاشة"
              className="w-10 h-10 grid place-items-center rounded-xl text-ink-200 hover:text-white hover:bg-ink-700/40 transition-colors"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              title="إغلاق (Esc)"
              className="w-10 h-10 grid place-items-center rounded-xl text-ink-200 hover:text-white hover:bg-ink-700/40 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="px-4 pb-3 flex items-center gap-2">
            <button
              onClick={goPrev}
              title="سيرفر سابق ([)"
              className="w-9 h-9 grid place-items-center rounded-full bg-ink-700/40 hover:bg-ink-700/70"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <div className="flex gap-2 min-w-min">
                {STREAM_SERVERS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setServerIdx(i)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                      i === serverIdx
                        ? 'bg-brand-500 text-white'
                        : 'bg-ink-700/40 text-ink-200 hover:bg-ink-700/70'
                    )}
                  >
                    {i + 1}. {s.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={goNext}
              title="سيرفر تالي (])"
              className="w-9 h-9 grid place-items-center rounded-full bg-ink-700/40 hover:bg-ink-700/70"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 bg-black">
            <iframe
              id="movie-iframe"
              key={`${serverIdx}-${reloadKey}`}
              src={url}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups-to-escape-sandbox"
            />
          </div>

          <footer className="px-4 py-2 text-center text-xs text-ink-400">
            لا يعمل السيرفر؟ اضغط <kbd className="bg-ink-700/50 rounded px-1.5 py-0.5">]</kbd> للتالي
            · <kbd className="bg-ink-700/50 rounded px-1.5 py-0.5">R</kbd> إعادة تحميل
            · <kbd className="bg-ink-700/50 rounded px-1.5 py-0.5">Esc</kbd> إغلاق
          </footer>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
