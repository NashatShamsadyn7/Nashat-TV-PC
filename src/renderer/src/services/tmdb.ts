import type { TmdbInvokePayload, TmdbMovie, TmdbTv, TmdbPaged } from '@shared/tmdb'

async function tmdb<T>(payload: TmdbInvokePayload): Promise<T> {
  return window.nashat.tmdbGet<T>(payload)
}

export const tmdbApi = {
  trendingMovies: (window: 'day' | 'week' = 'week', language = 'ar') =>
    tmdb<TmdbPaged<TmdbMovie>>({
      endpoint: `/trending/movie/${window}`,
      params: { language }
    }),

  popularMovies: (page = 1, language = 'ar') =>
    tmdb<TmdbPaged<TmdbMovie>>({
      endpoint: '/movie/popular',
      params: { page, language }
    }),

  topRatedMovies: (page = 1, language = 'ar') =>
    tmdb<TmdbPaged<TmdbMovie>>({
      endpoint: '/movie/top_rated',
      params: { page, language }
    }),

  nowPlayingMovies: (page = 1, language = 'ar') =>
    tmdb<TmdbPaged<TmdbMovie>>({
      endpoint: '/movie/now_playing',
      params: { page, language }
    }),

  trendingTv: (window: 'day' | 'week' = 'week', language = 'ar') =>
    tmdb<TmdbPaged<TmdbTv>>({
      endpoint: `/trending/tv/${window}`,
      params: { language }
    }),

  popularTv: (page = 1, language = 'ar') =>
    tmdb<TmdbPaged<TmdbTv>>({
      endpoint: '/tv/popular',
      params: { page, language }
    }),

  topRatedTv: (page = 1, language = 'ar') =>
    tmdb<TmdbPaged<TmdbTv>>({
      endpoint: '/tv/top_rated',
      params: { page, language }
    }),

  searchMulti: (query: string, language = 'ar') =>
    tmdb<TmdbPaged<TmdbMovie | TmdbTv>>({
      endpoint: '/search/multi',
      params: { query, language, include_adult: 'false' }
    }),

  searchMovies: (query: string, language = 'ar') =>
    tmdb<TmdbPaged<TmdbMovie>>({
      endpoint: '/search/movie',
      params: { query, language, include_adult: 'false' }
    }),

  searchTv: (query: string, language = 'ar') =>
    tmdb<TmdbPaged<TmdbTv>>({
      endpoint: '/search/tv',
      params: { query, language, include_adult: 'false' }
    })
}
