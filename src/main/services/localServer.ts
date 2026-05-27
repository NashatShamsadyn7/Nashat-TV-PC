import { createServer, type Server } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json'
}

// Stable port candidates. The renderer origin (http://localhost:PORT) is the
// storage key for Firebase auth (indexedDB), search history (localStorage) and
// every other browser store. A random port (listen(0)) changes the origin on
// every launch, wiping login + local history. Binding a FIXED port keeps the
// origin stable across restarts; we try a small ordered list in case one is
// already taken, but always in the same deterministic order.
const PORT_CANDIDATES = [17645, 17646, 17647, 17648, 17649]

function listenOnFirstFree(server: Server, ports: number[]): Promise<number> {
  return new Promise((resolveListen, rejectListen) => {
    const tryPort = (idx: number) => {
      if (idx >= ports.length) {
        rejectListen(new Error('No fixed renderer port available'))
        return
      }
      const onError = (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          server.removeListener('error', onError)
          tryPort(idx + 1)
        } else {
          rejectListen(err)
        }
      }
      server.once('error', onError)
      server.listen(ports[idx], '127.0.0.1', () => {
        server.removeListener('error', onError)
        resolveListen(ports[idx])
      })
    }
    tryPort(0)
  })
}

export async function startLocalRendererServer(rootDir: string): Promise<{
  origin: string
  server: Server
}> {
  const root = resolve(rootDir)

  const server = createServer(async (req, res) => {
    try {
      const rawPath = decodeURIComponent((req.url ?? '/').split('?')[0])
      let relPath = normalize(rawPath).replace(/^[/\\]+/, '')
      if (!relPath || relPath.endsWith('/')) relPath += 'index.html'

      const filePath = join(root, relPath)
      if (!filePath.startsWith(root)) {
        res.writeHead(403).end('Forbidden')
        return
      }

      let target = filePath
      try {
        const s = await stat(target)
        if (s.isDirectory()) target = join(target, 'index.html')
      } catch {
        target = join(root, 'index.html')
      }

      const buf = await readFile(target)
      const ext = extname(target).toLowerCase()
      res.writeHead(200, {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache'
      })
      res.end(buf)
    } catch (err) {
      res.writeHead(500).end(String((err as Error).message))
    }
  })

  const port = await listenOnFirstFree(server, PORT_CANDIDATES)
  // Firebase Auth whitelists `localhost` — use that hostname, not 127.0.0.1.
  return { origin: `http://localhost:${port}`, server }
}
