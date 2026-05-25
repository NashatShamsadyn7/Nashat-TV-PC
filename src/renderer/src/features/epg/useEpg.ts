import { useEffect, useState } from 'react'
import { off, onValue, ref } from 'firebase/database'
import { db } from '@/services/firebase'
import type { EpgEntry } from './types'

/**
 * Subscribes to /epg/{channelKey} entries from RTDB.
 * EPG data is uploaded externally (e.g. cron Cloud Function pulling XMLTV).
 */
export function useEpg(channelKey: string | null) {
  const [entries, setEntries] = useState<EpgEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!channelKey) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    const r = ref(db, `epg/${channelKey}`)
    const handler = onValue(
      r,
      (snap) => {
        const val = snap.val() as Record<string, EpgEntry> | EpgEntry[] | null
        const list = !val
          ? []
          : Array.isArray(val)
            ? val.filter(Boolean)
            : Object.values(val)
        list.sort((a, b) => a.start - b.start)
        setEntries(list)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => off(r, 'value', handler)
  }, [channelKey])

  return { entries, loading }
}

export function findNowPlaying(entries: EpgEntry[]): EpgEntry | null {
  const now = Date.now()
  return entries.find((e) => e.start <= now && e.end > now) ?? null
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
