import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number | null, decimals: number, duration = 1800): string {
  const [display, setDisplay] = useState<string>(target != null ? (0).toFixed(decimals) : '-')
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (target == null) {
      setDisplay('-')
      return
    }
    const t0 = performance.now()
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)

    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      const e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p
      setDisplay((e * target).toFixed(decimals))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, decimals, duration])

  return display
}
