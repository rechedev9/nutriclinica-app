import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'
type Effective = 'light' | 'dark'

const STORAGE_KEY = 'nutri-theme'

interface ThemeCtx {
  pref: ThemePref
  effective: Effective
  setPref: (p: ThemePref) => void
  toggle: () => void
}

const Ctx = createContext<ThemeCtx | null>(null)

function systemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readPref(): ThemePref {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
}

function resolve(pref: ThemePref): Effective {
  if (pref === 'system') return systemDark() ? 'dark' : 'light'
  return pref
}

function apply(effective: Effective) {
  document.documentElement.classList.toggle('dark', effective === 'dark')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(readPref)
  const [effective, setEffective] = useState<Effective>(() => resolve(readPref()))

  // Aplica la clase y reacciona a cambios del sistema cuando pref = system.
  useEffect(() => {
    const eff = resolve(pref)
    setEffective(eff)
    apply(eff)
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const e = systemDark() ? 'dark' : 'light'
      setEffective(e)
      apply(e)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  const setPref = useCallback((p: ThemePref) => {
    localStorage.setItem(STORAGE_KEY, p)
    setPrefState(p)
  }, [])

  // Toggle explícito: alterna entre claro y oscuro según lo que se ve ahora.
  const toggle = useCallback(() => {
    setPref(resolve(readPref()) === 'dark' ? 'light' : 'dark')
  }, [setPref])

  const value = useMemo(() => ({ pref, effective, setPref, toggle }), [pref, effective, setPref, toggle])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return ctx
}
