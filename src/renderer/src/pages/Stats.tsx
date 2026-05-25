import { useMemo } from 'react'
import { Clock, Tv, Film, BarChart3, Trash2, Flame } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { useStatsStore, fmtHours } from '@/stores/statsStore'

function last14Days(): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export default function Stats() {
  const daily = useStatsStore((s) => s.daily)
  const byMedia = useStatsStore((s) => s.byMedia)
  const totalSeconds = useStatsStore((s) => s.totalSeconds)
  const totalSessions = useStatsStore((s) => s.totalSessions)
  const reset = useStatsStore((s) => s.reset)

  const days = last14Days()
  const maxSec = useMemo(
    () => Math.max(60, ...days.map((d) => daily[d]?.seconds ?? 0)),
    [days, daily]
  )

  const topMedia = useMemo(
    () =>
      Object.values(byMedia)
        .sort((a, b) => b.seconds - a.seconds || b.count - a.count)
        .slice(0, 12),
    [byMedia]
  )

  const channelCount = Object.values(byMedia).filter((m) => m.kind === 'channel').length
  const movieCount = Object.values(byMedia).filter((m) => m.kind === 'movie').length
  const tvCount = Object.values(byMedia).filter((m) => m.kind === 'tv').length

  return (
    <div>
      <PageHeader title="إحصائيّاتي" subtitle="نظرة شاملة على عاداتك في المشاهدة" />
      <div className="px-8 pb-10 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={Clock} label="إجمالي المشاهدة" value={fmtHours(totalSeconds)} tone="brand" />
          <Stat icon={Flame} label="جلسات" value={String(totalSessions)} tone="orange" />
          <Stat icon={Tv} label="قنوات مختلفة" value={String(channelCount)} tone="emerald" />
          <Stat icon={Film} label="أفلام/مسلسلات" value={String(movieCount + tvCount)} tone="sky" />
        </div>

        <section className="bg-ink-700/30 rounded-2xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-400" />
            آخر 14 يوم
          </h2>
          <div className="flex items-end gap-2 h-40">
            {days.map((d) => {
              const sec = daily[d]?.seconds ?? 0
              const h = (sec / maxSec) * 100
              const isToday = d === days[days.length - 1]
              return (
                <div key={d} className="flex-1 flex flex-col items-center gap-1" title={`${d}: ${fmtHours(sec)}`}>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isToday ? 'bg-brand-400' : 'bg-brand-500/60'
                    }`}
                    style={{ height: `${Math.max(2, h)}%` }}
                  />
                  <span className="text-[10px] text-ink-300">{d.slice(8)}</span>
                </div>
              )
            })}
          </div>
        </section>

        <section className="bg-ink-700/30 rounded-2xl p-6">
          <h2 className="font-semibold mb-4">الأكثر مشاهدة</h2>
          {topMedia.length === 0 ? (
            <p className="text-ink-300 text-sm">لا توجد بيانات بعد — ابدأ بالمشاهدة</p>
          ) : (
            <ol className="space-y-2">
              {topMedia.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-ink-700/40">
                  <span className="w-6 text-center text-sm font-bold text-brand-400">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className="text-xs text-ink-300">
                      {m.count} مرّة · {fmtHours(m.seconds)} ·{' '}
                      <span className="opacity-70">
                        {m.kind === 'channel' ? 'قناة' : m.kind === 'movie' ? 'فيلم' : 'مسلسل'}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <button
          onClick={() => {
            if (confirm('حذف كل الإحصائيات؟')) reset()
          }}
          className="flex items-center gap-2 text-sm text-rose-400 hover:text-rose-300"
        >
          <Trash2 className="w-4 h-4" /> مسح الإحصائيات
        </button>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof Clock
  label: string
  value: string
  tone: 'brand' | 'orange' | 'emerald' | 'sky'
}) {
  const colors = {
    brand: 'text-brand-400 bg-brand-500/10 ring-brand-500/30',
    orange: 'text-orange-400 bg-orange-500/10 ring-orange-500/30',
    emerald: 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/30',
    sky: 'text-sky-400 bg-sky-500/10 ring-sky-500/30'
  }
  return (
    <div className={`rounded-2xl p-5 ring-1 ${colors[tone]}`}>
      <Icon className="w-6 h-6 mb-2" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-ink-300 mt-1">{label}</p>
    </div>
  )
}
