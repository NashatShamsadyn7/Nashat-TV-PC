import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { computeLivePosition, useRoom, type RoomState } from './useRoom'

export type RoomSync = {
  inRoom: boolean
  isAdmin: boolean
  room: RoomState | null
  // The current "should-be-at" position in seconds, recomputed each second.
  livePosition: number
  // Increments whenever the admin issues a play / pause / seek. Use this as
  // an iframe reload key so viewers jump to the new position.
  syncTick: number
}

// Subscribes to the active Watch Together room (if any) and exposes a live
// playback position plus a tick counter that bumps on each admin action.
// Returns inRoom=false when there is no active room — callers can fall back
// to their own playback in that case.
export function useRoomSync(): RoomSync {
  const activeRoomId = useRoomStore((s) => s.activeRoomId)
  const user = useAuthStore((s) => s.user)
  const { room } = useRoom(activeRoomId)

  const [livePosition, setLivePosition] = useState(0)

  // The anchorAt/updatedAt pair is the trigger for "admin took an action".
  const syncTick = useMemo(() => {
    if (!room?.state) return 0
    return room.state.updatedAt
  }, [room?.state?.updatedAt])

  useEffect(() => {
    if (!room?.state) return
    setLivePosition(computeLivePosition(room.state))
    if (!room.state.playing) return
    const id = window.setInterval(() => {
      setLivePosition(computeLivePosition(room.state))
    }, 1000)
    return () => window.clearInterval(id)
  }, [room?.state])

  return {
    inRoom: !!activeRoomId && !!room,
    isAdmin: !!room && !!user && room.ownerId === user.uid,
    room: room ?? null,
    livePosition,
    syncTick
  }
}

// Append `?t=N` (and optionally `&autoplay=1`) to an embed URL so the iframe
// starts at the right spot. Servers that ignore these params simply start
// from 0 / paused — harmless.
export function withStartTime(
  url: string,
  positionSec: number,
  autoplay = false
): string {
  if (!url) return url
  const t = Math.max(0, Math.floor(positionSec))
  if (t === 0 && !autoplay) return url
  const params: string[] = []
  if (t > 0) params.push(`t=${t}`)
  if (autoplay) params.push('autoplay=1')
  const sep = url.includes('?') ? '&' : '?'
  const base = `${url}${sep}${params.join('&')}`
  // Also append the HTML5 `#t=` hash for direct .mp4 fallback embeds.
  return t > 0 && !base.includes('#') ? `${base}#t=${t}` : base
}
