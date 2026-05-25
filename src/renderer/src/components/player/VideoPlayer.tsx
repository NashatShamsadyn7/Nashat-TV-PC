import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import Hls from 'hls.js'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Settings as Gear,
  Captions,
  PictureInPicture2,
  Upload
} from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'

export type PlayerHandle = {
  play: () => void
  pause: () => void
  togglePlay: () => void
  toggleMute: () => void
  seekBy: (seconds: number) => void
  seekTo: (ratio: number) => void
  requestFullscreen: () => void
  togglePip: () => void
  toggleSubtitles: () => void
  loadSubtitleFile: (file: File) => Promise<void>
  getElement: () => HTMLVideoElement | null
}

type Props = {
  src: string
  autoPlay?: boolean
  onError?: (err: Error) => void
  onProgress?: (currentTime: number, duration: number) => void
  initialPosition?: number
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

function srtToVtt(srt: string): string {
  return (
    'WEBVTT\n\n' +
    srt
      .replace(/\r+/g, '')
      .replace(/^\d+\s*$/gm, '')
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
      .trim()
  )
}

const VideoPlayer = forwardRef<PlayerHandle, Props>(function VideoPlayer(
  { src, autoPlay = true, onError, onProgress, initialPosition },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const subtitleUrlRef = useRef<string | null>(null)
  const kind = classify(src)

  const settings = useSettingsStore()

  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(settings.defaultVolume)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [qualities, setQualities] = useState<{ index: number; label: string }[]>([])
  const [currentQuality, setCurrentQuality] = useState<number>(-1)
  const [speed, setSpeed] = useState(1)
  const [live, setLive] = useState(false)
  const [subtitlesOn, setSubtitlesOn] = useState(true)
  const [hasSubtitles, setHasSubtitles] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const hideControlsTimer = useRef<number | null>(null)

  const loadSubtitleFile = useCallback(async (file: File) => {
    const text = await file.text()
    const vttText = file.name.endsWith('.vtt') ? text : srtToVtt(text)
    if (subtitleUrlRef.current) URL.revokeObjectURL(subtitleUrlRef.current)
    const blob = new Blob([vttText], { type: 'text/vtt' })
    const url = URL.createObjectURL(blob)
    subtitleUrlRef.current = url
    const v = videoRef.current
    if (!v) return
    Array.from(v.textTracks).forEach((t) => (t.mode = 'disabled'))
    const tracks = v.querySelectorAll('track')
    tracks.forEach((t) => t.remove())
    const track = document.createElement('track')
    track.kind = 'subtitles'
    track.label = file.name
    track.srclang = 'ar'
    track.default = true
    track.src = url
    v.appendChild(track)
    setHasSubtitles(true)
    setSubtitlesOn(true)
    setTimeout(() => {
      if (v.textTracks.length > 0) v.textTracks[v.textTracks.length - 1].mode = 'showing'
    }, 50)
  }, [])

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
      },
      togglePip: async () => {
        const vid = videoRef.current
        if (!vid) return
        try {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture()
          } else {
            await vid.requestPictureInPicture()
          }
        } catch {
          /* not supported */
        }
      },
      toggleSubtitles: () => {
        const vid = videoRef.current
        if (!vid) return
        const tracks = Array.from(vid.textTracks)
        if (tracks.length === 0) return
        const showing = tracks.find((t) => t.mode === 'showing')
        if (showing) {
          showing.mode = 'hidden'
          setSubtitlesOn(false)
        } else {
          tracks[tracks.length - 1].mode = 'showing'
          setSubtitlesOn(true)
        }
      },
      loadSubtitleFile,
      getElement: () => videoRef.current
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

    if (initialPosition && initialPosition > 5) {
      const seek = () => {
        if (Number.isFinite(v.duration) && v.duration > initialPosition) {
          v.currentTime = initialPosition
        }
      }
      v.addEventListener('loadedmetadata', seek, { once: true })
    }

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onVolume = () => {
      setMuted(v.muted)
      setVolume(v.volume)
    }
    const onTime = () => {
      setCurrentTime(v.currentTime)
      onProgress?.(v.currentTime, v.duration)
    }
    const onDur = () => setDuration(v.duration)
    const onProgressBuf = () => {
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1))
      }
    }
    const onRate = () => setSpeed(v.playbackRate)

    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('volumechange', onVolume)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('durationchange', onDur)
    v.addEventListener('progress', onProgressBuf)
    v.addEventListener('ratechange', onRate)

    v.volume = settings.defaultVolume

    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('volumechange', onVolume)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('durationchange', onDur)
      v.removeEventListener('progress', onProgressBuf)
      v.removeEventListener('ratechange', onRate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  // Auto-hide controls
  useEffect(() => {
    if (kind === 'web') return
    const showAndScheduleHide = () => {
      setShowControls(true)
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current)
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

  // Clean up subtitle blob URL
  useEffect(() => {
    return () => {
      if (subtitleUrlRef.current) URL.revokeObjectURL(subtitleUrlRef.current)
    }
  }, [])

  // Subtitle styling
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const style = settings.subtitleStyle
    // CSS via ::cue pseudo-element is tricky from JS — we inject a style tag.
    const id = 'nashat-cue-style'
    let tag = document.getElementById(id) as HTMLStyleElement | null
    if (!tag) {
      tag = document.createElement('style')
      tag.id = id
      document.head.appendChild(tag)
    }
    const bg =
      style.background === 'box'
        ? 'background: rgba(0,0,0,0.7);'
        : style.background === 'shadow'
          ? 'background: transparent; text-shadow: 0 0 4px #000, 0 0 8px #000;'
          : 'background: transparent;'
    tag.textContent = `::cue{font-size:${style.fontSize}px;color:${style.color};${bg}}`
  }, [settings.subtitleStyle])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (!/\.(srt|vtt)$/i.test(file.name)) return
    loadSubtitleFile(file)
  }

  if (kind === 'web') {
    return (
      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
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

  const changeSpeed = (rate: number) => {
    if (videoRef.current) videoRef.current.playbackRate = rate
    setShowSpeedMenu(false)
  }

  const progress =
    duration > 0 && Number.isFinite(duration) ? (currentTime / duration) * 100 : 0
  const bufferedPct =
    duration > 0 && Number.isFinite(duration) ? (buffered / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group"
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <video
        ref={videoRef}
        src={kind === 'mp4' ? src : undefined}
        autoPlay={autoPlay}
        playsInline
        crossOrigin="anonymous"
        className="w-full h-full"
        onClick={() => {
          const v = videoRef.current
          if (!v) return
          if (v.paused) v.play().catch(() => {})
          else v.pause()
        }}
        onError={() => onError?.(new Error('Video element error'))}
      />

      {dragOver && (
        <div className="absolute inset-6 z-10 grid place-items-center rounded-2xl border-2 border-dashed border-brand-400 bg-black/60 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <Upload className="w-10 h-10 text-brand-400 mx-auto mb-2" />
            <p className="text-sm font-semibold">أفلت ملف SRT/VTT لتشغيل الترجمة</p>
          </div>
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pt-12 pb-3 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
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
            {playing ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white" />}
          </button>

          <div className="flex items-center gap-2 group/vol">
            <button
              onClick={() => {
                const v = videoRef.current
                if (v) v.muted = !v.muted
              }}
              className="hover:scale-110 transition-transform"
            >
              {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
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

          {/* Subtitles */}
          <button
            onClick={() => {
              const v = videoRef.current
              if (!v) return
              const tracks = Array.from(v.textTracks)
              if (tracks.length === 0) {
                document.getElementById('sub-file-input')?.click()
                return
              }
              const showing = tracks.find((t) => t.mode === 'showing')
              if (showing) {
                showing.mode = 'hidden'
                setSubtitlesOn(false)
              } else {
                tracks[tracks.length - 1].mode = 'showing'
                setSubtitlesOn(true)
              }
            }}
            title="ترجمة (C)"
            className={`hover:scale-110 transition-transform ${hasSubtitles && subtitlesOn ? 'text-brand-400' : ''}`}
          >
            <Captions className="w-5 h-5" />
          </button>
          <input
            id="sub-file-input"
            type="file"
            accept=".srt,.vtt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) loadSubtitleFile(file)
            }}
          />

          {/* Speed */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu((v) => !v)}
              className="text-xs hover:bg-white/10 px-2 py-1 rounded font-semibold"
              title="السرعة"
            >
              {speed === 1 ? '1×' : `${speed}×`}
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-full mb-2 end-0 bg-ink-800 ring-1 ring-ink-600/50 rounded-lg overflow-hidden min-w-[80px]">
                {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
                  <button
                    key={r}
                    onClick={() => changeSpeed(r)}
                    className={`block w-full px-4 py-2 text-xs text-start hover:bg-ink-700/60 ${
                      Math.abs(speed - r) < 0.01 ? 'text-brand-400' : ''
                    }`}
                  >
                    {r}×
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quality */}
          {qualities.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowQualityMenu((v) => !v)}
                className="flex items-center gap-1 text-xs hover:bg-white/10 px-2 py-1 rounded"
              >
                <Gear className="w-4 h-4" />
                {currentQuality === -1
                  ? 'تلقائي'
                  : (qualities.find((q) => q.index === currentQuality)?.label ?? '?')}
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
            onClick={async () => {
              const vid = videoRef.current
              if (!vid) return
              try {
                if (document.pictureInPictureElement) await document.exitPictureInPicture()
                else await vid.requestPictureInPicture()
              } catch {
                /* ignore */
              }
            }}
            title="Picture-in-Picture (P)"
            className="hover:scale-110 transition-transform"
          >
            <PictureInPicture2 className="w-5 h-5" />
          </button>

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
