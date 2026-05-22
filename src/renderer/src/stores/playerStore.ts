import { create } from 'zustand'
import type { PlayerSource } from '@/components/player/PlayerModal'
import type { MediaKind } from '@/features/player/servers'

export type TmdbMediaSource = {
  kind: MediaKind
  tmdbId: number
  title: string
  subtitle?: string
  backdrop?: string
  season?: number
  episode?: number
}

type PlayerState = {
  // Direct-URL source (e.g. Live TV — opens iframe/HLS)
  source: PlayerSource | null
  // TMDB media — uses embed servers with switcher
  tmdbSource: TmdbMediaSource | null
  open: (source: PlayerSource) => void
  openTmdb: (source: TmdbMediaSource) => void
  close: () => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  source: null,
  tmdbSource: null,
  open: (source) => set({ source, tmdbSource: null }),
  openTmdb: (tmdbSource) => set({ tmdbSource, source: null }),
  close: () => set({ source: null, tmdbSource: null })
}))
