export type ExtractedStream = {
  pageUrl: string
  streamUrl: string
  kind: 'hls' | 'dash' | 'mp4'
  headers?: { referer?: string; userAgent?: string }
}

/** Result of a real (main-process) reachability check on an embed server. */
export type ServerProbe = {
  ok: boolean
  latencyMs: number
  /** Why it failed — surfaced in the UI so a dead server is legible. */
  reason?: 'offline' | 'http-error' | 'parked' | 'empty' | 'timeout'
  status?: number
}
