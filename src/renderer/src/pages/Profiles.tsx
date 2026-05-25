import { useState } from 'react'
import { Plus, Edit2, Trash2, Lock, Check, X } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { useProfilesStore, hashPin, type Profile } from '@/stores/profilesStore'
import { cn } from '@/lib/cn'

const AVATARS = ['🎬', '🍿', '🎭', '🎮', '👾', '🐯', '🦊', '🐱', '🐻', '🌟', '🚀', '🎨']

function ProfileEditor({
  profile,
  onSave,
  onCancel,
  onDelete
}: {
  profile: Profile
  onSave: (p: Profile) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(profile.name)
  const [avatar, setAvatar] = useState(profile.avatar)
  const [isKid, setIsKid] = useState(profile.isKid)
  const [pin, setPin] = useState('')
  const [keepPin, setKeepPin] = useState(!!profile.pinHash)

  const save = async () => {
    const next: Profile = { ...profile, name: name.trim() || 'بدون اسم', avatar, isKid }
    if (pin) next.pinHash = await hashPin(pin)
    else if (!keepPin) delete next.pinHash
    await onSave(next)
  }

  return (
    <div className="bg-ink-700/30 rounded-2xl p-6 space-y-4">
      <div>
        <label className="text-xs text-ink-300 block mb-1">الاسم</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-ink-700 ring-1 ring-ink-600 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-ink-300 block mb-2">الصورة الرمزية</label>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={cn(
                'w-10 h-10 rounded-lg text-xl grid place-items-center',
                avatar === a ? 'bg-brand-500 ring-2 ring-brand-300' : 'bg-ink-700/60 hover:bg-ink-700'
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isKid} onChange={(e) => setIsKid(e.target.checked)} />
        ملف أطفال (سيُخفي المحتوى للبالغين)
      </label>
      <div>
        <label className="text-xs text-ink-300 block mb-1 flex items-center gap-2">
          <Lock className="w-3 h-3" />
          رمز PIN (اختياري — 4 أرقام)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            placeholder={profile.pinHash && keepPin ? '••••' : 'بدون رمز'}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="flex-1 bg-ink-700 ring-1 ring-ink-600 rounded-lg px-3 py-2 text-sm tracking-widest"
          />
          {profile.pinHash && (
            <label className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={keepPin} onChange={(e) => setKeepPin(e.target.checked)} />
              إبقاء
            </label>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={save}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-xl text-sm font-semibold"
        >
          <Check className="w-4 h-4" /> حفظ
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 bg-ink-700/40 hover:bg-ink-700/70 px-4 py-2 rounded-xl text-sm"
        >
          <X className="w-4 h-4" /> إلغاء
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="ms-auto flex items-center gap-2 text-rose-400 hover:text-rose-300 text-sm"
          >
            <Trash2 className="w-4 h-4" /> حذف
          </button>
        )}
      </div>
    </div>
  )
}

export default function Profiles() {
  const profiles = useProfilesStore((s) => s.profiles)
  const activeId = useProfilesStore((s) => s.activeId)
  const setActive = useProfilesStore((s) => s.setActive)
  const update = useProfilesStore((s) => s.update)
  const add = useProfilesStore((s) => s.add)
  const remove = useProfilesStore((s) => s.remove)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <div>
      <PageHeader title="الملفّات الشخصيّة" subtitle="من يشاهد؟ — كل شخص له قائمته وذوقه" />
      <div className="px-8 max-w-3xl pb-10 space-y-4">
        {profiles.map((p) => {
          const isEditing = editingId === p.id
          if (isEditing) {
            return (
              <ProfileEditor
                key={p.id}
                profile={p}
                onSave={async (next) => {
                  update(p.id, next)
                  setEditingId(null)
                }}
                onCancel={() => setEditingId(null)}
                onDelete={
                  profiles.length > 1
                    ? () => {
                        remove(p.id)
                        setEditingId(null)
                      }
                    : undefined
                }
              />
            )
          }
          return (
            <div
              key={p.id}
              className={cn(
                'flex items-center gap-4 p-4 rounded-2xl ring-1',
                activeId === p.id ? 'bg-brand-500/20 ring-brand-500/60' : 'bg-ink-700/30 ring-ink-600/40'
              )}
            >
              <span className="text-3xl">{p.avatar}</span>
              <div className="flex-1">
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-ink-300 flex items-center gap-1">
                  {p.isKid && <span className="bg-emerald-500/30 px-1 rounded">KIDS</span>}
                  {p.pinHash && <Lock className="w-3 h-3" />}
                </p>
              </div>
              {activeId !== p.id && (
                <button
                  onClick={() => setActive(p.id)}
                  className="text-xs bg-ink-700/60 hover:bg-brand-500 px-3 py-1.5 rounded-lg"
                >
                  تفعيل
                </button>
              )}
              <button
                onClick={() => setEditingId(p.id)}
                className="w-9 h-9 grid place-items-center rounded-xl hover:bg-ink-700/50"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )
        })}

        {creating ? (
          <ProfileEditor
            profile={{ id: '', name: '', avatar: '🎬', isKid: false }}
            onSave={async (p) => {
              add(p)
              setCreating(false)
            }}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-ink-700/20 hover:bg-ink-700/40 ring-1 ring-dashed ring-ink-600/60 text-ink-300 hover:text-white"
          >
            <Plus className="w-5 h-5" />
            إضافة ملف جديد
          </button>
        )}
      </div>
    </div>
  )
}
