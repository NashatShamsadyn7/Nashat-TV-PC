import { create } from 'zustand'
import { libraryApi } from '@/features/library/api'
import type { LibraryItem, ProgressItem } from '@/features/library/types'
import { useAuthStore } from './authStore'

type LibraryState = {
  watchlist: LibraryItem[]
  favorites: LibraryItem[]
  progress: ProgressItem[]
  hydrated: boolean
}

export const useLibraryStore = create<LibraryState>(() => ({
  watchlist: [],
  favorites: [],
  progress: [],
  hydrated: false
}))

let unsubs: Array<() => void> = []

function rebindForUser(uid: string | null) {
  unsubs.forEach((u) => u())
  unsubs = []

  unsubs.push(
    libraryApi.subscribeList(uid, 'watchlist', (items) =>
      useLibraryStore.setState({ watchlist: items, hydrated: true })
    )
  )
  unsubs.push(
    libraryApi.subscribeList(uid, 'favorites', (items) =>
      useLibraryStore.setState({ favorites: items })
    )
  )
  unsubs.push(
    libraryApi.subscribeProgress(uid, (items) =>
      useLibraryStore.setState({ progress: items })
    )
  )
}

// React to auth changes
let lastUid: string | null | undefined
useAuthStore.subscribe((state) => {
  const uid = state.user?.uid ?? null
  if (uid === lastUid) return
  lastUid = uid
  if (uid) {
    libraryApi.pullCloudOnce(uid).finally(() => rebindForUser(uid))
  } else {
    rebindForUser(null)
  }
})
// Initial bind (anonymous, until auth resolves)
rebindForUser(null)

export const libraryActions = {
  isInWatchlist(id: string): boolean {
    return useLibraryStore.getState().watchlist.some((i) => i.id === id)
  },
  isFavorite(id: string): boolean {
    return useLibraryStore.getState().favorites.some((i) => i.id === id)
  },
  async toggleWatchlist(item: LibraryItem): Promise<void> {
    const uid = useAuthStore.getState().user?.uid ?? null
    if (libraryActions.isInWatchlist(item.id)) {
      await libraryApi.removeFromList(uid, 'watchlist', item.id)
    } else {
      await libraryApi.addToList(uid, 'watchlist', item)
    }
  },
  async toggleFavorite(item: LibraryItem): Promise<void> {
    const uid = useAuthStore.getState().user?.uid ?? null
    if (libraryActions.isFavorite(item.id)) {
      await libraryApi.removeFromList(uid, 'favorites', item.id)
    } else {
      await libraryApi.addToList(uid, 'favorites', item)
    }
  },
  async recordProgress(item: ProgressItem): Promise<void> {
    const uid = useAuthStore.getState().user?.uid ?? null
    await libraryApi.saveProgress(uid, item)
  },
  async clearProgress(id: string): Promise<void> {
    const uid = useAuthStore.getState().user?.uid ?? null
    await libraryApi.removeProgress(uid, id)
  }
}
