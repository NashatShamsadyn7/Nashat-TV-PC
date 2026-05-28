import { useCallback, useEffect, useMemo, useState } from 'react'
import { off, onValue, ref, set } from 'firebase/database'
import { db } from '@/services/firebase'
import { useAuthStore } from '@/stores/authStore'

// Community-curated "this title has an Arabic dub" votes, stored under
// `dubVotes/{kind}/{tmdbId}/{uid}: true`. Subscribing to `dubVotes/movie` or
// `dubVotes/tv` returns every voter map keyed by tmdbId; we compute counts
// and my-vote locally — no aggregations needed at this scale.

type Kind = 'movie' | 'tv'

type RawVoteTree = Record<string, Record<string, boolean | null | undefined>> | null

type Summary = {
  /** Map of tmdbId → number of distinct voters. */
  counts: Record<number, number>
  /** Set of tmdbIds the current user has voted for. */
  mine: Set<number>
}

const EMPTY: Summary = { counts: {}, mine: new Set() }

function summarize(raw: RawVoteTree, uid: string | null): Summary {
  if (!raw) return { counts: {}, mine: new Set() }
  const counts: Record<number, number> = {}
  const mine = new Set<number>()
  for (const [tmdbIdStr, voters] of Object.entries(raw)) {
    if (!voters) continue
    const id = Number(tmdbIdStr)
    if (!Number.isFinite(id)) continue
    const present = Object.entries(voters).filter(([, v]) => v === true)
    if (present.length === 0) continue
    counts[id] = present.length
    if (uid && voters[uid] === true) mine.add(id)
  }
  return { counts, mine }
}

export function useDubVotes(kind: Kind): Summary & {
  vote: (tmdbId: number, value: boolean) => void
  toggle: (tmdbId: number) => void
  /** TMDB ids sorted by vote count desc; ties broken by id ascending. */
  topIds: number[]
} {
  const uid = useAuthStore((s) => s.user?.uid) ?? null
  const [summary, setSummary] = useState<Summary>(EMPTY)

  useEffect(() => {
    const r = ref(db, `dubVotes/${kind}`)
    const h = onValue(r, (snap) => setSummary(summarize(snap.val() as RawVoteTree, uid)))
    return () => off(r, 'value', h)
  }, [kind, uid])

  const vote = useCallback(
    (tmdbId: number, value: boolean) => {
      if (!uid) return
      void set(ref(db, `dubVotes/${kind}/${tmdbId}/${uid}`), value ? true : null).catch(() => {})
    },
    [kind, uid]
  )

  const toggle = useCallback(
    (tmdbId: number) => {
      if (!uid) return
      vote(tmdbId, !summary.mine.has(tmdbId))
    },
    [vote, uid, summary.mine]
  )

  const topIds = useMemo(
    () =>
      Object.entries(summary.counts)
        .map(([id, n]) => [Number(id), n] as const)
        .sort((a, b) => b[1] - a[1] || a[0] - b[0])
        .map(([id]) => id),
    [summary.counts]
  )

  return { ...summary, vote, toggle, topIds }
}
