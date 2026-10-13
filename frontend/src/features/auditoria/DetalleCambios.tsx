import { describirCambio } from './cambios'
import type { CambioCampo } from './cambios'

// Los campos cambiados de una entrada del registro, uno por línea: «Peso: 78,5 kg → 77,9 kg».
export function DetalleCambios({ cambios }: { cambios: readonly CambioCampo[] }) {
  if (cambios.length === 0) return null
  return (
    <ul className="mt-1 flex flex-col gap-0.5 text-[13px] text-ink-muted">
      {cambios.map((c) => (
        <li key={c.campo} className="break-words tabular-nums">
          {describirCambio(c)}
        </li>
      ))}
    </ul>
  )
}
