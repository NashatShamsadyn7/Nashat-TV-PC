import { useEffect, useState } from 'react'
import {
  off,
  onValue,
  push,
  ref,
  serverTimestamp,
  set,
  update
} from 'firebase/database'
import { db } from '@/services/firebase'
import { useAuthStore } from '@/stores/authStore'
import type { ChatMsg } from '@/features/watchTogether/useRoom'

export type DMSummary = {
  chatId: string
  otherUid: string
  otherName: string
  otherPhoto?: string
  lastMessage?: string
  lastMessageAt?: number
  unread: number
}

// Deterministic chat id so both users compute the same path. Sorted by uid
// alphabetically and joined with `_`.
export function chatIdFor(uidA: string, uidB: string): string {
  return uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`
}

function previewOf(m: { text?: string; image?: string; gif?: string }): string {
  if (m.text) return m.text
  if (m.image) return '📷 صورة'
  if (m.gif) return '🎞 GIF'
  return ''
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out as Partial<T>
}

// Send a DM message. Updates both users' index entries so the inbox sorts
// correctly without an extra read.
export async function sendDM(
  otherUid: string,
  payload: { text?: string; image?: string; gif?: string }
): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('غير مسجّل دخول')
  const chatId = chatIdFor(user.uid, otherUid)
  const now = Date.now()
  const myName = user.displayName || 'Guest'

  const msgRef = push(ref(db, `dms/${chatId}/messages`))
  await set(
    msgRef,
    stripUndefined({
      uid: user.uid,
      name: myName,
      text: payload.text,
      image: payload.image,
      gif: payload.gif,
      createdAt: now
    })
  )

  const preview = previewOf(payload)
  const updates: Record<string, unknown> = {}
  updates[`dms/${chatId}/meta/lastMessage`] = preview
  updates[`dms/${chatId}/meta/lastMessageAt`] = serverTimestamp()
  updates[`dms/${chatId}/meta/participants/${user.uid}`] = true
  updates[`dms/${chatId}/meta/participants/${otherUid}`] = true
  // Per-user index so each side can list their conversations cheaply.
  updates[`users/${user.uid}/dms/${chatId}`] = {
    otherUid,
    lastMessageAt: now,
    lastMessage: preview
  }
  updates[`users/${otherUid}/dms/${chatId}`] = {
    otherUid: user.uid,
    lastMessageAt: now,
    lastMessage: preview
  }
  await update(ref(db), updates)
}

export async function markDMRead(chatId: string): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) return
  await update(ref(db, `users/${user.uid}/dms/${chatId}`), {
    lastReadAt: Date.now()
  })
}

// Hook: live messages for one DM chat. Auto-marks as read while open.
export function useDMMessages(otherUid: string | null): ChatMsg[] {
  const user = useAuthStore((s) => s.user)
  const [messages, setMessages] = useState<ChatMsg[]>([])

  useEffect(() => {
    if (!user || !otherUid) {
      setMessages([])
      return
    }
    const chatId = chatIdFor(user.uid, otherUid)
    const r = ref(db, `dms/${chatId}/messages`)
    const handler = onValue(r, (snap) => {
      const raw = snap.val() as Record<string, ChatMsg> | null
      if (!raw) {
        setMessages([])
        return
      }
      setMessages(
        Object.values(raw).sort((a, b) => a.createdAt - b.createdAt)
      )
      void markDMRead(chatId)
    })
    return () => off(r, 'value', handler)
  }, [user?.uid, otherUid])

  return messages
}

// Hook: the inbox — every DM the current user is part of, plus unread counts
// derived from `lastReadAt` vs `lastMessageAt`.
export function useDMInbox(): DMSummary[] {
  const user = useAuthStore((s) => s.user)
  const [raw, setRaw] = useState<
    Record<
      string,
      {
        otherUid: string
        lastMessage?: string
        lastMessageAt?: number
        lastReadAt?: number
      }
    > | null
  >(null)
  const [profiles, setProfiles] = useState<
    Record<string, { displayName: string; photoURL?: string }>
  >({})

  useEffect(() => {
    if (!user) {
      setRaw(null)
      return
    }
    const r = ref(db, `users/${user.uid}/dms`)
    const handler = onValue(r, (snap) => {
      setRaw(snap.val())
    })
    return () => off(r, 'value', handler)
  }, [user?.uid])

  // Pull each peer's profile (one snapshot per peer).
  useEffect(() => {
    if (!raw) return
    const uids = Array.from(new Set(Object.values(raw).map((e) => e.otherUid)))
    let cancelled = false
    Promise.all(
      uids.map(
        (uid) =>
          new Promise<[string, { displayName: string; photoURL?: string } | null]>(
            (resolve) => {
              onValue(
                ref(db, `profiles/${uid}`),
                (snap) => resolve([uid, snap.val()]),
                () => resolve([uid, null]),
                { onlyOnce: true }
              )
            }
          )
      )
    ).then((entries) => {
      if (cancelled) return
      const next: Record<string, { displayName: string; photoURL?: string }> = {}
      for (const [uid, p] of entries) {
        if (p) next[uid] = p
      }
      setProfiles(next)
    })
    return () => {
      cancelled = true
    }
  }, [raw])

  if (!raw) return []
  return Object.entries(raw)
    .map(([chatId, e]) => {
      const profile = profiles[e.otherUid]
      const unread =
        e.lastMessageAt && (!e.lastReadAt || e.lastReadAt < e.lastMessageAt) ? 1 : 0
      return {
        chatId,
        otherUid: e.otherUid,
        otherName: profile?.displayName || 'مستخدم',
        otherPhoto: profile?.photoURL,
        lastMessage: e.lastMessage,
        lastMessageAt: e.lastMessageAt,
        unread
      } as DMSummary
    })
    .sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0))
}
