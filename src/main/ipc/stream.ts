import { ipcMain } from 'electron'
import { extractStream } from '../services/streamExtractor'
import { probeServer } from '../services/serverHealth'

export function registerStreamIpc(): void {
  ipcMain.handle('stream:extract', async (_event, pageUrl: string) => {
    if (typeof pageUrl !== 'string' || !pageUrl.startsWith('http')) {
      throw new Error('Invalid pageUrl')
    }
    return extractStream(pageUrl)
  })

  ipcMain.handle('stream:probe', async (_event, url: string) => {
    if (typeof url !== 'string' || !url.startsWith('http')) {
      throw new Error('Invalid url')
    }
    return probeServer(url)
  })
}
