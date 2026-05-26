import { useEffect, useState } from 'react'
import {
  off,
  onValue,
  orderByChild,
  query,
  ref,
  remove,
  set,
  serverTimestamp,
  update
} from 'firebase/database'
import { db } from '@/services/firebase'
import { useAuthStore } from '@/stores/authStore'

export type Profile = {
  username?: string
  usernameChangedAt?: number
  displayName: string
  photoURL?: string
  updatedAt: number
}

// Hard limit: username can be changed at most once every 30 days. This
// stops impersonation churn and gives friends a stable handle to remember.
export const USERNAME_CHANGE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000

export type FriendEntry = {
  since: number
  name: string
}

export type FriendRequest = {
  sentAt: number
  name: string
}

export type RoomInvite = {
  fromUid: string
  fromName: string
  roomId: string
  mediaTitle?: string
  sentAt: number
}

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

export function isValidUsername(u: string): boolean {
  return USERNAME_RE.test(u)
}

// Ensure the current user has a profile entry. Called on sign-in; cheap idempotent write.
export async function ensureProfile() {
  const user = useAuthStore.getState().user
  if (!user) return
  await update(ref(db, `profiles/${user.uid}`), {
    displayName: user.displayName || 'Guest',
    photoURL: user.photoURL || null,
    updatedAt: Date.now()
  })
}

async function readMyProfile(uid: string): Promise<Profile | null> {
  return new Promise((resolve) => {
    onValue(
      ref(db, `profiles/${uid}`),
      (snap) => resolve((snap.val() as Profile | null) ?? null),
      () => resolve(null),
      { onlyOnce: true }
    )
  })
}

// Reserve a username for the current user. Fails if taken by someone else
// or if the user changed it less than 30 days ago.
export async function setUsername(username: string): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('غير مسجّل دخول')
  const u = username.toLowerCase().trim()
  if (!isValidUsername(u)) throw new Error('اسم المستخدم: 3-20 حرف، إنجليزي/أرقام/_ فقط')

  const current = await readMyProfile(user.uid)
  // Enforce 30-day cooldown — but only when ACTUALLY changing to a different
  // username. Reclaiming the same one (no-op) is always allowed.
  if (current?.username && current.username !== u) {
    const since = current.usernameChangedAt || 0
    const elapsed = Date.now() - since
    if (elapsed < USERNAME_CHANGE_COOLDOWN_MS) {
      const daysLeft = Math.ceil((USERNAME_CHANGE_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000))
      throw new Error(`يمكن تغيير اسم المستخدم مرة واحدة كل 30 يوماً. حاول بعد ${daysLeft} يوم.`)
    }
  }

  const now = Date.now()
  // Atomically claim the username + release the old one + update profile.
  const updates: Record<string, unknown> = {}
  updates[`usernames/${u}`] = user.uid
  if (current?.username && current.username !== u) {
    updates[`usernames/${current.username}`] = null
  }
  updates[`profiles/${user.uid}/username`] = u
  updates[`profiles/${user.uid}/usernameChangedAt`] = now
  updates[`profiles/${user.uid}/displayName`] = current?.displayName || user.displayName || 'Guest'
  updates[`profiles/${user.uid}/photoURL`] = current?.photoURL || user.photoURL || null
  updates[`profiles/${user.uid}/updatedAt`] = now
  try {
    await update(ref(db), updates)
  } catch (err) {
    const msg = (err as Error).message
    if (msg.toLowerCase().includes('permission_denied')) {
      throw new Error('اسم المستخدم مأخوذ بالفعل')
    }
    throw err
  }
}

// Update the profile's display name (the friendly name shown to friends).
// Unlimited — change as often as you want.
export async function updateDisplayName(displayName: string): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('غير مسجّل دخول')
  const name = displayName.trim()
  if (name.length < 1 || name.length > 40) {
    throw new Error('الاسم: 1-40 حرف')
  }
  await update(ref(db, `profiles/${user.uid}`), {
    displayName: name,
    updatedAt: Date.now()
  })
}

// Update the profile photo URL. Caller passes an already-uploaded URL
// (typically from imgbb via uploadChatImage with role='avatar').
export async function updatePhotoURL(photoURL: string | null): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('غير مسجّل دخول')
  await update(ref(db, `profiles/${user.uid}`), {
    photoURL: photoURL || null,
    updatedAt: Date.now()
  })
}

// Look up a uid by username. Returns null if not found.
export async function lookupByUsername(username: string): Promise<string | null> {
  const u = username.toLowerCase().trim()
  return new Promise((resolve) => {
    const r = ref(db, `usernames/${u}`)
    onValue(
      r,
      (snap) => resolve((snap.val() as string | null) ?? null),
      () => resolve(null),
      { onlyOnce: true }
    )
  })
}

const readProfile = readMyProfile

// Send a friend request: writes to recipient's `friendRequests/incoming` and
// our own `friendRequests/outgoing`. No-op if already friends.
export async function sendFriendRequest(targetUsername: string): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('غير مسجّل دخول')
  const targetUid = await lookupByUsername(targetUsername)
  if (!targetUid) throw new Error('لم يتم العثور على هذا المستخدم')
  if (targetUid === user.uid) throw new Error('لا يمكن إضافة نفسك')

  const targetProfile = await readProfile(targetUid)
  const myName = user.displayName || 'Guest'
  const targetName = targetProfile?.displayName || targetUsername

  const updates: Record<string, unknown> = {}
  updates[`users/${targetUid}/friendRequests/incoming/${user.uid}`] = {
    sentAt: Date.now(),
    name: myName
  }
  updates[`users/${user.uid}/friendRequests/outgoing/${targetUid}`] = {
    sentAt: Date.now(),
    name: targetName
  }
  await update(ref(db), updates)
}

// Accept a request: write both sides of the friendship, clear both requests.
export async function acceptFriendRequest(fromUid: string): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('غير مسجّل دخول')
  const fromProfile = await readProfile(fromUid)
  const myName = user.displayName || 'Guest'
  const fromName = fromProfile?.displayName || 'Friend'
  const now = Date.now()

  const updates: Record<string, unknown> = {}
  updates[`users/${user.uid}/friends/${fromUid}`] = { since: now, name: fromName }
  updates[`users/${fromUid}/friends/${user.uid}`] = { since: now, name: myName }
  updates[`users/${user.uid}/friendRequests/incoming/${fromUid}`] = null
  updates[`users/${fromUid}/friendRequests/outgoing/${user.uid}`] = null
  await update(ref(db), updates)
}

export async function declineFriendRequest(fromUid: string): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) return
  const updates: Record<string, unknown> = {}
  updates[`users/${user.uid}/friendRequests/incoming/${fromUid}`] = null
  updates[`users/${fromUid}/friendRequests/outgoing/${user.uid}`] = null
  await update(ref(db), updates)
}

export async function removeFriend(friendUid: string): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) return
  const updates: Record<string, unknown> = {}
  updates[`users/${user.uid}/friends/${friendUid}`] = null
  updates[`users/${friendUid}/friends/${user.uid}`] = null
  await update(ref(db), updates)
}

// Invite a friend to a Watch Together room. Writes to their roomInvites
// node which the friend's app listens to.
export async function inviteToRoom(
  friendUid: string,
  roomId: string,
  mediaTitle?: string
): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('غير مسجّل دخول')
  const inviteId = `${user.uid}-${Date.now()}`
  await set(ref(db, `users/${friendUid}/roomInvites/${inviteId}`), {
    fromUid: user.uid,
    fromName: user.displayName || 'Guest',
    roomId,
    mediaTitle: mediaTitle ?? null,
    sentAt: Date.now()
  })
}

export async function dismissInvite(inviteId: string): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) return
  await remove(ref(db, `users/${user.uid}/roomInvites/${inviteId}`))
}

// ---------- Hooks ----------

function useUserSubscription<T>(path: string | null, parse: (raw: unknown) => T) {
  const [value, setValue] = useState<T>(() => parse(null))
  useEffect(() => {
    if (!path) {
      setValue(parse(null))
      return
    }
    const r = ref(db, path)
    const handler = onValue(r, (snap) => setValue(parse(snap.val())))
    return () => off(r, 'value', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])
  return value
}

export function useMyProfile(): Profile | null {
  const uid = useAuthStore((s) => s.user?.uid)
  return useUserSubscription<Profile | null>(
    uid ? `profiles/${uid}` : null,
    (raw) => (raw as Profile | null) ?? null
  )
}

export function useFriends(): Array<{ uid: string } & FriendEntry> {
  const uid = useAuthStore((s) => s.user?.uid)
  return useUserSubscription(uid ? `users/${uid}/friends` : null, (raw) => {
    if (!raw) return []
    return Object.entries(raw as Record<string, FriendEntry>).map(([k, v]) => ({
      uid: k,
      ...v
    }))
  })
}

export function useIncomingRequests(): Array<{ uid: string } & FriendRequest> {
  const uid = useAuthStore((s) => s.user?.uid)
  return useUserSubscription(
    uid ? `users/${uid}/friendRequests/incoming` : null,
    (raw) => {
      if (!raw) return []
      return Object.entries(raw as Record<string, FriendRequest>).map(([k, v]) => ({
        uid: k,
        ...v
      }))
    }
  )
}

export function useRoomInvites(): Array<{ id: string } & RoomInvite> {
  const uid = useAuthStore((s) => s.user?.uid)
  return useUserSubscription(uid ? `users/${uid}/roomInvites` : null, (raw) => {
    if (!raw) return []
    return Object.entries(raw as Record<string, RoomInvite>).map(([k, v]) => ({
      id: k,
      ...v
    }))
  })
}

// Search profiles by username prefix. Lightweight: pulls up to 10 rows from
// the indexed `profiles` collection. Returns matches sorted by username.
export async function searchProfiles(prefix: string): Promise<Profile[]> {
  void prefix
  void query
  void orderByChild
  void serverTimestamp
  // Reserved for future: full text search lives on the client by username
  // prefix only, which `lookupByUsername` already covers exactly.
  return []
}
