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

// Persist the auth session across app restarts and Windows lock/unlock cycles.
// Without this, Electron may fall back to in-memory persistence and force the
// user to sign in again after the OS suspends/resumes the process.
setPersistence(auth, indexedDBLocalPersistence).catch(() => {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('[firebase] could not set persistent auth storage:', err)
  })
})

// App Check intentionally disabled — the dev placeholder reCAPTCHA key was
// triggering auth/internal-error on signInWithPopup. A real App Check provider
// will be wired in from the main process later.
export const appCheck = null
