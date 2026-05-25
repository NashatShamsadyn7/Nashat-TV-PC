import { session } from 'electron'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

// Hosts whose CDNs require a karwan.tv Referer to serve m3u8/ts segments.
const KARWAN_STREAM_HINTS = ['karwan', 'h-cdn', 'hls', 'stream']

function isStreamSegment(url: string): boolean {
  return /\.(m3u8|ts|mpd|m4s|key)(\?|$)/i.test(url)
}

function shouldInjectKarwanReferer(url: string): boolean {
  if (!isStreamSegment(url)) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    return KARWAN_STREAM_HINTS.some((h) => host.includes(h))
  } catch {
    return false
  }
}

export function installStreamHeaders(): void {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (!shouldInjectKarwanReferer(details.url)) {
      callback({ requestHeaders: details.requestHeaders })
      return
    }
    const headers = { ...details.requestHeaders }
    headers['Referer'] = 'https://karwan.tv/'
    headers['Origin'] = 'https://karwan.tv'
    headers['User-Agent'] = UA
    callback({ requestHeaders: headers })
  })
}
