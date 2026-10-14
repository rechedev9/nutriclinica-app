import { rm, rmdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { getTableColumns } from 'drizzle-orm'
import { Elysia } from 'elysia'
import type { Contexto } from '../contexto'
import { listarHistorial } from '../datos/auditoria'
import {
  actualizarPaciente,
  crearPaciente,
  eliminarPaciente,
  listarPacientes,
  obtenerPaciente,
} from '../datos/pacientes'
import {
  actualizarRevision,
  crearRevision,
  eliminarRevision,
  listarRevisiones,
  obtenerRevision,
} from '../datos/revisiones'
import { pacientes, revisiones } from '../db/esquema'
import { diferencias } from '../lib/cambios'
import { ErrorHttp } from '../lib/errores'
import { rutaSegura } from '../lib/rutas'
import { idParams, pacienteEntrada, revisionEntrada } from '../modelos'
import { normalizarPaciente, normalizarRevision } from '../validacion'
import { anotarAuditoria, crearAcceso } from './acceso'

// borrarFotos elimina del disco las fotos de un paciente y su carpeta si queda vacía.
async function borrarFotos(fotosDir: string, archivos: string[]): Promise<void> {
  const rutas = archivos.map((f) => rutaSegura(fotosDir, f)).filter((r) => r !== null)
  await Promise.all(rutas.map((ruta) => rm(ruta, { force: true })))
  const carpetas = new Set(rutas.map((ruta) => dirname(ruta)))
  // rmdir falla si la carpeta no está vacía (otro paciente con el mismo nombre): se deja.
  await Promise.all([...carpetas].map((carpeta) => rmdir(carpeta).catch(() => undefined)))
}

const CAMPOS_PACIENTE = Object.keys(getTableColumns(pacientes)).filter((c) => c !== 'id' && c !== 'creado')
const CAMPOS_REVISION = Object.keys(getTableColumns(revisiones)).filter((c) => c !== 'id' && c !== 'paciente_id')

function contar(n: number, formas: { una: string; varias: string }): string {
  return `${n} ${n === 1 ? formas.una : formas.varias}`
}

export function moduloPacientes(ctx: Contexto) {
  const { db } = ctx
  return new Elysia({ name: 'pacientes' })
    .use(crearAcceso(ctx))
    .guard({ sesion: true })
    .get('/api/pacientes', () => listarPacientes(db))
    .post(
      '/api/pacientes',
      ({ request, body, status }) => {
        const paciente = crearPaciente(db, normalizarPaciente(body, new Date()))
        anotarAuditoria(request, {
          pacienteId: paciente.id,
          detalle: { cambios: [], resumen: `Cliente «${paciente.nombre}»`, registro_id: paciente.id },
        })
        return status(201, paciente)
      },
      { body: pacienteEntrada },
    )
    .put(
      '/api/pacientes/:id',
      ({ request, params, body }) => {
        const antes = obtenerPaciente(db, params.id)
        const paciente = actualizarPaciente(db, params.id, normalizarPaciente(body, new Date()))
        if (antes === null || paciente === null) throw new ErrorHttp(404, 'Cliente no encontrado')
        anotarAuditoria(request, {
          pacienteId: paciente.id,
          detalle: {
            cambios: diferencias({ antes, despues: paciente, campos: CAMPOS_PACIENTE }),
            resumen: null,
            registro_id: paciente.id,
          },
        })
        return paciente
      },
      { params: idParams, body: pacienteEntrada },
    )
    .delete(
      '/api/pacientes/:id',
      async ({ request, params }) => {
        const antes = obtenerPaciente(db, params.id)
        const archivos = eliminarPaciente(db, params.id)
        if (antes !== null) {
          const resumen =
            `Cliente «${antes.nombre}», ${contar(antes.num_revisiones, { una: 'revisión', varias: 'revisiones' })} ` +
            `y ${contar(antes.num_fotos, { una: 'foto', varias: 'fotos' })}`
          anotarAuditoria(request, { pacienteId: antes.id, detalle: { cambios: [], resumen, registro_id: antes.id } })
        }
        if (archivos !== null) await borrarFotos(ctx.fotosDir, archivos)
        return { ok: true as const }
      },
      { params: idParams },
    )
    .get('/api/pacientes/:id/revisiones', ({ params }) => listarRevisiones(db, params.id), {
      params: idParams,
    })
    .get('/api/pacientes/:id/historial', ({ params }) => listarHistorial(db, params.id), { params: idParams })
    .post(
      '/api/pacientes/:id/revisiones',
      ({ request, params, body, status }) => {
        const revision = crearRevision(db, params.id, normalizarRevision(body, new Date()))
        anotarAuditoria(request, {
          pacienteId: revision.paciente_id,
          detalle: { cambios: [], resumen: `Revisión del ${revision.fecha ?? ''}`, registro_id: revision.id },
        })
        return status(201, revision)
      },
      { params: idParams, body: revisionEntrada },
    )
    .put(
      '/api/revisiones/:id',
      ({ request, params, body }) => {
        const antes = obtenerRevision(db, params.id)
        const revision = actualizarRevision(db, params.id, normalizarRevision(body, new Date()))
        if (antes === null || revision === null) throw new ErrorHttp(404, 'Revisión no encontrada')
        anotarAuditoria(request, {
          pacienteId: revision.paciente_id,
          detalle: {
            cambios: diferencias({ antes, despues: revision, campos: CAMPOS_REVISION }),
            resumen: `Revisión del ${revision.fecha ?? ''}`,
            registro_id: revision.id,
          },
        })
        return revision
      },
      { params: idParams, body: revisionEntrada },
    )
    .delete(
      '/api/revisiones/:id',
      ({ request, params }) => {
        const antes = obtenerRevision(db, params.id)
        eliminarRevision(db, params.id)
        if (antes !== null) {
          anotarAuditoria(request, {
            pacienteId: antes.paciente_id,
            detalle: { cambios: [], resumen: `Revisión del ${antes.fecha ?? ''}`, registro_id: antes.id },
          })
        }
        return { ok: true as const }
      },
      { params: idParams },
    )
}
