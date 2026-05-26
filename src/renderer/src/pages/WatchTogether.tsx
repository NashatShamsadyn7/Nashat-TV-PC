import { useEffect, useRef, useState } from 'react'
import { Users, Send, LogOut, Crown, Share2, Play, Pause, RotateCcw, FastForward, Rewind, Film, Smile, Image as ImageIcon, Loader2 } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import InviteModal from '@/components/modals/InviteModal'
import {
  createRoom,
  joinRoom,
  leaveRoom,
  sendChat,
  syncState,
  useRoom
} from '@/features/watchTogether/useRoom'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { usePlayerStore } from '@/stores/playerStore'
import VoiceCallButton from '@/features/voiceCall/VoiceCallButton'
import EmojiPicker from '@/features/watchTogether/EmojiPicker'
import GifPicker from '@/features/watchTogether/GifPicker'
import { uploadChatImage } from '@/features/watchTogether/chatUploads'

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00'
  const s = Math.floor(seconds % 60)
  const m = Math.floor((seconds / 60) % 60)
  const h = Math.floor(seconds / 3600)
  const mm = m.toString().padStart(2, '0')
  const ss = s.toString().padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export default function WatchTogether() {
  const user = useAuthStore((s) => s.user)
  const activeRoomId = useRoomStore((s) => s.activeRoomId)
  const setActiveRoom = useRoomStore((s) => s.setActive)
  const openTmdb = usePlayerStore((s) => s.openTmdb)
  const [roomId, setRoomId] = useState<string | null>(activeRoomId)
  const [joinInput, setJoinInput] = useState('')
  const [msg, setMsg] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [picker, setPicker] = useState<'none' | 'emoji' | 'gif'>('none')
  const [uploading, setUploading] = useState(false)
  const { room } = useRoom(roomId)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // If we arrived from Details.tsx with a freshly created room, auto-open the
  // invite modal so the user can share the code immediately.
  useEffect(() => {
    if (activeRoomId && activeRoomId !== roomId) {
      setRoomId(activeRoomId)
      setInviteOpen(true)
    }
  }, [activeRoomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the room store in sync with local state so other pages can read it.
  useEffect(() => {
    setActiveRoom(roomId)
  }, [roomId, setActiveRoom])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [room?.chat])

  // Auto-leave on page unmount / app close so stale members don't linger.
  useEffect(() => {
    if (!roomId) return
    const handler = () => {
      void leaveRoom(roomId)
    }
    window.addEventListener('beforeunload', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
      void leaveRoom(roomId)
    }
  }, [roomId])

  if (!user) {
    return (
      <div>
        <PageHeader title="مشاهدة مع الأصدقاء" />
        <div className="px-8">
          <div className="bg-ink-700/30 rounded-2xl p-6 max-w-xl">
            <Users className="w-10 h-10 text-brand-400 mb-3" />
            <p>يجب تسجيل الدخول لاستخدام Watch Together.</p>
            <a
              href="#/settings"
              className="mt-3 inline-block text-brand-400 hover:underline text-sm"
            >
              الذهاب إلى الإعدادات →
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!roomId) {
    return (
      <div>
        <PageHeader title="مشاهدة مع الأصدقاء" subtitle="انضم لغرفة موجودة أو أنشئ غرفة جديدة" />
        <div className="px-8 grid md:grid-cols-2 gap-4 max-w-3xl">
          <button
            disabled={busy}
            onClick={async () => {
              setError(null)
              setBusy(true)
              try {
                const id = await createRoom({
                  mediaId: 'placeholder',
                  mediaTitle: 'لا يوجد محتوى محدد',
                  kind: 'movie'
                })
                setRoomId(id)
                setInviteOpen(true)
              } catch (err) {
                console.error('[watchTogether] createRoom failed:', err)
                const msg = (err as Error)?.message ?? String(err)
                if (msg.toLowerCase().includes('permission_denied')) {
                  setError('قواعد Firebase RTDB ترفض الكتابة. اذهب إلى Firebase Console → Realtime Database → Rules وحدّثها للسماح للمستخدمين المسجّلين.')
                } else {
                  setError(`فشل إنشاء الغرفة: ${msg}`)
                }
              } finally {
                setBusy(false)
              }
            }}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 rounded-2xl p-6 text-start"
          >
            <Crown className="w-8 h-8 mb-3" />
            <h3 className="font-semibold text-lg">{busy ? 'جاري الإنشاء…' : 'إنشاء غرفة'}</h3>
            <p className="text-sm opacity-80">أنت تكون المالك وتتحكّم بالتشغيل</p>
          </button>
          <div className="bg-ink-700/30 rounded-2xl p-6">
            <Users className="w-8 h-8 text-brand-400 mb-3" />
            <h3 className="font-semibold text-lg mb-2">انضمام لغرفة</h3>
            <div className="flex gap-2">
              <input
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="رمز الغرفة"
                className="flex-1 bg-ink-700 ring-1 ring-ink-600 rounded-lg px-3 py-2 text-sm font-mono"
              />
              <button
                onClick={async () => {
                  const code = joinInput.trim()
                  if (!code) return
                  setError(null)
                  try {
                    await joinRoom(code)
                    setRoomId(code)
                  } catch (err) {
                    console.error('[watchTogether] joinRoom failed:', err)
                    setError(`فشل الانضمام: ${(err as Error)?.message ?? err}`)
                  }
                }}
                className="bg-ink-700/60 hover:bg-brand-500 px-4 py-2 rounded-lg text-sm font-semibold"
              >
                دخول
              </button>
            </div>
          </div>
          {error && (
            <div className="md:col-span-2 text-sm text-rose-300 bg-rose-500/10 ring-1 ring-rose-500/30 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  const chatMessages = room?.chat
    ? Object.values(room.chat).sort((a, b) => a.createdAt - b.createdAt)
    : []
  const memberCount = room?.members ? Object.keys(room.members).length : 0
  const isOwner = room?.ownerId === user.uid
  const playing = room?.state?.playing ?? false
  const position = room?.state?.position ?? 0

  const togglePlay = () => syncState(roomId, !playing, position)
  const seek = (delta: number) => syncState(roomId, playing, Math.max(0, position + delta))
  const restart = () => syncState(roomId, false, 0)

  return (
    <div>
      <PageHeader
        title={`غرفة ${roomId.slice(0, 8)}`}
        subtitle={room?.mediaTitle || 'بدون محتوى محدد'}
      />
      <div className="px-8 grid md:grid-cols-3 gap-4 pb-10">
        <div className="md:col-span-2 bg-ink-700/30 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-brand-400" />
              {memberCount} مشاهد
            </div>
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-brand-500 hover:bg-brand-600 px-3 py-1.5 rounded-lg font-semibold"
            >
              <Share2 className="w-3.5 h-3.5" />
              ادعُ صديقاً
            </button>
          </div>

          {room?.members && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(room.members).map(([uid, m]) => (
                <span
                  key={uid}
                  className={`text-xs px-2 py-1 rounded-full ${
                    uid === room.ownerId ? 'bg-amber-500/20 text-amber-300' : 'bg-ink-700/60'
                  }`}
                >
                  {uid === room.ownerId && '👑 '}
                  {m.name}
                </span>
              ))}
            </div>
          )}

          {room?.media && room.media.tmdbId && (
            <div className="bg-ink-900/60 rounded-xl p-4 ring-1 ring-brand-500/30 flex items-center gap-4">
              {room.media.backdrop && (
                <img
                  src={room.media.backdrop}
                  alt=""
                  className="w-24 aspect-video object-cover rounded-lg shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-ink-400 mb-1">ما نشاهده الآن</p>
                <h4 className="font-semibold truncate">{room.media.title}</h4>
                {room.media.subtitle && (
                  <p className="text-xs text-ink-300 mt-0.5">
                    {room.media.subtitle}
                    {room.media.season && ` · S${room.media.season}`}
                    {room.media.episode && ` · E${room.media.episode}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  if (!room.media || !room.media.tmdbId) return
                  openTmdb({
                    kind: room.media.kind === 'channel' ? 'movie' : room.media.kind,
                    tmdbId: room.media.tmdbId,
                    title: room.media.title,
                    subtitle: room.media.subtitle,
                    backdrop: room.media.backdrop,
                    season: room.media.season,
                    episode: room.media.episode
                  })
                }}
                className="bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shrink-0"
              >
                <Film className="w-4 h-4" />
                فتح المشغّل
              </button>
            </div>
          )}

          <div className="bg-ink-900/60 rounded-xl p-5 ring-1 ring-ink-700/40">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-ink-400">حالة المزامنة</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  playing ? 'bg-emerald-500/20 text-emerald-300' : 'bg-ink-700/60 text-ink-300'
                }`}
              >
                {playing ? '▶ يعمل' : '⏸ متوقف'}
              </span>
            </div>
            <div className="text-2xl font-mono text-center mb-4">{formatTime(position)}</div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => seek(-30)}
                disabled={!isOwner}
                className="w-10 h-10 grid place-items-center rounded-full bg-ink-700/60 hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title="رجوع 30 ثانية"
              >
                <Rewind className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                disabled={!isOwner}
                className="w-14 h-14 grid place-items-center rounded-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <button
                onClick={() => seek(30)}
                disabled={!isOwner}
                className="w-10 h-10 grid place-items-center rounded-full bg-ink-700/60 hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title="تقديم 30 ثانية"
              >
                <FastForward className="w-4 h-4" />
              </button>
              <button
                onClick={restart}
                disabled={!isOwner}
                className="ms-2 w-10 h-10 grid place-items-center rounded-full bg-ink-700/60 hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title="إعادة من البداية"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            {!isOwner && (
              <p className="text-xs text-ink-400 text-center mt-4">
                المالك فقط يتحكّم بالتشغيل. التحديثات تصل لك تلقائياً.
              </p>
            )}
          </div>

          <p className="text-xs text-ink-300">
            💡 لربط فيلم/مسلسل حقيقي بالغرفة، افتح المحتوى من الصفحة الرئيسية واختر "مشاهدة مع
            الأصدقاء" (دمج الـ player قريباً).
          </p>

          <div className="flex items-center justify-between pt-4 border-t border-ink-700/50">
            <button
              onClick={async () => {
                await leaveRoom(roomId)
                setRoomId(null)
              }}
              className="flex items-center gap-2 text-sm text-rose-400 hover:text-rose-300"
            >
              <LogOut className="w-4 h-4" /> مغادرة الغرفة
            </button>
          </div>
        </div>

        <div className="bg-ink-700/30 rounded-2xl p-4 flex flex-col h-[560px]">
          <h3 className="font-semibold mb-2 text-sm">دردشة</h3>
          <div className="flex-1 overflow-y-auto space-y-1.5 pe-1">
            {chatMessages.length === 0 && (
              <p className="text-xs text-ink-400 text-center mt-6">
                لا توجد رسائل بعد — كن أول من يكتب 👋
              </p>
            )}
            {chatMessages.map((m, i) => {
              const mine = m.uid === user.uid
              return (
                <div
                  key={i}
                  className={`text-sm rounded-lg px-2.5 py-1.5 max-w-[85%] ${
                    mine ? 'bg-brand-500/20 ms-auto' : 'bg-ink-700/40 me-auto'
                  }`}
                >
                  {!mine && (
                    <div className="text-xs font-semibold text-brand-300">{m.name}</div>
                  )}
                  {m.text && <div className="text-ink-100 break-words">{m.text}</div>}
                  {m.image && (
                    <img
                      src={m.image}
                      alt=""
                      className="rounded-md mt-1 max-w-full max-h-[180px] cursor-zoom-in"
                      onClick={() => window.open(m.image, '_blank')}
                    />
                  )}
                  {m.gif && (
                    <img
                      src={m.gif}
                      alt="GIF"
                      className="rounded-md mt-1 max-w-full max-h-[180px]"
                    />
                  )}
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>
          {picker !== 'none' && (
            <div className="relative">
              <div className="absolute bottom-2 end-0 z-10">
                {picker === 'emoji' && (
                  <EmojiPicker
                    onPick={(e) => {
                      setMsg((m) => m + e)
                      setPicker('none')
                    }}
                  />
                )}
                {picker === 'gif' && (
                  <GifPicker
                    onPick={(gifUrl) => {
                      void sendChat(roomId, { gif: gifUrl })
                      setPicker('none')
                    }}
                  />
                )}
              </div>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const text = msg.trim()
              if (text) {
                void sendChat(roomId, { text })
                setMsg('')
              }
            }}
            className="flex items-center gap-1.5 mt-3"
          >
            <button
              type="button"
              onClick={() => setPicker((p) => (p === 'emoji' ? 'none' : 'emoji'))}
              className={`w-9 h-9 grid place-items-center rounded-lg hover:bg-ink-700/60 ${
                picker === 'emoji' ? 'text-brand-400 bg-ink-700/40' : 'text-ink-300'
              }`}
              title="إيموجي"
            >
              <Smile className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPicker((p) => (p === 'gif' ? 'none' : 'gif'))}
              className={`px-2 h-9 text-[11px] font-bold rounded-lg hover:bg-ink-700/60 ${
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
              className="w-9 h-9 grid place-items-center rounded-lg hover:bg-ink-700/60 text-ink-300 disabled:opacity-50"
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
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file || !user) return
                setUploading(true)
                try {
                  const url = await uploadChatImage(roomId, user.uid, file)
                  await sendChat(roomId, { image: url })
                } catch (err) {
                  window.alert(`فشل رفع الصورة: ${(err as Error).message}`)
                } finally {
                  setUploading(false)
                }
              }}
            />
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="اكتب رسالة…"
              maxLength={500}
              className="flex-1 bg-ink-700 ring-1 ring-ink-600 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={!msg.trim()}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 px-3 h-9 rounded-lg grid place-items-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      <InviteModal
        open={inviteOpen}
        roomId={roomId}
        mediaTitle={room?.mediaTitle}
        onClose={() => setInviteOpen(false)}
      />
      <VoiceCallButton />
    </div>
  )
}
