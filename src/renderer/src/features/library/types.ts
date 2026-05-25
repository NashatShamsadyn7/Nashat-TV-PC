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
  kind: 'movie' | 'tv'
  tmdbId: number
  title: string
  poster?: string
  backdrop?: string
  season?: number
  episode?: number
  position: number
  duration: number
  updatedAt: number
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
