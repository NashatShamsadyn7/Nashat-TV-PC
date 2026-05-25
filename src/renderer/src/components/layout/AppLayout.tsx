import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import PlayerModal from '@/components/player/PlayerModal'
import MoviePlayerModal from '@/components/player/MoviePlayerModal'
import ShortcutHelp from '@/components/ui/ShortcutHelp'
import { usePlayerStore } from '@/stores/playerStore'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { useSettingsStore } from '@/stores/settingsStore'
import { useGamepad } from '@/hooks/useGamepad'
import { applyTheme, type ThemeId } from '@/features/themes'
import { useStatsStore } from '@/stores/statsStore'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const playerSource = usePlayerStore((s) => s.source)
  const tmdbSource = usePlayerStore((s) => s.tmdbSource)
  const closePlayer = usePlayerStore((s) => s.close)
  const reduceMotion = useSettingsStore((s) => s.reduceMotion)
  const theme = useSettingsStore((s) => s.theme as ThemeId)

  const [helpOpen, setHelpOpen] = useState(false)
  useGlobalShortcuts({
    onHelp: () => setHelpOpen(true),
    onSearch: () => navigate('/search')
  })
  useGamepad()

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Init system tray (best-effort — fails silently if API missing)
  useEffect(() => {
    window.nashat.showTray?.().catch(() => {})
  }, [])

  // Bridge media keys → player controls + presence
  useEffect(() => {
    const off = window.nashat.onMediaKey?.((action) => {
      const ev = new KeyboardEvent('keydown', {
        key: action === 'play-pause' ? ' ' : action === 'next' ? 'ArrowRight' : 'ArrowLeft'
      })
      window.dispatchEvent(ev)
    })
    return off
  }, [])

  // Record play sessions in stats whenever a player opens
  useEffect(() => {
    if (tmdbSource) {
      useStatsStore
        .getState()
        .recordPlay({
          id: `${tmdbSource.kind}:${tmdbSource.tmdbId}`,
          kind: tmdbSource.kind,
          title: tmdbSource.title
        })
      window.nashat.setPresence?.({ title: tmdbSource.title, status: 'playing' }).catch(() => {})
    }
  }, [tmdbSource])
  useEffect(() => {
    if (playerSource) {
      useStatsStore
        .getState()
        .recordPlay({ id: `channel:${playerSource.title}`, kind: 'channel', title: playerSource.title })
      window.nashat.setPresence?.({ title: playerSource.title, status: 'playing' }).catch(() => {})
    }
  }, [playerSource])

  return (
    <div className="flex h-screen overflow-hidden bg-ink-900 text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
              className="min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <PlayerModal source={playerSource} onClose={closePlayer} />
      <MoviePlayerModal source={tmdbSource} onClose={closePlayer} />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
