import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth'
import { auth } from '@/services/firebase'
import i18n from '@/i18n'

/**
 * Maps a raw error from the main-process OAuth flow (or Firebase) onto a
 * translated, user-facing message. The `code` is preserved on the returned
 * error so callers can branch on it without string-matching prose.
 */
export class AuthError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

function mapError(err: unknown): AuthError {
  const msg = (err as Error)?.message ?? String(err)
  const t = i18n.t.bind(i18n)

  if (msg.includes('auth_cancelled') || msg.includes('access_denied')) {
    return new AuthError('cancelled', t('auth.cancelled'))
  }
  if (msg.includes('auth_timeout')) {
    return new AuthError('timeout', t('auth.timeout'))
  }
  if (msg.includes('auth_not_configured')) {
    return new AuthError('not_configured', t('auth.notConfigured'))
  }
  if (msg.includes('token_exchange_failed')) {
    const detail = msg.split('token_exchange_failed:')[1]?.trim()
    const lower = detail?.toLowerCase() ?? ''
    if (lower.includes('invalid_grant')) {
      return new AuthError('expired_grant', t('auth.expiredGrant'))
    }
    if (lower.includes('client secret')) {
      return new AuthError('invalid_secret', t('auth.invalidSecret'))
    }
    return new AuthError(
      'verify_failed',
      t('auth.verifyFailed', { detail: detail ?? t('common.retry') })
    )
  }
  return new AuthError('generic', t('auth.genericError', { message: msg }))
}

export const authApi = {
  signInWithGoogle: async () => {
    // The OAuth client id/secret live in the main process only — the renderer
    // never sees them, so there is nothing to validate here. A missing config
    // surfaces as the `auth_not_configured` error mapped above.
    let idToken: string
    let accessToken: string
    try {
      const result = await window.nashat.googleSignIn()
      idToken = result.idToken
      accessToken = result.accessToken
    } catch (err) {
      throw mapError(err)
    }

    try {
      const credential = GoogleAuthProvider.credential(idToken, accessToken)
      // Any Google-federated account is accepted. Sign-in used to be rejected
      // unless the address ended in @gmail.com, which locked out Google
      // Workspace, iCloud-linked and every other federated account — the single
      // largest barrier to using this app outside its original audience.
      // Nothing else in the app or in database.rules.json keyed off that check.
      return await signInWithCredential(auth, credential)
    } catch (err) {
      throw mapError(err)
    }
  },

  signOut: () => signOut(auth)
}
