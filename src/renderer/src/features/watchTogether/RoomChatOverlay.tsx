import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, X, Users, Smile, Image as ImageIcon, Loader2 } from 'lucide-react'
import { sendChat, useRoom } from './useRoom'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import EmojiPicker from './EmojiPicker'
import GifPicker from './GifPicker'
import { uploadChatImage } from './chatUploads'

// Crude URL detector — good enough to render clickable links and auto-embed
// image URLs that get pasted in chat.
const URL_RE = /(https?:\/\/[^\s]+)/g
const IMG_URL_RE = /\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i

function renderText(text: string) {
  const parts = text.split(URL_RE)
  return parts.map((p, i) => {
    if (i % 2 === 1) {
      return (
        <a
          key={i}
          href={p}
          target="_blank"
          rel="noreferrer"
          className="text-brand-300 underline break-all"
        >
          {p}
        </a>
      )
    }
    return <span key={i}>{p}</span>
  })
}

/**
 * Floating chat overlay used on top of the player when the user is inside an
 * active Watch Together room. Supports text, emoji, GIFs and images.
 */
export default function RoomChatOverlay() {
  const user = useAuthStore((s) => s.user)
  const roomId = useRoomStore((s) => s.activeRoomId)
  const { room } = useRoom(roomId)
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [picker, setPicker] = useState<'none' | 'emoji' | 'gif'>('none')
  const [uploading, setUploading] = useState(false)
  const [lastSeenAt, setLastSeenAt] = useState<number>(() => Date.now())
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  // Close pickers when chat collapses.
  useEffect(() => {
    if (!open) setPicker('none')
  }, [open])

  if (!roomId || !user) return null

  const handleSendText = () => {
    const text = msg.trim()
    if (!text || !roomId) return
    void sendChat(roomId, { text })
    setMsg('')
  }

  const handleSendGif = (gifUrl: string) => {
    if (!roomId) return
    void sendChat(roomId, { gif: gifUrl })
    setPicker('none')
  }

  const handleUpload = async (file: File) => {
    if (!roomId || !user) return
    setUploading(true)
    try {
      const url = await uploadChatImage(roomId, user.uid, file)
      await sendChat(roomId, { image: url })
    } catch (err) {
      console.error('[chat] image upload failed:', err)
      window.alert(`فشل رفع الصورة: ${(err as Error).message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed bottom-4 end-4 z-[60] pointer-events-none">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto w-[340px] h-[460px] mb-3 bg-ink-900/95 backdrop-blur-md rounded-2xl ring-1 ring-ink-600/60 shadow-2xl flex flex-col overflow-hidden"
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
                    {m.text && (
                      <div className="text-ink-50 break-words leading-snug">
                        {renderText(m.text)}
                      </div>
                    )}
                    {m.image && (
                      <img
                        src={m.image}
                        alt=""
                        className="rounded-md mt-1 max-w-full max-h-[200px] cursor-zoom-in"
                        onClick={() => window.open(m.image, '_blank')}
                      />
                    )}
                    {m.gif && (
                      <img
                        src={m.gif}
                        alt="GIF"
                        className="rounded-md mt-1 max-w-full max-h-[200px]"
                      />
                    )}
                    {/* Auto-embed image URLs pasted as text */}
                    {m.text && IMG_URL_RE.test(m.text) && (
                      <img
                        src={(m.text.match(URL_RE) || [])[0]}
                        alt=""
                        className="rounded-md mt-1 max-w-full max-h-[200px]"
                      />
                    )}
                  </div>
                )
              })}
              <div ref={endRef} />
            </div>

            {picker !== 'none' && (
              <div className="absolute bottom-[60px] end-3 z-10">
                {picker === 'emoji' && (
                  <EmojiPicker
                    onPick={(e) => {
                      setMsg((m) => m + e)
                      setPicker('none')
                    }}
                  />
                )}
                {picker === 'gif' && <GifPicker onPick={handleSendGif} />}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendText()
              }}
              className="flex items-center gap-1.5 p-2 border-t border-ink-700/50 bg-ink-800/40"
            >
              <button
                type="button"
                onClick={() => setPicker((p) => (p === 'emoji' ? 'none' : 'emoji'))}
                className={`w-8 h-8 grid place-items-center rounded-lg hover:bg-ink-700/60 ${
                  picker === 'emoji' ? 'text-brand-400 bg-ink-700/40' : 'text-ink-300'
                }`}
                title="إيموجي"
              >
                <Smile className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPicker((p) => (p === 'gif' ? 'none' : 'gif'))}
                className={`px-2 h-8 text-[11px] font-bold rounded-lg hover:bg-ink-700/60 ${
                  picker === 'gif' ? 'text-brand-400 bg-ink-700/40' : 'text-ink-300'
                }`}
                title="GIF"
              >
                GIF
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="w-8 h-8 grid place-items-center rounded-lg hover:bg-ink-700/60 text-ink-300 disabled:opacity-50"
                title="صورة"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleUpload(file)
                  e.target.value = ''
                }}
              />
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="اكتب رسالة…"
                maxLength={500}
                className="flex-1 bg-ink-900/80 ring-1 ring-ink-600/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={!msg.trim()}
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 px-3 h-8 rounded-lg grid place-items-center"
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
