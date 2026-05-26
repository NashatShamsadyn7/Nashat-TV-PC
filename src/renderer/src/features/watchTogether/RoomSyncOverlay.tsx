import { useEffect, useState } from 'react'
import { Crown, Play, Pause, RotateCw, ChevronsRight } from 'lucide-react'
import { adminPause, adminPlay, adminSeek } from './useRoom'
import { useRoomSync } from './useRoomSync'
import { useRoomStore } from '@/stores/roomStore'

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '00:00'
  const s = Math.floor(sec % 60)
  const m = Math.floor((sec / 60) % 60)
  const h = Math.floor(sec / 3600)
  const mm = m.toString().padStart(2, '0')
  const ss = s.toString().padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// Floating overlay rendered on top of the iframe player. Admin sees full
// controls (start the virtual clock, pause, seek). Viewers see the admin's
// live position and a "Re-sync" button that reloads their iframe.
//
// onResync — caller-provided callback that bumps the iframe key with `?t=`
// applied so viewers can jump back to the admin's position. Only applies to
// iframe content; HTML5 players sync automatically via React state.
export default function RoomSyncOverlay({ onResync }: { onResync?: () => void }) {
  const { inRoom, isAdmin, room, livePosition } = useRoomSync()
  const [toast, setToast] = useState<string | null>(null)
  const activeRoomId = useRoomStore((s) => s.activeRoomId)

  // Pop a toast when the admin issues a new action.
  useEffect(() => {
    if (!inRoom || !room?.state) return
    if (isAdmin) return
    const action = room.state.playing ? '▶ تشغيل' : '⏸ إيقاف'
    setToast(`${action} على ${formatTime(room.state.position)}`)
    const id = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(id)
  }, [room?.state?.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!inRoom || !room || !activeRoomId) return null

  const playing = room.state.playing
  const ownerName =
    (room.members && Object.entries(room.members).find(([id]) => id === room.ownerId)?.[1]?.name) ||
    'الأدمن'

  if (isAdmin) {
    return (
      <div className="absolute top-20 start-4 z-20 flex flex-col gap-2 pointer-events-auto">
        <div className="bg-amber-500/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 self-start">
          <Crown className="w-3.5 h-3.5" /> أنت الأدمن
        </div>
        <div className="bg-black/70 backdrop-blur-md ring-1 ring-white/10 rounded-2xl p-3 flex items-center gap-2 text-white">
          <button
            onClick={() =>
              playing
                ? adminPause(activeRoomId, livePosition)
                : adminPlay(activeRoomId, livePosition)
            }
            className="w-10 h-10 grid place-items-center rounded-full bg-brand-500 hover:bg-brand-600"
            title={playing ? 'إيقاف الكل' : 'تشغيل الكل'}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => adminSeek(activeRoomId, Math.max(0, livePosition - 30), playing)}
            className="w-8 h-8 grid place-items-center rounded-full bg-ink-700/70 hover:bg-ink-600"
            title="رجوع 30 ثانية للكل"
          >
            <RotateCw className="w-3.5 h-3.5 rotate-180" />
          </button>
          <button
            onClick={() => adminSeek(activeRoomId, livePosition + 30, playing)}
            className="w-8 h-8 grid place-items-center rounded-full bg-ink-700/70 hover:bg-ink-600"
            title="تقديم 30 ثانية للكل"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
          <div className="text-xs font-mono tabular-nums px-2 min-w-[60px] text-center">
            {formatTime(livePosition)}
          </div>
          <button
            onClick={() => {
              const next = window.prompt('انتقل إلى (mm:ss أو ثانية)؟')
              if (!next) return
              const parts = next.split(':').map((p) => parseInt(p.trim(), 10))
              let seconds = 0
              if (parts.length === 2) seconds = parts[0] * 60 + parts[1]
              else if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
              else seconds = parts[0]
              if (Number.isFinite(seconds) && seconds >= 0) {
                adminSeek(activeRoomId, seconds, playing)
              }
            }}
            className="text-[10px] bg-ink-700/60 hover:bg-ink-600 px-2 py-1 rounded-md"
            title="انتقل إلى وقت محدد"
          >
            انتقل…
          </button>
        </div>
        <p className="text-[10px] text-white/70 bg-black/40 backdrop-blur px-2 py-1 rounded self-start">
          الأزرار هنا تتحكّم بكل المشاهدين. الـ play/pause داخل الفيديو يتحكم بك فقط.
        </p>
      </div>
    )
  }

  // Viewer view — read-only status + manual resync.
  return (
    <>
      <div className="absolute top-20 start-4 z-20 flex flex-col gap-2 pointer-events-auto">
        <div className="bg-black/70 backdrop-blur-md ring-1 ring-white/10 rounded-2xl px-3 py-2 flex items-center gap-2 text-white">
          <span
            className={`w-2 h-2 rounded-full ${playing ? 'bg-emerald-400 animate-pulse' : 'bg-ink-300'}`}
          />
          <div className="text-xs">
            <div className="font-semibold leading-tight">
              {ownerName} {playing ? 'يشاهد' : 'متوقّف'}
            </div>
            <div className="text-white/60 font-mono text-[10px]">
              {formatTime(livePosition)}
            </div>
          </div>
          {onResync && (
            <button
              onClick={onResync}
              className="text-[10px] bg-brand-500 hover:bg-brand-600 px-2 py-1 rounded-md font-semibold ms-2"
              title="عُد إلى موقع الأدمن"
            >
              🔄 مزامنة
            </button>
          )}
        </div>
      </div>
      {toast && (
        <div className="absolute top-32 start-4 z-30 bg-brand-500/95 backdrop-blur text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg pointer-events-none">
          {toast}
        </div>
      )}
    </>
  )
}

