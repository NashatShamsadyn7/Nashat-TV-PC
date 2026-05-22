// TMDB domain types shared between main (fetcher) and renderer (UI).

export interface TmdbMovie {
  id: number
  title: string
  original_title?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  genre_ids?: number[]
  popularity?: number
}

export interface TmdbTv {
  id: number
  name: string
  original_name?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  vote_count: number
  genre_ids?: number[]
}

export interface TmdbPaged<T> {
  page: number
  total_pages: number
  total_results: number
  results: T[]
}

export type TmdbInvokePayload = {
  endpoint: string
  params?: Record<string, string | number>
}

// Image URL helpers (sizes are TMDB public CDN conventions).
export const TMDB_IMG = 'https://image.tmdb.org/t/p'
export const posterUrl = (path: string | null, size: 'w185' | 'w342' | 'w500' = 'w342') =>
  path ? `${TMDB_IMG}/${size}${path}` : ''
export const backdropUrl = (
  path: string | null,
  size: 'w780' | 'w1280' | 'original' = 'w1280'
) => (path ? `${TMDB_IMG}/${size}${path}` : '')
