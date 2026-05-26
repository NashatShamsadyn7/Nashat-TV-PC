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

// Append `?t=N` (or `&t=N`) to an embed URL so the iframe starts at that
// position. Servers that ignore it simply start from 0 — harmless.
export function withStartTime(url: string, positionSec: number): string {
  if (!url) return url
  const t = Math.max(0, Math.floor(positionSec))
  if (t === 0) return url
  const sep = url.includes('?') ? '&' : '?'
  // `t` is the most widely supported param across vidsrc, vidlink, autoembed
  // and the standard HTML5 `#t=` hash. We add both for maximum coverage.
  const base = `${url}${sep}t=${t}`
  return base.includes('#') ? base : `${base}#t=${t}`
}
