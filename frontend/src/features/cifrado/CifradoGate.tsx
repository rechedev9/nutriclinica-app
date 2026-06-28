import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ApiError } from '@/lib/api/client'
import { useConfigurar, useEstadoCifrado, useRefrescarEstado, useUnlock } from './useCifrado'

// Marco común: fondo degradado + tarjeta centrada (igual que el login).
function Marco({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0a3d4a 0%, #0F7B92 50%, #1aaccc 100%)' }}
    >
      <div className="w-[min(440px,92vw)] rounded-card bg-surface p-8 shadow-md">{children}</div>
    </div>
  )
}

function Candado() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0F7B92" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

const inputCls =
  'w-full rounded-lg border border-border bg-app px-3 py-2.5 outline-none focus:border-primary focus:bg-surface'

// CifradoGate decide la pantalla según el estado del cifrado en reposo. En modo
// no cifrado el estado es "abierto" y se renderiza la app directamente.
export function CifradoGate({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useEstadoCifrado()

  if (isLoading) {
    return (
      <Marco>
        <div className="flex justify-center py-6">
          <Spinner className="h-8 w-8" />
        </div>
      </Marco>
    )
  }

  // Si el endpoint fallara, no bloquear: el backend ya impone el cierre.
  const estado = isError ? 'abierto' : (data?.estado ?? 'abierto')

  if (estado === 'abierto') return <>{children}</>
  if (estado === 'bloqueado') return <PantallaDesbloqueo />
  return <PantallaConfigurar migrar={estado === 'migrar'} />
}

function PantallaConfigurar({ migrar }: { migrar: boolean }) {
  const configurar = useConfigurar()
  const refrescar = useRefrescarEstado()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    try {
      const res = await configurar.mutateAsync(password)
      setRecoveryKey(res.recovery_key)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo configurar el cifrado.')
    }
  }

  if (recoveryKey) {
    return (
      <Marco>
        <h1 className="mb-2 text-xl font-extrabold text-ink">Guarda tu clave de recuperación</h1>
        <p className="mb-4 text-sm text-ink-muted">
          Es la <span className="font-semibold text-ink">única</span> forma de recuperar los datos si olvidas la
          contraseña. Guárdala en un lugar seguro (gestor de contraseñas). No se volverá a mostrar.
        </p>
        <div className="mb-3 select-all break-all rounded-lg border border-border bg-app px-3 py-3 text-center font-mono text-[15px] font-semibold tracking-wide text-ink">
          {recoveryKey}
        </div>
        <Button
          variant="outline"
          className="mb-3 w-full"
          onClick={() => navigator.clipboard?.writeText(recoveryKey)}
        >
          Copiar al portapapeles
        </Button>
        <Button className="w-full" onClick={refrescar}>
          La he guardado, continuar
        </Button>
      </Marco>
    )
  }

  return (
    <Marco>
      <div className="mb-4 flex items-center gap-2.5">
        <Candado />
        <h1 className="text-xl font-extrabold text-ink">
          {migrar ? 'Cifrar tus datos' : 'Configura el cifrado'}
        </h1>
      </div>
      <p className="mb-5 text-sm text-ink-muted">
        {migrar
          ? 'Se cifrarán tus datos actuales en reposo. Elige una contraseña maestra que pedirá la app al abrir.'
          : 'Elige una contraseña maestra. La app la pedirá al abrir para descifrar los datos.'}
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          autoFocus
          type="password"
          name="new-password"
          autoComplete="new-password"
          className={inputCls}
          placeholder="Contraseña maestra (mín. 8)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          className={inputCls}
          placeholder="Repite la contraseña"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" isLoading={configurar.isPending} className="mt-1 py-2.5">
          {migrar ? 'Cifrar y continuar' : 'Configurar'}
        </Button>
      </form>
    </Marco>
  )
}

function PantallaDesbloqueo() {
  const unlock = useUnlock()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await unlock.mutateAsync(password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo desbloquear.')
    }
  }

  return (
    <Marco>
      <div className="mb-4 flex items-center gap-2.5">
        <Candado />
        <h1 className="text-xl font-extrabold text-ink">NutriClínica</h1>
      </div>
      <p className="mb-5 text-sm text-ink-muted">
        Introduce tu contraseña maestra (o tu clave de recuperación) para abrir los datos.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          autoFocus
          type="password"
          name="password"
          autoComplete="current-password"
          className={inputCls}
          placeholder="Contraseña maestra o clave de recuperación"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" isLoading={unlock.isPending} className="mt-1 py-2.5">
          Desbloquear
        </Button>
      </form>
    </Marco>
  )
}
