import { useState } from 'react'
import { UserPlus, Check, X as XIcon, Trash2, Send, AtSign, Loader2, Users, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/ui/PageHeader'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import {
  acceptFriendRequest,
  declineFriendRequest,
  inviteToRoom,
  isValidUsername,
  removeFriend,
  sendFriendRequest,
  setUsername,
  useFriends,
  useIncomingRequests,
  useMyProfile,
  useRoomInvites,
  dismissInvite
} from '@/features/friends/useFriends'

export default function FriendsPage() {
  const user = useAuthStore((s) => s.user)
  const profile = useMyProfile()
  const friends = useFriends()
  const requests = useIncomingRequests()
  const invites = useRoomInvites()
  const setActiveRoom = useRoomStore((s) => s.setActive)
  const activeRoomId = useRoomStore((s) => s.activeRoomId)
  const navigate = useNavigate()

  const [usernameInput, setUsernameInput] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!user) {
    return (
      <div>
        <PageHeader title="الأصدقاء" />
        <div className="px-8">
          <div className="bg-ink-700/30 rounded-2xl p-6 max-w-xl">
            <Users className="w-10 h-10 text-brand-400 mb-3" />
            <p>يجب تسجيل الدخول لاستخدام الأصدقاء.</p>
            <a href="#/settings" className="mt-3 inline-block text-brand-400 hover:underline text-sm">
              الذهاب إلى الإعدادات →
            </a>
          </div>
        </div>
      </div>
    )
  }

  const handleSetUsername = async () => {
    setError(null)
    setSuccess(null)
    const u = usernameInput.toLowerCase().trim()
    if (!isValidUsername(u)) {
      setError('3-20 حرف، حروف إنجليزية صغيرة وأرقام و _ فقط')
      return
    }
    setBusy('username')
    try {
      await setUsername(u)
      setSuccess(`تم حفظ اسم المستخدم: @${u}`)
      setUsernameInput('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const handleSendRequest = async () => {
    setError(null)
    setSuccess(null)
    const u = searchInput.replace(/^@/, '').toLowerCase().trim()
    if (!u) return
    setBusy('search')
    try {
      await sendFriendRequest(u)
      setSuccess(`تم إرسال الطلب إلى @${u}`)
      setSearchInput('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const handleInvite = async (friendUid: string, friendName: string) => {
    if (!activeRoomId) {
      setError('أنشئ غرفة أولاً من صفحة "مشاهدة مع الأصدقاء"')
      return
    }
    setError(null)
    setBusy(`invite-${friendUid}`)
    try {
      await inviteToRoom(friendUid, activeRoomId)
      setSuccess(`تم إرسال دعوة إلى ${friendName}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <PageHeader title="الأصدقاء" subtitle="أضف أصدقاء وادعهم لمشاهدة معاً" />
      <div className="px-8 pb-10 space-y-6 max-w-3xl">
        {/* Username panel */}
        <section className="bg-ink-700/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AtSign className="w-4 h-4 text-brand-400" />
            <h2 className="font-semibold">اسم المستخدم</h2>
          </div>
          {profile?.username ? (
            <p className="text-sm text-ink-200">
              اسمك الحالي:{' '}
              <span className="font-mono bg-ink-800 px-2 py-0.5 rounded">
                @{profile.username}
              </span>
            </p>
          ) : (
            <>
              <p className="text-xs text-ink-300 mb-3">
                اختر اسماً فريداً ليتمكن أصدقاؤك من إضافتك. (3-20 حرف، إنجليزي/أرقام/_ فقط)
              </p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-ink-400">@</span>
                  <input
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="username"
                    className="w-full bg-ink-700 ring-1 ring-ink-600 rounded-lg ps-8 pe-3 py-2 text-sm font-mono"
                  />
                </div>
                <button
                  onClick={handleSetUsername}
                  disabled={busy === 'username'}
                  className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-4 rounded-lg text-sm font-semibold flex items-center gap-2"
                >
                  {busy === 'username' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
                </button>
              </div>
            </>
          )}
        </section>

        {/* Add friend */}
        <section className="bg-ink-700/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-brand-400" />
            <h2 className="font-semibold">إضافة صديق</h2>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-ink-400">@</span>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="اكتب اسم المستخدم"
                className="w-full bg-ink-700 ring-1 ring-ink-600 rounded-lg ps-8 pe-3 py-2 text-sm font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
              />
            </div>
            <button
              onClick={handleSendRequest}
              disabled={busy === 'search' || !searchInput}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-4 rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              {busy === 'search' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              إرسال طلب
            </button>
          </div>
        </section>

        {/* Feedback messages */}
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

        {/* Room invites */}
        {invites.length > 0 && (
          <section className="bg-amber-500/10 ring-1 ring-amber-500/30 rounded-2xl p-5">
            <h2 className="font-semibold mb-3">دعوات مشاهدة ({invites.length})</h2>
            <ul className="space-y-2">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center gap-2 bg-ink-900/40 rounded-lg p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{inv.fromName}</p>
                    <p className="text-xs text-ink-300">
                      {inv.mediaTitle || 'دعوة لمشاهدة معاً'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveRoom(inv.roomId)
                      window.location.hash = '#/together'
                      void dismissInvite(inv.id)
                    }}
                    className="bg-brand-500 hover:bg-brand-600 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    انضم
                  </button>
                  <button
                    onClick={() => dismissInvite(inv.id)}
                    className="w-8 h-8 grid place-items-center rounded-lg text-ink-300 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Incoming requests */}
        {requests.length > 0 && (
          <section className="bg-ink-700/30 rounded-2xl p-5">
            <h2 className="font-semibold mb-3">طلبات صداقة ({requests.length})</h2>
            <ul className="space-y-2">
              {requests.map((r) => (
                <li
                  key={r.uid}
                  className="flex items-center gap-2 bg-ink-900/40 rounded-lg p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{r.name}</p>
                  </div>
                  <button
                    onClick={() => acceptFriendRequest(r.uid)}
                    className="w-8 h-8 grid place-items-center rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    title="قبول"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => declineFriendRequest(r.uid)}
                    className="w-8 h-8 grid place-items-center rounded-lg text-ink-300 hover:text-rose-300 hover:bg-rose-500/10"
                    title="رفض"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Friends list */}
        <section className="bg-ink-700/30 rounded-2xl p-5">
          <h2 className="font-semibold mb-3">
            أصدقائي ({friends.length})
            {activeRoomId && (
              <span className="ms-2 text-xs text-emerald-300 font-normal">
                ● غرفة نشطة — يمكن الدعوة
              </span>
            )}
          </h2>
          {friends.length === 0 ? (
            <p className="text-sm text-ink-400">لا يوجد أصدقاء بعد. أضف صديقاً عبر اسم المستخدم.</p>
          ) : (
            <ul className="space-y-2">
              {friends.map((f) => (
                <li
                  key={f.uid}
                  className="flex items-center gap-2 bg-ink-900/40 rounded-lg p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{f.name}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/chats?u=${f.uid}`)}
                    className="bg-ink-700/60 hover:bg-ink-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                    title="محادثة"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    محادثة
                  </button>
                  <button
                    onClick={() => handleInvite(f.uid, f.name)}
                    disabled={!activeRoomId || busy === `invite-${f.uid}`}
                    className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    title={activeRoomId ? 'دعوة للغرفة' : 'افتح غرفة أولاً'}
                  >
                    {busy === `invite-${f.uid}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'دعوة'
                    )}
                  </button>
                  <button
                    onClick={() => removeFriend(f.uid)}
                    className="w-8 h-8 grid place-items-center rounded-lg text-ink-300 hover:text-rose-300 hover:bg-rose-500/10"
                    title="إزالة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
