import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Loader2, UserCircle2 } from 'lucide-react'
import { authApi } from '@/features/auth/api'
import { cn } from '@/lib/cn'

type Mode = 'signin' | 'register'

type Props = {
  open: boolean
  onClose: () => void
}

export default function AuthModal({ open, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setEmail('')
    setPassword('')
    setDisplayName('')
    setError(null)
    setBusy(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        await authApi.signIn(email, password)
      } else {
        await authApi.register(email, password, displayName || undefined)
      }
      handleClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const handleAnon = async () => {
    setError(null)
    setBusy(true)
    try {
      await authApi.signInAnon()
      handleClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-ink-800 rounded-2xl ring-1 ring-ink-600/50 shadow-2xl overflow-hidden"
          >
            <header className="flex items-center justify-between p-5 border-b border-ink-700/40">
              <div className="flex items-center gap-3">
                <UserCircle2 className="w-7 h-7 text-brand-400" />
                <h2 className="text-lg font-bold">
                  {mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب'}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="w-9 h-9 grid place-items-center rounded-lg text-ink-200 hover:text-white hover:bg-ink-700/40"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex border-b border-ink-700/40">
              {(['signin', 'register'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m)
                    setError(null)
                  }}
                  className={cn(
                    'flex-1 py-3 text-sm font-semibold transition-colors',
                    mode === m
                      ? 'text-brand-400 border-b-2 border-brand-500'
                      : 'text-ink-300 hover:text-white'
                  )}
                >
                  {m === 'signin' ? 'تسجيل الدخول' : 'حساب جديد'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="text-xs text-ink-300 mb-1 block">الاسم (اختياري)</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-ink-700/40 border border-ink-600/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-ink-300 mb-1 block">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-ink-700/40 border border-ink-600/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-ink-300 mb-1 block">كلمة المرور</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-ink-700/40 border border-ink-600/50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              {error && (
                <div className="text-sm text-rose-300 bg-rose-500/10 ring-1 ring-rose-500/30 rounded-lg p-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'signin' ? 'دخول' : 'تسجيل'}
              </button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-ink-700/60" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-ink-800 px-3 text-xs text-ink-300">أو</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAnon}
                disabled={busy}
                className="w-full bg-ink-700/40 hover:bg-ink-700/70 text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                المتابعة كزائر
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
