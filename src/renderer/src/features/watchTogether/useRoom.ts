import { useEffect, useState } from 'react'
import { off, onValue, ref, set, update, push, serverTimestamp, remove } from 'firebase/database'
import { db } from '@/services/firebase'
import { useAuthStore } from '@/stores/authStore'

export type RoomMedia = {
  kind: 'movie' | 'tv' | 'channel'
  mediaId: string
  title: string
  tmdbId?: number
  season?: number
  episode?: number
  backdrop?: string
  subtitle?: string
}

export type RoomPlaybackState = {
  playing: boolean
  position: number
  anchorAt: number
  updatedAt: number
}

export type RoomState = {
  ownerId: string
  createdAt: number
  mediaTitle?: string
  mediaId?: string
  kind?: 'movie' | 'tv' | 'channel'
  media?: RoomMedia
  state: RoomPlaybackState
  members?: Record<string, { name: string; joinedAt: number }>
  chat?: Record<string, ChatMsg>
}

export type ChatMsg = {
  uid: string
  name: string
  text?: string
  image?: string
  gif?: string
  createdAt: number
}

function uid() {
  return Math.random().toString(36).slice(2, 8)
}

export function createRoomId(): string {
  return uid() + '-' + uid()
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out as Partial<T>
}

// Compute the position the viewer SHOULD be at right now, given the admin's
// server-time anchor. Returns `position` directly when paused.
export function computeLivePosition(state: RoomPlaybackState | undefined): number {
  if (!state) return 0
  if (!state.playing) return state.position
  const driftSec = Math.max(0, (Date.now() - state.anchorAt) / 1000)
  return state.position + driftSec
}

export async function createRoom(opts: {
  mediaId: string
  mediaTitle: string
  kind: 'movie' | 'tv' | 'channel'
  media?: RoomMedia
}): Promise<string> {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('يجب تسجيل الدخول')
  const roomId = createRoomId()
  const now = Date.now()
  await set(ref(db, `rooms/${roomId}`), {
    ownerId: user.uid,
    createdAt: now,
    mediaId: opts.mediaId,
    mediaTitle: opts.mediaTitle,
    kind: opts.kind,
    ...(opts.media ? { media: stripUndefined(opts.media as Record<string, unknown>) } : {}),
    state: { playing: false, position: 0, anchorAt: now, updatedAt: now },
    members: { [user.uid]: { name: user.displayName || 'Guest', joinedAt: now } }
  })
  return roomId
}

export async function setRoomMedia(roomId: string, media: RoomMedia) {
  const now = Date.now()
  await update(ref(db, `rooms/${roomId}`), {
    media,
    mediaId: media.mediaId,
    mediaTitle: media.title,
    kind: media.kind,
    state: { playing: false, position: 0, anchorAt: now, updatedAt: now }
  })
}

export async function joinRoom(roomId: string) {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('يجب تسجيل الدخول')
  await update(ref(db, `rooms/${roomId}/members/${user.uid}`), {
    name: user.displayName || 'Guest',
    joinedAt: Date.now()
  })
}

export async function leaveRoom(roomId: string) {
  const user = useAuthStore.getState().user
  if (!user) return
  await remove(ref(db, `rooms/${roomId}/members/${user.uid}`))
}

// Admin: start (or resume) playback. anchorAt = server time when admin pressed play.
export async function adminPlay(roomId: string, position: number) {
  await update(ref(db, `rooms/${roomId}/state`), {
    playing: true,
    position,
    anchorAt: serverTimestamp() as unknown as number,
    updatedAt: serverTimestamp() as unknown as number
  })
}

// Admin: pause at a specific position.
export async function adminPause(roomId: string, position: number) {
  await update(ref(db, `rooms/${roomId}/state`), {
    playing: false,
    position,
    anchorAt: serverTimestamp() as unknown as number,
    updatedAt: serverTimestamp() as unknown as number
  })
}

// Admin: seek to position (keeps playing flag as-is).
export async function adminSeek(roomId: string, position: number, playing: boolean) {
  await update(ref(db, `rooms/${roomId}/state`), {
    playing,
    position,
    anchorAt: serverTimestamp() as unknown as number,
    updatedAt: serverTimestamp() as unknown as number
  })
}

// Legacy helper kept for compatibility; prefer the admin* variants.
export async function syncState(roomId: string, playing: boolean, position: number) {
  await update(ref(db, `rooms/${roomId}/state`), {
    playing,
    position,
    anchorAt: serverTimestamp() as unknown as number,
    updatedAt: serverTimestamp() as unknown as number
  })
}

export async function sendChat(
  roomId: string,
  payload: { text?: string; image?: string; gif?: string }
) {
  const user = useAuthStore.getState().user
  if (!user) return
  await push(
    ref(db, `rooms/${roomId}/chat`),
    stripUndefined({
      uid: user.uid,
      name: user.displayName || 'Guest',
      text: payload.text,
      image: payload.image,
      gif: payload.gif,
      createdAt: Date.now()
    })
  )
}

export function useRoom(roomId: string | null) {
  const [room, setRoom] = useState<RoomState | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!roomId) {
      setRoom(null)
      return
    }
    setLoading(true)
    const r = ref(db, `rooms/${roomId}`)
    const handler = onValue(
      r,
      (snap) => {
        setRoom(snap.val() as RoomState | null)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => off(r, 'value', handler)
  }, [roomId])

  return { room, loading }
}
