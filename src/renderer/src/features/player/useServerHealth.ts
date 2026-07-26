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
  /** Present when the probe failed; explains why (offline, parked, …). */
  reason?: string
}

type Args = {
  kind: MediaKind
  tmdbId: number
  season?: number
  episode?: number
}

/**
 * Asks the main process to probe the server for real.
 *
 * This used to be a `no-cors` fetch right here in the renderer, which was
 * worse than useless: such a promise resolves for *any* response, so a 404, a
 * 403, or an expired domain sitting on a parking page all reported as healthy
 * — letsembed.cc showed a green dot for months while serving nothing but a
 * "this domain may be for sale" page. The main process is not bound by CORS
 * and can read the status code and the body.
 */
async function pingServer(url: string): Promise<{ ok: boolean; latencyMs: number; reason?: string }> {
  const started = performance.now()
  try {
    const probe = await window.nashat.probeStreamServer(url)
    return { ok: probe.ok, latencyMs: probe.latencyMs, reason: probe.reason }
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - started), reason: 'offline' }
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
      pingServer(t.url).then(({ ok, latencyMs, reason }) => {
        if (cancelled) return
        setResults((prev) =>
          prev.map((r) =>
            r.id === t.id
              ? { ...r, url: t.url, status: ok ? 'ok' : 'fail', latencyMs, reason }
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
 * Sort: working → checking → failed; reliable → unreliable; higher user score
 * → lower; then by latency. `scoreOf` is optional — when omitted, scores are
 * treated as 0 and the sort falls back to status/reliability/latency.
 *
 * `scoreOf` lets each user's own up/down votes bias auto-pick toward servers
 * they have personally rated higher.
 */
export function sortByHealth(
  servers: ServerHealth[],
  scoreOf?: (serverId: string) => number
): ServerHealth[] {
  const order: Record<ServerStatus, number> = { ok: 0, checking: 1, fail: 2 }
  const score = scoreOf ?? (() => 0)
  return [...servers].sort((a, b) => {
    const byStatus = order[a.status] - order[b.status]
    if (byStatus !== 0) return byStatus
    if (a.reliable !== b.reliable) return a.reliable ? -1 : 1
    const sB = score(b.id)
    const sA = score(a.id)
    if (sA !== sB) return sB - sA
    return (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity)
  })
}
