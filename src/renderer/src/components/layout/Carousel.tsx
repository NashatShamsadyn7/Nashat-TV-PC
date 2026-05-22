import { useRef, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isRtl, type Language } from '@/i18n'

type Props = {
  title: string
  children: ReactNode
}

export default function Carousel({ title, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { i18n, t } = useTranslation()
  const rtl = isRtl(i18n.language as Language)

  const scrollBy = (direction: 'prev' | 'next') => {
    if (!ref.current) return
    const distance = ref.current.clientWidth * 0.8
    const sign = direction === 'next' ? 1 : -1
    const dx = rtl ? -sign * distance : sign * distance
    ref.current.scrollBy({ left: dx, behavior: 'smooth' })
  }

  return (
    <section className="py-4">
      <div className="flex items-center justify-between px-8 mb-3">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollBy('prev')}
            className="w-9 h-9 grid place-items-center rounded-full bg-ink-700/40 hover:bg-ink-700/80 transition-colors"
            aria-label={t('common.viewAll')}
          >
            {rtl ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <button
            onClick={() => scrollBy('next')}
            className="w-9 h-9 grid place-items-center rounded-full bg-ink-700/40 hover:bg-ink-700/80 transition-colors"
            aria-label={t('common.viewAll')}
          >
            {rtl ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="flex gap-4 px-8 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {children}
      </div>
    </section>
  )
}
