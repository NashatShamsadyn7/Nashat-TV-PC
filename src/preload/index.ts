import { contextBridge, ipcRenderer } from 'electron'
import type { TmdbInvokePayload } from '@shared/tmdb'

const api = {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  tmdbGet: <T = unknown>(payload: TmdbInvokePayload): Promise<T> =>
    ipcRenderer.invoke('tmdb:get', payload)
}

contextBridge.exposeInMainWorld('nashat', api)

export type NashatApi = typeof api
