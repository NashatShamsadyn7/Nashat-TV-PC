import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Profile = {
  id: string
  name: string
  avatar: string
  isKid: boolean
  pinHash?: string
}

type ProfilesState = {
  profiles: Profile[]
  activeId: string | null
  add: (profile: Omit<Profile, 'id'>) => string
  update: (id: string, patch: Partial<Profile>) => void
  remove: (id: string) => void
  setActive: (id: string) => void
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

const defaultProfile: Profile = {
  id: 'main',
  name: 'Nashat',
  avatar: '🎬',
  isKid: false
}

export const useProfilesStore = create<ProfilesState>()(
  persist(
    (set) => ({
      profiles: [defaultProfile],
      activeId: 'main',
      add: (profile) => {
        const id = uid()
        set((s) => ({ profiles: [...s.profiles, { ...profile, id }] }))
        return id
      },
      update: (id, patch) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p))
        })),
      remove: (id) =>
        set((s) => ({
          profiles: s.profiles.filter((p) => p.id !== id),
          activeId: s.activeId === id ? (s.profiles[0]?.id ?? null) : s.activeId
        })),
      setActive: (id) => set({ activeId: id })
    }),
    { name: 'nashat-profiles-v1' }
  )
)

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyPin(profile: Profile, pin: string): Promise<boolean> {
  if (!profile.pinHash) return true
  return (await hashPin(pin)) === profile.pinHash
}
