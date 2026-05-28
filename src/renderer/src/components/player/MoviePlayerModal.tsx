import { useEffect, useMemo, useRef, useState } from 'react'
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
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  PlayCircle
} from 'lucide-react'
import type { TmdbMediaSource } from '@/stores/playerStore'
import { libraryActions } from '@/stores/libraryStore'
import { makeProgressId } from '@/features/library/types'
import {
  sortByHealth,
  useServerHealth,
  type ServerStatus
} from '@/features/player/useServerHealth'
import { contentKey, useServerPrefs } from '@/features/player/useServerPrefs'
import { tmdbApi } from '@/services/tmdb'
import { cn } from '@/lib/cn'
import RoomChatOverlay from '@/features/watchTogether/RoomChatOverlay'
import RoomSyncOverlay from '@/features/watchTogether/RoomSyncOverlay'
import VoiceCallButton from '@/features/voiceCall/VoiceCallButton'
import { useRoomSync, withStartTime } from '@/features/watchTogether/useRoomSync'

// How long a freshly-selected iframe gets to fire `load` before we assume it
// is broken and auto-advance to the next server. Generous — embed players
// can be slow on first hit. Reload-on-failure stops the silent black screen
// on servers that pass the health ping but refuse to embed.
const IFRAME_LOAD_TIMEOUT_MS = 12_000
// Once an iframe loads, wait this long without the user switching before we
// commit it as "last working server for this title". Avoids saving a server
// the user immediately abandons (e.g. "Sandbox not allowed" they switched away from).
const LAST_USED_COMMIT_DELAY_MS = 8_000

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
  const prefs = useServerPrefs()
  // Sort with the user's own vote scores factored in — upvoted servers float
  // toward auto-pick over time, downvoted ones drop.
  const sorted = useMemo(() => sortByHealth(servers, prefs.scoreOf), [servers, prefs.scoreOf])

  const key = source ? contentKey(source.kind, source.tmdbId, source.season, source.episode) : ''
  const remembered = key ? prefs.lastUsed[key] : undefined

  // Reset on new media
  useEffect(() => {
    setActiveId(null)
    setAutoPicked(false)
    setReloadKey(0)
    setLoadState('idle')
    setShowTrailer(false)
    setTrailerKey(null)
  }, [source?.tmdbId, source?.kind, source?.season, source?.episode])

  // ── Iframe load-timeout auto-advance ──────────────────────────────────────
  // Cross-origin iframes hide playback failure, but a frame that never fires
  // its `load` event within ~12s is almost always a dead server. We watch the
  // event and bail to the next 'ok' candidate when it doesn't show up.
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded' | 'timeout'>('idle')
  const loadedAtRef = useRef<number | null>(null)
  const failedServersRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!activeId) return
    setLoadState('loading')
    loadedAtRef.current = null
    const t = window.setTimeout(() => {
      // Mark this server as failed-to-load for this session and try the next
      // working candidate. Avoids loops by skipping any server we already gave up on.
      failedServersRef.current.add(activeId)
      setLoadState('timeout')
      const remaining = sorted.filter(
        (s) => s.status === 'ok' && !failedServersRef.current.has(s.id)
      )
      const next = remaining[0]
      if (next) setActiveId(next.id)
    }, IFRAME_LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, reloadKey])

  // ── "Last working server" commit ──────────────────────────────────────────
  // Once the iframe has been loaded AND the user hasn't switched away within
  // LAST_USED_COMMIT_DELAY_MS, write it as the preferred server for this title.
  useEffect(() => {
    if (!activeId || loadState !== 'loaded' || !key) return
    const at = loadedAtRef.current ?? Date.now()
    const wait = Math.max(0, LAST_USED_COMMIT_DELAY_MS - (Date.now() - at))
    const t = window.setTimeout(() => prefs.rememberLastUsed(key, activeId), wait)
    return () => window.clearTimeout(t)
  }, [activeId, loadState, key, prefs])

  // ── Trailer fallback ──────────────────────────────────────────────────────
  // When every server is failed AND none is currently loading, offer the TMDB
  // trailer. The button is opt-in (not auto) so we don't yank the user out of
  // a server they were about to manually try.
  const [showTrailer, setShowTrailer] = useState(false)
  const [trailerKey, setTrailerKey] = useState<string | null>(null)
  const fetchTrailer = async () => {
    if (!source) return
    try {
      const res =
        source.kind === 'movie'
          ? await tmdbApi.movieVideos(source.tmdbId)
          : await tmdbApi.tvVideos(source.tmdbId)
      // Prefer official YouTube trailers, then any YouTube video.
      const yt = res.results.filter((v) => v.site === 'YouTube')
      const pick =
        yt.find((v) => v.type === 'Trailer' && v.official) ??
        yt.find((v) => v.type === 'Trailer') ??
        yt[0]
      if (pick) {
        setTrailerKey(pick.key)
        setShowTrailer(true)
      }
    } catch {
      /* swallow — user can dismiss the modal */
    }
  }

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

  // Auto-pick: prefer the server the user last successfully watched this title
  // on; otherwise grab the highest-ranked working candidate from sortByHealth.
  useEffect(() => {
    if (autoPicked || activeId) return
    // Remembered server, if it's also healthy right now.
    if (remembered) {
      const rem = sorted.find((s) => s.id === remembered && s.status === 'ok')
      if (rem) {
        setActiveId(rem.id)
        setAutoPicked(true)
        return
      }
    }
    const firstWorking = sorted.find((s) => s.status === 'ok')
    if (firstWorking) {
      setActiveId(firstWorking.id)
      setAutoPicked(true)
    }
  }, [sorted, autoPicked, activeId, remembered])

  const active = activeId ? servers.find((s) => s.id === activeId) : null
  const baseUrl = active?.url ?? ''

  // Watch Together: snapshot the admin's position at the moment of the last
  // sync event (or manual resync). The URL must NOT update on every tick —
  // doing so re-points the iframe's `src` every second and the embed never
  // finishes loading (black screen). Memoizing on syncTick freezes the URL
  // between admin actions, so the iframe plays freely inside.
  const sync = useRoomSync()
  const [manualResync, setManualResync] = useState(0)
  const url = useMemo(() => {
    if (!baseUrl) return ''
    if (!sync.inRoom || !sync.room?.state) return baseUrl
    const s = sync.room.state
    const driftSec = s.playing ? Math.max(0, (Date.now() - s.anchorAt) / 1000) : 0
    const pos = s.position + driftSec
    return withStartTime(baseUrl, pos, s.playing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, sync.inRoom, sync.syncTick, manualResync])
  const iframeKey = `${activeId}-${reloadKey}-${sync.syncTick}-${manualResync}`

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
            {/* Per-user up/down vote on the active server — biases auto-pick
                next time. Re-click the same side to clear. */}
            {activeId && (
              <div className="flex items-center gap-1 ms-2 ps-2 border-s border-ink-600/40">
                <button
                  onClick={() => prefs.vote(activeId, 'up')}
                  title="السيرفر شغّال ممتاز"
                  className={cn(
                    'w-9 h-9 grid place-items-center rounded-full transition-colors',
                    prefs.myVotes[activeId] === 'up'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-ink-700/40 hover:bg-emerald-500/30 text-ink-200'
                  )}
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => prefs.vote(activeId, 'down')}
                  title="هذا السيرفر سيّئ"
                  className={cn(
                    'w-9 h-9 grid place-items-center rounded-full transition-colors',
                    prefs.myVotes[activeId] === 'down'
                      ? 'bg-rose-500 text-white'
                      : 'bg-ink-700/40 hover:bg-rose-500/30 text-ink-200'
                  )}
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
            )}
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
            {!activeId && stats.ok === 0 && stats.checking === 0 && !showTrailer && (
              <div className="text-center max-w-md px-6">
                <XCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
                <p className="font-semibold mb-2">لا يوجد سيرفر يعمل لهذا العنوان</p>
                <p className="text-ink-300 text-sm mb-5">
                  ربما لم يصدر بعد، أو السيرفرات معطّلة الآن.
                </p>
                <button
                  onClick={fetchTrailer}
                  className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                >
                  <PlayCircle className="w-4 h-4" />
                  عرض الإعلان الرسمي
                </button>
              </div>
            )}
            {activeId && url && !showTrailer && (
              <iframe
                id="movie-iframe"
                key={iframeKey}
                src={url}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="no-referrer"
                onLoad={() => {
                  loadedAtRef.current = Date.now()
                  setLoadState('loaded')
                }}
              />
            )}
            {showTrailer && trailerKey && (
              <iframe
                key={`trailer-${trailerKey}`}
                src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            )}
          </div>

          <footer className="px-4 py-2 text-center text-xs text-ink-400">
            <kbd className="bg-ink-700/50 rounded px-1.5 py-0.5">]</kbd> تالي ·
            <kbd className="bg-ink-700/50 rounded px-1.5 py-0.5 mx-1">[</kbd> سابق ·
            <kbd className="bg-ink-700/50 rounded px-1.5 py-0.5">R</kbd> إعادة ·
            <kbd className="bg-ink-700/50 rounded px-1.5 py-0.5 mx-1">Esc</kbd> إغلاق
          </footer>

          <RoomSyncOverlay onResync={() => setManualResync((k) => k + 1)} />
          <VoiceCallButton />
          <RoomChatOverlay />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
