import { session } from 'electron'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

const VLC_UA = 'VLC/3.0.18 LibVLC/3.0.18'

// Hosts whose CDNs require a karwan.tv Referer to serve m3u8/ts segments.
// Must stay an exact-host / true-subdomain list. The previous version matched
// any hostname *containing* 'hls' or 'stream', which forged a karwan.tv Referer
// onto unrelated CDNs (akamaized.net, streamlock.net, wns.live, persiana.live…).
// Sending a foreign Referer to those leaks the association and trips hotlink
// protection, which rejects the segment request outright.
const KARWAN_STREAM_HOSTS = ['karwan.tv']

function isStreamSegment(url: string): boolean {
  return /\.(m3u8|ts|mpd|m4s|key)(\?|$)/i.test(url)
}

function shouldInjectKarwanReferer(url: string): boolean {
  if (!isStreamSegment(url)) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    return KARWAN_STREAM_HOSTS.some((h) => host === h || host.endsWith('.' + h))
  } catch {
    return false
  }
}

function isIptvRequest(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host.includes('cloudenginerevo')
  } catch {
    return false
  }
}

export function installStreamHeaders(): void {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders }

    if (isIptvRequest(details.url)) {
      headers['User-Agent'] = VLC_UA
      delete headers['Referer']
      delete headers['Origin']
      callback({ requestHeaders: headers })
      return
    }

    if (!shouldInjectKarwanReferer(details.url)) {
      callback({ requestHeaders: details.requestHeaders })
      return
    }

    headers['Referer'] = 'https://karwan.tv/'
    headers['Origin'] = 'https://karwan.tv'
    headers['User-Agent'] = UA
    callback({ requestHeaders: headers })
  })
}
