import { useEffect, useRef, useState } from 'react'

type SpeechRecognitionLike = {
  start: () => void
  stop: () => void
  abort: () => void
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((ev: any) => void) | null
  onerror: ((ev: any) => void) | null
  onend: (() => void) | null
}

type Ctor = new () => SpeechRecognitionLike

function getCtor(): Ctor | null {
  // Standard or webkit-prefixed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function useVoiceSearch(onResult: (text: string) => void, lang = 'ar-SA') {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    setSupported(!!getCtor())
  }, [])

  const start = () => {
    const Ctor = getCtor()
    if (!Ctor) {
      setError('التعرف على الصوت غير مدعوم')
      return
    }
    setError(null)
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (ev: any) => {
      const text = ev?.results?.[0]?.[0]?.transcript ?? ''
      if (text) onResult(text)
    }
    rec.onerror = (ev: any) => setError(ev?.error ?? 'recognition_error')
    rec.onend = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }
  const stop = () => recRef.current?.stop()
  useEffect(() => () => recRef.current?.abort(), [])

  return { supported, listening, error, start, stop }
}
