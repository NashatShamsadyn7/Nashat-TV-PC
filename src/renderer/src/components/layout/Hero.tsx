import { motion } from 'framer-motion'
import { Play, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Hero() {
  const { t } = useTranslation()

  return (
    <section className="relative h-[58vh] min-h-[420px] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/40 via-ink-800 to-ink-900" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(225,29,72,0.25),transparent_50%)]" />

      <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-transparent" />
      <div className="absolute inset-y-0 start-0 w-2/3 bg-gradient-to-e from-ink-900/90 via-ink-900/40 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative h-full flex flex-col justify-end p-10 max-w-3xl"
      >
        <span className="inline-block text-xs font-bold tracking-widest text-brand-400 uppercase mb-3">
          Featured
        </span>
        <h2 className="text-5xl font-extrabold leading-tight mb-4">
          {t('app.name')}
          <span className="block text-brand-400 mt-2 text-2xl font-semibold">
            {t('app.tagline')}
          </span>
        </h2>
        <p className="text-ink-200 max-w-xl mb-6 leading-relaxed">
          منصة شاملة للقنوات المباشرة والأفلام والمسلسلات. ابدأ المشاهدة الآن أو
          استكشف المكتبة الواسعة.
        </p>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-ink-100 transition-colors">
            <Play className="w-5 h-5 fill-black" />
            {t('common.play')}
          </button>
          <button className="flex items-center gap-2 bg-ink-700/60 backdrop-blur text-white font-semibold px-6 py-3 rounded-xl hover:bg-ink-700/90 transition-colors">
            <Info className="w-5 h-5" />
            {t('common.moreInfo')}
          </button>
        </div>
      </motion.div>
    </section>
  )
}
