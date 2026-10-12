import { Link } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { useMe } from '@/features/auth/useAuth'

// Página 404 en español. Muestra la cabecera de la app solo si hay sesión.
export function NoEncontrada() {
  const { data: me } = useMe()
  return (
    <div className="flex h-full flex-col bg-app text-ink">
      {me && <Header />}
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="text-5xl font-extrabold text-primary">404</div>
        <h1 className="text-xl font-bold">Página no encontrada</h1>
        <p className="max-w-md text-sm text-ink-muted">La dirección que has abierto no existe o ha cambiado.</p>
        <Link
          to="/pacientes"
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-[15px] font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          Ir a Pacientes
        </Link>
      </main>
    </div>
  )
}
