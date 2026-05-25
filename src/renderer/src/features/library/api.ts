import { ref, set, remove, onValue, off, get, update } from 'firebase/database'
import { db } from '@/services/firebase'
import type { LibraryItem, ProgressItem } from './types'

const LS_WATCHLIST = 'nashat-watchlist-v1'
const LS_FAVORITES = 'nashat-favorites-v1'
const LS_PROGRESS = 'nashat-progress-v1'

function readLocal<T>(key: string): Record<string, T> {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}')
  } catch {
    return {}
  }
}
function writeLocal<T>(key: string, value: Record<string, T>) {
  localStorage.setItem(key, JSON.stringify(value))
}

function listPath(uid: string, list: 'watchlist' | 'favorites' | 'progress') {
  return `users/${uid}/${list}`
}

export const libraryApi = {
  async addToList(
    uid: string | null,
    list: 'watchlist' | 'favorites',
    item: LibraryItem
  ): Promise<void> {
    const key = list === 'watchlist' ? LS_WATCHLIST : LS_FAVORITES
    const local = readLocal<LibraryItem>(key)
    local[item.id] = item
    writeLocal(key, local)
    if (uid) await set(ref(db, `${listPath(uid, list)}/${item.id}`), item)
  },

  async removeFromList(
    uid: string | null,
    list: 'watchlist' | 'favorites',
    id: string
  ): Promise<void> {
    const key = list === 'watchlist' ? LS_WATCHLIST : LS_FAVORITES
    const local = readLocal<LibraryItem>(key)
    delete local[id]
    writeLocal(key, local)
    if (uid) await remove(ref(db, `${listPath(uid, list)}/${id}`))
  },

  subscribeList(
    uid: string | null,
    list: 'watchlist' | 'favorites',
    cb: (items: LibraryItem[]) => void
  ): () => void {
    const key = list === 'watchlist' ? LS_WATCHLIST : LS_FAVORITES
    const local = readLocal<LibraryItem>(key)
    cb(Object.values(local).sort((a, b) => b.addedAt - a.addedAt))

    if (!uid) {
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          const next = readLocal<LibraryItem>(key)
          cb(Object.values(next).sort((a, b) => b.addedAt - a.addedAt))
        }
      }
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    }

    const r = ref(db, listPath(uid, list))
    const handler = onValue(r, (snap) => {
      const val = (snap.val() as Record<string, LibraryItem>) || {}
      writeLocal(key, val)
      cb(Object.values(val).sort((a, b) => b.addedAt - a.addedAt))
    })
    return () => off(r, 'value', handler)
  },

  async saveProgress(uid: string | null, item: ProgressItem): Promise<void> {
    const local = readLocal<ProgressItem>(LS_PROGRESS)
    local[item.id] = item
    writeLocal(LS_PROGRESS, local)
    if (uid) {
      await update(ref(db, `${listPath(uid, 'progress')}/${item.id}`), item)
    }
  },

  async removeProgress(uid: string | null, id: string): Promise<void> {
    const local = readLocal<ProgressItem>(LS_PROGRESS)
    delete local[id]
    writeLocal(LS_PROGRESS, local)
    if (uid) await remove(ref(db, `${listPath(uid, 'progress')}/${id}`))
  },

  subscribeProgress(
    uid: string | null,
    cb: (items: ProgressItem[]) => void
  ): () => void {
    const local = readLocal<ProgressItem>(LS_PROGRESS)
    cb(Object.values(local).sort((a, b) => b.updatedAt - a.updatedAt))

    if (!uid) {
      const onStorage = (e: StorageEvent) => {
        if (e.key === LS_PROGRESS) {
          const next = readLocal<ProgressItem>(LS_PROGRESS)
          cb(Object.values(next).sort((a, b) => b.updatedAt - a.updatedAt))
        }
      }
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    }

    const r = ref(db, listPath(uid, 'progress'))
    const handler = onValue(r, (snap) => {
      const val = (snap.val() as Record<string, ProgressItem>) || {}
      writeLocal(LS_PROGRESS, val)
      cb(Object.values(val).sort((a, b) => b.updatedAt - a.updatedAt))
    })
    return () => off(r, 'value', handler)
  },

  async pullCloudOnce(uid: string): Promise<void> {
    // One-shot merge on sign-in: cloud overrides local for cross-device truth.
    for (const list of ['watchlist', 'favorites', 'progress'] as const) {
      const snap = await get(ref(db, listPath(uid, list)))
      const val = snap.val() ?? {}
      const key =
        list === 'watchlist'
          ? LS_WATCHLIST
          : list === 'favorites'
            ? LS_FAVORITES
            : LS_PROGRESS
      writeLocal(key, val)
    }
  }
}
