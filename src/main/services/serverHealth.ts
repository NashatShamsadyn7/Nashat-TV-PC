import { net } from 'electron'
import type { ServerProbe } from '@shared/stream'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const TIMEOUT_MS = 10_000
const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * An embed page that actually carries a player is tens of kilobytes. Anything
 * smaller is a redirect stub, an error page, or a parking page — all of which
 * answer with HTTP 200 and would otherwise pass for healthy.
 */
const MIN_PLAYER_BYTES = 3_000

/**
 * Markers of a domain that has lapsed and been picked up by a parking service.
 * letsembed.cc did exactly this while still returning 200, so the renderer's
 * old no-cors ping reported it as a working server.
 */
const PARKED_RE =
  /(this domain (may be|is) for sale|abovedomains|sedoparking|hugedomains|dan\.com|domain for sale|buy this domain)/i

const cache = new Map<string, { value: ServerProbe; expiresAt: number }>()

/**
 * Probes an embed URL for real: status code, body size and parking markers.
 *
 * This lives in the main process on purpose. The renderer can only issue a
 * `no-cors` fetch, whose promise resolves for *any* response the server
 * returns — 404, 403 and domain-parking pages included — so it could not tell
 * a working server from a dead one. `net.fetch` here is not subject to CORS
 * and can read the status and the body.
 */
export async function probeServer(url: string): Promise<ServerProbe> {
  const now = Date.now()
  const hit = cache.get(url)
  if (hit && hit.expiresAt > now) return hit.value

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const started = Date.now()

  let result: ServerProbe
  try {
    const res = await net.fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*;q=0.8' },
      signal: controller.signal
    })
    const latencyMs = Date.now() - started

    if (!res.ok) {
      result = { ok: false, latencyMs, reason: 'http-error', status: res.status }
    } else {
      const body = await res.text()
      if (PARKED_RE.test(body)) {
        result = { ok: false, latencyMs, reason: 'parked', status: res.status }
      } else if (body.length < MIN_PLAYER_BYTES) {
        result = { ok: false, latencyMs, reason: 'empty', status: res.status }
      } else {
        result = { ok: true, latencyMs, status: res.status }
      }
    }
  } catch (err) {
    const latencyMs = Date.now() - started
    const aborted = err instanceof Error && err.name === 'AbortError'
    result = { ok: false, latencyMs, reason: aborted ? 'timeout' : 'offline' }
  } finally {
    clearTimeout(timer)
  }

  cache.set(url, { value: result, expiresAt: Date.now() + CACHE_TTL_MS })
  return result
}
