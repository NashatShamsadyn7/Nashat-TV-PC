import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Maximize2, Loader2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import VideoPlayer, { type PlayerHandle } from './VideoPlayer'
import type { ExtractedStream } from '@shared/stream'

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

export default function PlayerModal({ source, onClose }: Props) {
  const playerRef = useRef<PlayerHandle>(null)
  const [state, setState] = useState<ExtractState>({ status: 'idle' })

  // Kick off extraction whenever the source changes
  useEffect(() => {
    if (!source) {
      setState({ status: 'idle' })
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
          p?.seekBy(-10)
          break
        case 'ArrowRight':
          p?.seekBy(10)
          break
        case 'r':
        case 'R':
          retry()
          break
        default:
          if (/^[0-9]$/.test(e.key)) p?.seekTo(Number(e.key) / 10)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, onClose])

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
          </div>

          <footer className="px-4 py-2 text-center text-xs text-ink-400">
            Space: تشغيل/إيقاف · F: ملء الشاشة · M: كتم · ← →: ±10 ثوانٍ · R: إعادة · Esc: إغلاق
          </footer>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
