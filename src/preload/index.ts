import { contextBridge, ipcRenderer } from 'electron'
import type { TmdbInvokePayload } from '@shared/tmdb'
import type { ExtractedStream } from '@shared/stream'

const api = {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  tmdbGet: <T = unknown>(payload: TmdbInvokePayload): Promise<T> =>
    ipcRenderer.invoke('tmdb:get', payload),
  extractStream: (pageUrl: string): Promise<ExtractedStream> =>
    ipcRenderer.invoke('stream:extract', pageUrl),
  googleSignIn: (clientId: string, clientSecret: string): Promise<{ idToken: string; accessToken: string }> =>
    ipcRenderer.invoke('auth:google', clientId, clientSecret),
  // Auto-updater channel
  onUpdateEvent: (handler: (event: string, data?: unknown) => void): (() => void) => {
    const listener = (_: unknown, event: string, data?: unknown) => handler(event, data)
    ipcRenderer.on('updater:event', listener)
    return () => ipcRenderer.off('updater:event', listener)
  },
  installUpdate: (): Promise<void> => ipcRenderer.invoke('updater:install'),
  // Picture-in-Picture detached window
  openPip: (payload: { streamUrl: string; title?: string; logo?: string }): Promise<void> =>
    ipcRenderer.invoke('pip:open', payload),
  closePip: (): Promise<void> => ipcRenderer.invoke('pip:close'),
  // System integration
  showTray: (): Promise<void> => ipcRenderer.invoke('system:show-tray'),
  setPresence: (payload: { title?: string; status?: 'playing' | 'paused' | 'idle' }): Promise<void> =>
    ipcRenderer.invoke('system:set-presence', payload),
  onMediaKey: (handler: (action: 'play-pause' | 'next' | 'previous' | 'stop') => void): (() => void) => {
    const listener = (_: unknown, action: 'play-pause' | 'next' | 'previous' | 'stop') => handler(action)
    ipcRenderer.on('media-key', listener)
    return () => ipcRenderer.off('media-key', listener)
  }
}

contextBridge.exposeInMainWorld('nashat', api)

export type NashatApi = typeof api
