import type {
  TmdbInvokePayload,
  TmdbMovie,
  TmdbTv,
  TmdbPaged,
  TmdbMovieDetails,
  TmdbTvDetails,
  TmdbSeasonDetails,
  TmdbPerson,
  TmdbPersonDetails,
  TmdbPersonCredits
} from '@shared/tmdb'

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
    }),

  searchPeople: (query: string, language = 'ar') =>
    tmdb<TmdbPaged<TmdbPerson>>({
      endpoint: '/search/person',
      params: { query, language, include_adult: 'false' }
    }),

  movieDetails: (id: number, language = 'ar') =>
    tmdb<TmdbMovieDetails>({
      endpoint: `/movie/${id}`,
      params: {
        language,
        append_to_response: 'videos,credits,recommendations,similar'
      }
    }),

  tvDetails: (id: number, language = 'ar') =>
    tmdb<TmdbTvDetails>({
      endpoint: `/tv/${id}`,
      params: {
        language,
        append_to_response: 'videos,credits,recommendations,similar'
      }
    }),

  tvSeason: (tvId: number, season: number, language = 'ar') =>
    tmdb<TmdbSeasonDetails>({
      endpoint: `/tv/${tvId}/season/${season}`,
      params: { language }
    }),

  popularPeople: (page = 1, language = 'ar') =>
    tmdb<TmdbPaged<TmdbPerson>>({
      endpoint: '/person/popular',
      params: { page, language }
    }),

  personDetails: (id: number, language = 'ar') =>
    tmdb<TmdbPersonDetails>({
      endpoint: `/person/${id}`,
      params: { language }
    }),

  personCombinedCredits: (id: number, language = 'ar') =>
    tmdb<TmdbPersonCredits>({
      endpoint: `/person/${id}/combined_credits`,
      params: { language }
    })
}
