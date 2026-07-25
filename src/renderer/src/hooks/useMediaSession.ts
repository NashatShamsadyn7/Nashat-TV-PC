import { useEffect } from 'react'

/**
 * Wires a <video> element into the OS media controls via the Media Session API.
 *
 * This is what makes AirPods, Bluetooth headsets and wired inline remotes work.
 * They do NOT emit keyboard events — a headset sends an AVRCP/HID transport
 * command to the OS, which routes it to whichever app owns the current media
 * session. Chromium only claims that session once a page declares metadata and
 * action handlers here, so without this hook the app is invisible to them and
 * the button falls through to whatever else is playing (Spotify, a browser tab).
 *
 * It also populates the Windows SMTC overlay / macOS Now Playing panel with the
 * title and artwork, and enables the on-screen transport buttons there.
 *
 * `Electron.globalShortcut` is NOT a substitute: it grabs the media keys
 * process-wide even when the app is in the background, hijacking them from
 * every other player, and it never receives Bluetooth transport commands at all.
 */

export type MediaSessionMeta = {
  title: string
  /** Shown as the "artist" line in the OS overlay — channel name, or S1 · E4. */
  subtitle?: string
  artwork?: string
}

type Options = {
  /** The element to control. Null while the player is closed. */
  getElement: () => HTMLVideoElement | null
  meta: MediaSessionMeta | null
  seekStep?: number
  onStop?: () => void
}

function supported(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
}

/**
 * Seekable bounds. For live HLS `duration` is Infinity, so the TimeRanges from
 * `video.seekable` are the only reliable description of the DVR window.
 */
function seekStart(v: HTMLVideoElement): number {
  return v.seekable.length > 0 ? v.seekable.start(0) : 0
}

function seekEnd(v: HTMLVideoElement): number {
  if (v.seekable.length > 0) return v.seekable.end(v.seekable.length - 1)
  return Number.isFinite(v.duration) ? v.duration : Infinity
}

/** Setting an unsupported action throws in some Chromium builds — ignore those. */
function setHandler(
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null
): void {
  try {
    navigator.mediaSession.setActionHandler(action, handler)
  } catch {
    /* action not implemented in this Chromium build */
  }
}

export function useMediaSession({
  getElement,
  meta,
  seekStep = 10,
  onStop
}: Options): void {
  // Metadata: title, artist line and artwork for the OS overlay.
  useEffect(() => {
    if (!supported()) return
    if (!meta) {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
      return
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: meta.title,
      artist: meta.subtitle ?? 'Nashat TV',
      album: 'Nashat TV',
      // Several sizes are advertised because Windows and macOS pick different
      // ones; the same URL serving all of them is fine.
      artwork: meta.artwork
        ? [
            { src: meta.artwork, sizes: '96x96', type: 'image/png' },
            { src: meta.artwork, sizes: '256x256', type: 'image/png' },
            { src: meta.artwork, sizes: '512x512', type: 'image/png' }
          ]
        : []
    })
  }, [meta])

  // Action handlers: the actual headset/OS button targets.
  useEffect(() => {
    if (!supported() || !meta) return

    const withElement = (fn: (v: HTMLVideoElement) => void) => () => {
      const v = getElement()
      if (v) fn(v)
    }

    setHandler('play', withElement((v) => void v.play().catch(() => {})))
    setHandler('pause', withElement((v) => v.pause()))

    // A single AirPod tap sends play/pause as a toggle on some stacks; Chromium
    // maps it to whichever of play/pause contradicts playbackState, so keeping
    // playbackState accurate (below) is what makes one tap behave correctly.
    setHandler(
      'stop',
      onStop
        ? () => onStop()
        : withElement((v) => {
            v.pause()
            v.currentTime = 0
          })
    )

    // Relative seek is registered unconditionally: it works on VOD and also
    // inside a live HLS DVR window. Clamping to `seekable` end rather than
    // `duration` keeps it correct when duration is Infinity on a live edge.
    setHandler(
      'seekbackward',
      withElement((v) => {
        v.currentTime = Math.max(seekStart(v), v.currentTime - seekStep)
      })
    )
    setHandler(
      'seekforward',
      withElement((v) => {
        v.currentTime = Math.min(seekEnd(v), v.currentTime + seekStep)
      })
    )
    setHandler('seekto', (details) => {
      const v = getElement()
      if (!v || details.seekTime == null) return
      const target = Math.min(Math.max(details.seekTime, seekStart(v)), seekEnd(v))
      if (details.fastSeek && 'fastSeek' in v) v.fastSeek(target)
      else v.currentTime = target
    })

    return () => {
      for (const a of [
        'play',
        'pause',
        'stop',
        'seekbackward',
        'seekforward',
        'seekto',
        'nexttrack',
        'previoustrack'
      ] as MediaSessionAction[]) {
        setHandler(a, null)
      }
      if (supported()) navigator.mediaSession.playbackState = 'none'
    }
  }, [getElement, meta, seekStep, onStop])

  // Mirror the element's real state back to the session. A double-tap on
  // AirPods is dispatched relative to `playbackState`, so if this drifts the
  // headset sends `play` while already playing and the tap appears to do
  // nothing. Position state drives the OS scrubber.
  useEffect(() => {
    if (!supported() || !meta) return
    const v = getElement()
    if (!v) return

    const syncState = () => {
      navigator.mediaSession.playbackState = v.paused ? 'paused' : 'playing'
    }
    const syncPosition = () => {
      // setPositionState throws if duration is NaN/Infinity (live edge) or if
      // playbackRate is 0, both of which happen normally here.
      if (!Number.isFinite(v.duration) || v.duration <= 0) return
      try {
        navigator.mediaSession.setPositionState({
          duration: v.duration,
          playbackRate: v.playbackRate || 1,
          position: Math.min(v.currentTime, v.duration)
        })
      } catch {
        /* transient invalid state — next timeupdate will retry */
      }
    }

    syncState()
    syncPosition()

    v.addEventListener('play', syncState)
    v.addEventListener('pause', syncState)
    v.addEventListener('ratechange', syncPosition)
    v.addEventListener('durationchange', syncPosition)
    v.addEventListener('timeupdate', syncPosition)
    return () => {
      v.removeEventListener('play', syncState)
      v.removeEventListener('pause', syncState)
      v.removeEventListener('ratechange', syncPosition)
      v.removeEventListener('durationchange', syncPosition)
      v.removeEventListener('timeupdate', syncPosition)
    }
  }, [getElement, meta])
}
