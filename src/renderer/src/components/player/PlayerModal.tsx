import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Maximize2 } from 'lucide-react'
import VideoPlayer, { type PlayerHandle } from './VideoPlayer'

export type PlayerSource = {
  title: string
  subtitle?: string
  logo?: string
  url: string
}

type Props = {
  source: PlayerSource | null
  onClose: () => void
}

export default function PlayerModal({ source, onClose }: Props) {
  const playerRef = useRef<PlayerHandle>(null)

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
        default:
          if (/^[0-9]$/.test(e.key)) {
            p?.seekTo(Number(e.key) / 10)
          }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
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
            <button
              onClick={() => playerRef.current?.requestFullscreen()}
              title="Fullscreen (F)"
              className="w-10 h-10 grid place-items-center rounded-xl text-ink-200 hover:text-white hover:bg-ink-700/40 transition-colors"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="w-10 h-10 grid place-items-center rounded-xl text-ink-200 hover:text-white hover:bg-ink-700/40 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 min-h-0">
            <VideoPlayer ref={playerRef} src={source.url} />
          </div>

          <footer className="px-4 py-2 text-center text-xs text-ink-400">
            Space: تشغيل/إيقاف · F: ملء الشاشة · M: كتم · ← →: ±10 ثوانٍ · 0-9: قفز · Esc: إغلاق
          </footer>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
