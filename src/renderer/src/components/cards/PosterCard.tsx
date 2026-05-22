import { motion } from 'framer-motion'
import { Play } from 'lucide-react'

type Props = {
  title?: string
  imageUrl?: string
  rating?: number
  onClick?: () => void
}

export default function PosterCard({ title, imageUrl, rating, onClick }: Props) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      onClick={onClick}
      className="group relative w-40 shrink-0 text-start snap-start"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-ink-700/40 ring-1 ring-ink-600/40 group-hover:ring-brand-500/60 transition">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
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
      </div>
      {title && (
        <p className="mt-2 text-sm font-medium text-ink-100 line-clamp-2">{title}</p>
      )}
    </motion.button>
  )
}
