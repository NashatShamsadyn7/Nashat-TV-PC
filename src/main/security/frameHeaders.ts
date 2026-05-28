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
  '2embed.stream',
  'www.2embed.stream',
  'streamvaultsrc.click',
  'vidapi.xyz',
  'vembed.click',
  'letsembed.cc',
  'godriveplayer.com',
  'databasegdriveplayer.co',
  'vidlink.pro',
  'multiembed.mov',
  'moviesapi.club',
  'smashystream.com',
  'player.smashy.stream'
]

// Firebase auth popup uses postMessage to pass the token back to the opener.
// Google/Firebase send Cross-Origin-Opener-Policy: same-origin which severs
// the window.opener reference and breaks the popup flow with auth/internal-error.
// We must strip COOP (only) from these auth responses.
const AUTH_COOP_HOSTS = ['accounts.google.com', 'firebaseapp.com']

function isAuthUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return AUTH_COOP_HOSTS.some((h) => hostname === h || hostname.endsWith('.' + h))
  } catch {
    return false
  }
}

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

const COOP_ONLY = new Set(['cross-origin-opener-policy'])

export function installFrameHeaderBypass(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (!details.responseHeaders) {
      callback({})
      return
    }

    const stripSet = shouldRelax(details.url) ? STRIPPED : isAuthUrl(details.url) ? COOP_ONLY : null
    if (!stripSet) {
      callback({})
      return
    }

    const cleaned: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(details.responseHeaders)) {
      if (stripSet.has(key.toLowerCase())) continue
      cleaned[key] = Array.isArray(value) ? value : [value as string]
    }
    callback({ responseHeaders: cleaned })
  })
}
