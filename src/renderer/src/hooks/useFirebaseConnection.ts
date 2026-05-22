import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '@/services/firebase'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

/** Subscribes to Firebase RTDB's special `.info/connected` node. */
export function useFirebaseConnection(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')

  useEffect(() => {
    const connectedRef = ref(db, '.info/connected')
    const unsub = onValue(connectedRef, (snap) => {
      setStatus(snap.val() === true ? 'connected' : 'disconnected')
    })
    return () => unsub()
  }, [])

  return status
}
