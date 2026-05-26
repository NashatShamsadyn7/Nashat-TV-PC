import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, X, Users } from 'lucide-react'
import { sendChat, useRoom } from './useRoom'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'

/**
 * Floating chat overlay used on top of the player when the user is inside an
 * active Watch Together room. Collapsible so it doesn't obstruct the picture.
 */
export default function RoomChatOverlay() {
  const user = useAuthStore((s) => s.user)
  const roomId = useRoomStore((s) => s.activeRoomId)
  const { room } = useRoom(roomId)
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [lastSeenAt, setLastSeenAt] = useState<number>(() => Date.now())
  const endRef = useRef<HTMLDivElement>(null)

  const messages = room?.chat
    ? Object.values(room.chat).sort((a, b) => a.createdAt - b.createdAt)
    : []
  const memberCount = room?.members ? Object.keys(room.members).length : 0
  const unread = !open
    ? messages.filter((m) => m.uid !== user?.uid && m.createdAt > lastSeenAt).length
    : 0

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
      setLastSeenAt(Date.now())
    }
  }, [open, messages.length])

  if (!roomId || !user) return null

  return (
    <div className="fixed bottom-4 end-4 z-[60] pointer-events-none">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto w-[340px] h-[420px] mb-3 bg-ink-900/95 backdrop-blur-md rounded-2xl ring-1 ring-ink-600/60 shadow-2xl flex flex-col overflow-hidden"
          >
            <header className="flex items-center justify-between px-4 py-3 border-b border-ink-700/50 bg-ink-800/60">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-semibold">دردشة الغرفة</span>
                <span className="text-xs text-ink-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {memberCount}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 grid place-items-center rounded-lg text-ink-300 hover:text-white hover:bg-ink-700/60"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
              {messages.length === 0 && (
                <p className="text-xs text-ink-400 text-center mt-8">
                  لا توجد رسائل — اكتب أولاً 👋
                </p>
              )}
              {messages.map((m, i) => {
                const mine = m.uid === user.uid
                return (
                  <div
                    key={i}
                    className={`text-sm rounded-lg px-2.5 py-1.5 max-w-[85%] ${
                      mine ? 'bg-brand-500/30 ms-auto' : 'bg-ink-700/60 me-auto'
                    }`}
                  >
                    {!mine && (
                      <div className="text-[11px] font-semibold text-brand-300 mb-0.5">
                        {m.name}
                      </div>
                    )}
                    <div className="text-ink-50 break-words leading-snug">{m.text}</div>
                  </div>
                )
              })}
              <div ref={endRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const text = msg.trim()
                if (!text || !roomId) return
                void sendChat(roomId, text)
                setMsg('')
              }}
              className="flex gap-2 p-3 border-t border-ink-700/50 bg-ink-800/40"
            >
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="اكتب رسالة…"
                maxLength={500}
                className="flex-1 bg-ink-900/80 ring-1 ring-ink-600/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-brand-500"
              />
              <button
                type="submit"
                className="bg-brand-500 hover:bg-brand-600 px-3 rounded-lg grid place-items-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto relative bg-brand-500 hover:bg-brand-600 text-white rounded-full w-14 h-14 grid place-items-center shadow-xl ring-2 ring-ink-900/40 transition-colors"
        title={open ? 'إغلاق الشات' : 'فتح شات الغرفة'}
      >
        <MessageCircle className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[20px] h-5 bg-rose-500 text-white text-[11px] font-bold rounded-full grid place-items-center px-1.5 ring-2 ring-ink-900">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  )
}
