import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck
} from 'firebase/app-check'

// In dev we use the debug provider so App Check doesn't block us.
// Production requires either a reCAPTCHA Enterprise key bound to a domain
// (impractical for Electron) or a custom provider. We'll address that later.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined
}

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string
}

function assertConfig() {
  const missing = Object.entries(config)
    .filter(([, v]) => !v)
    .map(([k]) => k)
  if (missing.length > 0) {
    throw new Error(
      `Firebase config missing: ${missing.join(', ')}. Check .env file.`
    )
  }
}

assertConfig()

export const firebaseApp: FirebaseApp = initializeApp(config)
export const auth: Auth = getAuth(firebaseApp)
export const db: Database = getDatabase(firebaseApp)

// App Check — debug-only for now. The production strategy will use a
// custom provider invoked from the main process.
let appCheck: AppCheck | null = null
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true
  try {
    appCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider('debug-placeholder-site-key'),
      isTokenAutoRefreshEnabled: true
    })
  } catch (err) {
    console.warn('[firebase] App Check init skipped in dev:', err)
  }
}

export { appCheck }
