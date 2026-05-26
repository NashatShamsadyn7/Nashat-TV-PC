export type MediaKind = 'movie' | 'tv' | 'channel'

export type LibraryItem = {
  id: string
  kind: MediaKind
  tmdbId?: number
  channelKey?: string
  title: string
  poster?: string
  backdrop?: string
  year?: string
  addedAt: number
}

export type ProgressItem = {
  id: string
  kind: 'movie' | 'tv' | 'channel'
  tmdbId?: number
  title: string
  poster?: string
  backdrop?: string
  season?: number
  episode?: number
  position: number
  duration: number
  updatedAt: number
  /** Channel-only: cached stream/page URL so Continue Watching can replay it. */
  streamUrl?: string
  /** Channel-only: category label for the badge. */
  channelCategory?: string
  /** Channel-only: unique key to identify the channel across reloads. */
  channelKey?: string
}

export function makeLibraryId(kind: MediaKind, ref: string | number): string {
  return `${kind}:${ref}`
}

export function makeProgressId(
  kind: 'movie' | 'tv',
  tmdbId: number,
  season?: number,
  episode?: number
): string {
  if (kind === 'tv') return `tv:${tmdbId}:s${season ?? 1}e${episode ?? 1}`
  return `movie:${tmdbId}`
}

export function makeChannelProgressId(channelKey: string): string {
  return `channel:${channelKey}`
}
