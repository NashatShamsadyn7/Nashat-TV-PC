import { create } from 'zustand'

type RoomStoreState = {
  activeRoomId: string | null
  setActive: (id: string | null) => void
}

// Tracks the user's current Watch Together room across page navigations.
// Set when a room is created from Details/Play, read by WatchTogether page.
export const useRoomStore = create<RoomStoreState>((set) => ({
  activeRoomId: null,
  setActive: (id) => set({ activeRoomId: id })
}))
