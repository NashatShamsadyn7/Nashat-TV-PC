import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClock, ChevronDown } from 'lucide-react'
import { useEpgNowNext } from './useEpgNowNext'
import { formatTime } from '@/i18n/format'
import { cn } from '@/lib/cn'

type Props = {
  channelKey: string | null
  /** Compact mode omits the expandable full schedule. */
  compact?: boolean
}

/**
 * Now/next programme strip for a live channel, with an expandable full
 * schedule. Renders nothing when the channel has no EPG data, so channels
 * without a guide look exactly as they did before.
 */
export default function EpgStrip({ channelKey, compact = false }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { now, next, progress, entries, hasData } = useEpgNowNext(channelKey)

  if (!hasData || !now) return null

  return (
    <div className="text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <CalendarClock className="w-3.5 h-3.5 text-brand-400 shrink-0" />
        <span className="text-ink-100 font-medium truncate">{now.title}</span>
        <span className="text-ink-400 shrink-0 tabular-nums">
          {formatTime(now.start)} – {formatTime(now.end)}
        </span>
        {!compact && entries.length > 1 && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="ms-auto shrink-0 flex items-center gap-1 text-ink-300 hover:text-white"
          >
            {t('epg.schedule')}
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>

      {progress !== null && (
        <div className="mt-1.5 h-1 rounded-full bg-ink-700/70 overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-[width] duration-1000"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      {next && (
        <p className="mt-1 text-ink-400 truncate">
          {t('epg.upNext')} <span className="text-ink-200">{next.title}</span>{' '}
          <span className="tabular-nums">{formatTime(next.start)}</span>
        </p>
      )}

      {open && !compact && (
        <ul className="mt-2 max-h-56 overflow-y-auto space-y-0.5 pe-1">
          {entries.map((e) => {
            const isNow = e.id === now.id
            return (
              <li
                key={e.id}
                className={cn(
                  'flex items-start gap-2 rounded-lg px-2 py-1.5',
                  isNow ? 'bg-brand-500/20 text-white' : 'text-ink-300 hover:bg-ink-700/40'
                )}
              >
                <span className="tabular-nums shrink-0 w-11">{formatTime(e.start)}</span>
                <span className="min-w-0 flex-1 truncate">{e.title}</span>
                {isNow && (
                  <span className="shrink-0 text-[10px] font-bold text-brand-300">
                    {t('epg.onNow')}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
