import { ipcMain, shell } from 'electron'
import { createServer, type Server } from 'node:http'
import { randomBytes, createHash } from 'node:crypto'

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

type AuthTokens = { idToken: string; accessToken: string }

/** Escape untrusted text before inlining it into the callback HTML response. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function startCallbackServer(expectedState: string): Promise<{
  port: number
  waitForCode: () => Promise<string>
  server: Server
}> {
  return new Promise((resolve, reject) => {
    let resolveCode!: (code: string) => void
    let rejectCode!: (err: Error) => void

    const codePromise = new Promise<string>((res, rej) => {
      resolveCode = res
      rejectCode = rej
    })

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')
      const state = url.searchParams.get('state')

      // The browser fires extra requests (favicon, devtools, prefetch) at the
      // same origin. Only the request that carries `code` or `error` is the
      // real OAuth redirect — ignore the rest so we don't reject the flow
      // prematurely or send the success page to a favicon request.
      if (!code && !error) {
        res.writeHead(204)
        res.end()
        return
      }

      // CSRF guard. This server listens on loopback, so any local process or
      // any web page the user has open can hit it with a fabricated `code`.
      // Only a redirect carrying the exact `state` we generated for this run is
      // the real one; anything else is discarded without touching the flow.
      if (state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Invalid state')
        return
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(
        '<html><body dir="rtl" style="font-family:sans-serif;text-align:center;padding:40px">' +
          (code
            ? '<h2>✓ تم تسجيل الدخول بنجاح!</h2><p>يمكنك إغلاق هذه النافذة والعودة إلى Nashat TV.</p>'
            : `<h2>✗ فشل تسجيل الدخول</h2><p>${escapeHtml(error ?? '')}</p>`) +
          '<script>setTimeout(()=>window.close(),2000)</script>' +
          '</body></html>'
      )

      if (code) resolveCode(code)
      else rejectCode(new Error(error ?? 'auth_cancelled'))
    })

    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to bind auth callback server'))
        return
      }
      resolve({ port: (addr as { port: number }).port, waitForCode: () => codePromise, server })
    })
  })
}

export function registerAuthIpc(): void {
  // Credentials are read from the main-process environment and never leave it.
  // They used to be passed in from the renderer, which meant Vite baked the
  // client secret into the renderer bundle where anyone could read it out of
  // app.asar. The renderer has no business knowing them.
  ipcMain.handle('auth:google', async (): Promise<AuthTokens> => {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      throw new Error('auth_not_configured')
    }

    const { verifier, challenge } = generatePKCE()
    const state = randomBytes(16).toString('base64url')
    const { port, waitForCode, server } = await startCallbackServer(state)
    const redirectUri = `http://localhost:${port}`

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      access_type: 'offline',
      prompt: 'select_account'
    })

    await shell.openExternal(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)

    try {
      const code = await Promise.race([
        waitForCode(),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error('auth_timeout')), 5 * 60 * 1000)
        )
      ])

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code_verifier: verifier
        })
      })

      if (!tokenRes.ok) {
        const body = await tokenRes.text()
        let detail = body
        try {
          const parsed = JSON.parse(body) as { error?: string; error_description?: string }
          detail = parsed.error_description ?? parsed.error ?? body
        } catch {
          // body wasn't JSON, use as-is
        }
        throw new Error(`token_exchange_failed: ${detail}`)
      }

      const tokens = (await tokenRes.json()) as { id_token: string; access_token: string }
      return { idToken: tokens.id_token, accessToken: tokens.access_token }
    } finally {
      server.close()
    }
  })
}
