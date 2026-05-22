import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type AuthError
} from 'firebase/auth'
import { auth } from '@/services/firebase'

function mapError(err: unknown): Error {
  const e = err as AuthError
  const code = e?.code ?? 'unknown'
  const messages: Record<string, string> = {
    'auth/popup-closed-by-user': 'تم إغلاق نافذة تسجيل الدخول',
    'auth/popup-blocked': 'تم حجب نافذة تسجيل الدخول',
    'auth/cancelled-popup-request': 'تم إلغاء الطلب',
    'auth/network-request-failed': 'تعذّر الاتصال بالخادم',
    'auth/operation-not-allowed':
      'طريقة تسجيل الدخول غير مفعّلة. فعّل Google في Firebase Console',
    'auth/internal-error': 'حدث خطأ داخلي، حاول مرة أخرى'
  }
  return new Error(messages[code] ?? `${code}: ${e?.message ?? 'حدث خطأ'}`)
}

export class GmailOnlyError extends Error {
  constructor(email: string | null) {
    super(
      email
        ? `يُسمح فقط بحسابات Gmail. حسابك "${email}" غير مدعوم.`
        : 'يُسمح فقط بحسابات Gmail'
    )
    this.name = 'GmailOnlyError'
  }
}

const isGmail = (email: string | null | undefined): boolean =>
  !!email && /@gmail\.com$/i.test(email.trim())

export const authApi = {
  /**
   * Opens a Google sign-in popup. After auth succeeds we verify the address
   * ends with @gmail.com — if it doesn't (e.g. Workspace / non-Google relay
   * service), we sign the user out immediately and surface a clear error so
   * temp-mail / disposable accounts can't slip through Google login.
   */
  signInWithGoogle: async () => {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    try {
      const result = await signInWithPopup(auth, provider)
      const email = result.user.email
      if (!isGmail(email)) {
        await signOut(auth)
        throw new GmailOnlyError(email)
      }
      return result
    } catch (err) {
      if (err instanceof GmailOnlyError) throw err
      throw mapError(err)
    }
  },

  signOut: () => signOut(auth)
}

export { isGmail }
