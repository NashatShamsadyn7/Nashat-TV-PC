// Cross-platform launcher that ensures ELECTRON_RUN_AS_NODE is unset before
// spawning electron-vite. Some IDEs (Cursor, VS Code) set this system-wide,
// which makes Electron behave like a plain Node runtime and breaks the app.

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const mode = process.argv[2] ?? 'dev'
const valid = ['dev', 'build', 'preview']
if (!valid.includes(mode)) {
  console.error(`Unknown mode "${mode}". Expected one of: ${valid.join(', ')}`)
  process.exit(1)
}

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const isWin = process.platform === 'win32'
const cmd = isWin ? 'electron-vite.cmd' : 'electron-vite'
const bin = resolve(projectRoot, 'node_modules', '.bin', cmd)
const quotedBin = isWin ? `"${bin}"` : bin

const child = spawn(quotedBin, [mode], {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
  shell: isWin,
  windowsVerbatimArguments: false
})

child.on('exit', (code) => process.exit(code ?? 0))
child.on('error', (err) => {
  console.error('Failed to launch electron-vite:', err)
  process.exit(1)
})
