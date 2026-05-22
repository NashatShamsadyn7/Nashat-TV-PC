import { useTranslation } from 'react-i18next'
import { Search, Bell, User } from 'lucide-react'
import { changeLanguage, type Language } from '@/i18n'

const LANGS: { code: Language; label: string }[] = [
  { code: 'ar', label: 'عر' },
  { code: 'ku', label: 'ku' },
  { code: 'en', label: 'EN' }
]

export default function TopBar() {
  const { t, i18n } = useTranslation()
  const current = i18n.language as Language

  return (
    <header className="h-16 shrink-0 flex items-center gap-4 px-6 border-b border-ink-700/40 bg-ink-900/60 backdrop-blur-md">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-ink-300" />
          <input
            type="text"
            placeholder={t('nav.search')}
            className="w-full bg-ink-700/40 border border-ink-600/50 rounded-xl ps-10 pe-3 py-2 text-sm placeholder:text-ink-300 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 bg-ink-700/40 rounded-xl p-1">
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            onClick={() => changeLanguage(code)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              current === code
                ? 'bg-brand-500 text-white'
                : 'text-ink-200 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button className="w-10 h-10 grid place-items-center rounded-xl text-ink-200 hover:text-white hover:bg-ink-700/40 transition-colors">
        <Bell className="w-5 h-5" />
      </button>

      <button className="w-10 h-10 grid place-items-center rounded-xl bg-ink-700/40 text-ink-200 hover:text-white hover:bg-ink-700/60 transition-colors">
        <User className="w-5 h-5" />
      </button>
    </header>
  )
}
