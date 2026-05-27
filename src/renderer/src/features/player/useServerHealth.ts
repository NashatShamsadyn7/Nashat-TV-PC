import { useEffect, useState } from 'react'
import { STREAM_SERVERS, type MediaKind } from './servers'

export type ServerStatus = 'checking' | 'ok' | 'fail'
export type ServerHealth = {
  id: string
  label: string
  url: string
  status: ServerStatus
  latencyMs?: number
  reliable: boolean
}

type Args = {
  kind: MediaKind
  tmdbId: number
  season?: number
  episode?: number
}

const CHECK_TIMEOUT_MS = 6000

async function pingServer(url: string): Promise<{ ok: boolean; latencyMs: number }> {
  const started = performance.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)
  try {
    // Embed servers usually block CORS, so a no-cors request is the best we can do.
    // We get an opaque response — but if the fetch resolves without throwing the
    // server at least responded, which is the signal we want.
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
      referrerPolicy: 'no-referrer'
    })
    return { ok: true, latencyMs: Math.round(performance.now() - started) }
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - started) }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Pings every embed server in parallel and returns their live health status.
 * Working servers float to the top with green dots; failing ones drop to the
 * bottom with red dots.
 */
export function useServerHealth(args: Args | null): ServerHealth[] {
  const [results, setResults] = useState<ServerHealth[]>(() =>
    STREAM_SERVERS.map((s) => ({
      id: s.id,
      label: s.label,
      url: '',
      status: 'checking' as ServerStatus,
      reliable: s.reliable !== false
    }))
  )

  useEffect(() => {
    if (!args) return

    const targets = STREAM_SERVERS.map((s) => ({
      id: s.id,
      label: s.label,
      url: s.build(args),
      reliable: s.reliable !== false
    }))

    setResults(targets.map((t) => ({ ...t, status: 'checking' as ServerStatus })))

    let cancelled = false
    targets.forEach((t) => {
      pingServer(t.url).then(({ ok, latencyMs }) => {
        if (cancelled) return
        setResults((prev) =>
          prev.map((r) =>
            r.id === t.id
              ? { ...r, url: t.url, status: ok ? 'ok' : 'fail', latencyMs }
              : r
          )
        )
      })
    })

    return () => {
      cancelled = true
    }
  }, [args?.kind, args?.tmdbId, args?.season, args?.episode])

  return results
}

/**
 * Sort working first, then checking, then failed. Within the same status,
 * reliable servers come before unreliable ones (e.g. VidSrc, which pings OK but
 * its player often refuses to embed), then by latency. This keeps auto-pick —
 * which grabs the first 'ok' server — on a server that actually plays.
 */
export function sortByHealth(servers: ServerHealth[]): ServerHealth[] {
  const order: Record<ServerStatus, number> = { ok: 0, checking: 1, fail: 2 }
  return [...servers].sort((a, b) => {
    const byStatus = order[a.status] - order[b.status]
    if (byStatus !== 0) return byStatus
    if (a.reliable !== b.reliable) return a.reliable ? -1 : 1
    return (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity)
  })
}
