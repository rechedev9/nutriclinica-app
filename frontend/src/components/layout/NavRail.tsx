import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useMe } from '@/features/auth/useAuth'
import { cn } from '@/lib/cn'

interface Item {
  to: string
  label: string
  icon: ReactNode
  adminOnly?: boolean
}

const items: Item[] = [
  {
    to: '/pacientes',
    label: 'Pacientes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/stock',
    label: 'Stock',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    to: '/usuarios',
    label: 'Usuarios',
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
]

export function NavRail() {
  const { data: me } = useMe()
  const visible = items.filter((i) => !i.adminOnly || me?.rol === 'admin')

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'z-30 flex shrink-0 flex-col gap-1.5 border-r border-border bg-surface p-3',
        'w-[88px]',
        'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:w-auto max-md:flex-row max-md:justify-around max-md:border-r-0 max-md:border-t max-md:shadow-[0_-2px_12px_rgba(15,27,45,.08)]',
      )}
    >
      {visible.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-2.5 text-[11.5px] font-semibold transition-colors max-md:flex-1',
              isActive ? 'bg-primary-light text-primary' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
            )
          }
        >
          <span className="[&>svg]:h-[22px] [&>svg]:w-[22px]">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
