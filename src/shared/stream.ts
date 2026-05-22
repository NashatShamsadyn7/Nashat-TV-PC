export type ExtractedStream = {
  pageUrl: string
  streamUrl: string
  kind: 'hls' | 'dash' | 'mp4'
  headers?: { referer?: string; userAgent?: string }
}
