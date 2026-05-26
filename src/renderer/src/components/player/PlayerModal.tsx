import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Maximize2, Loader2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import VideoPlayer, { type PlayerHandle } from './VideoPlayer'
import type { ExtractedStream } from '@shared/stream'
import { libraryActions } from '@/stores/libraryStore'
import { makeChannelProgressId } from '@/features/library/types'
import RoomChatOverlay from '@/features/watchTogether/RoomChatOverlay'
import RoomSyncOverlay from '@/features/watchTogether/RoomSyncOverlay'
import VoiceCallButton from '@/features/voiceCall/VoiceCallButton'
import { useRoomSync } from '@/features/watchTogether/useRoomSync'
import { adminPause, adminPlay, adminSeek } from '@/features/watchTogether/useRoom'
import { useRoomStore } from '@/stores/roomStore'

export type PlayerSource = {
  title: string
  subtitle?: string
  logo?: string
  /** Web page URL that hosts the stream (we'll extract the .m3u8 from it). */
  url: string
}

type Props = {
  source: PlayerSource | null
  onClose: () => void
}

type ExtractState =
  | { status: 'idle' }
  | { status: 'extracting' }
  | { status: 'ready'; stream: ExtractedStream }
  | { status: 'failed'; error: string }

function isDirectStream(url: string): boolean {
  return /\.(m3u8|mpd|mp4)(\?|$)/i.test(url)
}

function directKind(url: string): ExtractedStream['kind'] {
  if (/\.m3u8/i.test(url)) return 'hls'
  if (/\.mpd/i.test(url)) return 'dash'
  return 'mp4'
}

export default function PlayerModal({ source, onClose }: Props) {
  const playerRef = useRef<PlayerHandle>(null)
  const [state, setState] = useState<ExtractState>({ status: 'idle' })
  const sync = useRoomSync()
  const activeRoomId = useRoomStore((s) => s.activeRoomId)

  // Admin: broadcast play / pause / seek from the local video element to the
  // room so every viewer follows. Coalesce rapid seeks (e.g. scrubbing) by
  // letting the `seeked` event win — `timeupdate` is too noisy to forward.
  useEffect(() => {
    if (!sync.inRoom || !sync.isAdmin || !activeRoomId) return
    if (state.status !== 'ready') return
    const v = playerRef.current?.getElement()
    if (!v) return
    const onPlay = () => void adminPlay(activeRoomId, v.currentTime)
    const onPause = () => void adminPause(activeRoomId, v.currentTime)
    const onSeeked = () => void adminSeek(activeRoomId, v.currentTime, !v.paused)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('seeked', onSeeked)
    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('seeked', onSeeked)
    }
  }, [sync.inRoom, sync.isAdmin, activeRoomId, state.status])

  // Watch Together: when a viewer in a room sees the admin take action,
  // drive the video element to match (seek + play/pause). Channels with HLS
  // are direct-controllable so sync is accurate to ~half a second.
  useEffect(() => {
    if (!sync.inRoom || sync.isAdmin) return
    if (state.status !== 'ready') return
    const v = playerRef.current?.getElement()
    if (!v) return
    const target = sync.livePosition
    if (Math.abs(v.currentTime - target) > 1.5) {
      try {
        v.currentTime = target
      } catch {
        /* live edge or unseekable */
      }
    }
    if (sync.room?.state.playing && v.paused) v.play().catch(() => {})
    if (!sync.room?.state.playing && !v.paused) v.pause()
  }, [sync.syncTick, sync.inRoom, sync.isAdmin, state.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Record channel into "Continue Watching" on open
  useEffect(() => {
    if (!source) return
    const key = `${source.title}|${source.url}`
    libraryActions.recordProgress({
      id: makeChannelProgressId(key),
      kind: 'channel',
      title: source.title,
      poster: source.logo,
      backdrop: source.logo,
      streamUrl: source.url,
      channelKey: key,
      channelCategory: source.subtitle,
      position: 0,
      duration: 0,
      updatedAt: Date.now()
    })
  }, [source])

  useEffect(() => {
    if (!source) {
      setState({ status: 'idle' })
      return
    }

    // If the channel URL is already a direct stream, skip extraction.
    if (isDirectStream(source.url)) {
      setState({
        status: 'ready',
        stream: {
          pageUrl: source.url,
          streamUrl: source.url,
          kind: directKind(source.url)
        }
      })
      return
    }

    let cancelled = false
    setState({ status: 'extracting' })
    window.nashat
      .extractStream(source.url)
      .then((stream) => {
        if (!cancelled) setState({ status: 'ready', stream })
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ status: 'failed', error: err.message })
      })

    return () => {
      cancelled = true
    }
  }, [source])

  const retry = () => {
    if (!source) return
    if (isDirectStream(source.url)) {
      setState({
        status: 'ready',
        stream: {
          pageUrl: source.url,
          streamUrl: source.url,
          kind: directKind(source.url)
        }
      })
      return
    }
    setState({ status: 'extracting' })
    window.nashat
      .extractStream(source.url)
      .then((stream) => setState({ status: 'ready', stream }))
      .catch((err: Error) => setState({ status: 'failed', error: err.message }))
  }

  // Global keyboard shortcuts
  useEffect(() => {
    if (!source) return
    const handleKey = (e: KeyboardEvent) => {
      const p = playerRef.current
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case ' ':
          e.preventDefault()
          p?.togglePlay()
          break
        case 'f':
        case 'F':
          p?.requestFullscreen()
          break
        case 'm':
        case 'M':
          p?.toggleMute()
          break
        case 'ArrowLeft':
        case 'j':
        case 'J':
          p?.seekBy(-10)
          break
        case 'ArrowRight':
        case 'l':
        case 'L':
          p?.seekBy(10)
          break
        case 'r':
        case 'R':
          retry()
          break
        case 'p':
        case 'P':
          p?.togglePip()
          break
        case 'c':
        case 'C':
          p?.toggleSubtitles()
          break
        case ',':
          p?.seekBy(-1 / 30)
          break
        case '.':
          p?.seekBy(1 / 30)
          break
        default:
          if (/^[0-9]$/.test(e.key)) p?.seekTo(Number(e.key) / 10)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, onClose])

  // Open detached PiP from main menu (Ctrl+Shift+P) — main-window-floating mini player
  useEffect(() => {
    if (!source || state.status !== 'ready') return
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        if (state.status === 'ready') {
          window.nashat
            .openPip({
              streamUrl: state.stream.streamUrl,
              title: source.title,
              logo: source.logo
            })
            .catch(() => {})
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [source, state])

  return createPortal(
    <AnimatePresence>
      {source && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col"
        >
          <header className="flex items-center gap-3 p-4 bg-gradient-to-b from-black/80 to-transparent">
            {source.logo && (
              <img
                src={source.logo}
                alt=""
                className="w-10 h-10 rounded-md object-contain bg-ink-800 p-0.5"
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg truncate">{source.title}</h2>
              {source.subtitle && (
                <p className="text-xs text-ink-300">{source.subtitle}</p>
              )}
            </div>
            {state.status === 'ready' && (
              <button
                onClick={retry}
                title="إعادة التحميل (R)"
                className="w-10 h-10 grid place-items-center rounded-xl text-ink-200 hover:text-white hover:bg-ink-700/40 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => playerRef.current?.requestFullscreen()}
              title="ملء الشاشة (F)"
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

          <div className="flex-1 min-h-0 bg-black grid place-items-center">
            {state.status === 'extracting' && (
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-brand-400 animate-spin mx-auto mb-4" />
                <p className="font-semibold text-lg">جارٍ استخراج البث…</p>
                <p className="text-ink-300 text-sm mt-1">
                  قد يستغرق هذا 5-15 ثانية
                </p>
              </div>
            )}

            {state.status === 'failed' && (
              <div className="text-center max-w-md px-6">
                <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
                <p className="font-semibold text-lg mb-2">تعذّر استخراج البث</p>
                <p className="text-ink-300 text-sm mb-6">{state.error}</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={retry}
                    className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    إعادة المحاولة
                  </button>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-ink-700/60 hover:bg-ink-700/80 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    فتح في المتصفّح
                  </a>
                </div>
              </div>
            )}

            {state.status === 'ready' && (
              <VideoPlayer ref={playerRef} src={state.stream.streamUrl} />
            )}
            {state.status === 'ready' && (
              <button
                onClick={() => {
                  if (state.status !== 'ready') return
                  window.nashat
                    .openPip({
                      streamUrl: state.stream.streamUrl,
                      title: source?.title,
                      logo: source?.logo
                    })
                    .then(() => onClose())
                    .catch(() => {})
                }}
                title="نافذة عائمة (Ctrl+Shift+P)"
                className="absolute top-20 end-4 bg-ink-700/70 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors"
              >
                نافذة عائمة
              </button>
            )}
          </div>

          <footer className="px-4 py-2 text-center text-xs text-ink-400">
            Space · F · M · J/L · C ترجمة · P نافذة · ←→ ±10s · R إعادة · Esc
          </footer>

          <RoomSyncOverlay
            onResync={() => {
              const v = playerRef.current?.getElement()
              if (v && sync.inRoom) {
                try {
                  v.currentTime = sync.livePosition
                  if (sync.room?.state.playing) v.play().catch(() => {})
                } catch {
                  /* ignore */
                }
              }
            }}
          />
          <VoiceCallButton />
          <RoomChatOverlay />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
