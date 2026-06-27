import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { NavRail } from './NavRail'
import { ConfirmProvider } from '@/components/ui/ConfirmDialog'

export function AppShell() {
  return (
    <ConfirmProvider>
      <div className="flex h-full flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden max-md:block max-md:overflow-visible">
          <NavRail />
          <main className="flex flex-1 overflow-hidden max-md:block max-md:overflow-visible max-md:pb-[66px]">
            <Outlet />
          </main>
        </div>
      </div>
    </ConfirmProvider>
  )
}
