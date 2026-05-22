import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react'
import Hls from 'hls.js'

export type PlayerHandle = {
  play: () => void
  pause: () => void
  togglePlay: () => void
  toggleMute: () => void
  seekBy: (seconds: number) => void
  seekTo: (ratio: number) => void
  requestFullscreen: () => void
}

type Props = {
  src: string
  autoPlay?: boolean
  onError?: (err: Error) => void
}

function classify(src: string): 'hls' | 'mp4' | 'web' {
  const lower = src.toLowerCase()
  if (lower.includes('.m3u8')) return 'hls'
  if (lower.endsWith('.mp4') || lower.endsWith('.mkv') || lower.endsWith('.webm')) {
    return 'mp4'
  }
  return 'web'
}

const VideoPlayer = forwardRef<PlayerHandle, Props>(function VideoPlayer(
  { src, autoPlay = true, onError },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const kind = classify(src)

  useImperativeHandle(ref, () => {
    const v = videoRef.current
    return {
      play: () => v?.play().catch(() => {}),
      pause: () => v?.pause(),
      togglePlay: () => {
        if (!v) return
        if (v.paused) v.play().catch(() => {})
        else v.pause()
      },
      toggleMute: () => {
        if (v) v.muted = !v.muted
      },
      seekBy: (seconds) => {
        if (v) v.currentTime = Math.max(0, v.currentTime + seconds)
      },
      seekTo: (ratio) => {
        if (v && Number.isFinite(v.duration)) v.currentTime = v.duration * ratio
      },
      requestFullscreen: () => {
        const target = videoRef.current ?? iframeRef.current
        target?.requestFullscreen().catch(() => {})
      }
    }
  })

  useEffect(() => {
    if (kind !== 'hls') return
    const video = videoRef.current
    if (!video) return

    // Safari has native HLS; everything else needs HLS.js.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      return
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true })
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) onError?.(new Error(`HLS fatal: ${data.type}/${data.details}`))
      })
      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    }

    onError?.(new Error('HLS not supported in this environment'))
  }, [src, kind, onError])

  if (kind === 'web') {
    return (
      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
      />
    )
  }

  return (
    <video
      ref={videoRef}
      src={kind === 'mp4' ? src : undefined}
      controls
      autoPlay={autoPlay}
      className="w-full h-full bg-black"
      onError={() => onError?.(new Error('Video element error'))}
    />
  )
})

export default VideoPlayer
