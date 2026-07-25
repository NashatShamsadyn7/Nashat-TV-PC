import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Lock, Loader2, X } from 'lucide-react'
import { verifyPin, type Profile } from '@/stores/profilesStore'

type Props = {
  /** The profile being unlocked. Null keeps the modal closed. */
  profile: Profile | null
  onUnlocked: (profile: Profile) => void
  onCancel: () => void
}

/**
 * PIN gate for switching into a protected profile.
 *
 * `verifyPin` already existed in the profiles store but nothing ever called it:
 * the profile list switched with a bare `setActive(p.id)`, so a PIN was purely
 * decorative and a Kids profile was one click away for anyone.
 */
export default function PinPrompt({ profile, onUnlocked, onCancel }: Props) {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset between openings so a previous failure doesn't persist.
  useEffect(() => {
    if (profile) {
      setPin('')
      setError(false)
      setBusy(false)
      // Autofocus so the PIN can be typed immediately.
      const id = window.setTimeout(() => inputRef.current?.focus(), 50)
      return () => window.clearTimeout(id)
    }
  }, [profile])

  useEffect(() => {
    if (!profile) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [profile, onCancel])

  const submit = async () => {
    if (!profile || busy) return
    setBusy(true)
    const ok = await verifyPin(profile, pin)
    setBusy(false)
    if (ok) {
      onUnlocked(profile)
      return
    }
    setError(true)
    setPin('')
    inputRef.current?.focus()
  }

  return createPortal(
    <AnimatePresence>
      {profile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-ink-800 rounded-2xl ring-1 ring-ink-600/50 shadow-2xl overflow-hidden"
          >
            <header className="flex items-center justify-between p-4 border-b border-ink-700/40">
              <h2 className="font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-400" />
                {t('profiles.enterPin')}
              </h2>
              <button
                onClick={onCancel}
                className="w-8 h-8 grid place-items-center rounded-lg text-ink-200 hover:text-white hover:bg-ink-700/40"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-5 space-y-4 text-center">
              <div>
                <span className="text-3xl">{profile.avatar}</span>
                <p className="font-semibold mt-1">{profile.name}</p>
              </div>

              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''))
                  setError(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit()
                }}
                placeholder="••••"
                className={cnInput(error)}
              />

              {error && (
                <p className="text-xs text-rose-300">{t('profiles.wrongPin')}</p>
              )}

              <button
                onClick={() => void submit()}
                disabled={busy || pin.length === 0}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('profiles.unlock')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

function cnInput(error: boolean): string {
  return [
    'w-full bg-ink-900 rounded-xl px-3 py-3 text-center text-2xl tracking-[0.5em]',
    'ring-1 focus:outline-none',
    error ? 'ring-rose-500/70' : 'ring-ink-600/50 focus:ring-brand-500'
  ].join(' ')
}
