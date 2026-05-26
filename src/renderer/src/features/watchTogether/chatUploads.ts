// imgbb free image host — no Firebase Storage / no credit card required.
// Get a free API key at https://api.imgbb.com/ and put it in .env as
// VITE_IMGBB_API_KEY=... Free tier: unlimited uploads, 32 MB per file.

const IMGBB_KEY = import.meta.env.VITE_IMGBB_API_KEY as string | undefined

const MAX_DIM = 1280
const QUALITY = 0.82

// Downscale + re-encode an image to JPEG/WebP so the upload stays small.
// Keeps aspect ratio. Returns a Blob ready for imgbb.
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d unsupported')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY)
  )
  if (!blob) throw new Error('فشل ضغط الصورة')
  return blob
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // strip the `data:...;base64,` prefix — imgbb wants raw base64
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// Uploads a chat image to imgbb. Returns the public direct URL.
// roomId and uid are accepted but unused — kept so the signature matches the
// previous Firebase Storage helper.
export async function uploadChatImage(
  _roomId: string,
  _uid: string,
  file: File
): Promise<string> {
  if (!IMGBB_KEY) {
    throw new Error(
      'ضع VITE_IMGBB_API_KEY في ملف .env (احصل عليه مجاناً من api.imgbb.com)'
    )
  }
  const blob = await compressImage(file)
  const base64 = await blobToBase64(blob)
  const body = new FormData()
  body.append('image', base64)
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
    method: 'POST',
    body
  })
  if (!res.ok) throw new Error(`imgbb ${res.status}`)
  const data = (await res.json()) as {
    success: boolean
    data?: { url: string; display_url: string }
    error?: { message: string }
  }
  if (!data.success || !data.data) {
    throw new Error(data.error?.message || 'imgbb upload failed')
  }
  return data.data.display_url || data.data.url
}
