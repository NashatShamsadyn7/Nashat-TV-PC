import { useEffect, useState } from 'react'
import { tmdbApi } from '@/services/tmdb'
import { useLibraryStore } from '@/stores/libraryStore'
import type { TmdbMovie, TmdbTv } from '@shared/tmdb'

type Reason = 'because_you_liked' | 'continue_watching_similar' | 'trending_match'
type RecItem = (TmdbMovie | TmdbTv) & { _reason: Reason; _sourceTitle?: string; _kind: 'movie' | 'tv' }

async function fetchRecs(
  endpoint: string,
  language: string
): Promise<TmdbMovie[] | TmdbTv[]> {
  try {
    const res = await window.nashat.tmdbGet<{ results: any[] }>({ endpoint, params: { language } })
    return (res?.results ?? []).slice(0, 6) as any
  } catch {
    return []
  }
}

/**
 * Pulls TMDB recommendations off the user's top library items.
 * No ML — just leverages TMDB's "/recommendations" endpoint per item.
 */
export function useRecommendations(language: string) {
  const favorites = useLibraryStore((s) => s.favorites)
  const progress = useLibraryStore((s) => s.progress)
  const [items, setItems] = useState<RecItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const seeds = [
      ...favorites.slice(0, 3).filter((x) => x.tmdbId),
      ...progress.slice(0, 3).filter((x) => x.tmdbId)
    ]
    if (seeds.length === 0) {
      setItems([])
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all(
      seeds.map(async (seed) => {
        const isTv = seed.kind === 'tv'
        const endpoint = isTv
          ? `/tv/${seed.tmdbId}/recommendations`
          : `/movie/${seed.tmdbId}/recommendations`
        const results = await fetchRecs(endpoint, language)
        return (results || []).map((r) => ({
          ...r,
          _reason: 'because_you_liked' as Reason,
          _sourceTitle: seed.title,
          _kind: isTv ? ('tv' as const) : ('movie' as const)
        }))
      })
    )
      .then((batches) => {
        if (cancelled) return
        const flat = batches.flat()
        const seen = new Set<number>()
        const deduped = flat.filter((it) => {
          if (seen.has(it.id)) return false
          seen.add(it.id)
          return true
        })
        setItems(deduped.slice(0, 24))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites.length, progress.length, language])

  return { items, loading }
  void tmdbApi // ts unused guard
}
