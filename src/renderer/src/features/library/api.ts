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
  // Same-window 'storage' events don't fire — dispatch our own so subscribers refresh.
  window.dispatchEvent(new CustomEvent('nashat:library-changed', { detail: { key } }))
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
    if (uid) {
      try {
        await set(ref(db, `${listPath(uid, list)}/${item.id}`), item)
      } catch (err) {
        // Cloud write failed — local copy persists; cross-device sync will catch up later.
        console.warn('library cloud write failed', err)
      }
    }
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
    if (uid) {
      try {
        await remove(ref(db, `${listPath(uid, list)}/${id}`))
      } catch (err) {
        console.warn('library cloud delete failed', err)
      }
    }
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
      const refresh = () => {
        const next = readLocal<LibraryItem>(key)
        cb(Object.values(next).sort((a, b) => b.addedAt - a.addedAt))
      }
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) refresh()
      }
      const onLocal = (e: Event) => {
        const detail = (e as CustomEvent<{ key: string }>).detail
        if (detail?.key === key) refresh()
      }
      window.addEventListener('storage', onStorage)
      window.addEventListener('nashat:library-changed', onLocal)
      return () => {
        window.removeEventListener('storage', onStorage)
        window.removeEventListener('nashat:library-changed', onLocal)
      }
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
      try {
        await update(ref(db, `${listPath(uid, 'progress')}/${item.id}`), item)
      } catch (err) {
        console.warn('progress cloud write failed', err)
      }
    }
  },

  async removeProgress(uid: string | null, id: string): Promise<void> {
    const local = readLocal<ProgressItem>(LS_PROGRESS)
    delete local[id]
    writeLocal(LS_PROGRESS, local)
    if (uid) {
      try {
        await remove(ref(db, `${listPath(uid, 'progress')}/${id}`))
      } catch (err) {
        console.warn('progress cloud delete failed', err)
      }
    }
  },

  subscribeProgress(
    uid: string | null,
    cb: (items: ProgressItem[]) => void
  ): () => void {
    const local = readLocal<ProgressItem>(LS_PROGRESS)
    cb(Object.values(local).sort((a, b) => b.updatedAt - a.updatedAt))

    if (!uid) {
      const refresh = () => {
        const next = readLocal<ProgressItem>(LS_PROGRESS)
        cb(Object.values(next).sort((a, b) => b.updatedAt - a.updatedAt))
      }
      const onStorage = (e: StorageEvent) => {
        if (e.key === LS_PROGRESS) refresh()
      }
      const onLocal = (e: Event) => {
        const detail = (e as CustomEvent<{ key: string }>).detail
        if (detail?.key === LS_PROGRESS) refresh()
      }
      window.addEventListener('storage', onStorage)
      window.addEventListener('nashat:library-changed', onLocal)
      return () => {
        window.removeEventListener('storage', onStorage)
        window.removeEventListener('nashat:library-changed', onLocal)
      }
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
