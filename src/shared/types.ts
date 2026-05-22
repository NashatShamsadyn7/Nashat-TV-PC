// Shared types between main and renderer processes.
// Add cross-process contracts here (IPC payloads, domain models).

/** A Live TV channel as stored under `/live_tv_channels` in RTDB. */
export interface Channel {
  id: string
  key: string
  name: string
  logo: string
  category: string
  url: string
  streamUrl: string
  isAlive: boolean
  dbIndex: number
}
