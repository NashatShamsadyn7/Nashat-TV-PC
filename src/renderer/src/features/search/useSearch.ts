import Fuse from 'fuse.js'
import { useEffect, useMemo, useState } from 'react'

const LS_HISTORY = 'nashat-search-history-v1'
const MAX_HISTORY = 12

export function getSearchHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]')
  } catch {
    return []
  }
}

export function pushSearchHistory(term: string): void {
  const t = term.trim()
  if (!t) return
  const cur = getSearchHistory().filter((q) => q.toLowerCase() !== t.toLowerCase())
  cur.unshift(t)
  localStorage.setItem(LS_HISTORY, JSON.stringify(cur.slice(0, MAX_HISTORY)))
}

export function clearSearchHistory(): void {
  localStorage.removeItem(LS_HISTORY)
}

export function useFuzzy<T>(items: T[], keys: (keyof T | string)[], query: string, limit = 50) {
  const fuse = useMemo(
    () =>
      new Fuse<T>(items, {
        keys: keys as string[],
        threshold: 0.35,
        ignoreLocation: true,
        minMatchCharLength: 1
      }),
    [items, keys]
  )
  return useMemo(() => {
    const q = query.trim()
    if (!q) return [] as T[]
    return fuse.search(q, { limit }).map((r) => r.item)
  }, [fuse, query, limit])
}

export function useDebounced<T>(value: T, ms = 200): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
