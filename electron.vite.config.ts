import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin, loadEnv } from 'electron-vite'
import react from '@vitejs/plugin-react'

/**
 * Secrets that are inlined at build time, mapped to what breaks without them.
 *
 * These are `define`d as literals below, which means an empty value does not
 * merely produce an empty string at runtime — Vite folds the constant and
 * Rollup then eliminates the branch as dead code. A build with an empty
 * TMDB_V4_TOKEN ships a `fetchTmdb` whose entire body is `throw new Error(...)`:
 * home, movies, series, actors and search are all guaranteed to fail, and
 * nothing about the build output says so. That is exactly how v1.5.0 was
 * published broken.
 *
 * So a production build refuses to run with any of these missing. Set
 * ALLOW_INCOMPLETE_BUILD=1 to override deliberately (e.g. a smoke-test build).
 */
const BUILD_SECRETS: Record<string, string> = {
  // TMDB_V3_KEY is intentionally absent: it is still defined and written by CI,
  // but no source file reads it — src/main/ipc/tmdb.ts authenticates with the
  // v4 bearer token alone. Requiring it here would block builds over a value
  // nothing uses.
  TMDB_V4_TOKEN: 'TMDB browsing — home, movies, series, actors, search, details',
  GOOGLE_CLIENT_ID: 'Google sign-in',
  GOOGLE_CLIENT_SECRET: 'Google sign-in',
  VITE_FIREBASE_API_KEY: 'Firebase — live TV, profiles, cloud sync',
  VITE_FIREBASE_AUTH_DOMAIN: 'Firebase — live TV, profiles, cloud sync',
  VITE_FIREBASE_DATABASE_URL: 'Firebase — live TV, profiles, cloud sync',
  VITE_FIREBASE_PROJECT_ID: 'Firebase — live TV, profiles, cloud sync',
  VITE_FIREBASE_APP_ID: 'Firebase — live TV, profiles, cloud sync',
  VITE_GIPHY_API_KEY: 'Watch Together — GIF picker',
  VITE_IMGBB_API_KEY: 'Watch Together — image upload'
}

function assertBuildSecrets(env: Record<string, string>, mode: string): void {
  // Dev is allowed to run partially configured — you should be able to work on
  // Live TV without a TMDB token. Only a production build ships to users.
  if (mode !== 'production' || env.ALLOW_INCOMPLETE_BUILD === '1') return

  const missing = Object.keys(BUILD_SECRETS).filter((k) => !env[k]?.trim())
  if (missing.length === 0) return

  throw new Error(
    [
      '',
      `Refusing to build: ${missing.length} required value(s) missing from .env.`,
      'Each one is inlined at build time, so an empty value silently ships the',
      'dependent feature as dead code rather than failing loudly at runtime.',
      '',
      ...missing.map((k) => `  - ${k}  ->  ${BUILD_SECRETS[k]}`),
      '',
      'Fill them in .env (see .env.example), or set ALLOW_INCOMPLETE_BUILD=1 to',
      'build a knowingly partial bundle that must not be released.',
      ''
    ].join('\n')
  )
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  assertBuildSecrets(env, mode)
  return {
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    // Main-process secrets are inlined here at build time. They are NOT
    // prefixed with VITE_, so Vite never exposes them to the renderer bundle.
    // The previous GOOGLE_OAUTH_* names matched nothing in the codebase — the
    // OAuth credentials were being read from the renderer instead.
    define: {
      'process.env.TMDB_V3_KEY': JSON.stringify(env.TMDB_V3_KEY ?? ''),
      'process.env.TMDB_V4_TOKEN': JSON.stringify(env.TMDB_V4_TOKEN ?? ''),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID ?? ''),
      'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(env.GOOGLE_CLIENT_SECRET ?? '')
    },
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: { index: resolve('src/main/index.ts') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: { index: resolve('src/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    base: '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: { index: resolve('src/renderer/index.html') }
      }
    },
    server: {
      port: 5173,
      strictPort: true
    }
  }
  }
})
