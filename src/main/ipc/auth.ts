import { ipcMain, shell } from 'electron'
import { createServer, type Server } from 'node:http'
import { randomBytes, createHash } from 'node:crypto'

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

type AuthTokens = { idToken: string; accessToken: string }

function startCallbackServer(): Promise<{
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

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(
        '<html><body dir="rtl" style="font-family:sans-serif;text-align:center;padding:40px">' +
          '<h2>✓ تم تسجيل الدخول بنجاح!</h2>' +
          '<p>يمكنك إغلاق هذه النافذة والعودة إلى Nashat TV.</p>' +
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
  ipcMain.handle('auth:google', async (_e, clientId: string, clientSecret: string): Promise<AuthTokens> => {
    const { verifier, challenge } = generatePKCE()
    const { port, waitForCode, server } = await startCallbackServer()
    const redirectUri = `http://localhost:${port}`

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      code_challenge: challenge,
      code_challenge_method: 'S256',
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
        throw new Error(`token_exchange_failed: ${body}`)
      }

      const tokens = (await tokenRes.json()) as { id_token: string; access_token: string }
      return { idToken: tokens.id_token, accessToken: tokens.access_token }
    } finally {
      server.close()
    }
  })
}
