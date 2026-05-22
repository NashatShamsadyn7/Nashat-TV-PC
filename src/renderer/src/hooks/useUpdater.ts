import { useEffect, useState } from 'react'

export type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version?: string }
  | { status: 'not-available' }
  | { status: 'progress'; percent: number }
  | { status: 'downloaded'; version?: string }
  | { status: 'error'; message: string }

export function useUpdater(): UpdateState {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })

  useEffect(() => {
    const off = window.nashat.onUpdateEvent((event, data) => {
      switch (event) {
        case 'checking':
          setState({ status: 'checking' })
          break
        case 'available':
          setState({
            status: 'available',
            version: (data as { version?: string })?.version
          })
          break
        case 'not-available':
          setState({ status: 'not-available' })
          break
        case 'progress':
          setState({
            status: 'progress',
            percent: (data as { percent: number }).percent
          })
          break
        case 'downloaded':
          setState({
            status: 'downloaded',
            version: (data as { version?: string })?.version
          })
          break
        case 'error':
          setState({ status: 'error', message: (data as string) ?? 'خطأ' })
          break
      }
    })
    return off
  }, [])

  return state
}
