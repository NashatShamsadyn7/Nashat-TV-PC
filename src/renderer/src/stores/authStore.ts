import { create } from 'zustand'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/services/firebase'

type AuthState = {
  user: User | null
  loading: boolean
}

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  loading: true
}))

onAuthStateChanged(auth, (user) => {
  useAuthStore.setState({ user, loading: false })
  if (user) {
    // Lazy import to avoid a circular dep through services/firebase.
    void import('@/features/friends/useFriends').then(({ ensureProfile }) =>
      ensureProfile().catch((err) => console.warn('[auth] ensureProfile failed:', err))
    )
  }
})
