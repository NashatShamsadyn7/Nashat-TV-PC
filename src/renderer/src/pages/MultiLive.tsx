import { useEffect, useMemo, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Plus, X, Volume2, VolumeX, Search as SearchIcon } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { useChannels } from '@/features/livetv/useChannels'
import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/cn'
import type { Channel } from '@shared/types'

type Cell = { channel: Channel | null; muted: boolean }

function MiniPlayer({
  channel,
  muted,
  active,
  onSelect,
  onClear,
  onToggleMute,
  onActivate
}: {
  channel: Channel | null
  muted: boolean
  active: boolean
  onSelect: () => void
  onClear: () => void
  onToggleMute: () => void
  onActivate: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const url = channel?.streamUrl || channel?.url || ''

  useEffect(() => {
    const v = videoRef.current
    if (!v || !url) return
    if (!/\.m3u8(\?|$)/i.test(url)) {
      v.src = url
      v.play().catch(() => {})
      return
    }
    if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = url
      v.play().catch(() => {})
      return
    }
    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true })
      hls.loadSource(url)
      hls.attachMedia(v)
      return () => hls.destroy()
    }
  }, [url])

  if (!channel) {
    return (
      <button
        onClick={onSelect}
        className="h-full w-full grid place-items-center rounded-xl bg-ink-700/30 hover:bg-ink-700/50 ring-1 ring-ink-600/40 hover:ring-brand-500/60 transition-colors"
      >
        <div className="text-center">
          <Plus className="w-8 h-8 text-brand-400 mx-auto mb-2" />
          <p className="text-sm text-ink-200">إضافة قناة</p>
        </div>
      </button>
    )
  }

  return (
    <div
      onClick={onActivate}
      className={cn(
        'relative h-full w-full rounded-xl overflow-hidden bg-black group ring-1',
        active ? 'ring-brand-500' : 'ring-ink-700/40'
      )}
    >
      <video ref={videoRef} muted={muted} autoPlay playsInline className="w-full h-full object-contain" />
      <div className="absolute inset-x-0 top-0 p-2 flex items-center gap-2 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        {channel.logo && (
          <img src={channel.logo} alt="" className="w-6 h-6 rounded object-contain bg-ink-800 p-0.5" />
        )}
        <span className="text-xs font-semibold truncate flex-1">{channel.name}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleMute()
          }}
          className="w-7 h-7 grid place-items-center rounded-md bg-black/40 hover:bg-black/60"
          aria-label="mute"
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          className="w-7 h-7 grid place-items-center rounded-md bg-black/40 hover:bg-rose-500/60"
          aria-label="close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {active && (
        <span className="absolute bottom-2 start-2 text-[10px] font-bold bg-brand-500 px-2 py-0.5 rounded">
          AUDIO
        </span>
      )}
    </div>
  )
}

function ChannelPicker({
  open,
  channels,
  onPick,
  onClose
}: {
  open: boolean
  channels: Channel[]
  onPick: (c: Channel) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return channels.slice(0, 80)
    return channels.filter((c) => c.name.toLowerCase().includes(term)).slice(0, 80)
  }, [q, channels])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm grid place-items-center p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-ink-800 rounded-2xl ring-1 ring-ink-600/40 w-full max-w-2xl max-h-[80vh] flex flex-col"
      >
        <div className="p-4 border-b border-ink-700/50">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-ink-300" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن قناة…"
              className="w-full bg-ink-700/40 ring-1 ring-ink-600/50 rounded-xl ps-10 pe-3 py-2 text-sm focus:outline-none focus:ring-brand-500"
            />
          </div>
        </div>
        <div className="overflow-y-auto p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onPick(c)}
              className="flex items-center gap-2 p-2 rounded-lg bg-ink-700/30 hover:bg-ink-700/60 text-start"
            >
              {c.logo && <img src={c.logo} alt="" className="w-8 h-8 rounded object-contain bg-ink-800 p-0.5" />}
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{c.name}</p>
                <p className="text-[10px] text-ink-300 truncate">{c.category}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MultiLive() {
  const { channels, loading } = useChannels()
  const layout = useSettingsStore((s) => s.multiLiveLayout)
  const setSetting = useSettingsStore((s) => s.set)
  const [cells, setCells] = useState<Cell[]>(() =>
    Array.from({ length: 4 }, () => ({ channel: null, muted: true }))
  )
  const [activeIdx, setActiveIdx] = useState(0)
  const [pickerIdx, setPickerIdx] = useState<number | null>(null)

  // Ensure only the active cell is unmuted
  useEffect(() => {
    setCells((cs) => cs.map((c, i) => ({ ...c, muted: i !== activeIdx })))
  }, [activeIdx])

  const pick = (c: Channel) => {
    if (pickerIdx === null) return
    setCells((cs) => cs.map((cell, i) => (i === pickerIdx ? { ...cell, channel: c } : cell)))
    setPickerIdx(null)
  }

  const gridClass =
    layout === '2x2'
      ? 'grid-cols-2 grid-rows-2'
      : layout === '1+3'
        ? 'grid-cols-3 grid-rows-3'
        : 'grid-cols-3 grid-rows-1'

  return (
    <div>
      <PageHeader
        title="مشاهدة متعددة"
        subtitle={loading ? 'جارٍ تحميل القنوات…' : `4 قنوات في نفس الوقت — ${channels.length} قناة متاحة`}
      />
      <div className="px-8 mb-3 flex items-center gap-2">
        <span className="text-xs text-ink-300">الشكل:</span>
        {(['2x2', '1+3', '3x1'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setSetting('multiLiveLayout', opt)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold',
              layout === opt ? 'bg-brand-500 text-white' : 'bg-ink-700/40 text-ink-200 hover:bg-ink-700/70'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="px-8 pb-8">
        <div className={cn('grid gap-3 h-[calc(100vh-220px)]', gridClass)}>
          {cells.map((cell, i) => {
            const span = layout === '1+3' && i === 0 ? 'col-span-2 row-span-3' : ''
            return (
              <div key={i} className={span}>
                <MiniPlayer
                  channel={cell.channel}
                  muted={cell.muted}
                  active={activeIdx === i && !!cell.channel}
                  onActivate={() => setActiveIdx(i)}
                  onSelect={() => setPickerIdx(i)}
                  onClear={() =>
                    setCells((cs) => cs.map((c, j) => (j === i ? { ...c, channel: null } : c)))
                  }
                  onToggleMute={() =>
                    setCells((cs) => cs.map((c, j) => (j === i ? { ...c, muted: !c.muted } : c)))
                  }
                />
              </div>
            )
          })}
        </div>
      </div>
      <ChannelPicker
        open={pickerIdx !== null}
        channels={channels}
        onPick={pick}
        onClose={() => setPickerIdx(null)}
      />
    </div>
  )
}
