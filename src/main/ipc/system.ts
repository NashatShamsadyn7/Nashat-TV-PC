import { ipcMain, Tray, Menu, app, BrowserWindow, nativeImage, globalShortcut } from 'electron'

let tray: Tray | null = null

export function registerSystemIpc(getMainWindow: () => BrowserWindow | null) {
  // Tray
  ipcMain.handle('system:show-tray', () => {
    if (tray) return
    const icon = nativeImage.createEmpty()
    tray = new Tray(icon)
    tray.setToolTip('Nashat TV')
    rebuildMenu(getMainWindow)
    tray.on('click', () => {
      const win = getMainWindow()
      if (!win) return
      if (win.isVisible()) win.hide()
      else win.show()
    })
  })

  ipcMain.handle('system:set-presence', (_e, payload: { title?: string; status?: 'playing' | 'paused' | 'idle' }) => {
    if (!tray) return
    if (payload.title) tray.setToolTip(`Nashat TV — ${payload.title}`)
    rebuildMenu(getMainWindow, payload)
  })

  ipcMain.handle('system:flash-frame', () => {
    const win = getMainWindow()
    win?.flashFrame(true)
  })
}

function rebuildMenu(
  getMainWindow: () => BrowserWindow | null,
  presence?: { title?: string; status?: 'playing' | 'paused' | 'idle' }
) {
  if (!tray) return
  const items: Electron.MenuItemConstructorOptions[] = []
  if (presence?.title) {
    items.push({ label: presence.title, enabled: false })
    items.push({ type: 'separator' })
  }
  items.push(
    { label: 'إظهار', click: () => getMainWindow()?.show() },
    { label: 'إخفاء', click: () => getMainWindow()?.hide() },
    { type: 'separator' },
    { label: 'خروج', click: () => app.quit() }
  )
  tray.setContextMenu(Menu.buildFromTemplate(items))
}

export function registerMediaKeys(getMainWindow: () => BrowserWindow | null) {
  // Forward media keys to renderer via IPC
  const send = (action: 'play-pause' | 'next' | 'previous' | 'stop') => {
    const win = getMainWindow()
    if (!win || win.isDestroyed()) return
    win.webContents.send('media-key', action)
  }

  const acc: Array<[string, () => void]> = [
    ['MediaPlayPause', () => send('play-pause')],
    ['MediaNextTrack', () => send('next')],
    ['MediaPreviousTrack', () => send('previous')],
    ['MediaStop', () => send('stop')]
  ]

  app.whenReady().then(() => {
    for (const [key, fn] of acc) {
      try {
        globalShortcut.register(key, fn)
      } catch {
        /* not all platforms support every key */
      }
    }
  })

  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })
}
