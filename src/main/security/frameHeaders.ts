import { session } from 'electron'

// Hosts whose responses we relax framing/CSP restrictions for so the in-app
// player can embed them. Matches what an Android WebView effectively does.
const FRAMEABLE_HOSTS = [
  'karwan.tv',
  'vidsrc.to',
  'vidsrc.me',
  'vidsrc.xyz',
  'embed.su',
  'autoembed.cc',
  'player.autoembed.cc',
  '2embed.cc',
  'www.2embed.cc',
  'vidlink.pro',
  'multiembed.mov',
  'moviesapi.club',
  'smashystream.com',
  'player.smashy.stream'
]

function shouldRelax(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return FRAMEABLE_HOSTS.some(
      (h) => hostname === h || hostname.endsWith('.' + h) || hostname.endsWith(h)
    )
  } catch {
    return false
  }
}

const STRIPPED = new Set([
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  'frame-ancestors'
])

export function installFrameHeaderBypass(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (!details.responseHeaders || !shouldRelax(details.url)) {
      callback({})
      return
    }

    const cleaned: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(details.responseHeaders)) {
      if (STRIPPED.has(key.toLowerCase())) continue
      cleaned[key] = Array.isArray(value) ? value : [value as string]
    }
    callback({ responseHeaders: cleaned })
  })
}
