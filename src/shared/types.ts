// Shared types between main and renderer processes.
// Add cross-process contracts here (IPC payloads, domain models).

export interface Channel {
  id: string
  name: string
  url: string
  logo?: string
  country?: string
  language?: string
  category?: string
}
