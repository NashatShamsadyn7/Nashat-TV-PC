import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Heart, History, Bookmark, Play, Trash2 } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { useLibraryStore, libraryActions } from '@/stores/libraryStore'
import { usePlayerStore } from '@/stores/playerStore'
import { cn } from '@/lib/cn'

type Tab = 'watchlist' | 'favorites' | 'progress'

const TABS: { id: Tab; label: string; icon: typeof Heart }[] = [
  { id: 'watchlist', label: 'قائمتي', icon: Bookmark },
  { id: 'favorites', label: 'المفضّلة', icon: Heart },
  { id: 'progress', label: 'تابع المشاهدة', icon: History }
]

export default function Library() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('watchlist')
  const watchlist = useLibraryStore((s) => s.watchlist)
  const favorites = useLibraryStore((s) => s.favorites)
  const progress = useLibraryStore((s) => s.progress)
  const openTmdb = usePlayerStore((s) => s.openTmdb)

  const counts = { watchlist: watchlist.length, favorites: favorites.length, progress: progress.length }

  return (
    <div>
      <PageHeader title={t('nav.library')} subtitle="قائمتك، مفضّلتك، وما تتابع مشاهدته" />

      <div className="px-8 mb-6 flex gap-2 flex-wrap">
        {TABS.map((tt) => (
          <button
            key={tt.id}
            onClick={() => setTab(tt.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
              tab === tt.id
                ? 'bg-brand-500 text-white'
                : 'bg-ink-700/40 text-ink-200 hover:bg-ink-700/70'
            )}
          >
            <tt.icon className="w-4 h-4" />
            {tt.label}
            <span className="text-xs opacity-70 bg-black/20 rounded-full px-2">{counts[tt.id]}</span>
          </button>
        ))}
      </div>

      <div className="px-8 pb-10">
        {tab === 'watchlist' && (
          <Grid>
            {watchlist.length === 0 ? (
              <Empty icon={Bookmark} text="قائمتك فارغة — أضف من الأفلام والمسلسلات" />
            ) : (
              watchlist.map((it) => (
                <Tile
                  key={it.id}
                  title={it.title}
                  poster={it.poster}
                  year={it.year}
                  onPlay={() => {
                    if (it.kind === 'movie' && it.tmdbId)
                      openTmdb({ kind: 'movie', tmdbId: it.tmdbId, title: it.title, backdrop: it.backdrop })
                    else if (it.kind === 'tv' && it.tmdbId)
                      openTmdb({
                        kind: 'tv',
                        tmdbId: it.tmdbId,
                        title: it.title,
                        season: 1,
                        episode: 1,
                        backdrop: it.backdrop
                      })
                  }}
                  onRemove={() => libraryActions.toggleWatchlist(it)}
                />
              ))
            )}
          </Grid>
        )}
        {tab === 'favorites' && (
          <Grid>
            {favorites.length === 0 ? (
              <Empty icon={Heart} text="لا توجد عناصر في المفضّلة" />
            ) : (
              favorites.map((it) => (
                <Tile
                  key={it.id}
                  title={it.title}
                  poster={it.poster}
                  year={it.year}
                  onPlay={() => {
                    if (it.kind === 'movie' && it.tmdbId)
                      openTmdb({ kind: 'movie', tmdbId: it.tmdbId, title: it.title, backdrop: it.backdrop })
                    else if (it.kind === 'tv' && it.tmdbId)
                      openTmdb({
                        kind: 'tv',
                        tmdbId: it.tmdbId,
                        title: it.title,
                        season: 1,
                        episode: 1,
                        backdrop: it.backdrop
                      })
                  }}
                  onRemove={() => libraryActions.toggleFavorite(it)}
                />
              ))
            )}
          </Grid>
        )}
        {tab === 'progress' && (
          <Grid>
            {progress.length === 0 ? (
              <Empty icon={History} text="لا توجد عناصر قيد المشاهدة" />
            ) : (
              progress.map((p) => {
                const pct = p.duration > 0 ? Math.min(100, (p.position / p.duration) * 100) : 0
                return (
                  <Tile
                    key={p.id}
                    title={p.title}
                    poster={p.backdrop}
                    year={p.season ? `S${p.season}·E${p.episode}` : undefined}
                    progress={pct}
                    onPlay={() =>
                      openTmdb({
                        kind: p.kind,
                        tmdbId: p.tmdbId,
                        title: p.title,
                        backdrop: p.backdrop,
                        season: p.season,
                        episode: p.episode
                      })
                    }
                    onRemove={() => libraryActions.clearProgress(p.id)}
                  />
                )
              })
            )}
          </Grid>
        )}
      </div>
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {children}
    </div>
  )
}

function Empty({ icon: Icon, text }: { icon: typeof Heart; text: string }) {
  return (
    <div className="col-span-full text-center py-16 text-ink-300">
      <Icon className="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p>{text}</p>
    </div>
  )
}

function Tile({
  title,
  poster,
  year,
  progress,
  onPlay,
  onRemove
}: {
  title: string
  poster?: string
  year?: string
  progress?: number
  onPlay: () => void
  onRemove: () => void
}) {
  return (
    <div className="group relative">
      <button onClick={onPlay} className="block w-full text-start">
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-ink-700/40 ring-1 ring-ink-600/40 group-hover:ring-brand-500/60 transition">
          {poster ? (
            <img src={poster} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-ink-700 to-ink-800" />
          )}
          <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
            <div className="w-12 h-12 rounded-full bg-brand-500 grid place-items-center">
              <Play className="w-6 h-6 fill-white" />
            </div>
          </div>
          {progress !== undefined && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
              <div className="h-full bg-brand-500" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        <p className="mt-2 text-sm font-medium line-clamp-1">{title}</p>
        {year && <p className="text-xs text-ink-300">{year}</p>}
      </button>
      <button
        onClick={onRemove}
        title="إزالة"
        className="absolute top-2 end-2 w-7 h-7 grid place-items-center rounded-full bg-black/70 opacity-0 group-hover:opacity-100 hover:bg-rose-500 transition"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
