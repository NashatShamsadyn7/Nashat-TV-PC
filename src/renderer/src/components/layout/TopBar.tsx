import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Bell, User } from 'lucide-react'
import { changeLanguage, type Language } from '@/i18n'
import { useMyProfile } from '@/features/friends/useFriends'

const LANGS: { code: Language; label: string }[] = [
  { code: 'ar', label: 'عر' },
  { code: 'ku', label: 'ku' },
  { code: 'en', label: 'EN' }
]

export default function TopBar() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const current = i18n.language as Language
  const [q, setQ] = useState('')
  const profile = useMyProfile()

  const onChange = (value: string) => {
    setQ(value)
    const trimmed = value.trim()
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = q.trim()
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <header className="h-16 shrink-0 flex items-center gap-4 px-6 border-b border-ink-700/40 bg-ink-900/60 backdrop-blur-md">
      <form onSubmit={onSubmit} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-ink-300" />
          <input
            type="text"
            value={q}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => navigate('/search')}
            placeholder={t('nav.search')}
            className="w-full bg-ink-700/40 border border-ink-600/50 rounded-xl ps-10 pe-3 py-2 text-sm placeholder:text-ink-300 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </form>

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

      <button
        onClick={() => navigate('/profile')}
        title={profile?.displayName || 'الملف الشخصي'}
        className="w-10 h-10 grid place-items-center rounded-xl overflow-hidden bg-ink-700/40 text-ink-200 hover:text-white hover:bg-ink-700/60 transition-colors"
      >
        {profile?.photoURL ? (
          <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
        ) : (
          <User className="w-5 h-5" />
        )}
      </button>
    </header>
  )
}
