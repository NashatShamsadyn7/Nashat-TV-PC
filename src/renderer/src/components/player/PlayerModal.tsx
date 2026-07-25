import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Maximize2, Loader2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import VideoPlayer, { type PlayerHandle } from './VideoPlayer'
import type { ExtractedStream } from '@shared/stream'
import { makeChannelProgressId } from '@/features/library/types'
import { useWatchProgress } from '@/features/library/useWatchProgress'
import RoomChatOverlay from '@/features/watchTogether/RoomChatOverlay'
import RoomSyncOverlay from '@/features/watchTogether/RoomSyncOverlay'
import VoiceCallButton from '@/features/voiceCall/VoiceCallButton'
import { useRoomSync } from '@/features/watchTogether/useRoomSync'
import { adminPause, adminPlay, adminSeek } from '@/features/watchTogether/useRoom'
import { useRoomStore } from '@/stores/roomStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useMediaSession } from '@/hooks/useMediaSession'
import EpgStrip from '@/features/epg/EpgStrip'

export type PlayerSource = {
  title: string
  subtitle?: string
  logo?: string
  /** Web page URL that hosts the stream (we'll extract the .m3u8 from it). */
  url: string
  /** Live TV only: RTDB key used to look up this channel's EPG schedule. */
  channelKey?: string
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

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

function isDirectStream(url: string): boolean {
  return /\.(m3u8|mpd|mp4|ts)(\?|$)/i.test(url)
}

function directKind(url: string): ExtractedStream['kind'] {
  if (/\.m3u8/i.test(url)) return 'hls'
  if (/\.mpd/i.test(url)) return 'dash'
  if (/\.ts/i.test(url)) return 'mp4' // MPEG-TS streams handled as raw media
  return 'mp4'
}

export default function PlayerModal({ source, onClose }: Props) {
  const { t } = useTranslation()
  const playerRef = useRef<PlayerHandle>(null)
  const [state, setState] = useState<ExtractState>({ status: 'idle' })
  const sync = useRoomSync()
  const activeRoomId = useRoomStore((s) => s.activeRoomId)
  // Was hardcoded to 10s in three places while the Settings slider wrote to a
  // value nothing read.
  const seekStep = useSettingsStore((s) => s.seekStep)

  // Monotonic token for extraction requests. Every start bumps it; a resolving
  // request only commits its result if it still owns the latest token. Without
  // this, a slow earlier attempt (source switch, or a second press of R) lands
  // after a newer one and overwrites the fresher state.
  const requestIdRef = useRef(0)

  const startExtraction = useCallback((src: PlayerSource) => {
    const id = ++requestIdRef.current

    // Already a direct stream — no extraction round-trip needed.
    if (isDirectStream(src.url)) {
      setState({
        status: 'ready',
        stream: { pageUrl: src.url, streamUrl: src.url, kind: directKind(src.url) }
      })
      return
    }

    setState({ status: 'extracting' })
    window.nashat
      .extractStream(src.url)
      .then((stream) => {
        if (requestIdRef.current === id) setState({ status: 'ready', stream })
      })
      .catch((err: Error) => {
        if (requestIdRef.current === id) setState({ status: 'failed', error: err.message })
      })
  }, [])

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
  const playing = sync.room?.state.playing ?? false

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
    if (playing && v.paused) v.play().catch(() => {})
    if (!playing && !v.paused) v.pause()
    // `syncTick` is the intended clock: it advances once per sync interval and
    // is what makes this effect re-run. livePosition/playing are read fresh on
    // every tick, so they are listed as real dependencies instead of being
    // silenced — the previous eslint-disable hid the fact that a play/pause
    // arriving between ticks was ignored until the next tick.
  }, [sync.syncTick, sync.inRoom, sync.isAdmin, sync.livePosition, playing, state.status])

  // "Continue Watching" identity for this source. Real position/duration are
  // filled in by useWatchProgress from live playback — this used to write a
  // fixed `position: 0, duration: 0` on open and never update, which is why
  // every progress bar on the home page sat at 0% and nothing ever resumed.
  const progressItem = useMemo(() => {
    if (!source) return null
    const key = `${source.title}|${source.url}`
    return {
      id: makeChannelProgressId(key),
      kind: 'channel' as const,
      title: source.title,
      poster: source.logo,
      backdrop: source.logo,
      streamUrl: source.url,
      channelKey: key,
      channelCategory: source.subtitle
    }
  }, [source])

  const { initialPosition, onProgress } = useWatchProgress({ item: progressItem })

  useEffect(() => {
    if (!source) {
      // Invalidate any in-flight request so it can't resolve into the closed player.
      requestIdRef.current++
      setState({ status: 'idle' })
      return
    }
    startExtraction(source)
  }, [source, startExtraction])

  const retry = useCallback(() => {
    if (!source) return
    startExtraction(source)
  }, [source, startExtraction])

  // AirPods / Bluetooth headset / OS media-key control. Only claim the media
  // session once a stream is actually playing, so the headset button keeps
  // controlling whatever else was playing while we sit on the loading screen.
  const getVideoElement = useCallback(() => playerRef.current?.getElement() ?? null, [])
  useMediaSession({
    getElement: getVideoElement,
    meta:
      source && state.status === 'ready'
        ? { title: source.title, subtitle: source.subtitle, artwork: source.logo }
        : null,
    seekStep,
    onStop: onClose
  })

  // Global keyboard shortcuts
  useEffect(() => {
    if (!source) return
    const handleKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return
      const p = playerRef.current
      switch (e.key) {
        case 'Escape':
          // If we're in fullscreen, Esc should only exit fullscreen (the
          // browser handles that) — not close the whole player.
          if (document.fullscreenElement) break
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
          p?.seekBy(-seekStep)
          break
        case 'ArrowRight':
        case 'l':
        case 'L':
          p?.seekBy(seekStep)
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
  }, [source, onClose, retry])

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
              {/* Renders only when this channel actually has EPG data. */}
              <div className="mt-1 max-w-xl">
                <EpgStrip channelKey={source.channelKey ?? null} />
              </div>
            </div>
            {state.status === 'ready' && (
              <button
                onClick={retry}
                title={t('player.reloadTitle')}
                className="w-10 h-10 grid place-items-center rounded-xl text-ink-200 hover:text-white hover:bg-ink-700/40 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => playerRef.current?.requestFullscreen()}
              title={t('player.fullscreenTitle')}
              className="w-10 h-10 grid place-items-center rounded-xl text-ink-200 hover:text-white hover:bg-ink-700/40 transition-colors"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              title={t('player.closeTitle')}
              className="w-10 h-10 grid place-items-center rounded-xl text-ink-200 hover:text-white hover:bg-ink-700/40 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 min-h-0 bg-black grid place-items-center">
            {state.status === 'extracting' && (
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-brand-400 animate-spin mx-auto mb-4" />
                <p className="font-semibold text-lg">{t('player.extracting')}</p>
                <p className="text-ink-300 text-sm mt-1">
                  {t('player.extractingHint')}
                </p>
              </div>
            )}

            {state.status === 'failed' && (
              <div className="text-center max-w-md px-6">
                <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
                <p className="font-semibold text-lg mb-2">{t('player.extractFailed')}</p>
                <p className="text-ink-300 text-sm mb-6">{state.error}</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={retry}
                    className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('common.retry')}
                  </button>
                  <button
                    onClick={() => {
                      void window.nashat.openExternal(source.url)
                    }}
                    className="flex items-center gap-2 bg-ink-700/60 hover:bg-ink-700/80 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t('player.openInBrowser')}
                  </button>
                </div>
              </div>
            )}

            {state.status === 'ready' && (
              <VideoPlayer
                ref={playerRef}
                src={state.stream.streamUrl}
                initialPosition={initialPosition}
                onProgress={onProgress}
              />
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
                title={t('player.pipTitle')}
                className="absolute top-20 end-4 bg-ink-700/70 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors"
              >
                {t('player.pip')}
              </button>
            )}
          </div>

          <footer className="px-4 py-2 text-center text-xs text-ink-400">
            {t('player.shortcutsHint')}
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
