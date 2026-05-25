import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SubtitleStyle = {
  fontSize: number
  background: 'none' | 'shadow' | 'box'
  color: string
}

export type SettingsState = {
  autoplayNext: boolean
  defaultVolume: number
  rememberPosition: boolean
  preferredQuality: 'auto' | '1080p' | '720p' | '480p'
  seekStep: number
  subtitleStyle: SubtitleStyle
  theme: 'dark' | 'midnight' | 'oled'
  reduceMotion: boolean
  hoverPeek: boolean
  discordRpc: boolean
  multiLiveLayout: '2x2' | '1+3' | '3x1'
  showHotkeysOnStartup: boolean

  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
  reset: () => void
}

const defaults: Omit<SettingsState, 'set' | 'reset'> = {
  autoplayNext: true,
  defaultVolume: 1,
  rememberPosition: true,
  preferredQuality: 'auto',
  seekStep: 10,
  subtitleStyle: { fontSize: 22, background: 'shadow', color: '#ffffff' },
  theme: 'dark',
  reduceMotion: false,
  hoverPeek: true,
  discordRpc: false,
  multiLiveLayout: '2x2',
  showHotkeysOnStartup: false
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      reset: () => set(defaults)
    }),
    { name: 'nashat-settings-v1' }
  )
)
