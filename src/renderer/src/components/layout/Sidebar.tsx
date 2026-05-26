import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Home,
  Tv,
  Film,
  MonitorPlay,
  Users,
  Search,
  Library,
  Settings,
  LayoutGrid,
  BarChart3,
  PartyPopper,
  UserPlus,
  MessageCircle,
  type LucideIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { useProfilesStore } from '@/stores/profilesStore'

type NavEntry = {
  to: string
  icon: LucideIcon
  labelKey: string
}

const NAV: NavEntry[] = [
  { to: '/', icon: Home, labelKey: 'nav.home' },
  { to: '/live', icon: Tv, labelKey: 'nav.livetv' },
  { to: '/live/multi', icon: LayoutGrid, labelKey: 'nav.multilive' },
  { to: '/movies', icon: Film, labelKey: 'nav.movies' },
  { to: '/series', icon: MonitorPlay, labelKey: 'nav.series' },
  { to: '/actors', icon: Users, labelKey: 'nav.actors' },
  { to: '/search', icon: Search, labelKey: 'nav.search' },
  { to: '/library', icon: Library, labelKey: 'nav.library' },
  { to: '/stats', icon: BarChart3, labelKey: 'nav.stats' },
  { to: '/together', icon: PartyPopper, labelKey: 'nav.together' },
  { to: '/friends', icon: UserPlus, labelKey: 'nav.friends' },
  { to: '/chats', icon: MessageCircle, labelKey: 'nav.chats' }
]

export default function Sidebar() {
  const { t } = useTranslation()
  const profiles = useProfilesStore((s) => s.profiles)
  const activeId = useProfilesStore((s) => s.activeId)
  const active = profiles.find((p) => p.id === activeId)

  return (
    <aside className="w-60 shrink-0 h-full bg-ink-900/80 backdrop-blur-md border-e border-ink-700/50 flex flex-col">
      <div className="px-6 py-5">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
          {t('app.name')}
        </h1>
        <p className="text-xs text-ink-300 mt-1">{t('app.tagline')}</p>
      </div>
      {active && (
        <NavLink
          to="/profiles"
          className="mx-3 mb-3 flex items-center gap-3 px-3 py-2 rounded-xl bg-ink-700/30 hover:bg-ink-700/60 transition-colors"
        >
          <span className="text-xl">{active.avatar}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-300">Profile</p>
            <p className="text-sm font-semibold truncate">{active.name}</p>
          </div>
        </NavLink>
      )}

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'text-white bg-ink-700/60'
                  : 'text-ink-200 hover:text-white hover:bg-ink-700/30'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-y-2 start-0 w-1 rounded-full bg-brand-500"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className="w-5 h-5 shrink-0" />
                <span>{t(labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          cn(
            'mx-3 mb-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
            isActive
              ? 'text-white bg-ink-700/60'
              : 'text-ink-200 hover:text-white hover:bg-ink-700/30'
          )
        }
      >
        <Settings className="w-5 h-5" />
        <span>{t('nav.settings')}</span>
      </NavLink>
    </aside>
  )
}
