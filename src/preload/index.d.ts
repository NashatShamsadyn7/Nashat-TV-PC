import type { NashatApi } from './index'

declare global {
  interface Window {
    nashat: NashatApi
  }
}

export {}
