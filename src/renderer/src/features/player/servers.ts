// Embed-server registry for movies & TV. Order = preference. Player tries
// the first; on failure (or user click) advances to the next.

export type MediaKind = 'movie' | 'tv'

export interface StreamServer {
  id: string
  label: string
  // false = the host responds to a health ping but its player frequently refuses
  // to play inside an embed (e.g. VidSrc's "Sandbox not allowed" anti-embed gate).
  // Such servers stay selectable manually but are skipped by auto-pick when a
  // reliable working server exists.
  reliable?: boolean
  build: (args: { kind: MediaKind; tmdbId: number; season?: number; episode?: number }) => string
}

export const STREAM_SERVERS: StreamServer[] = [
  {
    id: 'vidsrc',
    label: 'VidSrc',
    reliable: false,
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://vidsrc.to/embed/movie/${tmdbId}`
        : `https://vidsrc.to/embed/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
  },
  {
    id: 'vidsrc-xyz',
    label: 'VidSrc XYZ',
    reliable: false,
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`
        : `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season ?? 1}&episode=${episode ?? 1}`
  },
  {
    id: 'embedsu',
    label: 'Embed.su',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://embed.su/embed/movie/${tmdbId}`
        : `https://embed.su/embed/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
  },
  {
    id: 'autoembed',
    label: 'AutoEmbed',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://player.autoembed.cc/embed/movie/${tmdbId}`
        : `https://player.autoembed.cc/embed/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
  },
  {
    id: '2embed',
    label: '2Embed',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://www.2embed.cc/embed/${tmdbId}`
        : `https://www.2embed.cc/embedtv/${tmdbId}&s=${season ?? 1}&e=${episode ?? 1}`
  },
  {
    id: 'vidlink',
    label: 'VidLink',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://vidlink.pro/movie/${tmdbId}`
        : `https://vidlink.pro/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
  },
  {
    id: 'multiembed',
    label: 'MultiEmbed',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season ?? 1}&e=${episode ?? 1}`
  },
  {
    id: 'moviesapi',
    label: 'MoviesAPI',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://moviesapi.club/movie/${tmdbId}`
        : `https://moviesapi.club/tv/${tmdbId}-${season ?? 1}-${episode ?? 1}`
  }
]
