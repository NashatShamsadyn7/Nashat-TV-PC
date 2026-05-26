import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth'
import { auth } from '@/services/firebase'

function mapError(err: unknown): Error {
  const msg = (err as Error)?.message ?? String(err)
  if (msg.includes('auth_cancelled') || msg.includes('access_denied')) {
    return new Error('تم إلغاء تسجيل الدخول')
  }
  if (msg.includes('auth_timeout')) {
    return new Error('انتهت مهلة تسجيل الدخول، حاول مرة أخرى')
  }
  if (msg.includes('token_exchange_failed')) {
    const detail = msg.split('token_exchange_failed:')[1]?.trim()
    if (detail?.toLowerCase().includes('invalid_grant')) {
      return new Error('انتهت صلاحية رمز Google، أعد المحاولة من البداية')
    }
    if (detail?.toLowerCase().includes('client secret')) {
      return new Error('VITE_GOOGLE_CLIENT_SECRET في .env غير صحيح. حدّثه من Google Cloud Console.')
    }
    return new Error(`فشل التحقق من Google: ${detail ?? 'حاول مرة أخرى'}`)
  }
  if (msg.includes('VITE_GOOGLE_CLIENT_ID')) {
    return new Error('يجب ضبط VITE_GOOGLE_CLIENT_ID في ملف .env')
  }
  return new Error(`حدث خطأ: ${msg}`)
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
  signInWithGoogle: async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string | undefined
    if (!clientId || !clientSecret) {
      throw new Error('VITE_GOOGLE_CLIENT_ID أو VITE_GOOGLE_CLIENT_SECRET غير مضبوط في .env')
    }

    let idToken: string
    let accessToken: string
    try {
      const result = await window.nashat.googleSignIn(clientId, clientSecret)
      idToken = result.idToken
      accessToken = result.accessToken
    } catch (err) {
      throw mapError(err)
    }

    try {
      const credential = GoogleAuthProvider.credential(idToken, accessToken)
      const result = await signInWithCredential(auth, credential)

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
