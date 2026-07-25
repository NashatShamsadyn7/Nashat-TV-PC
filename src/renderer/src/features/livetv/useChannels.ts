import { useEffect, useMemo, useState } from 'react'
import type { Channel } from '@shared/types'
import { subscribeChannels } from './api'
import { filterChannelsForKids, useKidsMode } from '@/features/profiles/useKidsMode'

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

  // Kids profiles only see kid-safe categories. Applied here rather than per
  // page so LiveTV, MultiLive and Search are all covered by one rule.
  const kidsMode = useKidsMode()
  return useMemo(
    () => ({ ...state, channels: filterChannelsForKids(state.channels, kidsMode) }),
    [state, kidsMode]
  )
}
