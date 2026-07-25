import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { libraryActions, useLibraryStore } from '@/stores/libraryStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { ProgressItem } from './types'

/**
 * Records and restores playback position for "Continue Watching".
 *
 * Before this existed the feature was cosmetic: the player wrote a single
 * `{ position: 0, duration: 0 }` row when it opened and never updated it, so
 * every card's progress bar sat at 0% and reopening a title always restarted
 * from the beginning. `VideoPlayer` already accepted `onProgress` and
 * `initialPosition` — nothing passed them.
 *
 * Write policy: `timeupdate` fires roughly 4×/second, and each save is a
 * Firebase RTDB write. We therefore persist at most once every
 * `SAVE_INTERVAL_MS`, plus one final flush on unmount so closing the player
 * mid-episode does not lose up to 10s of position.
 */

const SAVE_INTERVAL_MS = 10_000

/** Ignore the first seconds — a title opened and abandoned isn't "in progress". */
const MIN_POSITION_S = 15

/**
 * Past this fraction the title counts as finished: we drop the row so a
 * watched episode leaves Continue Watching instead of sitting there at 98%.
 */
const COMPLETE_RATIO = 0.94

type Options = {
  /** Stable identity + metadata for the row. Null disables tracking. */
  item: Omit<ProgressItem, 'position' | 'duration' | 'updatedAt'> | null
}

type WatchProgress = {
  /** Seconds to resume from, or undefined to start at the beginning. */
  initialPosition: number | undefined
  /** Pass straight to <VideoPlayer onProgress={...}>. */
  onProgress: (currentTime: number, duration: number) => void
}

export function useWatchProgress({ item }: Options): WatchProgress {
  const rememberPosition = useSettingsStore((s) => s.rememberPosition)

  const id = item?.id ?? null

  // Snapshot the stored position once per title, via getState() rather than a
  // store subscription. Subscribing to `progress` would re-render the player on
  // every one of our own saves, and would make `initialPosition` change under a
  // playing video. The store is hydrated at app start, long before a player can
  // be opened, so a one-shot read is sufficient here.
  const [resume, setResume] = useState<number | undefined>(undefined)
  const resumeIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (resumeIdRef.current === id) return
    resumeIdRef.current = id
    if (!id || !rememberPosition) {
      setResume(undefined)
      return
    }
    const stored = useLibraryStore.getState().progress.find((p) => p.id === id)
    setResume(stored && stored.position > MIN_POSITION_S ? stored.position : undefined)
  }, [id, rememberPosition])

  const lastSaveRef = useRef(0)
  const latestRef = useRef<{ position: number; duration: number } | null>(null)
  // Keep the metadata in a ref so `onProgress` stays referentially stable —
  // VideoPlayer binds its listeners once and would not pick up a new closure.
  const itemRef = useRef(item)
  itemRef.current = item

  const save = useCallback((position: number, duration: number) => {
    const meta = itemRef.current
    if (!meta) return

    // A live stream reports duration Infinity. There is no "position" to come
    // back to on a live broadcast, so the row is written as a plain
    // recently-watched marker (position 0) — which also means the resume check
    // below can never fire for it.
    if (!Number.isFinite(duration) || duration <= 0) {
      void libraryActions.recordProgress({
        ...meta,
        position: 0,
        duration: 0,
        updatedAt: Date.now()
      })
      return
    }

    // Finished: remove instead of pinning the card at ~100%.
    if (position / duration >= COMPLETE_RATIO) {
      void libraryActions.clearProgress(meta.id)
      latestRef.current = null
      return
    }

    void libraryActions.recordProgress({
      ...meta,
      position,
      duration,
      updatedAt: Date.now()
    })
  }, [])

  const onProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (!itemRef.current) return
      if (!Number.isFinite(currentTime) || currentTime < MIN_POSITION_S) return

      latestRef.current = { position: currentTime, duration }

      const now = Date.now()
      if (now - lastSaveRef.current < SAVE_INTERVAL_MS) return
      lastSaveRef.current = now
      save(currentTime, duration)
    },
    [save]
  )

  // Final flush. Without this, closing the player up to 10s after the last
  // throttled write would discard that much progress.
  useEffect(() => {
    return () => {
      const latest = latestRef.current
      if (latest) save(latest.position, latest.duration)
      latestRef.current = null
      lastSaveRef.current = 0
    }
    // Flush when the tracked title changes, not just on unmount.
  }, [id, save])

  return useMemo(
    () => ({ initialPosition: resume, onProgress }),
    [resume, onProgress]
  )
}
