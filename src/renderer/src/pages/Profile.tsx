import { useEffect, useRef, useState } from 'react'
import { AtSign, Camera, Check, Loader2, User } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { useAuthStore } from '@/stores/authStore'
import {
  isValidUsername,
  setUsername,
  updateDisplayName,
  updatePhotoURL,
  useMyProfile,
  USERNAME_CHANGE_COOLDOWN_MS
} from '@/features/friends/useFriends'
import { uploadChatImage } from '@/features/watchTogether/chatUploads'

function daysUntilUnlock(changedAt: number | undefined): number {
  if (!changedAt) return 0
  const elapsed = Date.now() - changedAt
  if (elapsed >= USERNAME_CHANGE_COOLDOWN_MS) return 0
  return Math.ceil((USERNAME_CHANGE_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000))
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const profile = useMyProfile()
  const fileRef = useRef<HTMLInputElement>(null)

  const [nameInput, setNameInput] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Seed inputs from profile whenever it loads.
  useEffect(() => {
    if (profile) {
      setNameInput(profile.displayName || '')
      setUsernameInput(profile.username || '')
    }
  }, [profile?.displayName, profile?.username]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) {
    return (
      <div>
        <PageHeader title="الملف الشخصي" />
        <div className="px-8">
          <div className="bg-ink-700/30 rounded-2xl p-6 max-w-xl">
            <User className="w-10 h-10 text-brand-400 mb-3" />
            <p>يجب تسجيل الدخول.</p>
          </div>
        </div>
      </div>
    )
  }

  const lockedDays = daysUntilUnlock(profile?.usernameChangedAt)
  const usernameLocked = lockedDays > 0 && profile?.username !== usernameInput.toLowerCase().trim()

  const showStatus = (msg: string, isError = false) => {
    if (isError) {
      setError(msg)
      setSuccess(null)
    } else {
      setSuccess(msg)
      setError(null)
    }
    window.setTimeout(() => {
      setError(null)
      setSuccess(null)
    }, 4000)
  }

  const handleSaveName = async () => {
    setBusy('name')
    try {
      await updateDisplayName(nameInput)
      showStatus('تم تحديث الاسم')
    } catch (err) {
      showStatus((err as Error).message, true)
    } finally {
      setBusy(null)
    }
  }

  const handleSaveUsername = async () => {
    setBusy('username')
    try {
      await setUsername(usernameInput)
      showStatus('تم تحديث اسم المستخدم')
    } catch (err) {
      showStatus((err as Error).message, true)
    } finally {
      setBusy(null)
    }
  }

  const handlePhotoUpload = async (file: File) => {
    if (!user) return
    setBusy('photo')
    try {
      const url = await uploadChatImage('avatars', user.uid, file)
      await updatePhotoURL(url)
      showStatus('تم تحديث الصورة')
    } catch (err) {
      showStatus((err as Error).message, true)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <PageHeader title="الملف الشخصي" subtitle="بياناتك كما يراها أصدقاؤك" />
      <div className="px-8 pb-10 max-w-2xl space-y-5">
        {/* Avatar */}
        <section className="bg-ink-700/30 rounded-2xl p-5 flex items-center gap-5">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy === 'photo'}
            className="relative w-24 h-24 rounded-full overflow-hidden bg-ink-700 ring-2 ring-ink-600 hover:ring-brand-500 grid place-items-center group"
            title="تغيير الصورة"
          >
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-ink-400" />
            )}
            <div className="absolute inset-0 bg-black/50 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
              {busy === 'photo' ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void handlePhotoUpload(file)
            }}
          />
          <div className="min-w-0">
            <h2 className="font-semibold text-lg truncate">
              {profile?.displayName || user.displayName || 'Guest'}
            </h2>
            {profile?.username ? (
              <p className="text-sm text-brand-300 font-mono">@{profile.username}</p>
            ) : (
              <p className="text-xs text-ink-400">لم يتم تعيين اسم مستخدم</p>
            )}
            <p className="text-[11px] text-ink-400 mt-1">انقر الصورة لتغييرها</p>
          </div>
        </section>

        {/* Display name */}
        <section className="bg-ink-700/30 rounded-2xl p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-brand-400" /> الاسم الظاهر
          </h3>
          <p className="text-xs text-ink-300 mb-3">
            الاسم الذي يراه أصدقاؤك. يمكن تغييره في أي وقت.
          </p>
          <div className="flex gap-2">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={40}
              placeholder="اسمك"
              className="flex-1 bg-ink-700 ring-1 ring-ink-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-brand-500"
            />
            <button
              onClick={handleSaveName}
              disabled={busy === 'name' || !nameInput.trim() || nameInput === profile?.displayName}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-4 rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              {busy === 'name' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              حفظ
            </button>
          </div>
        </section>

        {/* Username */}
        <section className="bg-ink-700/30 rounded-2xl p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AtSign className="w-4 h-4 text-brand-400" /> اسم المستخدم
          </h3>
          <p className="text-xs text-ink-300 mb-3">
            يستخدم لإضافتك كصديق. مرة واحدة كل 30 يوماً.
            {lockedDays > 0 && (
              <span className="block mt-1 text-amber-300">
                ⏳ يفتح التعديل بعد {lockedDays} يوم
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-ink-400">@</span>
              <input
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
                maxLength={20}
                disabled={usernameLocked}
                placeholder="username"
                className="w-full bg-ink-700 ring-1 ring-ink-600 rounded-lg ps-8 pe-3 py-2 text-sm font-mono focus:outline-none focus:ring-brand-500 disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleSaveUsername}
              disabled={
                busy === 'username' ||
                usernameLocked ||
                !usernameInput.trim() ||
                usernameInput.toLowerCase() === profile?.username ||
                !isValidUsername(usernameInput.toLowerCase())
              }
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-4 rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              {busy === 'username' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              حفظ
            </button>
          </div>
          <p className="text-[10px] text-ink-400 mt-2">
            3-20 حرف · حروف إنجليزية صغيرة وأرقام و _
          </p>
        </section>

        {/* Status */}
        {error && (
          <div className="text-sm text-rose-300 bg-rose-500/10 ring-1 ring-rose-500/30 rounded-lg p-3">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-emerald-300 bg-emerald-500/10 ring-1 ring-emerald-500/30 rounded-lg p-3">
            {success}
          </div>
        )}
      </div>
    </div>
  )
}
