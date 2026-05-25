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

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to bind local renderer server'))
        return
      }
      // Firebase Auth whitelists `localhost` — use that hostname, not 127.0.0.1.
      resolve({ origin: `http://localhost:${addr.port}`, server })
    })
  })
}
