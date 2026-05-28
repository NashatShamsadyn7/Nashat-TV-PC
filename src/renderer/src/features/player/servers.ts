// Embed-server registry for movies & TV. Order = preference. Player tries
// the first; on failure (or user click) advances to the next.
//
// Quality rule: a "reliable" server is one whose embed actually plays inside
// a third-party iframe. An "unreliable" server (e.g. vidsrc.to) often responds
// to the ping but its player refuses to embed ("Sandbox not allowed"). The
// auto-pick logic in useServerHealth.sortByHealth keeps reliable servers
// ahead of unreliable ones — both remain manually selectable.

export type MediaKind = 'movie' | 'tv'

export interface StreamServer {
  id: string
  label: string
  reliable?: boolean
  build: (args: { kind: MediaKind; tmdbId: number; season?: number; episode?: number }) => string
}

export const STREAM_SERVERS: StreamServer[] = [
  {
    id: 'vidlink',
    label: 'VidLink',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://vidlink.pro/movie/${tmdbId}`
        : `https://vidlink.pro/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
  },
  {
    // Newer 2Embed (distinct host from 2embed.cc). Reported clean iframe, HD.
    id: '2embed-stream',
    label: '2Embed Stream',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://www.2embed.stream/embed/movie/${tmdbId}`
        : `https://www.2embed.stream/embed/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
  },
  {
    // StreamVault — explicitly markets sandbox/CSP-friendly embeds + multi-source fallback.
    id: 'streamvault',
    label: 'StreamVault',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://streamvaultsrc.click/embed/movie/${tmdbId}`
        : `https://streamvaultsrc.click/embed/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
  },
  {
    // VidAPI — same path convention as the legacy ones, generally stable.
    id: 'vidapi',
    label: 'VidAPI',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://vidapi.xyz/embed/movie/${tmdbId}`
        : `https://vidapi.xyz/embed/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
  },
  {
    // VikingEmbed — single /play/<id> endpoint; episodes use suffix _sN_eN.
    id: 'vembed',
    label: 'VikingEmbed',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://vembed.click/play/${tmdbId}`
        : `https://vembed.click/play/${tmdbId}_s${season ?? 1}_e${episode ?? 1}`
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
    id: 'multiembed',
    label: 'MultiEmbed',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season ?? 1}&e=${episode ?? 1}`
  },
  // -- Unreliable fallbacks below. They ping OK but the player frequently
  //    refuses to embed ("Sandbox not allowed"). Kept so a user can still try
  //    them manually; auto-pick will only reach them if nothing reliable works.
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
  }
]
