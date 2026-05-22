import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
  type AuthError
} from 'firebase/auth'
import { auth } from '@/services/firebase'

function mapError(err: unknown): Error {
  const e = err as AuthError
  const code = e?.code ?? 'unknown'
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'بريد إلكتروني أو كلمة مرور غير صحيحة',
    'auth/user-not-found': 'المستخدم غير موجود',
    'auth/wrong-password': 'كلمة المرور غير صحيحة',
    'auth/email-already-in-use': 'البريد الإلكتروني مستخدم مسبقاً',
    'auth/weak-password': 'كلمة المرور ضعيفة (6 أحرف على الأقل)',
    'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة',
    'auth/network-request-failed': 'تعذّر الاتصال بالخادم',
    'auth/too-many-requests': 'محاولات كثيرة، حاول لاحقاً'
  }
  return new Error(messages[code] ?? `${code}: ${e?.message ?? 'حدث خطأ'}`)
}

export const authApi = {
  signIn: async (email: string, password: string) => {
    try {
      return await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      throw mapError(err)
    }
  },
  register: async (email: string, password: string, displayName?: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      if (displayName) await updateProfile(cred.user, { displayName })
      return cred
    } catch (err) {
      throw mapError(err)
    }
  },
  signInAnon: async () => {
    try {
      return await signInAnonymously(auth)
    } catch (err) {
      throw mapError(err)
    }
  },
  signOut: () => signOut(auth)
}
