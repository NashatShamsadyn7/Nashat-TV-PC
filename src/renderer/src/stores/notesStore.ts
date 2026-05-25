import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Note } from '@/features/notes/types'

type NotesState = {
  notes: Record<string, Note>
  add: (note: Omit<Note, 'id' | 'createdAt'>) => string
  remove: (id: string) => void
  byMedia: (mediaId: string) => Note[]
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: {},
      add: (note) => {
        const id = uid()
        set((s) => ({
          notes: { ...s.notes, [id]: { ...note, id, createdAt: Date.now() } }
        }))
        return id
      },
      remove: (id) =>
        set((s) => {
          const next = { ...s.notes }
          delete next[id]
          return { notes: next }
        }),
      byMedia: (mediaId) =>
        Object.values(get().notes)
          .filter((n) => n.mediaId === mediaId)
          .sort((a, b) => a.timestamp - b.timestamp)
    }),
    { name: 'nashat-notes-v1' }
  )
)
