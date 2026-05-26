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

export type RoomState = {
  ownerId: string
  createdAt: number
  mediaTitle?: string
  mediaId?: string
  kind?: 'movie' | 'tv' | 'channel'
  media?: RoomMedia
  state: { playing: boolean; position: number; updatedAt: number }
  members?: Record<string, { name: string; joinedAt: number }>
  chat?: Record<string, ChatMsg>
}

export type ChatMsg = {
  uid: string
  name: string
  text: string
  createdAt: number
}

function uid() {
  return Math.random().toString(36).slice(2, 8)
}

export function createRoomId(): string {
  return uid() + '-' + uid()
}

// Firebase RTDB rejects writes containing undefined values, so strip them
// before sending. Returns a new object with only defined entries.
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out as Partial<T>
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
  await set(ref(db, `rooms/${roomId}`), {
    ownerId: user.uid,
    createdAt: Date.now(),
    mediaId: opts.mediaId,
    mediaTitle: opts.mediaTitle,
    kind: opts.kind,
    ...(opts.media ? { media: stripUndefined(opts.media as Record<string, unknown>) } : {}),
    state: { playing: false, position: 0, updatedAt: Date.now() },
    members: { [user.uid]: { name: user.displayName || 'Guest', joinedAt: Date.now() } }
  })
  return roomId
}

export async function setRoomMedia(roomId: string, media: RoomMedia) {
  await update(ref(db, `rooms/${roomId}`), {
    media,
    mediaId: media.mediaId,
    mediaTitle: media.title,
    kind: media.kind,
    state: { playing: false, position: 0, updatedAt: Date.now() }
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

export async function syncState(roomId: string, playing: boolean, position: number) {
  await update(ref(db, `rooms/${roomId}/state`), {
    playing,
    position,
    updatedAt: serverTimestamp() as unknown as number
  })
}

export async function sendChat(roomId: string, text: string) {
  const user = useAuthStore.getState().user
  if (!user) return
  await push(ref(db, `rooms/${roomId}/chat`), {
    uid: user.uid,
    name: user.displayName || 'Guest',
    text,
    createdAt: Date.now()
  })
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
