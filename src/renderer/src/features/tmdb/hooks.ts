import { useEffect, useMemo, useState } from 'react'
import type { TmdbMovie, TmdbTv, TmdbPaged } from '@shared/tmdb'
import { tmdbApi } from '@/services/tmdb'
import { filterMediaForKids, useKidsMode } from '@/features/profiles/useKidsMode'

type Resource<T> = { data: T | null; loading: boolean; error: string | null }

/**
 * Shared fetch wrapper for the paged TMDB endpoints.
 *
 * Kids filtering is applied here rather than at each call site so every row on
 * Home, Movies and Series is covered by a single rule. `include_adult=false`
 * on the request only handles TMDB's own adult flag; this additionally drops
 * horror/thriller/crime/war by genre.
 */
function useResource<T extends TmdbPaged<TmdbMovie | TmdbTv>>(
  fetcher: () => Promise<T>,
  deps: unknown[]
): Resource<T> {
  const [state, setState] = useState<Resource<T>>({
    data: null,
    loading: true,
    error: null
  })
  const kidsMode = useKidsMode()

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ data: null, loading: false, error: err.message })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return useMemo(() => {
    if (!kidsMode || !state.data) return state
    return {
      ...state,
      data: { ...state.data, results: filterMediaForKids(state.data.results, true) }
    }
  }, [state, kidsMode])
}

export const useTrendingMovies = (language = 'ar') =>
  useResource<TmdbPaged<TmdbMovie>>(() => tmdbApi.trendingMovies('week', language), [language])

export const usePopularMovies = (language = 'ar') =>
  useResource<TmdbPaged<TmdbMovie>>(() => tmdbApi.popularMovies(1, language), [language])

export const useTopRatedMovies = (language = 'ar') =>
  useResource<TmdbPaged<TmdbMovie>>(() => tmdbApi.topRatedMovies(1, language), [language])

export const useNowPlayingMovies = (language = 'ar') =>
  useResource<TmdbPaged<TmdbMovie>>(() => tmdbApi.nowPlayingMovies(1, language), [language])

export const useTrendingTv = (language = 'ar') =>
  useResource<TmdbPaged<TmdbTv>>(() => tmdbApi.trendingTv('week', language), [language])

export const usePopularTv = (language = 'ar') =>
  useResource<TmdbPaged<TmdbTv>>(() => tmdbApi.popularTv(1, language), [language])
