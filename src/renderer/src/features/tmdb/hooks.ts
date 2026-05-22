import { useEffect, useState } from 'react'
import type { TmdbMovie, TmdbTv, TmdbPaged } from '@shared/tmdb'
import { tmdbApi } from '@/services/tmdb'

type Resource<T> = { data: T | null; loading: boolean; error: string | null }

function useResource<T>(fetcher: () => Promise<T>, deps: unknown[]): Resource<T> {
  const [state, setState] = useState<Resource<T>>({
    data: null,
    loading: true,
    error: null
  })

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

  return state
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
