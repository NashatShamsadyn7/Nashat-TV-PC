import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type DailyStat = {
  date: string
  seconds: number
  sessions: number
}

type MediaTouch = {
  id: string
  kind: 'movie' | 'tv' | 'channel'
  title: string
  count: number
  lastAt: number
  seconds: number
}

type StatsState = {
  daily: Record<string, DailyStat>
  byMedia: Record<string, MediaTouch>
  totalSeconds: number
  totalSessions: number
  recordPlay: (media: { id: string; kind: MediaTouch['kind']; title: string }) => void
  recordHeartbeat: (id: string, seconds: number) => void
  reset: () => void
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      daily: {},
      byMedia: {},
      totalSeconds: 0,
      totalSessions: 0,
      recordPlay: (m) =>
        set((s) => {
          const d = today()
          const cur = s.daily[d] ?? { date: d, seconds: 0, sessions: 0 }
          const touch = s.byMedia[m.id] ?? {
            id: m.id,
            kind: m.kind,
            title: m.title,
            count: 0,
            lastAt: 0,
            seconds: 0
          }
          return {
            daily: { ...s.daily, [d]: { ...cur, sessions: cur.sessions + 1 } },
            byMedia: {
              ...s.byMedia,
              [m.id]: { ...touch, count: touch.count + 1, lastAt: Date.now() }
            },
            totalSessions: s.totalSessions + 1
          }
        }),
      recordHeartbeat: (id, seconds) =>
        set((s) => {
          const d = today()
          const cur = s.daily[d] ?? { date: d, seconds: 0, sessions: 0 }
          const touch = s.byMedia[id]
          if (!touch) return s
          return {
            daily: { ...s.daily, [d]: { ...cur, seconds: cur.seconds + seconds } },
            byMedia: { ...s.byMedia, [id]: { ...touch, seconds: touch.seconds + seconds } },
            totalSeconds: s.totalSeconds + seconds
          }
        }),
      reset: () =>
        set({ daily: {}, byMedia: {}, totalSeconds: 0, totalSessions: 0 })
    }),
    { name: 'nashat-stats-v1' }
  )
)

export function fmtHours(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
