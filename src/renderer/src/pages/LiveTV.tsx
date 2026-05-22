import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search as SearchIcon, AlertCircle, Tv } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import ChannelCard from '@/components/cards/ChannelCard'
import { useChannels } from '@/features/livetv/useChannels'
import { cn } from '@/lib/cn'
import type { Channel } from '@shared/types'

const ALL_CATEGORIES = '__all__'

function LoadingGrid() {
  return (
    <div className="px-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="bg-ink-700/30 rounded-xl p-3 flex items-center gap-3">
          <Skeleton className="w-14 h-14 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2 mt-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LiveTV() {
  const { t } = useTranslation()
  const { channels, loading, error } = useChannels()
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES)

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const c of channels) set.add(c.category)
    return [ALL_CATEGORIES, ...Array.from(set).sort()]
  }, [channels])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return channels.filter((c) => {
      if (activeCategory !== ALL_CATEGORIES && c.category !== activeCategory) return false
      if (q && !c.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [channels, query, activeCategory])

  const handlePlay = (channel: Channel) => {
    // Player integration arrives in the next step.
    console.log('[livetv] play:', channel.name, channel.streamUrl)
  }

  return (
    <div>
      <PageHeader
        title={t('nav.livetv')}
        subtitle={
          loading ? 'جارٍ تحميل القنوات…' : `${channels.length} قناة متاحة`
        }
      />

      <div className="px-8 mb-4 flex flex-col gap-3">
        <div className="relative max-w-md">
          <SearchIcon className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-ink-300" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن قناة…"
            className="w-full bg-ink-700/40 border border-ink-600/50 rounded-xl ps-10 pe-3 py-2 text-sm placeholder:text-ink-300 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                  activeCategory === cat
                    ? 'bg-brand-500 text-white'
                    : 'bg-ink-700/40 text-ink-200 hover:bg-ink-700/70'
                )}
              >
                {cat === ALL_CATEGORIES ? 'الكل' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-8 mb-4 flex items-center gap-3 p-4 bg-rose-500/10 ring-1 ring-rose-500/30 rounded-xl text-rose-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">فشل تحميل القنوات</p>
            <p className="text-sm text-rose-300/80">{error}</p>
          </div>
        </div>
      )}

      {loading && <LoadingGrid />}

      {!loading && !error && filtered.length === 0 && (
        <div className="px-8 py-16 text-center">
          <Tv className="w-12 h-12 mx-auto text-ink-300 mb-3" />
          <p className="text-ink-200">
            {channels.length === 0
              ? 'لا توجد قنوات متاحة حالياً'
              : 'لا توجد نتائج مطابقة'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="px-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-8">
          {filtered.map((c) => (
            <ChannelCard key={c.id} channel={c} onClick={handlePlay} />
          ))}
        </div>
      )}
    </div>
  )
}
