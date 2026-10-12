import { Suspense } from 'react'
import { Outlet } from '@tanstack/react-router'
import { Header } from './Header'
import { NavRail } from './NavRail'
import { ConfirmProvider } from '@/components/ui/ConfirmDialog'
import { CenteredSpinner } from '@/components/ui/Spinner'

export function AppShell() {
  return (
    <ConfirmProvider>
      <div className="flex h-full flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden max-md:block max-md:overflow-visible">
          <NavRail />
          <main className="flex flex-1 overflow-hidden max-md:block max-md:overflow-visible max-md:pb-[66px]">
            {/* Suspense para las rutas con carga diferida. */}
            <Suspense fallback={<CenteredSpinner />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </ConfirmProvider>
  )
}
