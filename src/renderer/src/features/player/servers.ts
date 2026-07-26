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
    // VidFast — largest, most complete embed payload of everything probed.
    id: 'vidfast',
    label: 'VidFast',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://vidfast.pro/movie/${tmdbId}`
        : `https://vidfast.pro/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
  },
  {
    id: '111movies',
    label: '111Movies',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://111movies.com/movie/${tmdbId}`
        : `https://111movies.com/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
  },
  {
    id: 'videasy',
    label: 'Videasy',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://player.videasy.net/movie/${tmdbId}`
        : `https://player.videasy.net/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
  },
  {
    // vidsrc.me — the surviving VidSrc host. vidsrc.xyz no longer resolves at all.
    id: 'vidsrc-me',
    label: 'VidSrc',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`
        : `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season ?? 1}&episode=${episode ?? 1}`
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
    // GoDrivePlayer — VidSrc alternative, mostly 1080p, uses TMDB id.
    id: 'godrive',
    label: 'GoDrive',
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://databasegdriveplayer.co/player.php?type=movie&tmdb=${tmdbId}`
        : `https://databasegdriveplayer.co/player.php?type=series&tmdb=${tmdbId}&season=${season ?? 1}&episode=${episode ?? 1}`
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
    // vidsrc.to now serves an ad shell (~2.5 KB of popunder scripts) rather
    // than a player. Kept as a last resort only.
    id: 'vidsrc',
    label: 'VidSrc (legacy)',
    reliable: false,
    build: ({ kind, tmdbId, season, episode }) =>
      kind === 'movie'
        ? `https://vidsrc.to/embed/movie/${tmdbId}`
        : `https://vidsrc.to/embed/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
  }
]
