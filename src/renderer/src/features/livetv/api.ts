import { onValue, ref } from 'firebase/database'
import { db } from '@/services/firebase'
import type { Channel } from '@shared/types'

const CHANNELS_PATH = 'live_tv_channels'

type ChannelRaw = Partial<Channel> & { id?: string; key?: string; name?: string }

function isValidChannel(c: ChannelRaw | null | undefined): c is Channel {
  return !!c && typeof c.name === 'string' && typeof c.url === 'string'
}

function normalize(raw: ChannelRaw, fallbackKey: string): Channel {
  return {
    id: raw.id ?? raw.key ?? fallbackKey,
    key: raw.key ?? raw.id ?? fallbackKey,
    name: raw.name ?? 'Unknown',
    logo: raw.logo ?? '',
    category: raw.category ?? 'Uncategorized',
    url: raw.url ?? '',
    streamUrl: raw.streamUrl ?? raw.url ?? '',
    isAlive: raw.isAlive ?? true,
    dbIndex: typeof raw.dbIndex === 'number' ? raw.dbIndex : 0
  }
}

/**
 * Subscribes to the channel list. Firebase stores it as an indexed array
 * (0, 1, 2, ...) so the snapshot can arrive as an Array or an Object.
 */
export function subscribeChannels(
  onData: (channels: Channel[]) => void,
  onError: (err: Error) => void
): () => void {
  const channelsRef = ref(db, CHANNELS_PATH)

  const unsub = onValue(
    channelsRef,
    (snap) => {
      const val = snap.val() as Record<string, ChannelRaw> | ChannelRaw[] | null
      if (!val) {
        onData([])
        return
      }

      const entries: [string, ChannelRaw][] = Array.isArray(val)
        ? val.map((c, i) => [String(i), c])
        : Object.entries(val)

      const channels = entries
        .map(([k, c]) => (isValidChannel(c) ? normalize(c, k) : null))
        .filter((c): c is Channel => c !== null)

      onData(channels)
    },
    (err) => onError(err as Error)
  )

  return unsub
}
