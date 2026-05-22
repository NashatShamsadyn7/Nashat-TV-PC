import { create } from 'zustand'
import type { PlayerSource } from '@/components/player/PlayerModal'

type PlayerState = {
  source: PlayerSource | null
  open: (source: PlayerSource) => void
  close: () => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  source: null,
  open: (source) => set({ source }),
  close: () => set({ source: null })
}))
