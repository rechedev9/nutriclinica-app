import { create } from 'zustand'

type ThemePref = 'light' | 'dark' | 'system'
type Effective = 'light' | 'dark'

const STORAGE_KEY = 'nutri-theme'
const sistemaOscuro = window.matchMedia('(prefers-color-scheme: dark)')

function readPref(): ThemePref {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
}

function resolve(pref: ThemePref): Effective {
  if (pref === 'system') return sistemaOscuro.matches ? 'dark' : 'light'
  return pref
}

function apply(effective: Effective) {
  document.documentElement.classList.toggle('dark', effective === 'dark')
}

interface ThemeState {
  pref: ThemePref
  effective: Effective
  toggle: () => void
}

export const useTheme = create<ThemeState>()((set, get) => ({
  pref: readPref(),
  effective: resolve(readPref()),
  // Toggle explícito: alterna entre claro y oscuro según lo que se ve ahora.
  toggle: () => {
    const pref = get().effective === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, pref)
    apply(pref)
    set({ pref, effective: pref })
  },
}))

apply(useTheme.getState().effective)

// El tema del sistema puede cambiar con la app abierta: solo cuenta si pref = system.
sistemaOscuro.addEventListener('change', () => {
  if (useTheme.getState().pref !== 'system') return
  const effective = resolve('system')
  apply(effective)
  useTheme.setState({ effective })
})
