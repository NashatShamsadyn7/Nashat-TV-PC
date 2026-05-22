import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { authApi } from '@/features/auth/api'

type Props = {
  open: boolean
  onClose: () => void
}

// Official Google "G" mark used on Sign-In buttons.
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}

export default function AuthModal({ open, onClose }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleClose = () => {
    setError(null)
    setBusy(false)
    onClose()
  }

  const handleGoogle = async () => {
    setError(null)
    setBusy(true)
    try {
      await authApi.signInWithGoogle()
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
              <h2 className="text-lg font-bold">تسجيل الدخول</h2>
              <button
                onClick={handleClose}
                className="w-9 h-9 grid place-items-center rounded-lg text-ink-200 hover:text-white hover:bg-ink-700/40"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-6 space-y-5">
              <p className="text-ink-200 text-sm leading-relaxed text-center">
                للوصول لكامل المميزات ومزامنة المفضّلة مع تطبيق الموبايل،
                سجّل دخولك بحساب <span className="font-bold text-brand-300">Gmail</span> فقط.
              </p>

              <button
                onClick={handleGoogle}
                disabled={busy}
                className="w-full bg-white hover:bg-ink-100 disabled:opacity-60 text-ink-900 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-3"
              >
                {busy ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <GoogleLogo className="w-5 h-5" />
                )}
                <span>{busy ? 'جارٍ التحقّق…' : 'المتابعة بحساب Gmail'}</span>
              </button>

              {error && (
                <div className="text-sm text-rose-300 bg-rose-500/10 ring-1 ring-rose-500/30 rounded-lg p-3">
                  {error}
                </div>
              )}

              <div className="text-xs text-ink-400 leading-relaxed border-t border-ink-700/40 pt-4">
                <p className="mb-1">🔒 <strong>الحسابات المؤقّتة محظورة</strong></p>
                <p>
                  لن نقبل tempmail، 10minutemail، Yahoo، Outlook، أو أي مزوّد آخر. فقط
                  حسابات Gmail الرسمية من Google.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
