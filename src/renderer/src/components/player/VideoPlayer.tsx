import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import Hls from 'hls.js'
import { Play, Pause, Volume2, VolumeX, Maximize2, Settings as Gear } from 'lucide-react'

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

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '∞'
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

const VideoPlayer = forwardRef<PlayerHandle, Props>(function VideoPlayer(
  { src, autoPlay = true, onError },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const kind = classify(src)

  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [qualities, setQualities] = useState<{ index: number; label: string }[]>([])
  const [currentQuality, setCurrentQuality] = useState<number>(-1) // -1 = auto
  const [live, setLive] = useState(false)
  const hideControlsTimer = useRef<number | null>(null)

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
        const target = containerRef.current ?? videoRef.current ?? iframeRef.current
        target?.requestFullscreen().catch(() => {})
      }
    }
  })

  // HLS setup
  useEffect(() => {
    if (kind !== 'hls') return
    const video = videoRef.current
    if (!video) return

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      return
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true })
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLive(hls.levels.some((l) => l.details?.live))
        setQualities(
          hls.levels.map((lvl, i) => ({
            index: i,
            label: lvl.height ? `${lvl.height}p` : `Level ${i}`
          }))
        )
      })
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) onError?.(new Error(`HLS fatal: ${data.type}/${data.details}`))
      })
      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    }

    onError?.(new Error('HLS not supported'))
  }, [src, kind, onError])

  // Video element event listeners
  useEffect(() => {
    if (kind === 'web') return
    const v = videoRef.current
    if (!v) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onVolume = () => {
      setMuted(v.muted)
      setVolume(v.volume)
    }
    const onTime = () => setCurrentTime(v.currentTime)
    const onDur = () => setDuration(v.duration)
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1))
      }
    }

    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('volumechange', onVolume)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('durationchange', onDur)
    v.addEventListener('progress', onProgress)

    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('volumechange', onVolume)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('durationchange', onDur)
      v.removeEventListener('progress', onProgress)
    }
  }, [kind])

  // Auto-hide controls
  useEffect(() => {
    if (kind === 'web') return
    const showAndScheduleHide = () => {
      setShowControls(true)
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current)
      }
      hideControlsTimer.current = window.setTimeout(() => {
        if (playing) setShowControls(false)
      }, 3000)
    }

    const container = containerRef.current
    container?.addEventListener('mousemove', showAndScheduleHide)
    container?.addEventListener('mouseleave', () => setShowControls(playing ? false : true))
    showAndScheduleHide()

    return () => {
      container?.removeEventListener('mousemove', showAndScheduleHide)
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current)
    }
  }, [kind, playing])

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v || !Number.isFinite(v.duration)) return
    v.currentTime = (Number(e.target.value) / 100) * v.duration
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v) return
    const newVol = Number(e.target.value) / 100
    v.volume = newVol
    v.muted = newVol === 0
  }

  const changeQuality = (idx: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = idx
      setCurrentQuality(idx)
    }
    setShowQualityMenu(false)
  }

  const progress =
    duration > 0 && Number.isFinite(duration) ? (currentTime / duration) * 100 : 0
  const bufferedPct =
    duration > 0 && Number.isFinite(duration) ? (buffered / duration) * 100 : 0

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black group">
      <video
        ref={videoRef}
        src={kind === 'mp4' ? src : undefined}
        autoPlay={autoPlay}
        playsInline
        className="w-full h-full"
        onClick={() => {
          const v = videoRef.current
          if (!v) return
          if (v.paused) v.play().catch(() => {})
          else v.pause()
        }}
        onError={() => onError?.(new Error('Video element error'))}
      />

      {/* Custom controls overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pt-12 pb-3 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress bar (hide for live) */}
        {!live && Number.isFinite(duration) && duration > 0 && (
          <div className="relative mb-2 h-1.5 group/seek">
            <div className="absolute inset-0 rounded-full bg-white/20" />
            <div
              className="absolute inset-y-0 start-0 rounded-full bg-white/30"
              style={{ width: `${bufferedPct}%` }}
            />
            <div
              className="absolute inset-y-0 start-0 rounded-full bg-brand-500"
              style={{ width: `${progress}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progress}
              onChange={handleSeek}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        )}

        {/* Controls row */}
        <div className="flex items-center gap-3 text-white">
          <button
            onClick={() => {
              const v = videoRef.current
              if (!v) return
              if (v.paused) v.play().catch(() => {})
              else v.pause()
            }}
            className="hover:scale-110 transition-transform"
            aria-label={playing ? 'إيقاف' : 'تشغيل'}
          >
            {playing ? (
              <Pause className="w-7 h-7 fill-white" />
            ) : (
              <Play className="w-7 h-7 fill-white" />
            )}
          </button>

          <div className="flex items-center gap-2 group/vol">
            <button
              onClick={() => {
                const v = videoRef.current
                if (v) v.muted = !v.muted
              }}
              className="hover:scale-110 transition-transform"
            >
              {muted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume * 100}
              onChange={handleVolumeChange}
              className="w-20 accent-brand-500"
            />
          </div>

          <div className="text-xs text-ink-100 font-medium tabular-nums">
            {live ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                LIVE
              </span>
            ) : (
              `${formatTime(currentTime)} / ${formatTime(duration)}`
            )}
          </div>

          <div className="flex-1" />

          {qualities.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowQualityMenu((v) => !v)}
                className="flex items-center gap-1 text-xs hover:bg-white/10 px-2 py-1 rounded"
              >
                <Gear className="w-4 h-4" />
                {currentQuality === -1
                  ? 'تلقائي'
                  : qualities.find((q) => q.index === currentQuality)?.label ?? '?'}
              </button>
              {showQualityMenu && (
                <div className="absolute bottom-full mb-2 end-0 bg-ink-800 ring-1 ring-ink-600/50 rounded-lg overflow-hidden min-w-[120px]">
                  <button
                    onClick={() => changeQuality(-1)}
                    className={`block w-full px-4 py-2 text-xs text-start hover:bg-ink-700/60 ${
                      currentQuality === -1 ? 'text-brand-400' : ''
                    }`}
                  >
                    تلقائي
                  </button>
                  {qualities.map((q) => (
                    <button
                      key={q.index}
                      onClick={() => changeQuality(q.index)}
                      className={`block w-full px-4 py-2 text-xs text-start hover:bg-ink-700/60 ${
                        currentQuality === q.index ? 'text-brand-400' : ''
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => containerRef.current?.requestFullscreen().catch(() => {})}
            className="hover:scale-110 transition-transform"
            aria-label="ملء الشاشة"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
})

export default VideoPlayer
