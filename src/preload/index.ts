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
  // Auto-updater channel
  onUpdateEvent: (handler: (event: string, data?: unknown) => void): (() => void) => {
    const listener = (_: unknown, event: string, data?: unknown) => handler(event, data)
    ipcRenderer.on('updater:event', listener)
    return () => ipcRenderer.off('updater:event', listener)
  },
  installUpdate: (): Promise<void> => ipcRenderer.invoke('updater:install')
}

contextBridge.exposeInMainWorld('nashat', api)

export type NashatApi = typeof api
