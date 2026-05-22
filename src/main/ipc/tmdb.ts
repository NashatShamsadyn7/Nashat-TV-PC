import { ipcMain, net } from 'electron'
import type { TmdbInvokePayload } from '@shared/tmdb'

const TMDB_BASE = 'https://api.themoviedb.org/3'

type CacheEntry = { expiresAt: number; data: unknown }
const cache = new Map<string, CacheEntry>()
const TTL_MS = 5 * 60 * 1000

function cacheKey(p: TmdbInvokePayload): string {
  const entries: [string, string][] = Object.entries(p.params ?? {}).map(
    ([k, v]) => [k, String(v)]
  )
  const params = new URLSearchParams(entries)
  params.sort()
  return `${p.endpoint}?${params.toString()}`
}

async function fetchTmdb(payload: TmdbInvokePayload): Promise<unknown> {
  const key = cacheKey(payload)
  const cached = cache.get(key)
  const now = Date.now()
  if (cached && cached.expiresAt > now) return cached.data

  const token = process.env.TMDB_V4_TOKEN
  if (!token) {
    throw new Error('TMDB_V4_TOKEN is not set in environment')
  }

  const url = new URL(`${TMDB_BASE}${payload.endpoint}`)
  for (const [k, v] of Object.entries(payload.params ?? {})) {
    url.searchParams.set(k, String(v))
  }

  // Use Electron's `net` so requests use the OS-level network stack
  // (proxy/auth settings inherited) and not Node's http module.
  const response = await net.fetch(url.toString(), {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error(`TMDB ${payload.endpoint} → HTTP ${response.status}`)
  }

  const data = await response.json()
  cache.set(key, { data, expiresAt: now + TTL_MS })
  return data
}

export function registerTmdbIpc(): void {
  ipcMain.handle('tmdb:get', async (_event, payload: TmdbInvokePayload) => {
    return fetchTmdb(payload)
  })
}
