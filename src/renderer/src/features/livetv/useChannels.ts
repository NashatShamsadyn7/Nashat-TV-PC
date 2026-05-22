import { useEffect, useState } from 'react'
import type { Channel } from '@shared/types'
import { subscribeChannels } from './api'

export type ChannelsState = {
  channels: Channel[]
  loading: boolean
  error: string | null
}

/** Live subscription to /live_tv_channels in Firebase RTDB. */
export function useChannels(): ChannelsState {
  const [state, setState] = useState<ChannelsState>({
    channels: [],
    loading: true,
    error: null
  })

  useEffect(() => {
    const unsub = subscribeChannels(
      (channels) => setState({ channels, loading: false, error: null }),
      (err) => setState({ channels: [], loading: false, error: err.message })
    )
    return () => unsub()
  }, [])

  return state
}
