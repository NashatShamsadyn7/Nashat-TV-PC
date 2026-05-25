export type EpgEntry = {
  id: string
  channelKey: string
  title: string
  description?: string
  start: number
  end: number
  category?: string
}

export type EpgChannelSchedule = {
  channelKey: string
  channelName: string
  channelLogo?: string
  entries: EpgEntry[]
}
