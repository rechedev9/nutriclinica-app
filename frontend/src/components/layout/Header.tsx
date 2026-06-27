import { useMe } from '@/features/auth/useAuth'

export function Header() {
  const { data: me } = useMe()
  return (
    <header className="flex h-[58px] shrink-0 items-center justify-between bg-primary px-6 text-white shadow-[0_2px_8px_rgba(15,123,146,0.3)]">
      <div className="flex items-center gap-2.5">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
          <path d="M12 6v6l4 2" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        </svg>
        <span className="text-xl font-bold">NutriClínica</span>
        <span className="hidden text-sm font-normal opacity-70 sm:inline">
          — Gestión de pacientes en nutrición
        </span>
      </div>
      <div className="flex items-center gap-3">
        {me && (
          <span className="text-[13px] font-semibold uppercase tracking-wider text-white/60">
            {me.usuario}
          </span>
        )}
        <a
          href="/logout"
          className="flex items-center gap-1.5 rounded-lg border border-white/25 px-3 py-1.5 text-[13px] font-semibold text-white/80 transition-colors hover:bg-white/15"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Salir
        </a>
      </div>
    </header>
  )
}
