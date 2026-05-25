import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  Maximize2,
  RefreshCw,
  Check,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import type { TmdbMediaSource } from '@/stores/playerStore'
import { libraryActions } from '@/stores/libraryStore'
import { makeProgressId } from '@/features/library/types'
import {
  sortByHealth,
  useServerHealth,
  type ServerStatus
} from '@/features/player/useServerHealth'
import { cn } from '@/lib/cn'

type Props = {
  source: TmdbMediaSource | null
  onClose: () => void
}

function StatusDot({ status }: { status: ServerStatus }) {
  if (status === 'checking') {
    return <Loader2 className="w-3.5 h-3.5 text-sky-300 animate-spin shrink-0" />
  }
  if (status === 'ok') {
    return <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
  }
  return <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
}

export default function MoviePlayerModal({ source, onClose }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [autoPicked, setAutoPicked] = useState(false)

  const healthArgs = useMemo(
    () =>
      source
        ? {
            kind: source.kind,
            tmdbId: source.tmdbId,
            season: source.season,
            episode: source.episode
          }
        : null,
    [source]
  )

  const servers = useServerHealth(healthArgs)
  const sorted = useMemo(() => sortByHealth(servers), [servers])

  // Reset on new media
  useEffect(() => {
    setActiveId(null)
    setAutoPicked(false)
    setReloadKey(0)
  }, [source?.tmdbId, source?.kind, source?.season, source?.episode])

  // Record into "Continue Watching" the moment a media item opens.
  useEffect(() => {
    if (!source) return
    const id = makeProgressId(source.kind, source.tmdbId, source.season, source.episode)
    libraryActions.recordProgress({
      id,
      kind: source.kind,
      tmdbId: source.tmdbId,
      title: source.title,
      backdrop: source.backdrop,
      season: source.season,
      episode: source.episode,
      position: 0,
      duration: 0,
      updatedAt: Date.now()
    })
  }, [source?.tmdbId, source?.kind, source?.season, source?.episode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-pick the first working server the moment one resolves
  useEffect(() => {
    if (autoPicked || activeId) return
    const firstWorking = sorted.find((s) => s.status === 'ok')
    if (firstWorking) {
      setActiveId(firstWorking.id)
      setAutoPicked(true)
    }
  }, [sorted, autoPicked, activeId])

  const active = activeId ? servers.find((s) => s.id === activeId) : null
  const url = active?.url ?? ''

  // Keyboard shortcuts
  useEffect(() => {
    if (!source) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'r' || e.key === 'R') setReloadKey((k) => k + 1)
      if (e.key === ']' || e.key === '[') {
        const idx = sorted.findIndex((s) => s.id === activeId)
        if (idx < 0) return
        const next = e.key === ']' ? idx + 1 : idx - 1
        const wrapped = (next + sorted.length) % sorted.length
        setActiveId(sorted[wrapped].id)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [source, sorted, activeId, onClose])

  const stats = useMemo(() => {
    const checking = servers.filter((s) => s.status === 'checking').length
    const ok = servers.filter((s) => s.status === 'ok').length
    const fail = servers.filter((s) => s.status === 'fail').length
    return { checking, ok, fail }
  }, [servers])

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
              <p className="text-xs text-ink-300">
                {source.subtitle}
                {source.subtitle && ' · '}
                <span className="text-emerald-400">✓ {stats.ok}</span>{' '}
                <span className="text-sky-300">⟳ {stats.checking}</span>{' '}
                <span className="text-rose-400">✕ {stats.fail}</span>
              </p>
            </div>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              title="إعادة التحميل (R)"
              className="w-10 h-10 grid place-items-center rounded-xl text-ink-200 hover:text-white hover:bg-ink-700/40 transition-colors"
              disabled={!activeId}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const iframe = document.getElementById(
                  'movie-iframe'
                ) as HTMLIFrameElement | null
                iframe?.requestFullscreen().catch(() => {})
              }}
              title="ملء الشاشة"
              className="w-10 h-10 grid place-items-center rounded-xl text-ink-200 hover:text-white hover:bg-ink-700/40 transition-colors"
              disabled={!activeId}
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
              onClick={() => {
                const idx = sorted.findIndex((s) => s.id === activeId)
                if (idx < 0) return
                const prev = (idx - 1 + sorted.length) % sorted.length
                setActiveId(sorted[prev].id)
              }}
              title="سابق ([)"
              disabled={!activeId}
              className="w-9 h-9 grid place-items-center rounded-full bg-ink-700/40 hover:bg-ink-700/70 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div
              className="flex-1 overflow-x-auto"
              style={{ scrollbarWidth: 'none' }}
            >
              <div className="flex gap-2 min-w-min">
                {sorted.map((s) => {
                  const isActive = s.id === activeId
                  const tone =
                    s.status === 'ok'
                      ? 'ring-emerald-500/40'
                      : s.status === 'fail'
                        ? 'ring-rose-500/40 opacity-60'
                        : 'ring-sky-500/30'
                  return (
                    <button
                      key={s.id}
                      onClick={() => s.status !== 'fail' && setActiveId(s.id)}
                      disabled={s.status === 'fail'}
                      title={
                        s.latencyMs !== undefined ? `${s.latencyMs}ms` : 'يفحص…'
                      }
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ring-1 transition-colors',
                        tone,
                        isActive
                          ? 'bg-brand-500 text-white ring-brand-400'
                          : 'bg-ink-700/40 text-ink-100 hover:bg-ink-700/70'
                      )}
                    >
                      <StatusDot status={s.status} />
                      <span>{s.label}</span>
                      {s.status === 'ok' && s.latencyMs !== undefined && (
                        <span className="text-ink-300/80 text-[10px]">
                          {s.latencyMs}ms
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            <button
              onClick={() => {
                const idx = sorted.findIndex((s) => s.id === activeId)
                if (idx < 0) return
                const next = (idx + 1) % sorted.length
                setActiveId(sorted[next].id)
              }}
              title="تالي (])"
              disabled={!activeId}
              className="w-9 h-9 grid place-items-center rounded-full bg-ink-700/40 hover:bg-ink-700/70 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 bg-black grid place-items-center">
            {!activeId && stats.ok === 0 && stats.checking > 0 && (
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-brand-400 animate-spin mx-auto mb-3" />
                <p className="font-semibold">جارٍ فحص السيرفرات…</p>
                <p className="text-ink-300 text-sm mt-1">
                  سنختار أسرعها تلقائياً
                </p>
              </div>
            )}
            {!activeId && stats.ok === 0 && stats.checking === 0 && (
              <div className="text-center max-w-md px-6">
                <XCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
                <p className="font-semibold mb-2">جميع السيرفرات معطّلة</p>
                <p className="text-ink-300 text-sm">
                  حاول لاحقاً أو جرّب فلماً آخر
                </p>
              </div>
            )}
            {activeId && url && (
              <iframe
                id="movie-iframe"
                key={`${activeId}-${reloadKey}`}
                src={url}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          <footer className="px-4 py-2 text-center text-xs text-ink-400">
            <kbd className="bg-ink-700/50 rounded px-1.5 py-0.5">]</kbd> تالي ·
            <kbd className="bg-ink-700/50 rounded px-1.5 py-0.5 mx-1">[</kbd> سابق ·
            <kbd className="bg-ink-700/50 rounded px-1.5 py-0.5">R</kbd> إعادة ·
            <kbd className="bg-ink-700/50 rounded px-1.5 py-0.5 mx-1">Esc</kbd> إغلاق
          </footer>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
