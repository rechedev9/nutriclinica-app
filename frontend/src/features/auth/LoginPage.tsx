import { useState } from 'react'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { useLogin, useMe } from './useAuth'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { ApiError } from '@/lib/api/client'

export function LoginPage() {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const login = useLogin()
  const navigate = useNavigate()
  const { data: me, isLoading: cargandoSesion } = useMe()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!usuario.trim() || !password) {
      setError('Introduce usuario y contraseña')
      return
    }
    try {
      await login.mutateAsync({ usuario: usuario.trim(), password })
      await navigate({ to: '/pacientes', replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al iniciar sesión')
    }
  }

  // Con la sesión ya iniciada no tiene sentido mostrar el formulario.
  if (cargandoSesion) return <CenteredSpinner />
  if (me) return <Navigate to="/pacientes" replace />

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0a3d4a 0%, #0F7B92 50%, #1aaccc 100%)' }}
    >
      <form
        onSubmit={onSubmit}
        className="w-[min(400px,92vw)] rounded-card bg-surface p-8 shadow-md"
      >
        <div className="mb-6 flex items-center gap-2">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0F7B92" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
            <path d="M12 6v6l4 2" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          </svg>
          <h1 className="text-2xl font-extrabold text-ink">NutriClínica</h1>
        </div>
        <p className="mb-6 text-sm text-ink-muted">Accede para gestionar tus pacientes.</p>

        <div className="flex flex-col gap-3">
          <input
            autoFocus
            name="usuario"
            autoComplete="username"
            className="w-full rounded-lg border border-border bg-app px-3 py-2.5 outline-hidden focus:border-primary focus:bg-surface"
            placeholder="Usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-border bg-app px-3 py-2.5 outline-hidden focus:border-primary focus:bg-surface"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" isLoading={login.isPending} className="mt-2 py-2.5">
            Entrar
          </Button>
        </div>
      </form>
    </div>
  )
}
