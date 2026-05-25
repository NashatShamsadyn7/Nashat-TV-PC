import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin, loadEnv } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    define: {
      'process.env.TMDB_V3_KEY': JSON.stringify(env.TMDB_V3_KEY ?? ''),
      'process.env.TMDB_V4_TOKEN': JSON.stringify(env.TMDB_V4_TOKEN ?? ''),
      'process.env.GOOGLE_OAUTH_CLIENT_ID': JSON.stringify(env.GOOGLE_OAUTH_CLIENT_ID ?? ''),
      'process.env.GOOGLE_OAUTH_CLIENT_SECRET': JSON.stringify(env.GOOGLE_OAUTH_CLIENT_SECRET ?? '')
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
