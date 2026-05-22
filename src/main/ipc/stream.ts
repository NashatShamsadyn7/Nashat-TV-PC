import { ipcMain } from 'electron'
import { extractStream } from '../services/streamExtractor'

export function registerStreamIpc(): void {
  ipcMain.handle('stream:extract', async (_event, pageUrl: string) => {
    if (typeof pageUrl !== 'string' || !pageUrl.startsWith('http')) {
      throw new Error('Invalid pageUrl')
    }
    return extractStream(pageUrl)
  })
}
