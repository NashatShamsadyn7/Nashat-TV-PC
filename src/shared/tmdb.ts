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

export interface TmdbGenre {
  id: number
  name: string
}

export interface TmdbProductionCountry {
  iso_3166_1: string
  name: string
}

export interface TmdbMovieDetails extends TmdbMovie {
  runtime: number | null
  tagline?: string
  status?: string
  genres: TmdbGenre[]
  production_countries?: TmdbProductionCountry[]
  videos?: { results: TmdbVideo[] }
  credits?: TmdbCredits
  recommendations?: TmdbPaged<TmdbMovie>
  similar?: TmdbPaged<TmdbMovie>
}

export interface TmdbTvSeasonSummary {
  id: number
  season_number: number
  episode_count: number
  air_date: string | null
  name: string
  overview: string
  poster_path: string | null
}

export interface TmdbTvDetails extends TmdbTv {
  number_of_seasons: number
  number_of_episodes: number
  tagline?: string
  status?: string
  episode_run_time?: number[]
  genres: TmdbGenre[]
  seasons: TmdbTvSeasonSummary[]
  videos?: { results: TmdbVideo[] }
  credits?: TmdbCredits
  recommendations?: TmdbPaged<TmdbTv>
  similar?: TmdbPaged<TmdbTv>
}

export interface TmdbEpisode {
  id: number
  episode_number: number
  season_number: number
  name: string
  overview: string
  still_path: string | null
  air_date: string | null
  runtime: number | null
  vote_average?: number
}

export interface TmdbSeasonDetails {
  id: number
  season_number: number
  name: string
  overview: string
  poster_path: string | null
  air_date: string | null
  episodes: TmdbEpisode[]
}

export interface TmdbVideo {
  id: string
  key: string
  name: string
  site: 'YouTube' | string
  type: 'Trailer' | 'Teaser' | 'Clip' | 'Featurette' | 'Behind the Scenes' | string
  official: boolean
  published_at?: string
}

export interface TmdbCastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
}

export interface TmdbCrewMember {
  id: number
  name: string
  job: string
  department: string
  profile_path: string | null
}

export interface TmdbCredits {
  cast: TmdbCastMember[]
  crew: TmdbCrewMember[]
}

export interface TmdbPerson {
  id: number
  name: string
  profile_path: string | null
  known_for_department?: string
  popularity?: number
  known_for?: Array<(TmdbMovie | TmdbTv) & { media_type: 'movie' | 'tv' }>
}

export interface TmdbPersonDetails extends TmdbPerson {
  biography: string
  birthday: string | null
  deathday: string | null
  place_of_birth: string | null
}

export interface TmdbPersonCreditMovie extends TmdbMovie {
  character?: string
}

export interface TmdbPersonCreditTv extends TmdbTv {
  character?: string
}

export interface TmdbPersonCredits {
  cast: Array<((TmdbMovie & { character?: string; media_type: 'movie' }) | (TmdbTv & { character?: string; media_type: 'tv' }))>
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
export const profileUrl = (path: string | null, size: 'w185' | 'h632' | 'original' = 'w185') =>
  path ? `${TMDB_IMG}/${size}${path}` : ''
export const stillUrl = (path: string | null, size: 'w300' | 'original' = 'w300') =>
  path ? `${TMDB_IMG}/${size}${path}` : ''
export const youtubeUrl = (key: string) => `https://www.youtube.com/watch?v=${key}`
export const youtubeEmbedUrl = (key: string, autoplay = true) =>
  `https://www.youtube.com/embed/${key}?autoplay=${autoplay ? 1 : 0}&rel=0`
