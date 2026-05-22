import { cn } from '@/lib/cn'

type Tone = 'success' | 'warning' | 'error' | 'info'

const TONES: Record<Tone, string> = {
  success: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  error: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  info: 'bg-sky-500/15 text-sky-300 ring-sky-500/30'
}

export default function StatusBadge({
  tone,
  children
}: {
  tone: Tone
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ring-1',
        TONES[tone]
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          tone === 'success' && 'bg-emerald-400 animate-pulse',
          tone === 'warning' && 'bg-amber-400',
          tone === 'error' && 'bg-rose-400',
          tone === 'info' && 'bg-sky-400'
        )}
      />
      {children}
    </span>
  )
}
