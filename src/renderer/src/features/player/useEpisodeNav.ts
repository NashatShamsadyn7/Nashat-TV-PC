import { useEffect, useState } from 'react'
import { tmdbApi } from '@/services/tmdb'
import { useTmdbLanguage } from '@/i18n/tmdbLocale'

/**
 * Resolves the previous/next episode of a series, including season rollover.
 *
 * TMDB does not expose "next episode" directly — you have to know how many
 * episodes the current season has before you can decide whether E+1 exists or
 * whether the next episode is S+1 E1. That needs the season payload, which this
 * hook fetches and caches per (series, season).
 *
 * Specials (season 0) are skipped: TMDB files them as season_number 0 and they
 * are not part of the normal running order.
 */

export type EpisodeRef = { season: number; episode: number }

type Nav = {
  next: EpisodeRef | null
  previous: EpisodeRef | null
  loading: boolean
}

// (tmdbId, season) -> episode count. Series data is stable, so a plain
// module-level cache avoids refetching while the user binges through a season.
const seasonSizeCache = new Map<string, number>()
let totalSeasonsCache = new Map<number, number>()

export function useEpisodeNav(
  tmdbId: number | null,
  season: number | undefined,
  episode: number | undefined,
  enabled: boolean
): Nav {
  const language = useTmdbLanguage()
  const [nav, setNav] = useState<Nav>({ next: null, previous: null, loading: false })

  useEffect(() => {
    if (!enabled || !tmdbId || !season || !episode) {
      setNav({ next: null, previous: null, loading: false })
      return
    }

    let cancelled = false
    setNav((n) => ({ ...n, loading: true }))

    const sizeKey = (s: number) => `${tmdbId}:${s}`

    const episodeCount = async (s: number): Promise<number> => {
      const cached = seasonSizeCache.get(sizeKey(s))
      if (cached !== undefined) return cached
      const data = await tmdbApi.tvSeason(tmdbId, s, language)
      const count = data.episodes?.length ?? 0
      seasonSizeCache.set(sizeKey(s), count)
      return count
    }

    const seasonCount = async (): Promise<number> => {
      const cached = totalSeasonsCache.get(tmdbId)
      if (cached !== undefined) return cached
      const details = await tmdbApi.tvDetails(tmdbId, language)
      const count = details.number_of_seasons ?? 1
      totalSeasonsCache.set(tmdbId, count)
      return count
    }

    async function resolve(): Promise<void> {
      try {
        const [currentSize, totalSeasons] = await Promise.all([
          episodeCount(season!),
          seasonCount()
        ])

        let next: EpisodeRef | null = null
        if (episode! < currentSize) {
          next = { season: season!, episode: episode! + 1 }
        } else if (season! < totalSeasons) {
          // End of season — roll into the next one if it actually has episodes.
          const nextSize = await episodeCount(season! + 1)
          if (nextSize > 0) next = { season: season! + 1, episode: 1 }
        }

        let previous: EpisodeRef | null = null
        if (episode! > 1) {
          previous = { season: season!, episode: episode! - 1 }
        } else if (season! > 1) {
          const prevSize = await episodeCount(season! - 1)
          if (prevSize > 0) previous = { season: season! - 1, episode: prevSize }
        }

        if (!cancelled) setNav({ next, previous, loading: false })
      } catch {
        // A failed lookup just means no navigation offered — never block playback.
        if (!cancelled) setNav({ next: null, previous: null, loading: false })
      }
    }

    void resolve()
    return () => {
      cancelled = true
    }
  }, [tmdbId, season, episode, enabled, language])

  return nav
}

/** Exposed for tests/debugging — clears the module-level caches. */
export function clearEpisodeNavCache(): void {
  seasonSizeCache.clear()
  totalSeasonsCache = new Map()
}
