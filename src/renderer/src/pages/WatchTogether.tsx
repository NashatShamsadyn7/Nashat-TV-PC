import { useEffect, useRef, useState } from 'react'
import { Users, Send, Copy, LogOut, Crown } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import {
  createRoom,
  joinRoom,
  leaveRoom,
  sendChat,
  useRoom
} from '@/features/watchTogether/useRoom'
import { useAuthStore } from '@/stores/authStore'

export default function WatchTogether() {
  const user = useAuthStore((s) => s.user)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [joinInput, setJoinInput] = useState('')
  const [msg, setMsg] = useState('')
  const { room } = useRoom(roomId)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [room?.chat])

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
            onClick={async () => {
              const id = await createRoom({
                mediaId: 'placeholder',
                mediaTitle: 'لا يوجد محتوى محدد',
                kind: 'movie'
              })
              setRoomId(id)
            }}
            className="bg-brand-500 hover:bg-brand-600 rounded-2xl p-6 text-start"
          >
            <Crown className="w-8 h-8 mb-3" />
            <h3 className="font-semibold text-lg">إنشاء غرفة</h3>
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
                  if (joinInput.trim()) {
                    await joinRoom(joinInput.trim())
                    setRoomId(joinInput.trim())
                  }
                }}
                className="bg-ink-700/60 hover:bg-brand-500 px-4 py-2 rounded-lg text-sm font-semibold"
              >
                دخول
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const chatMessages = room?.chat ? Object.values(room.chat).sort((a, b) => a.createdAt - b.createdAt) : []
  const memberCount = room?.members ? Object.keys(room.members).length : 0

  return (
    <div>
      <PageHeader
        title={`غرفة ${roomId.slice(0, 8)}`}
        subtitle={room?.mediaTitle || 'بدون محتوى محدد'}
      />
      <div className="px-8 grid md:grid-cols-3 gap-4 pb-10">
        <div className="md:col-span-2 bg-ink-700/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-brand-400" />
              {memberCount} مشاهد
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomId)
              }}
              className="flex items-center gap-1.5 text-xs bg-ink-700/60 hover:bg-ink-700 px-3 py-1.5 rounded-lg"
            >
              <Copy className="w-3.5 h-3.5" />
              نسخ الرمز
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
          <p className="text-xs text-ink-300 mt-2">
            💡 لربط مشاهدة فعلية لفيلم أو مسلسل، افتح المحتوى من الصفحة الرئيسية واختر "مشاهدة مع
            الأصدقاء" (قريباً مدعوم تلقائياً).
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

        <div className="bg-ink-700/30 rounded-2xl p-4 flex flex-col h-[480px]">
          <h3 className="font-semibold mb-2 text-sm">دردشة</h3>
          <div className="flex-1 overflow-y-auto space-y-1.5 pe-1">
            {chatMessages.map((m, i) => (
              <div key={i} className="text-sm">
                <span className="font-semibold text-brand-300">{m.name}: </span>
                <span className="text-ink-100">{m.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (msg.trim()) {
                sendChat(roomId, msg.trim())
                setMsg('')
              }
            }}
            className="flex gap-2 mt-3"
          >
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="اكتب رسالة…"
              maxLength={500}
              className="flex-1 bg-ink-700 ring-1 ring-ink-600 rounded-lg px-3 py-2 text-sm"
            />
            <button className="bg-brand-500 hover:bg-brand-600 px-3 rounded-lg">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
