import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

const GROUPS = [
  {
    title: 'Navigation',
    items: [
      ['/', 'Open search'],
      ['Ctrl+K', 'Quick search'],
      ['g h', 'Home'],
      ['g l', 'Live TV'],
      ['g m', 'Movies'],
      ['g s', 'Series'],
      ['g y', 'Library'],
      ['g t', 'Settings'],
      ['?', 'This help']
    ]
  },
  {
    title: 'Player',
    items: [
      ['Space', 'Play / Pause'],
      ['F', 'Fullscreen'],
      ['M', 'Mute'],
      ['← →', 'Seek ±10s'],
      ['J / L', 'Seek ±10s'],
      [', / .', 'Frame step'],
      ['0–9', 'Jump 0–90%'],
      ['P', 'Picture-in-Picture'],
      ['C', 'Toggle subtitles'],
      ['+ / -', 'Subtitle size'],
      ['Esc', 'Close player']
    ]
  },
  {
    title: 'Movies & Series',
    items: [
      ['[', 'Previous server'],
      [']', 'Next server'],
      ['R', 'Reload player']
    ]
  }
]

type Props = {
  open: boolean
  onClose: () => void
}

export default function ShortcutHelp({ open, onClose }: Props) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-ink-800 rounded-2xl ring-1 ring-ink-600/50 max-w-3xl w-full max-h-[85vh] overflow-y-auto"
          >
            <header className="flex items-center justify-between p-5 border-b border-ink-700/50 sticky top-0 bg-ink-800">
              <h2 className="text-xl font-semibold">اختصارات لوحة المفاتيح</h2>
              <button
                onClick={onClose}
                className="w-9 h-9 grid place-items-center rounded-xl hover:bg-ink-700/50"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </header>
            <div className="p-5 grid md:grid-cols-3 gap-6">
              {GROUPS.map((g) => (
                <section key={g.title}>
                  <h3 className="text-sm font-semibold text-brand-400 mb-3">{g.title}</h3>
                  <ul className="space-y-2">
                    {g.items.map(([k, label]) => (
                      <li key={k} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-ink-200">{label}</span>
                        <kbd className="font-mono text-xs bg-ink-700/60 ring-1 ring-ink-600/50 rounded px-2 py-0.5">
                          {k}
                        </kbd>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
