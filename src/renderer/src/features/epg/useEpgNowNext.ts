import { useEffect, useMemo, useState } from 'react'
import { useEpg } from './useEpg'
import type { EpgEntry } from './types'

/**
 * "What's on now / what's next" for one channel.
 *
 * Built on the existing `useEpg` subscription, which was written months ago and
 * never rendered by any component. Deliberately scoped to a single channel:
 * `useEpg` opens one RTDB listener per channel key, so calling it per row in a
 * 34-channel list would open 34 listeners. Use this where one channel is in
 * focus — the player, or an expanded guide row.
 *
 * A ticking clock is required because the schedule is time-based: without it
 * "now playing" would stay frozen on whatever was airing when the component
 * mounted.
 */

const TICK_MS = 30_000

export type NowNext = {
  now: EpgEntry | null
  next: EpgEntry | null
  /** 0–1 progress through the current programme, or null when nothing is on. */
  progress: number | null
  /** Whole schedule, sorted by start time. */
  entries: EpgEntry[]
  loading: boolean
  /** False when this channel simply has no EPG data uploaded. */
  hasData: boolean
}

export function useEpgNowNext(channelKey: string | null): NowNext {
  const { entries, loading } = useEpg(channelKey)
  const [nowTs, setNowTs] = useState(() => Date.now())

  useEffect(() => {
    if (!channelKey || entries.length === 0) return
    const id = window.setInterval(() => setNowTs(Date.now()), TICK_MS)
    return () => window.clearInterval(id)
  }, [channelKey, entries.length])

  return useMemo(() => {
    const now = entries.find((e) => e.start <= nowTs && e.end > nowTs) ?? null
    const next = entries.find((e) => e.start > nowTs) ?? null
    const span = now ? now.end - now.start : 0
    const progress =
      now && span > 0 ? Math.min(1, Math.max(0, (nowTs - now.start) / span)) : null
    return { now, next, progress, entries, loading, hasData: entries.length > 0 }
  }, [entries, nowTs, loading])
}
