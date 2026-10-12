import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useMe } from '@/features/auth/useAuth'
import { cn } from '@/lib/cn'

interface Item {
  to: LinkProps['to']
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
  {
    to: '/auditoria',
    label: 'Auditoría',
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 13h6M9 17h4" />
      </svg>
    ),
  },
]

const STORAGE_KEY = 'nutri-sidebar'

export function NavRail() {
  const { data: me } = useMe()
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem(STORAGE_KEY) === '1')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  const visible = items.filter((i) => !i.adminOnly || me?.rol === 'admin')

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'print-hide z-30 flex shrink-0 flex-col gap-1 border-r border-border bg-surface p-3 transition-[width] duration-200',
        collapsed ? 'md:w-16' : 'md:w-56',
        // Móvil: barra de navegación inferior (no colapsa).
        'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:w-auto max-md:flex-row max-md:justify-around max-md:gap-0 max-md:border-r-0 max-md:border-t max-md:p-1.5 max-md:shadow-[0_-2px_12px_rgba(15,27,45,.08)]',
      )}
    >
      {visible.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          title={collapsed ? item.label : undefined}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
            'max-md:flex-1 max-md:flex-col max-md:gap-1 max-md:px-1 max-md:py-2 max-md:text-[11.5px]',
            collapsed && 'md:justify-center md:px-0',
          )}
          activeProps={{ className: 'bg-primary-light text-primary' }}
          inactiveProps={{ className: 'text-ink-muted hover:bg-surface-2 hover:text-ink' }}
        >
          <span className="shrink-0 [&>svg]:h-[22px] [&>svg]:w-[22px]">{item.icon}</span>
          <span className={cn('truncate', collapsed && 'md:hidden')}>{item.label}</span>
        </Link>
      ))}

      {/* Botón colapsar/expandir (solo escritorio) */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expandir' : 'Colapsar'}
        className={cn(
          'mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink max-md:hidden',
          collapsed && 'md:justify-center md:px-0',
        )}
      >
        <span className="shrink-0">
          <svg
            className={cn('h-[20px] w-[20px] transition-transform', collapsed && 'rotate-180')}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </span>
        <span className={cn('truncate', collapsed && 'md:hidden')}>Colapsar</span>
      </button>
    </nav>
  )
}
