import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVoiceCall } from './useVoiceCall'
import { useRoomStore } from '@/stores/roomStore'

// Floating call control. Placed alongside RoomSyncOverlay / RoomChatOverlay
// so it follows the user into every player view. Hidden when not in a room.
export default function VoiceCallButton() {
  const { t } = useTranslation()
  const roomId = useRoomStore((s) => s.activeRoomId)
  const call = useVoiceCall(roomId)
  const [error, setError] = useState<string | null>(null)

  if (!roomId) return null

  const handleJoin = async () => {
    setError(null)
    try {
      await call.start()
    } catch (err) {
      const msg = (err as Error).message
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        setError(t('voicecall.micPermission'))
      } else {
        setError(msg)
      }
    }
  }

  return (
    <div className="fixed bottom-4 start-4 z-[60] pointer-events-auto flex flex-col gap-2 items-start">
      {error && (
        <div className="bg-rose-500/95 backdrop-blur text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg max-w-[260px]">
          {error}
        </div>
      )}

      {call.inCall && call.participants.length > 0 && (
        <div className="bg-black/70 backdrop-blur-md ring-1 ring-white/10 rounded-xl px-3 py-1.5 text-xs text-white">
          {t('voicecall.participants', { count: call.participants.length + 1 })}
        </div>
      )}

      <div className="flex items-center gap-2">
        {!call.inCall ? (
          <button
            onClick={handleJoin}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-14 h-14 grid place-items-center shadow-xl ring-2 ring-ink-900/40"
            title={t('voicecall.joinCall')}
          >
            <Phone className="w-6 h-6" />
          </button>
        ) : (
          <>
            <button
              onClick={call.toggleMute}
              className={`rounded-full w-12 h-12 grid place-items-center shadow-xl ring-2 ring-ink-900/40 ${
                call.muted
                  ? 'bg-rose-500 hover:bg-rose-600'
                  : 'bg-ink-700/80 hover:bg-ink-700'
              } text-white`}
              title={call.muted ? t('voicecall.unmute') : t('voicecall.mute')}
            >
              {call.muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={() => call.leave()}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-full w-14 h-14 grid place-items-center shadow-xl ring-2 ring-ink-900/40"
              title={t('voicecall.endCall')}
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
