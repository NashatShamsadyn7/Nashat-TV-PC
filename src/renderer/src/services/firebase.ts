import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  setPersistence,
  type Auth
} from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string
}

// Compute which config keys are missing WITHOUT throwing at module-load time.
// Throwing here (during import evaluation, before React mounts) leaves the
// #root element empty and produces a silent black screen that even the React
// ErrorBoundary cannot catch. Instead we export the error so the UI can show a
// readable message, and we still initialize Firebase so all existing exports
// (auth, db, firebaseApp) keep their types and importers don't break.
const missingConfigKeys = Object.entries(config)
  .filter(([, v]) => !v)
  .map(([k]) => k)

export const firebaseConfigError: string | null =
  missingConfigKeys.length > 0
    ? `Firebase config missing: ${missingConfigKeys.join(', ')}. Check .env file.`
    : null

if (firebaseConfigError) {
  // Surface the problem in logs/DevTools but do NOT crash the renderer.
  console.error('[firebase]', firebaseConfigError)
}

// initializeApp tolerates empty string values and does not throw synchronously,
// so calling it unconditionally keeps `auth`/`db` non-null for importers. Any
// real network/auth failure caused by bad config is handled at call sites (and
// surfaced to the user via firebaseConfigError before they get there).
export const firebaseApp: FirebaseApp = initializeApp(config)
export const auth: Auth = getAuth(firebaseApp)

// getDatabase throws synchronously when databaseURL is empty/invalid. Guard it
// so a missing config never crashes module evaluation (which would black-screen
// the whole app). When the URL is missing we already show firebaseConfigError,
// so db here is only touched by feature hooks that won't run in that state.
function initDatabase(): Database {
  try {
    return getDatabase(firebaseApp)
  } catch (err) {
    console.error('[firebase] could not initialize Realtime Database:', err)
    // Return a lazy proxy so importing `db` never throws; any real access while
    // config is broken will throw a clear error instead of a silent black screen.
    return new Proxy({} as Database, {
      get() {
        throw new Error(
          firebaseConfigError ??
            'Firebase Realtime Database is not initialized (invalid config).'
        )
      }
    })
  }
}

export const db: Database = initDatabase()

// Persist the auth session across app restarts and Windows lock/unlock cycles.
// Without this, Electron may fall back to in-memory persistence and force the
// user to sign in again after the OS suspends/resumes the process.
if (!firebaseConfigError) {
  setPersistence(auth, indexedDBLocalPersistence).catch(() => {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('[firebase] could not set persistent auth storage:', err)
    })
  })
}

// App Check intentionally disabled — the dev placeholder reCAPTCHA key was
// triggering auth/internal-error on signInWithPopup. A real App Check provider
// will be wired in from the main process later.
export const appCheck = null
