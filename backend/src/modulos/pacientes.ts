import { rm, rmdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { Elysia } from 'elysia'
import type { Contexto } from '../contexto'
import { actualizarPaciente, crearPaciente, eliminarPaciente, listarPacientes } from '../datos/pacientes'
import {
  actualizarRevision,
  crearRevision,
  eliminarRevision,
  listarRevisiones,
} from '../datos/revisiones'
import { ErrorHttp } from '../lib/errores'
import { rutaSegura } from '../lib/rutas'
import { idParams, pacienteEntrada, revisionEntrada } from '../modelos'
import { normalizarPaciente, normalizarRevision } from '../validacion'
import { crearAcceso } from './acceso'

// borrarFotos elimina del disco las fotos de un paciente y su carpeta si queda vacía.
async function borrarFotos(fotosDir: string, archivos: string[]): Promise<void> {
  const rutas = archivos.map((f) => rutaSegura(fotosDir, f)).filter((r) => r !== null)
  await Promise.all(rutas.map((ruta) => rm(ruta, { force: true })))
  const carpetas = new Set(rutas.map((ruta) => dirname(ruta)))
  // rmdir falla si la carpeta no está vacía (otro paciente con el mismo nombre): se deja.
  await Promise.all([...carpetas].map((carpeta) => rmdir(carpeta).catch(() => undefined)))
}

export function moduloPacientes(ctx: Contexto) {
  const { db } = ctx
  return new Elysia({ name: 'pacientes' })
    .use(crearAcceso(ctx))
    .guard({ sesion: true })
    .get('/api/pacientes', () => listarPacientes(db))
    .post(
      '/api/pacientes',
      ({ body, status }) => status(201, crearPaciente(db, normalizarPaciente(body, new Date()))),
      { body: pacienteEntrada },
    )
    .put(
      '/api/pacientes/:id',
      ({ params, body }) => {
        const paciente = actualizarPaciente(db, params.id, normalizarPaciente(body, new Date()))
        if (paciente === null) throw new ErrorHttp(404, 'Paciente no encontrado')
        return paciente
      },
      { params: idParams, body: pacienteEntrada },
    )
    .delete(
      '/api/pacientes/:id',
      async ({ params }) => {
        const archivos = eliminarPaciente(db, params.id)
        if (archivos !== null) await borrarFotos(ctx.fotosDir, archivos)
        return { ok: true as const }
      },
      { params: idParams },
    )
    .get('/api/pacientes/:id/revisiones', ({ params }) => listarRevisiones(db, params.id), {
      params: idParams,
    })
    .post(
      '/api/pacientes/:id/revisiones',
      ({ params, body, status }) =>
        status(201, crearRevision(db, params.id, normalizarRevision(body, new Date()))),
      { params: idParams, body: revisionEntrada },
    )
    .put(
      '/api/revisiones/:id',
      ({ params, body }) => {
        const revision = actualizarRevision(db, params.id, normalizarRevision(body, new Date()))
        if (revision === null) throw new ErrorHttp(404, 'Revisión no encontrada')
        return revision
      },
      { params: idParams, body: revisionEntrada },
    )
    .delete(
      '/api/revisiones/:id',
      ({ params }) => {
        eliminarRevision(db, params.id)
        return { ok: true as const }
      },
      { params: idParams },
    )
}
