import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { useMe } from '@/features/auth/useAuth'
import { intentar } from '@/lib/api/intentar'
import { hoyLocal } from '@/lib/format/fecha'
import { useGuardarTienda, useTienda } from '../hooks/useVentas'
import { Ticket } from '../components/Ticket'
import type { Tienda, Venta } from '@/types'

// Venta de muestra para ver cómo queda el ticket con los datos escritos.
function ventaDeMuestra(usuario: string): Venta {
  const hoy = hoyLocal()
  return {
    id: 123,
    numero: 'V-000123',
    fecha: hoy,
    creado: `${hoy} 11:30:00`,
    usuario,
    paciente_id: null,
    paciente_nombre: null,
    notas: null,
    total: 42.5,
    estado: 'completada',
    entregado: 50,
    anulacion_motivo: null,
    anulacion_fecha: null,
    anulacion_usuario: null,
    situacion: 'completada',
    total_devuelto: 0,
    devoluciones: [],
    pagos: [{ metodo: 'efectivo', importe: 42.5 }],
    lineas: [
      {
        id: 1,
        producto_id: 1,
        producto_nombre: 'Proteína whey 1 kg',
        unidad: 'bote',
        cantidad: 1,
        precio_unitario: 34.9,
        descuento: 0,
        iva: 10,
        importe: 34.9,
        devuelto: 0,
      },
      {
        id: 2,
        producto_id: 2,
        producto_nombre: 'Barrita proteica',
        unidad: 'ud',
        cantidad: 4,
        precio_unitario: 2.1,
        descuento: 0.8,
        iva: 10,
        importe: 7.6,
        devuelto: 0,
      },
    ],
  }
}

function Formulario({ inicial, editable }: { inicial: Tienda; editable: boolean }) {
  const guardar = useGuardarTienda()
  const { data: me } = useMe()
  const [datos, setDatos] = useState<Tienda>(inicial)
  const cambiado = JSON.stringify(datos) !== JSON.stringify(inicial)

  function campo(clave: keyof Tienda) {
    return {
      value: datos[clave],
      disabled: !editable,
      onChange: (e: { target: { value: string } }) => setDatos((d) => ({ ...d, [clave]: e.target.value })),
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form
        className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card"
        onSubmit={(e) => {
          e.preventDefault()
          void intentar(guardar.mutateAsync(datos))
        }}
      >
        <h3 className="text-lg font-bold">Datos del ticket</h3>
        <p className="text-sm text-ink-muted">
          Salen en la cabecera y el pie de cada justificante de venta.
          {!editable && ' Solo un administrador puede cambiarlos.'}
        </p>
        <Field label="Nombre de la tienda">
          <Input {...campo('tienda_nombre')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="NIF">
            <Input {...campo('tienda_nif')} />
          </Field>
          <Field label="Teléfono">
            <Input {...campo('tienda_telefono')} />
          </Field>
        </div>
        <Field label="Dirección">
          <Input {...campo('tienda_direccion')} />
        </Field>
        <Field label="Pie del ticket">
          <Textarea
            {...campo('ticket_pie')}
            placeholder="Gracias por tu compra. Cambios y devoluciones en 15 días con el ticket."
          />
        </Field>
        {editable && (
          <Button type="submit" className="self-end" isLoading={guardar.isPending} disabled={!cambiado}>
            Guardar
          </Button>
        )}
      </form>
      <section className="rounded-card bg-surface p-4 shadow-card">
        <h4 className="mb-3 text-sm font-semibold text-ink-muted">Vista previa</h4>
        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <Ticket venta={ventaDeMuestra(me?.usuario ?? 'admin')} tienda={datos} />
        </div>
      </section>
    </div>
  )
}

export function TicketTab() {
  const { data, isLoading, isError, error, refetch, isFetching } = useTienda()
  const { data: me } = useMe()
  if (isLoading) return <CenteredSpinner />
  if (isError || !data)
    return (
      <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="los datos del ticket" />
    )
  return (
    <div className="p-4 sm:p-6">
      <Formulario inicial={data} editable={me?.rol === 'admin'} />
    </div>
  )
}
