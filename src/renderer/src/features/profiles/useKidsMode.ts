import { useMemo } from 'react'
import { useProfilesStore } from '@/stores/profilesStore'
import type { Channel } from '@shared/types'

/**
 * Kids-profile content restrictions.
 *
 * The profile editor labels this "Kids profile (hides adult content)", but
 * `isKid` was only ever rendered as a badge — it filtered nothing. Anyone on a
 * Kids profile saw the identical catalogue and the identical channel list.
 *
 * What is enforced here:
 *  - TMDB rows/grids drop anything flagged `adult`.
 *  - Live TV is restricted to channel categories that are actually for children.
 *
 * What is deliberately NOT claimed: this is a content filter, not a hardened
 * parental-control system. A determined user can still switch profiles if no
 * PIN is set — the PIN gate in PinPrompt is the access control half.
 */

/** Channel categories a Kids profile may watch. Matched case-insensitively. */
const KID_SAFE_CATEGORIES = ['kids', 'cartoon', 'cartoons', 'children', 'أطفال', 'منوعات أطفال']

/** TMDB genres unsuitable for a kids profile: Horror (27), Thriller (53), War (10752), Crime (80). */
const BLOCKED_GENRE_IDS = new Set([27, 53, 10752, 80])

export function useKidsMode(): boolean {
  const profiles = useProfilesStore((s) => s.profiles)
  const activeId = useProfilesStore((s) => s.activeId)
  return useMemo(
    () => profiles.find((p) => p.id === activeId)?.isKid ?? false,
    [profiles, activeId]
  )
}

/** Minimal shape shared by TMDB movie/tv objects that we can filter on. */
type FilterableMedia = {
  adult?: boolean
  genre_ids?: number[]
  vote_average?: number
}

export function isKidSafeMedia(item: FilterableMedia | null | undefined): boolean {
  if (!item) return false
  if (item.adult) return false
  if (item.genre_ids?.some((g) => BLOCKED_GENRE_IDS.has(g))) return false
  return true
}

export function isKidSafeChannel(channel: Channel): boolean {
  const category = (channel.category ?? '').trim().toLowerCase()
  return KID_SAFE_CATEGORIES.some((c) => category === c.toLowerCase())
}

/**
 * Filters a TMDB list when kids mode is on, and returns it untouched otherwise.
 * Written as a plain function (not a hook) so it can be used inside `useMemo`
 * at any call site.
 */
export function filterMediaForKids<T extends FilterableMedia>(
  items: T[] | null | undefined,
  kidsMode: boolean
): T[] {
  if (!items) return []
  if (!kidsMode) return items
  return items.filter(isKidSafeMedia)
}

export function filterChannelsForKids(
  channels: Channel[],
  kidsMode: boolean
): Channel[] {
  if (!kidsMode) return channels
  return channels.filter(isKidSafeChannel)
}
