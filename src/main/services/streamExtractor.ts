import { net } from 'electron'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const MAX_HOPS = 5
const REQUEST_TIMEOUT_MS = 8_000
const CACHE_TTL_MS = 10 * 60 * 1000

export type ExtractedStream = {
  pageUrl: string
  streamUrl: string
  kind: 'hls' | 'dash' | 'mp4'
  headers?: { referer?: string; userAgent?: string }
}

const cache = new Map<string, { value: ExtractedStream; expiresAt: number }>()

function kindFromUrl(url: string): ExtractedStream['kind'] {
  if (/\.m3u8/i.test(url)) return 'hls'
  if (/\.mpd/i.test(url)) return 'dash'
  return 'mp4'
}

function resolveUrl(base: string, src: string): string {
  if (src.startsWith('//')) return 'https:' + src
  if (/^https?:/i.test(src)) return src
  try {
    return new URL(src, base).toString()
  } catch {
    return src
  }
}

async function fetchHtml(url: string, referer: string): Promise<{ body: string; finalUrl: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await net.fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Referer: referer,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    const body = await res.text()
    return { body, finalUrl: res.url || url }
  } finally {
    clearTimeout(timer)
  }
}

// Ported from Android KarwanScraper.java — recursively follows iframes and
// looks for hls/dash player config strings, with /embed.html → /index.m3u8 fallback.
async function scrape(targetUrl: string, hop: number): Promise<string | null> {
  if (hop >= MAX_HOPS) throw new Error('Too many iframe hops')

  if (targetUrl.includes('/embed.html')) {
    return targetUrl.replace('/embed.html', '/index.m3u8')
  }

  const { body: html, finalUrl } = await fetchHtml(targetUrl, 'https://karwan.tv/')

  // 1. Follow valid iframes
  const iframeRe = /<iframe[^>]*src=["']([^"']+)["']/gi
  const iframes: string[] = []
  let m: RegExpExecArray | null
  while ((m = iframeRe.exec(html)) !== null) {
    const src = m[1]
    if (!src) continue
    if (/google|facebook|ads/i.test(src)) continue
    if (
      /karwan|embed|live/i.test(src) ||
      src.startsWith('/') ||
      src.startsWith('.') ||
      src.startsWith('//')
    ) {
      iframes.push(src)
    }
  }

  if (iframes.length > 0) {
    const next = resolveUrl(finalUrl, iframes[0])
    return scrape(next, hop + 1)
  }

  // 2. hls: "..." / dash: "..." config in page JS. Prefer HLS — the renderer's
  // VideoPlayer only plays HLS/MP4. A .mpd (DASH) URL has no player, so it ends
  // up in an <iframe> that Chromium downloads to disk instead of playing (the
  // "needs download" symptom on channels like NRT). Only fall back to DASH when
  // no HLS source exists on the page.
  const hlsMatch = html.match(/hls\s*:\s*['"]([^'"]+)['"]/i)
  if (hlsMatch) return hlsMatch[1]
  const dashMatch = html.match(/dash\s*:\s*['"]([^'"]+)['"]/i)
  if (dashMatch) return dashMatch[1]

  // 3. Fallback: redirect landed on /embed.html
  if (finalUrl.includes('/embed.html')) {
    return finalUrl.replace('/embed.html', '/index.m3u8')
  }

  // 4. Generic fallback — scan raw HTML for any m3u8/mpd URL
  const directMatch = html.match(/https?:\/\/[^"'\s<>]+\.(?:m3u8|mpd)[^"'\s<>]*/i)
  if (directMatch) return directMatch[0]

  return null
}

export async function extractStream(pageUrl: string): Promise<ExtractedStream> {
  const now = Date.now()
  const cached = cache.get(pageUrl)
  if (cached && cached.expiresAt > now) return cached.value

  const streamUrl = await scrape(pageUrl, 0)
  if (!streamUrl) throw new Error('Stream URL not found in page')

  const result: ExtractedStream = {
    pageUrl,
    streamUrl,
    kind: kindFromUrl(streamUrl),
    headers: { referer: pageUrl, userAgent: UA }
  }
  cache.set(pageUrl, { value: result, expiresAt: now + CACHE_TTL_MS })
  return result
}
