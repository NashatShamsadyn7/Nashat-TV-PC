import { autoUpdater } from 'electron-updater'
import { app, ipcMain, BrowserWindow } from 'electron'
import log from 'electron-log'

autoUpdater.logger = log
log.transports.file.level = 'info'

let mainWin: BrowserWindow | null = null
let checkTimer: NodeJS.Timeout | null = null

function emit(event: string, data?: unknown) {
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send('updater:event', event, data)
  }
}

export function initAutoUpdater(win: BrowserWindow): void {
  mainWin = win
  if (!app.isPackaged) {
    log.info('[updater] skipped in dev')
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => emit('checking'))
  autoUpdater.on('update-available', (info) => emit('available', info))
  autoUpdater.on('update-not-available', () => emit('not-available'))
  autoUpdater.on('download-progress', (p) =>
    emit('progress', {
      percent: p.percent,
      bytesPerSecond: p.bytesPerSecond,
      transferred: p.transferred,
      total: p.total
    })
  )
  autoUpdater.on('update-downloaded', (info) => emit('downloaded', info))
  autoUpdater.on('error', (err) => emit('error', err.message))

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // Initial check + every hour
  autoUpdater.checkForUpdatesAndNotify().catch((err) => log.error('[updater] init', err))
  checkTimer = setInterval(
    () => {
      autoUpdater.checkForUpdates().catch((err) => log.error('[updater] periodic', err))
    },
    60 * 60 * 1000
  )

  // The hourly timer keeps an event-loop handle alive and fires against a
  // destroyed window after the user closes the app. Tear it down explicitly.
  win.on('closed', stopAutoUpdater)
  app.once('before-quit', stopAutoUpdater)
}

export function stopAutoUpdater(): void {
  if (checkTimer) {
    clearInterval(checkTimer)
    checkTimer = null
  }
  mainWin = null
}
