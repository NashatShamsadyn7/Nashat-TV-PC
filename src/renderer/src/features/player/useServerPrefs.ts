import { useCallback, useEffect, useMemo, useState } from 'react'
import { off, onValue, ref, set, update } from 'firebase/database'
import { db } from '@/services/firebase'
import { useAuthStore } from '@/stores/authStore'
import type { MediaKind } from './servers'

// Per-user server preferences, stored under `users/{uid}/serverPrefs`:
//   lastUsed/{contentKey}: '<serverId>'       — server that last played the title
//   scores/{serverId}:     { up: N, down: N } — user's lifetime votes
//
// The data is light enough to subscribe to in full (a handful of bytes per
// content key + one row per server). We cache locally so the player can read
// "lastUsed" synchronously on open.

type ScoresMap = Record<string, { up?: number; down?: number }>
type LastUsedMap = Record<string, string>

export function contentKey(kind: MediaKind, tmdbId: number, season?: number, episode?: number): string {
  if (kind === 'movie') return `movie-${tmdbId}`
  return `tv-${tmdbId}-s${season ?? 1}-e${episode ?? 1}`
}

/** Net score = up - down. Unscored servers count as 0. */
export function scoreOf(scores: ScoresMap, serverId: string): number {
  const s = scores[serverId]
  if (!s) return 0
  return (s.up ?? 0) - (s.down ?? 0)
}

type Vote = 'up' | 'down' | null

/**
 * Subscribes the current user's server prefs from Firebase. Returns a stable
 * read API plus three mutators (rememberLastUsed, vote, currentVote). When the
 * user isn't signed in, mutators are no-ops and reads return empty.
 */
export function useServerPrefs() {
  const uid = useAuthStore((s) => s.user?.uid)
  const [scores, setScores] = useState<ScoresMap>({})
  const [lastUsed, setLastUsed] = useState<LastUsedMap>({})
  // Per-server local "my vote" mirror, kept in lastUsed/_votes/{serverId}:
  //   'up' | 'down'. Stored alongside lastUsed so we don't need a second
  //   subscription. Anonymous = no votes recorded.
  const [myVotes, setMyVotes] = useState<Record<string, Vote>>({})

  useEffect(() => {
    if (!uid) {
      setScores({})
      setLastUsed({})
      setMyVotes({})
      return
    }
    const scoresRef = ref(db, `users/${uid}/serverPrefs/scores`)
    const lastUsedRef = ref(db, `users/${uid}/serverPrefs/lastUsed`)
    const myVotesRef = ref(db, `users/${uid}/serverPrefs/myVotes`)

    const sH = onValue(scoresRef, (snap) => setScores((snap.val() as ScoresMap) ?? {}))
    const lH = onValue(lastUsedRef, (snap) => setLastUsed((snap.val() as LastUsedMap) ?? {}))
    const vH = onValue(myVotesRef, (snap) => setMyVotes((snap.val() as Record<string, Vote>) ?? {}))

    return () => {
      off(scoresRef, 'value', sH)
      off(lastUsedRef, 'value', lH)
      off(myVotesRef, 'value', vH)
    }
  }, [uid])

  const rememberLastUsed = useCallback(
    (key: string, serverId: string) => {
      if (!uid) return
      // Write a single leaf; tolerant of permission failures (don't disrupt playback).
      void set(ref(db, `users/${uid}/serverPrefs/lastUsed/${key}`), serverId).catch(() => {})
    },
    [uid]
  )

  // Toggle a vote — re-clicking the same side clears it. Up/down are mutually
  // exclusive. We adjust both `scores` and `myVotes` in one atomic update.
  const vote = useCallback(
    (serverId: string, next: Vote) => {
      if (!uid) return
      const current = myVotes[serverId] ?? null
      if (current === next) next = null // toggle off
      const cur = scores[serverId] ?? { up: 0, down: 0 }
      let up = cur.up ?? 0
      let down = cur.down ?? 0
      // Undo previous
      if (current === 'up') up = Math.max(0, up - 1)
      if (current === 'down') down = Math.max(0, down - 1)
      // Apply new
      if (next === 'up') up += 1
      if (next === 'down') down += 1
      const updates: Record<string, unknown> = {}
      updates[`users/${uid}/serverPrefs/scores/${serverId}/up`] = up
      updates[`users/${uid}/serverPrefs/scores/${serverId}/down`] = down
      updates[`users/${uid}/serverPrefs/myVotes/${serverId}`] = next
      void update(ref(db), updates).catch(() => {})
    },
    [uid, myVotes, scores]
  )

  const api = useMemo(
    () => ({
      scores,
      lastUsed,
      myVotes,
      rememberLastUsed,
      vote,
      scoreOf: (id: string) => scoreOf(scores, id)
    }),
    [scores, lastUsed, myVotes, rememberLastUsed, vote]
  )

  return api
}
