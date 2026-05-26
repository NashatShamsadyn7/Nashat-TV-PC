import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/services/firebase'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

/** Subscribes to Firebase RTDB's special `.info/connected` node. */
export function useFirebaseConnection(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')

  useEffect(() => {
    const connectedRef = ref(db, '.info/connected')
    console.log('[rtdb] subscribing to .info/connected, db url:', db.app.options.databaseURL)
    const unsub = onValue(
      connectedRef,
      (snap) => {
        const value = snap.val()
        console.log('[rtdb] connection state ->', value)
        setStatus(value === true ? 'connected' : 'disconnected')
      },
      (err) => {
        console.error('[rtdb] connection subscription error:', err)
        setStatus('disconnected')
      }
    )
    return () => unsub()
  }, [])

  return status
}
