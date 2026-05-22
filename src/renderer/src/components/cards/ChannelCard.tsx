import { useState } from 'react'
import { motion } from 'framer-motion'
import { Tv, Play } from 'lucide-react'
import type { Channel } from '@shared/types'

type Props = {
  channel: Channel
  onClick?: (channel: Channel) => void
}

export default function ChannelCard({ channel, onClick }: Props) {
  const [imgError, setImgError] = useState(false)

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(channel)}
      className="group flex items-center gap-3 p-3 bg-ink-700/30 hover:bg-ink-700/60 rounded-xl text-start transition-colors ring-1 ring-ink-600/40 hover:ring-brand-500/60"
    >
      <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-ink-800 grid place-items-center">
        {channel.logo && !imgError ? (
          <img
            src={channel.logo}
            alt={channel.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-1"
          />
        ) : (
          <Tv className="w-6 h-6 text-ink-300" />
        )}
        <div className="absolute inset-0 grid place-items-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-5 h-5 fill-white text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{channel.name}</p>
        <p className="text-xs text-ink-300 truncate">{channel.category}</p>
      </div>
    </motion.button>
  )
}
