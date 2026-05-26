// Lightweight emoji popover with the most commonly used reactions. The user's
// OS keyboard (Win+. on Windows) covers the long tail — this just gives one
// click access to the obvious ones during a movie night.
const EMOJIS = [
  '😂', '🤣', '😭', '😍', '😘', '🥰', '😎', '🤩',
  '😱', '🥳', '🤯', '🥺', '😢', '😡', '🤔', '😴',
  '👍', '👎', '👏', '🙏', '🔥', '💯', '❤️', '💔',
  '✨', '🎉', '🍿', '🎬', '🎵', '⭐', '🌹', '☕',
  '👀', '💀', '😈', '🤡', '🙄', '😏', '😬', '🤤'
]

export default function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  return (
    <div className="bg-ink-900/95 backdrop-blur-md ring-1 ring-ink-600/60 rounded-xl p-2 shadow-xl grid grid-cols-8 gap-1 w-[280px]">
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onPick(e)}
          className="text-xl w-8 h-8 grid place-items-center rounded-md hover:bg-ink-700/60 transition-colors"
        >
          {e}
        </button>
      ))}
    </div>
  )
}
