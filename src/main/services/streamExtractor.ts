import { BrowserWindow, session } from 'electron'

const STREAM_PATTERN = /\.(m3u8|mpd|mp4)(\?|$)/i
const EXTRACT_TIMEOUT_MS = 25_000
const STREAM_PARTITION = 'persist:stream-extractor'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

export type ExtractedStream = {
  pageUrl: string
  streamUrl: string
  kind: 'hls' | 'dash' | 'mp4'
  headers?: { referer?: string; userAgent?: string }
}

// Single-flight cache so we don't re-extract the same channel within 10 min.
const cache = new Map<string, { value: ExtractedStream; expiresAt: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000

function kindFromUrl(url: string): ExtractedStream['kind'] {
  if (/\.m3u8/i.test(url)) return 'hls'
  if (/\.mpd/i.test(url)) return 'dash'
  return 'mp4'
}

export async function extractStream(pageUrl: string): Promise<ExtractedStream> {
  const now = Date.now()
  const cached = cache.get(pageUrl)
  if (cached && cached.expiresAt > now) return cached.value

  return new Promise<ExtractedStream>((resolve, reject) => {
    const win = new BrowserWindow({
      show: false,
      width: 1280,
      height: 720,
      webPreferences: {
        partition: STREAM_PARTITION,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        offscreen: false,
        javascript: true,
        webSecurity: false
      }
    })

    let settled = false
    const ses = win.webContents.session

    const finish = (err: Error | null, result?: ExtractedStream) => {
      if (settled) return
      settled = true
      try {
        ses.webRequest.onBeforeRequest(null)
      } catch {
        /* ignore */
      }
      if (!win.isDestroyed()) win.destroy()
      if (err) reject(err)
      else if (result) {
        cache.set(pageUrl, { value: result, expiresAt: Date.now() + CACHE_TTL_MS })
        resolve(result)
      }
    }

    const timer = setTimeout(
      () => finish(new Error('Timed out extracting stream URL')),
      EXTRACT_TIMEOUT_MS
    )

    ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
      if (settled) {
        callback({})
        return
      }
      if (STREAM_PATTERN.test(details.url)) {
        clearTimeout(timer)
        callback({ cancel: true })
        finish(null, {
          pageUrl,
          streamUrl: details.url,
          kind: kindFromUrl(details.url),
          headers: { referer: pageUrl, userAgent: UA }
        })
        return
      }
      callback({})
    })

    win.webContents.setUserAgent(UA)
    win.loadURL(pageUrl, { userAgent: UA }).catch((err) => finish(err))

    // Some players need a user-gesture click to start network requests.
    win.webContents.once('did-finish-load', () => {
      win.webContents
        .executeJavaScript(
          `
            (function autoplay() {
              const videos = document.querySelectorAll('video');
              videos.forEach(v => { try { v.muted = true; v.play(); } catch(e){} });
              const buttons = document.querySelectorAll(
                '.jw-icon-display, .vjs-big-play-button, button[aria-label*="play" i], .play-button, .plyr__control--overlaid'
              );
              buttons.forEach(b => { try { b.click(); } catch(e){} });
            })();
          `
        )
        .catch(() => {
          /* ignore — page may have CSP that blocks this */
        })
    })
  })
}
