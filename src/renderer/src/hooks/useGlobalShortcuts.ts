import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

type Options = {
  onHelp?: () => void
  onSearch?: () => void
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return true
  return false
}

export function useGlobalShortcuts({ onHelp, onSearch }: Options = {}) {
  const navigate = useNavigate()
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return
      // Navigation
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        onHelp?.()
        return
      }
      if (e.key === '/' && !e.ctrlKey) {
        e.preventDefault()
        onSearch ? onSearch() : navigate('/search')
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        onSearch ? onSearch() : navigate('/search')
        return
      }
      // g + letter chord shortcuts
      if (e.key === 'g') {
        const onNext = (ev: KeyboardEvent) => {
          window.removeEventListener('keydown', onNext, true)
          if (isEditable(ev.target)) return
          const map: Record<string, string> = {
            h: '/',
            l: '/live',
            m: '/movies',
            s: '/series',
            a: '/actors',
            y: '/library',
            t: '/settings'
          }
          const path = map[ev.key.toLowerCase()]
          if (path) {
            ev.preventDefault()
            navigate(path)
          }
        }
        window.addEventListener('keydown', onNext, true)
        setTimeout(() => window.removeEventListener('keydown', onNext, true), 1200)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, onHelp, onSearch])
}
