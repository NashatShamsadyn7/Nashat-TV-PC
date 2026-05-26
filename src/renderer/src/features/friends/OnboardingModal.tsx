import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AtSign, Loader2, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  isValidUsername,
  setUsername,
  useMyProfile
} from './useFriends'

// First-time onboarding overlay. Shown once when the user signs in and has
// no username yet. Blocks the rest of the app until they pick a handle —
// without one, friends can't add them, so the app is effectively half-functional.
export default function OnboardingModal() {
  const user = useAuthStore((s) => s.user)
  const profile = useMyProfile()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  // Reset input when sign-in changes.
  useEffect(() => {
    setInput('')
    setError(null)
    setDismissed(false)
  }, [user?.uid])

  if (!user) return null
  // Profile loading — render nothing until we know whether they have a username.
  if (profile === null && user) {
    // First sign-in: profile may not exist yet. Wait one beat.
  }
  if (profile?.username) return null
  if (dismissed) return null

  const handleSubmit = async () => {
    setError(null)
    const u = input.toLowerCase().trim().replace(/^@/, '')
    if (!isValidUsername(u)) {
      setError('3-20 حرف، حروف إنجليزية صغيرة وأرقام و _ فقط')
      return
    }
    setBusy(true)
    try {
      await setUsername(u)
      setDismissed(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md grid place-items-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-ink-800 ring-1 ring-ink-600/50 rounded-3xl p-7 w-full max-w-md shadow-2xl"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl grid place-items-center mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-1">مرحباً بك في Nashat TV!</h2>
          <p className="text-sm text-ink-300 mb-5">
            اختر اسم مستخدم فريد ليتمكن أصدقاؤك من إضافتك ومشاهدة الأفلام معاً.
          </p>

          <div className="relative mb-2">
            <AtSign className="w-4 h-4 text-ink-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="username"
              autoFocus
              maxLength={20}
              className="w-full bg-ink-700 ring-1 ring-ink-600 rounded-xl ps-9 pe-3 py-3 text-sm font-mono focus:outline-none focus:ring-brand-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <p className="text-[11px] text-ink-400 mb-4">
            3-20 حرف · إنجليزي/أرقام/_ · يمكن تغييره مرة كل 30 يوماً
          </p>

          {error && (
            <p className="text-xs text-rose-300 bg-rose-500/10 ring-1 ring-rose-500/30 rounded-lg p-2.5 mb-3">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={busy || !input.trim()}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'متابعة'}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="w-full text-xs text-ink-400 hover:text-ink-200 mt-3 py-1"
          >
            تخطي الآن (يمكنك ضبطه لاحقاً من الإعدادات)
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
