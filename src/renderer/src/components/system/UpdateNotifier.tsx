import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, RefreshCw, X } from 'lucide-react'

type UpdateState =
  | { kind: 'idle' }
  | { kind: 'available'; version: string }
  | { kind: 'progress'; percent: number; bps: number }
  | { kind: 'downloaded'; version: string }
  | { kind: 'error'; message: string }

function fmtSpeed(bps: number): string {
  if (bps < 1024) return `${bps.toFixed(0)} B/s`
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`
  return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`
}

// Floating banner that surfaces auto-updater events from the main process.
// Silent for "checking" and "not-available" — only shows when there's news.
export default function UpdateNotifier() {
  const [state, setState] = useState<UpdateState>({ kind: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const off = window.nashat.onUpdateEvent?.((event, data) => {
      const payload = data as {
        version?: string
        percent?: number
        bytesPerSecond?: number
      } | string | undefined
      if (event === 'available') {
        const v = typeof payload === 'object' ? payload?.version || '' : ''
        setState({ kind: 'available', version: v })
        setDismissed(false)
      } else if (event === 'progress' && typeof payload === 'object') {
        setState({
          kind: 'progress',
          percent: payload?.percent || 0,
          bps: payload?.bytesPerSecond || 0
        })
      } else if (event === 'downloaded') {
        const v = typeof payload === 'object' ? payload?.version || '' : ''
        setState({ kind: 'downloaded', version: v })
        setDismissed(false)
      } else if (event === 'error') {
        const msg = typeof payload === 'string' ? payload : 'تعذّر التحقق من التحديث'
        setState({ kind: 'error', message: msg })
      } else if (event === 'not-available') {
        setState({ kind: 'idle' })
      }
    })
    return off
  }, [])

  if (state.kind === 'idle' || dismissed) return null
  if (state.kind === 'error') return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] bg-ink-800 ring-1 ring-brand-500/40 rounded-2xl shadow-2xl p-4 min-w-[320px] max-w-md"
      >
        {state.kind === 'available' && (
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-brand-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">تحديث متاح</p>
              <p className="text-xs text-ink-300">
                جاري التحميل {state.version && `v${state.version}`}…
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="w-7 h-7 grid place-items-center rounded-lg text-ink-300 hover:bg-ink-700/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {state.kind === 'progress' && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Download className="w-5 h-5 text-brand-400 shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">جاري تحميل التحديث</p>
                <p className="text-[11px] text-ink-300">
                  {state.percent.toFixed(0)}% · {fmtSpeed(state.bps)}
                </p>
              </div>
            </div>
            <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all duration-300"
                style={{ width: `${state.percent}%` }}
              />
            </div>
          </div>
        )}

        {state.kind === 'downloaded' && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 grid place-items-center shrink-0">
              <RefreshCw className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">جاهز للتثبيت!</p>
              <p className="text-[11px] text-ink-300">
                v{state.version} — أعد التشغيل لتطبيق التحديث
              </p>
            </div>
            <button
              onClick={() => window.nashat.installUpdate?.()}
              className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-3 py-2 rounded-lg shrink-0"
            >
              إعادة التشغيل
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="w-7 h-7 grid place-items-center rounded-lg text-ink-300 hover:bg-ink-700/60 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
