import { randomBytes } from 'node:crypto'
import { mkdir, rm } from 'node:fs/promises'
import { dirname, extname } from 'node:path'
import { Elysia, t } from 'elysia'
import type { Contexto } from '../contexto'
import { crearFoto, eliminarFoto, listarFotos, obtenerFoto } from '../datos/fotos'
import { obtenerPaciente } from '../datos/pacientes'
import { ErrorHttp } from '../lib/errores'
import { selloArchivo } from '../lib/fechas'
import { EXTENSIONES_IMAGEN, extensionImagen } from '../lib/imagen'
import { carpeta, prefijo } from '../lib/naming'
import { rutaSegura } from '../lib/rutas'
import { vacioANulo } from '../lib/texto'
import { idParams } from '../modelos'
import { anotarAuditoria, crearAcceso } from './acceso'

const MAX_BYTES = 32 * 1024 * 1024

const fotoEntrada = t.Object({
  foto: t.Optional(t.File()),
  nota: t.Optional(t.String()),
})

export function moduloFotos(ctx: Contexto) {
  const { db, fotosDir } = ctx
  return new Elysia({ name: 'fotos' })
    .use(crearAcceso(ctx))
    .guard({ sesion: true })
    .get('/api/pacientes/:id/fotos', ({ params }) => listarFotos(db, params.id), { params: idParams })
    .post(
      '/api/pacientes/:id/fotos',
      async ({ request, params, body, status }) => {
        const archivo = body.foto
        if (archivo === undefined) throw new ErrorHttp(400, 'Sin archivo')
        if (archivo.size > MAX_BYTES) throw new ErrorHttp(400, 'La imagen no puede superar los 32 MB')
        const bytes = new Uint8Array(await archivo.arrayBuffer())
        const detectada = extensionImagen(bytes)
        if (detectada === null) throw new ErrorHttp(400, 'El archivo no es una imagen')
        const paciente = obtenerPaciente(db, params.id)
        if (paciente === null) throw new ErrorHttp(404, 'Cliente no encontrado')

        // Se conserva la extensión original solo si es de imagen: nunca .html, .svg, etc.
        const original = extname(archivo.name).toLowerCase()
        const extension = EXTENSIONES_IMAGEN.find((e) => e === original) ?? detectada
        // Un nombre sin letras ASCII daría una carpeta vacía: se usa el id.
        const subcarpeta = carpeta(paciente.nombre) || `Paciente${paciente.id}`
        const base = prefijo(paciente.nombre) || `paciente${paciente.id}`
        const nombre = `${base}_${selloArchivo(new Date())}_${randomBytes(3).toString('hex')}${extension}`
        const filename = `${subcarpeta}/${nombre}`
        const destino = rutaSegura(fotosDir, filename)
        if (destino === null) throw new ErrorHttp(400, 'Ruta inválida')

        await mkdir(dirname(destino), { recursive: true })
        await Bun.write(destino, bytes)
        try {
          const foto = crearFoto(db, { paciente_id: paciente.id, filename, nota: vacioANulo(body.nota?.trim()) })
          anotarAuditoria(request, {
            pacienteId: paciente.id,
            detalle: {
              cambios: [],
              resumen: foto.nota === null ? 'Foto de progreso' : `Foto de progreso: ${foto.nota}`,
              registro_id: foto.id,
            },
          })
          return status(201, foto)
        } catch (error) {
          await rm(destino, { force: true })
          throw error
        }
      },
      { params: idParams, body: fotoEntrada },
    )
    .delete(
      '/api/fotos/:id',
      async ({ request, params }) => {
        const foto = obtenerFoto(db, params.id)
        if (foto !== null) {
          eliminarFoto(db, params.id)
          const fecha = foto.fecha?.slice(0, 10) ?? ''
          anotarAuditoria(request, {
            pacienteId: foto.paciente_id,
            detalle: {
              cambios: [],
              resumen: `Foto del ${fecha}${foto.nota === null ? '' : `: ${foto.nota}`}`,
              registro_id: foto.id,
            },
          })
          const ruta = rutaSegura(fotosDir, foto.filename)
          if (ruta !== null) await rm(ruta, { force: true })
        }
        return { ok: true as const }
      },
      { params: idParams },
    )
    .get('/fotos/*', async ({ params }) => {
      const ruta = rutaSegura(fotosDir, params['*'])
      if (ruta === null) throw new ErrorHttp(400, 'Ruta inválida')
      const archivo = Bun.file(ruta)
      const esImagen = EXTENSIONES_IMAGEN.some((e) => e === extname(ruta).toLowerCase())
      if (!esImagen || !(await archivo.exists())) throw new ErrorHttp(404, 'No encontrado')
      return archivo
    })
}
