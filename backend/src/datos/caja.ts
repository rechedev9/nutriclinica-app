import { desc, eq } from 'drizzle-orm'
import type { BD } from '../db/cliente'
import { ajustes, caja_cierres } from '../db/esquema'
import { aCentimos, aEuros } from '../lib/dinero'
import { ErrorHttp } from '../lib/errores'
import { fechaEs, fechaHoraLocal } from '../lib/fechas'
import type { AjustesDatos, CierreDatos } from '../validacion'
import { cierreDe, resumenCaja } from './ventas'

const INMEDIATA = { behavior: 'immediate' } as const

// --- Cierres ---

export function listarCierres(db: BD) {
  return db.select().from(caja_cierres).orderBy(desc(caja_cierres.fecha)).all()
}

export function cerrarCaja(db: BD, opciones: { datos: CierreDatos; usuario: string; ahora: Date }) {
  const { datos, usuario, ahora } = opciones
  return db.transaction((tx) => {
    if (cierreDe(tx, datos.fecha) !== null) {
      throw new ErrorHttp(409, `La caja del ${fechaEs(datos.fecha)} ya está cerrada`)
    }
    const resumen = resumenCaja(tx, datos.fecha)
    return tx
      .insert(caja_cierres)
      .values({
        ...datos,
        creado: fechaHoraLocal(ahora),
        usuario,
        num_ventas: resumen.num_ventas,
        total_ventas: resumen.total_ventas,
        total_devoluciones: resumen.total_devoluciones,
        efectivo: resumen.neto.efectivo,
        tarjeta: resumen.neto.tarjeta,
        bizum: resumen.neto.bizum,
        sin_indicar: resumen.neto.sin_indicar,
        efectivo_esperado: aEuros(aCentimos(datos.fondo_inicial) + aCentimos(resumen.neto.efectivo)),
      })
      .returning()
      .get()
  }, INMEDIATA)
}

// Reabrir borra el cierre: el día vuelve a admitir ventas, anulaciones y devoluciones.
export function reabrirCaja(db: BD, id: number) {
  const fila = db.delete(caja_cierres).where(eq(caja_cierres.id, id)).returning().all()[0]
  if (fila === undefined) throw new ErrorHttp(404, 'Cierre no encontrado')
  return fila
}

// --- Datos de la tienda para el ticket ---

export function leerAjustes(db: BD): AjustesDatos {
  const valores = new Map(
    db
      .select()
      .from(ajustes)
      .all()
      .map((f) => [f.clave, f.valor]),
  )
  const valor = (clave: keyof AjustesDatos) => valores.get(clave) ?? ''
  return {
    tienda_nombre: valor('tienda_nombre'),
    tienda_nif: valor('tienda_nif'),
    tienda_direccion: valor('tienda_direccion'),
    tienda_telefono: valor('tienda_telefono'),
    ticket_pie: valor('ticket_pie'),
  }
}

export function guardarAjustes(db: BD, datos: AjustesDatos): AjustesDatos {
  db.transaction((tx) => {
    for (const [clave, valor] of Object.entries(datos)) {
      tx.insert(ajustes).values({ clave, valor }).onConflictDoUpdate({ target: ajustes.clave, set: { valor } }).run()
    }
  }, INMEDIATA)
  return leerAjustes(db)
}
