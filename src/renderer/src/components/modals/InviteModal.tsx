import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Copy, Check, Send, MessageCircle } from 'lucide-react'

type Props = {
  open: boolean
  roomId: string
  mediaTitle?: string
  onClose: () => void
}

export default function InviteModal({ open, roomId, mediaTitle, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  const inviteText = mediaTitle
    ? `انضم لمشاهدة "${mediaTitle}" معي على Nashat TV! استخدم الرمز: ${roomId}`
    : `انضم لغرفة المشاهدة على Nashat TV! استخدم الرمز: ${roomId}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard may be unavailable; fall back to nothing.
    }
  }

  const copyFull = async () => {
    try {
      await navigator.clipboard.writeText(inviteText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(inviteText)}`
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent('https://nashat.tv')}&text=${encodeURIComponent(inviteText)}`

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-ink-800 rounded-2xl ring-1 ring-ink-600/50 shadow-2xl overflow-hidden"
          >
            <header className="flex items-center justify-between p-5 border-b border-ink-700/40">
              <h2 className="text-lg font-bold">ادعُ صديقاً</h2>
              <button
                onClick={onClose}
                className="w-9 h-9 grid place-items-center rounded-lg text-ink-200 hover:text-white hover:bg-ink-700/40"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-6 space-y-5">
              <p className="text-sm text-ink-200 text-center leading-relaxed">
                شارك هذا الرمز مع صديقك ليدخل غرفتك ويشاهد معك.
              </p>

              <div className="bg-ink-900/60 rounded-xl p-4 ring-1 ring-ink-700/40">
                <p className="text-xs text-ink-400 mb-2">رمز الغرفة</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-lg text-brand-300 select-all break-all">
                    {roomId}
                  </code>
                  <button
                    onClick={copy}
                    className="bg-ink-700/60 hover:bg-brand-500 transition-colors px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'تم النسخ' : 'نسخ'}
                  </button>
                </div>
              </div>

              <button
                onClick={copyFull}
                className="w-full bg-ink-700/40 hover:bg-ink-700/60 rounded-xl px-4 py-3 text-sm flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                نسخ رسالة الدعوة الكاملة
              </button>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600/20 hover:bg-emerald-600/30 ring-1 ring-emerald-500/40 rounded-xl px-3 py-3 flex items-center justify-center gap-2 text-sm"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-300" />
                  WhatsApp
                </a>
                <a
                  href={tgUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-sky-600/20 hover:bg-sky-600/30 ring-1 ring-sky-500/40 rounded-xl px-3 py-3 flex items-center justify-center gap-2 text-sm"
                >
                  <Send className="w-4 h-4 text-sky-300" />
                  Telegram
                </a>
              </div>

              <p className="text-xs text-ink-400 leading-relaxed text-center border-t border-ink-700/40 pt-4">
                صديقك يفتح Nashat TV → "مع الأصدقاء" → "انضمام لغرفة" → يلصق الرمز.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
