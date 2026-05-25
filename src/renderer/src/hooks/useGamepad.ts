import { useEffect } from 'react'

type Direction = 'up' | 'down' | 'left' | 'right'

function moveFocus(dir: Direction) {
  const focusables = Array.from(
    document.querySelectorAll<HTMLElement>(
      'a, button, [role="button"], input, select, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null)

  const active = document.activeElement as HTMLElement | null
  if (!active || !focusables.includes(active)) {
    focusables[0]?.focus()
    return
  }

  const rect = active.getBoundingClientRect()
  let best: { el: HTMLElement; score: number } | null = null
  for (const el of focusables) {
    if (el === active) continue
    const r = el.getBoundingClientRect()
    const dx = r.left + r.width / 2 - (rect.left + rect.width / 2)
    const dy = r.top + r.height / 2 - (rect.top + rect.height / 2)
    let primary = 0
    let cross = 0
    if (dir === 'right') {
      if (dx <= 0) continue
      primary = dx
      cross = Math.abs(dy)
    } else if (dir === 'left') {
      if (dx >= 0) continue
      primary = -dx
      cross = Math.abs(dy)
    } else if (dir === 'down') {
      if (dy <= 0) continue
      primary = dy
      cross = Math.abs(dx)
    } else {
      if (dy >= 0) continue
      primary = -dy
      cross = Math.abs(dx)
    }
    const score = primary + cross * 2
    if (!best || score < best.score) best = { el, score }
  }
  best?.el.focus()
  best?.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

const BTN_A = 0
const BTN_B = 1
const DPAD_UP = 12
const DPAD_DOWN = 13
const DPAD_LEFT = 14
const DPAD_RIGHT = 15

export function useGamepad() {
  useEffect(() => {
    let raf = 0
    const lastPressed = new Map<number, number>()
    const REPEAT_MS = 250

    const poll = () => {
      const pads = navigator.getGamepads?.() ?? []
      const pad = pads[0]
      if (pad) {
        const now = performance.now()
        const press = (idx: number, action: () => void) => {
          if (!pad.buttons[idx]?.pressed) {
            lastPressed.delete(idx)
            return
          }
          const last = lastPressed.get(idx) ?? 0
          if (now - last < REPEAT_MS) return
          lastPressed.set(idx, now)
          action()
        }
        press(DPAD_UP, () => moveFocus('up'))
        press(DPAD_DOWN, () => moveFocus('down'))
        press(DPAD_LEFT, () => moveFocus('left'))
        press(DPAD_RIGHT, () => moveFocus('right'))
        press(BTN_A, () => (document.activeElement as HTMLElement | null)?.click())
        press(BTN_B, () => window.history.back())
        // Left stick for analog navigation
        const [ax, ay] = [pad.axes[0] ?? 0, pad.axes[1] ?? 0]
        const TH = 0.6
        if (Math.abs(ax) > TH || Math.abs(ay) > TH) {
          const last = lastPressed.get(99) ?? 0
          if (now - last >= REPEAT_MS) {
            lastPressed.set(99, now)
            if (Math.abs(ax) > Math.abs(ay))
              moveFocus(ax > 0 ? 'right' : 'left')
            else moveFocus(ay > 0 ? 'down' : 'up')
          }
        }
      }
      raf = requestAnimationFrame(poll)
    }
    raf = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(raf)
  }, [])
}
