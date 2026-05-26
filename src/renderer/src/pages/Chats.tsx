import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Send,
  Smile,
  User
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { useAuthStore } from '@/stores/authStore'
import { useFriends } from '@/features/friends/useFriends'
import EmojiPicker from '@/features/watchTogether/EmojiPicker'
import GifPicker from '@/features/watchTogether/GifPicker'
import { uploadChatImage } from '@/features/watchTogether/chatUploads'
import { sendDM, useDMInbox, useDMMessages } from '@/features/dms/useDM'

const URL_RE = /(https?:\/\/[^\s]+)/g

function renderText(text: string) {
  const parts = text.split(URL_RE)
  return parts.map((p, i) => {
    if (i % 2 === 1) {
      return (
        <a key={i} href={p} target="_blank" rel="noreferrer" className="text-brand-300 underline break-all">
          {p}
        </a>
      )
    }
    return <span key={i}>{p}</span>
  })
}

function formatTimestamp(ms?: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  const now = new Date()
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  if (sameDay) return d.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('ar', { day: '2-digit', month: '2-digit' })
}

export default function ChatsPage() {
  const user = useAuthStore((s) => s.user)
  const inbox = useDMInbox()
  const friends = useFriends()
  const [params, setParams] = useSearchParams()
  const activeUid = params.get('u')
  const messages = useDMMessages(activeUid)

  const [msg, setMsg] = useState('')
  const [picker, setPicker] = useState<'none' | 'emoji' | 'gif'>('none')
  const [uploading, setUploading] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, activeUid])

  if (!user) {
    return (
      <div>
        <PageHeader title="المحادثات" />
        <div className="px-8">
          <div className="bg-ink-700/30 rounded-2xl p-6 max-w-xl">
            <MessageCircle className="w-10 h-10 text-brand-400 mb-3" />
            <p>يجب تسجيل الدخول لاستخدام المحادثات.</p>
          </div>
        </div>
      </div>
    )
  }

  const activeFriend =
    inbox.find((c) => c.otherUid === activeUid) ||
    friends.find((f) => f.uid === activeUid)

  const openChat = (uid: string) => {
    setParams({ u: uid })
    setShowNewChat(false)
    setMsg('')
    setPicker('none')
  }

  const handleSendText = () => {
    if (!activeUid) return
    const text = msg.trim()
    if (!text) return
    void sendDM(activeUid, { text })
    setMsg('')
  }

  const handleSendGif = (gifUrl: string) => {
    if (!activeUid) return
    void sendDM(activeUid, { gif: gifUrl })
    setPicker('none')
  }

  const handleUpload = async (file: File) => {
    if (!activeUid || !user) return
    setUploading(true)
    try {
      const url = await uploadChatImage('dm', user.uid, file)
      await sendDM(activeUid, { image: url })
    } catch (err) {
      window.alert(`فشل رفع الصورة: ${(err as Error).message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <PageHeader title="المحادثات" subtitle="رسائل مباشرة مع أصدقائك" />
      <div className="px-8 pb-10">
        <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[480px]">
          {/* Inbox list */}
          <aside className="bg-ink-700/30 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-3 border-b border-ink-700/50 flex items-center justify-between">
              <h3 className="font-semibold text-sm">صناديق الوارد</h3>
              <button
                onClick={() => setShowNewChat((v) => !v)}
                className="text-xs bg-brand-500 hover:bg-brand-600 px-2.5 py-1 rounded-lg font-semibold"
              >
                + جديد
              </button>
            </div>

            {showNewChat && (
              <div className="p-3 border-b border-ink-700/50 bg-ink-800/40 max-h-[240px] overflow-y-auto">
                <p className="text-[11px] text-ink-400 mb-2">اختر صديقاً لبدء محادثة:</p>
                {friends.length === 0 ? (
                  <p className="text-xs text-ink-400">لا يوجد أصدقاء. أضف صديقاً من صفحة الأصدقاء.</p>
                ) : (
                  <ul className="space-y-1">
                    {friends.map((f) => (
                      <li key={f.uid}>
                        <button
                          onClick={() => openChat(f.uid)}
                          className="w-full text-start px-2.5 py-1.5 rounded-lg text-sm hover:bg-ink-700/60"
                        >
                          {f.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {inbox.length === 0 && !showNewChat && (
                <div className="p-6 text-center text-xs text-ink-400">
                  لا توجد محادثات بعد. ابدأ بصديق من زر "جديد".
                </div>
              )}
              <ul>
                {inbox.map((c) => {
                  const active = c.otherUid === activeUid
                  return (
                    <li key={c.chatId}>
                      <button
                        onClick={() => openChat(c.otherUid)}
                        className={`w-full text-start flex items-center gap-3 p-3 hover:bg-ink-700/40 transition-colors ${
                          active ? 'bg-brand-500/10 border-s-2 border-brand-400' : ''
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-ink-700 grid place-items-center shrink-0">
                          {c.otherPhoto ? (
                            <img src={c.otherPhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-ink-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm truncate">{c.otherName}</span>
                            <span className="text-[10px] text-ink-400 shrink-0">
                              {formatTimestamp(c.lastMessageAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-ink-300 truncate flex-1">
                              {c.lastMessage || '—'}
                            </p>
                            {c.unread > 0 && (
                              <span className="bg-brand-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] grid place-items-center px-1.5">
                                {c.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </aside>

          {/* Thread */}
          <section className="bg-ink-700/30 rounded-2xl flex flex-col overflow-hidden">
            {!activeUid && (
              <div className="flex-1 grid place-items-center">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 text-ink-500 mx-auto mb-3" />
                  <p className="text-sm text-ink-300">اختر محادثة من القائمة</p>
                  <p className="text-xs text-ink-400 mt-1">أو ابدأ محادثة جديدة</p>
                </div>
              </div>
            )}

            {activeUid && (
              <>
                <header className="p-3 border-b border-ink-700/50 flex items-center gap-3 bg-ink-800/40">
                  <button
                    onClick={() => setParams({})}
                    className="md:hidden w-8 h-8 grid place-items-center rounded-lg hover:bg-ink-700/60"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-ink-700 grid place-items-center shrink-0">
                    {activeFriend && 'otherPhoto' in activeFriend && activeFriend.otherPhoto ? (
                      <img src={activeFriend.otherPhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-ink-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {(activeFriend && 'otherName' in activeFriend && activeFriend.otherName) ||
                        (activeFriend && 'name' in activeFriend && activeFriend.name) ||
                        'محادثة'}
                    </h3>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                  {messages.length === 0 && (
                    <p className="text-xs text-ink-400 text-center mt-8">
                      لا توجد رسائل بعد — اكتب أولاً 👋
                    </p>
                  )}
                  {messages.map((m, i) => {
                    const mine = m.uid === user.uid
                    return (
                      <div
                        key={i}
                        className={`text-sm rounded-2xl px-3 py-1.5 max-w-[70%] ${
                          mine
                            ? 'bg-brand-500/30 ms-auto rounded-tr-sm'
                            : 'bg-ink-700/60 me-auto rounded-tl-sm'
                        }`}
                      >
                        {m.text && (
                          <div className="text-ink-50 break-words leading-snug">
                            {renderText(m.text)}
                          </div>
                        )}
                        {m.image && (
                          <img
                            src={m.image}
                            alt=""
                            className="rounded-lg mt-1 max-w-full max-h-[240px] cursor-zoom-in"
                            onClick={() => window.open(m.image, '_blank')}
                          />
                        )}
                        {m.gif && (
                          <img
                            src={m.gif}
                            alt="GIF"
                            className="rounded-lg mt-1 max-w-full max-h-[240px]"
                          />
                        )}
                        <div
                          className={`text-[10px] mt-1 ${
                            mine ? 'text-white/60 text-end' : 'text-ink-400'
                          }`}
                        >
                          {formatTimestamp(m.createdAt)}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={endRef} />
                </div>

                {picker !== 'none' && (
                  <div className="relative">
                    <div className="absolute bottom-2 end-3 z-10">
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
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendText()
                  }}
                  className="flex items-center gap-1.5 p-3 border-t border-ink-700/50 bg-ink-800/40"
                >
                  <button
                    type="button"
                    onClick={() => setPicker((p) => (p === 'emoji' ? 'none' : 'emoji'))}
                    className={`w-9 h-9 grid place-items-center rounded-lg hover:bg-ink-700/60 ${
                      picker === 'emoji' ? 'text-brand-400 bg-ink-700/40' : 'text-ink-300'
                    }`}
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPicker((p) => (p === 'gif' ? 'none' : 'gif'))}
                    className={`px-2 h-9 text-[11px] font-bold rounded-lg hover:bg-ink-700/60 ${
                      picker === 'gif' ? 'text-brand-400 bg-ink-700/40' : 'text-ink-300'
                    }`}
                  >
                    GIF
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="w-9 h-9 grid place-items-center rounded-lg hover:bg-ink-700/60 text-ink-300 disabled:opacity-50"
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
                      e.target.value = ''
                      if (file) void handleUpload(file)
                    }}
                  />
                  <input
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    placeholder="اكتب رسالة…"
                    maxLength={2000}
                    className="flex-1 bg-ink-900/80 ring-1 ring-ink-600/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={!msg.trim()}
                    className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 px-3 h-9 rounded-lg grid place-items-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
