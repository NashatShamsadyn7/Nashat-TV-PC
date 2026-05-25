import { motion } from 'framer-motion'
import { Play, Plus, Check, Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLibraryStore, libraryActions } from '@/stores/libraryStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { makeLibraryId, type LibraryItem } from '@/features/library/types'

type Props = {
  title?: string
  imageUrl?: string
  rating?: number
  onClick?: () => void
  libItem?: Omit<LibraryItem, 'addedAt' | 'id'> & { tmdbId?: number; channelKey?: string }
}

export default function PosterCard({ title, imageUrl, rating, onClick, libItem }: Props) {
  const hoverPeek = useSettingsStore((s) => s.hoverPeek)
  const itemId = libItem
    ? makeLibraryId(libItem.kind, libItem.tmdbId ?? libItem.channelKey ?? title ?? '')
    : null
  const inWatchlist = useLibraryStore((s) =>
    itemId ? s.watchlist.some((i) => i.id === itemId) : false
  )
  const isFav = useLibraryStore((s) =>
    itemId ? s.favorites.some((i) => i.id === itemId) : false
  )
  const [hovering, setHovering] = useState(false)
  const [delayedOpen, setDelayedOpen] = useState(false)

  useEffect(() => {
    if (!hoverPeek || !hovering) {
      setDelayedOpen(false)
      return
    }
    const t = setTimeout(() => setDelayedOpen(true), 450)
    return () => clearTimeout(t)
  }, [hovering, hoverPeek])

  const toggleList = (e: React.MouseEvent, list: 'watchlist' | 'favorites') => {
    e.stopPropagation()
    if (!libItem || !itemId) return
    const item: LibraryItem = {
      ...libItem,
      id: itemId,
      addedAt: Date.now()
    } as LibraryItem
    if (list === 'watchlist') libraryActions.toggleWatchlist(item)
    else libraryActions.toggleFavorite(item)
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="group relative w-40 shrink-0 text-start snap-start"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-ink-700/40 ring-1 ring-ink-600/40 group-hover:ring-brand-500/60 transition">
        {imageUrl ? (
          <img src={imageUrl} alt={title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-ink-700 to-ink-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition" />
        <div className="absolute bottom-3 inset-x-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition">
          <div className="flex items-center gap-2 text-xs">
            <Play className="w-4 h-4 fill-white" />
            <span className="font-semibold">تشغيل</span>
          </div>
        </div>
        {rating !== undefined && rating > 0 && (
          <span className="absolute top-2 end-2 bg-black/70 backdrop-blur-sm rounded-md px-2 py-0.5 text-xs font-bold">
            ★ {rating.toFixed(1)}
          </span>
        )}
        {libItem && (
          <div className="absolute top-2 start-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={(e) => toggleList(e, 'watchlist')}
              title={inWatchlist ? 'إزالة من القائمة' : 'إضافة إلى القائمة'}
              className="w-7 h-7 grid place-items-center rounded-full bg-black/70 hover:bg-brand-500 backdrop-blur"
            >
              {inWatchlist ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={(e) => toggleList(e, 'favorites')}
              title={isFav ? 'إزالة من المفضّلة' : 'إضافة للمفضّلة'}
              className="w-7 h-7 grid place-items-center rounded-full bg-black/70 hover:bg-rose-500 backdrop-blur"
            >
              <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-400 text-rose-400' : ''}`} />
            </button>
          </div>
        )}
      </div>
      {title && <p className="mt-2 text-sm font-medium text-ink-100 line-clamp-2">{title}</p>}
      {delayedOpen && hoverPeek && libItem?.backdrop && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18 }}
          className="absolute z-20 top-full mt-2 inset-x-0 w-64 -translate-x-12 rounded-xl overflow-hidden ring-1 ring-brand-500/40 bg-ink-800 shadow-2xl pointer-events-none"
        >
          <div className="aspect-video bg-ink-900">
            {libItem.backdrop && (
              <img src={libItem.backdrop} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="p-2.5">
            <p className="text-sm font-semibold line-clamp-1">{title}</p>
            {libItem.year && <p className="text-[10px] text-ink-300">{libItem.year}</p>}
          </div>
        </motion.div>
      )}
    </motion.button>
  )
}
