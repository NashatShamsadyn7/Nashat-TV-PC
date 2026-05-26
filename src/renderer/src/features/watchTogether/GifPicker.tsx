import { useEffect, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'

// Giphy v1 API — free key from https://developers.giphy.com/ (no card).
// Tenor was discontinued by Google in Jan 2026, so we use Giphy instead.
const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY as string | undefined

type Gif = {
  id: string
  url: string
  preview: string
}

type GiphyImage = { url: string }
type GiphyResult = {
  id: string
  images: {
    original?: GiphyImage
    downsized_medium?: GiphyImage
    fixed_height_small?: GiphyImage
    fixed_width_small?: GiphyImage
  }
}

async function giphyFetch(path: string): Promise<Gif[]> {
  if (!GIPHY_KEY) return []
  const url = `https://api.giphy.com/v1/gifs/${path}&api_key=${GIPHY_KEY}&limit=24&rating=pg-13`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`giphy ${res.status}`)
  const data = (await res.json()) as { data: GiphyResult[] }
  return data.data.map((r) => ({
    id: r.id,
    url:
      r.images.downsized_medium?.url || r.images.original?.url || '',
    preview:
      r.images.fixed_width_small?.url ||
      r.images.fixed_height_small?.url ||
      r.images.original?.url ||
      ''
  }))
}

export default function GifPicker({ onPick }: { onPick: (gifUrl: string) => void }) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<Gif[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!GIPHY_KEY) return
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const path = query.trim()
          ? `search?q=${encodeURIComponent(query.trim())}`
          : 'trending?'
        const results = await giphyFetch(path)
        setGifs(results)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [query])

  if (!GIPHY_KEY) {
    return (
      <div className="bg-ink-900/95 backdrop-blur-md ring-1 ring-ink-600/60 rounded-xl p-4 shadow-xl w-[320px] text-xs text-ink-200 space-y-2">
        <p className="font-semibold text-ink-50">GIFs غير مفعّلة</p>
        <p>
          أضف <code className="bg-ink-700/60 px-1 rounded">VITE_GIPHY_API_KEY</code> في
          ملف <code className="bg-ink-700/60 px-1 rounded">.env</code> ثم أعد التشغيل.
        </p>
        <a
          href="https://developers.giphy.com/dashboard/"
          target="_blank"
          rel="noreferrer"
          className="text-brand-400 hover:underline block"
        >
          احصل على مفتاح Giphy مجاني ↗
        </a>
      </div>
    )
  }

  return (
    <div className="bg-ink-900/95 backdrop-blur-md ring-1 ring-ink-600/60 rounded-xl p-2 shadow-xl w-[320px]">
      <div className="relative mb-2">
        <Search className="w-3.5 h-3.5 text-ink-400 absolute start-2 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن GIF…"
          className="w-full bg-ink-800 ring-1 ring-ink-600/50 rounded-lg ps-7 pe-2 py-1.5 text-xs focus:outline-none focus:ring-brand-500"
        />
      </div>
      <div className="h-[260px] overflow-y-auto">
        {loading && (
          <div className="grid place-items-center h-full">
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
          </div>
        )}
        {error && <p className="text-xs text-rose-400 p-2">{error}</p>}
        {!loading && !error && gifs.length > 0 && (
          <div className="grid grid-cols-3 gap-1">
            {gifs.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onPick(g.url)}
                className="aspect-square overflow-hidden rounded-md bg-ink-800 hover:ring-2 hover:ring-brand-500"
              >
                <img
                  src={g.preview}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
        {!loading && !error && gifs.length === 0 && (
          <p className="text-xs text-ink-400 text-center mt-12">لا توجد نتائج</p>
        )}
      </div>
      <p className="text-[10px] text-ink-500 text-center mt-1">Powered by GIPHY</p>
    </div>
  )
}
