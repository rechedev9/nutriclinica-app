import { Elysia, t } from 'elysia'
import ExcelJS from 'exceljs'
import type { Contexto } from '../contexto'
import { listarPacientes, obtenerPaciente } from '../datos/pacientes'
import { listarRevisiones, listarRevisionesConNombre, obtenerRevision } from '../datos/revisiones'
import { ErrorHttp } from '../lib/errores'
import { selloArchivo } from '../lib/fechas'
import { idParams } from '../modelos'
import { PERIMETROS, PLIEGUES } from '../validacion'
import { crearAcceso } from './acceso'

const VERDE = 'FF16A34A'
const BLANCO = 'FFFFFFFF'
const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

type Celda = string | number | null

const COLUMNAS_PACIENTES: [string, number][] = [
  ['ID', 6],
  ['Nombre', 28],
  ['Fecha nac.', 14],
  ['Sexo', 10],
  ['DNI', 14],
  ['Teléfono', 14],
  ['Email', 28],
  ['Objetivo', 22],
  ['Actividad física', 20],
  ['Intolerancias', 30],
  ['Patologías', 30],
  ['Notas', 35],
  ['Nº revisiones', 12],
  ['Nº fotos', 8],
  ['Fecha alta', 18],
]

const COLUMNAS_REVISIONES: [string, number][] = [
  ['ID Rev.', 8],
  ['Cliente', 28],
  ['Fecha revisión', 16],
  ['Peso (kg)', 10],
  ['Talla (cm)', 10],
  ['Envergadura (cm)', 14],
  ['Pl. Bicipital', 13],
  ['Pl. Tricipital', 13],
  ['Pl. Subescapular', 16],
  ['Pl. Supraespinal', 16],
  ['Pl. Supracrestal', 16],
  ['Pl. Abdominal', 14],
  ['Pl. Muslo int.', 14],
  ['Pl. Pierna med.', 15],
  ['Per. Antebrazo', 14],
  ['Per. Brazo rel.', 14],
  ['Per. Brazo cont.', 15],
  ['Per. Hombros', 13],
  ['Per. Pecho', 11],
  ['Per. Cintura', 12],
  ['Per. Caderas', 12],
  ['Per. Muslo', 11],
  ['Per. Muslo cont.', 14],
  ['Per. Gemelo', 12],
  ['Notas', 35],
]

// Etiquetas de la hoja de una revisión, en el orden de PLIEGUES y PERIMETROS.
const ETIQUETAS_MEDIDAS = [
  'Pl. Bicipital',
  'Pl. Tricipital',
  'Pl. Subescapular',
  'Pl. Supraespinal',
  'Pl. Supracrestal',
  'Pl. Abdominal',
  'Pl. Muslo int.',
  'Pl. Pierna med.',
  'Per. Antebrazo',
  'Per. Brazo relaj.',
  'Per. Brazo cont.',
  'Per. Hombros',
  'Per. Pecho',
  'Per. Cintura',
  'Per. Caderas',
  'Per. Muslo',
  'Per. Muslo cont.',
  'Per. Gemelo',
]

function hojaConCabecera(libro: ExcelJS.Workbook, nombre: string, columnas: [string, number][]) {
  const hoja = libro.addWorksheet(nombre)
  hoja.columns = columnas.map(([header, width]) => ({ header, width }))
  const cabecera = hoja.getRow(1)
  cabecera.height = 22
  cabecera.eachCell((celda) => {
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } }
    celda.font = { bold: true, color: { argb: BLANCO }, size: 11 }
    celda.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  return hoja
}

// contentDisposition da un nombre ASCII de respaldo y el nombre real en UTF-8 (RFC 5987).
function contentDisposition(nombre: string): string {
  const seguro = [...nombre].map((c) => (c < ' ' || '/\\:*?"<>|'.includes(c) ? '_' : c)).join('')
  const ascii = [...seguro].map((c) => (c > '~' ? '_' : c)).join('')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(seguro)}`
}

async function enviar(libro: ExcelJS.Workbook, nombre: string): Promise<Response> {
  const contenido = await libro.xlsx.writeBuffer()
  return new Response(contenido, {
    headers: { 'content-type': TIPO_XLSX, 'content-disposition': contentDisposition(nombre) },
  })
}

export function moduloExportar(ctx: Contexto) {
  const { db } = ctx
  return new Elysia({ name: 'exportar' })
    .use(crearAcceso(ctx))
    .guard({ sesion: true })
    .get(
      '/api/exportar-excel',
      ({ query }) => {
        const unico = query.id === undefined ? null : obtenerPaciente(db, query.id)
        if (query.id !== undefined && unico === null) throw new ErrorHttp(404, 'Cliente no encontrado')
        const pacientes = unico === null ? listarPacientes(db) : [unico]
        const revisiones =
          unico === null
            ? listarRevisionesConNombre(db)
            : listarRevisiones(db, unico.id).map((r) => ({ ...r, paciente_nombre: unico.nombre }))

        const libro = new ExcelJS.Workbook()
        const hojaPacientes = hojaConCabecera(libro, 'Clientes', COLUMNAS_PACIENTES)
        for (const p of pacientes) {
          const fila: Celda[] = [
            p.id,
            p.nombre,
            p.fecha_nac,
            p.sexo,
            p.dni,
            p.telefono,
            p.email,
            p.objetivo,
            p.actividad_fisica,
            p.intolerancias,
            p.patologias,
            p.notas,
            p.num_revisiones,
            p.num_fotos,
            p.creado,
          ]
          hojaPacientes.addRow(fila)
        }
        const hojaRevisiones = hojaConCabecera(libro, 'Revisiones', COLUMNAS_REVISIONES)
        for (const r of revisiones) {
          const fila: Celda[] = [
            r.id,
            r.paciente_nombre,
            r.fecha,
            r.peso,
            r.talla,
            r.envergadura,
            ...PLIEGUES.map((campo) => r[campo]),
            ...PERIMETROS.map((campo) => r[campo]),
            r.notas,
          ]
          hojaRevisiones.addRow(fila)
        }
        const base = unico === null ? 'nutricion' : unico.nombre.replaceAll(' ', '_')
        return enviar(libro, `${base}_${selloArchivo(new Date()).slice(0, 13)}.xlsx`)
      },
      { query: t.Object({ id: t.Optional(t.Numeric()) }) },
    )
    .get(
      '/api/exportar-revision/:id',
      ({ params }) => {
        const revision = obtenerRevision(db, params.id)
        if (revision === null) throw new ErrorHttp(404, 'No encontrado')
        const paciente = obtenerPaciente(db, revision.paciente_id)
        if (paciente === null) throw new ErrorHttp(404, 'Cliente no encontrado')

        const libro = new ExcelJS.Workbook()
        const hoja = libro.addWorksheet('Revisión')
        hoja.getColumn(1).width = 28
        hoja.getColumn(2).width = 35
        const fecha = revision.fecha ?? ''

        hoja.mergeCells('A1:B1')
        const titulo = hoja.getCell('A1')
        titulo.value = `Revisión: ${paciente.nombre}  (${fecha})`
        titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } }
        titulo.font = { bold: true, color: { argb: BLANCO }, size: 12 }
        titulo.alignment = { horizontal: 'center', vertical: 'middle' }
        hoja.getRow(1).height = 24

        const seccion = (texto: string) => {
          hoja.addRow([texto]).getCell(1).font = { bold: true, size: 10, color: { argb: VERDE } }
        }
        const dato = (etiqueta: string, valor: Celda) => {
          hoja.addRow([etiqueta, valor]).getCell(1).font = { bold: true, size: 11 }
        }

        seccion('DATOS DEL CLIENTE')
        dato('Nombre', paciente.nombre)
        dato('Fecha nacimiento', paciente.fecha_nac)
        dato('Sexo', paciente.sexo)
        dato('DNI', paciente.dni)
        dato('Teléfono', paciente.telefono)
        dato('Email', paciente.email)
        dato('Objetivo', paciente.objetivo)
        dato('Actividad física', paciente.actividad_fisica)
        dato('Talla (cm)', paciente.talla)
        dato('Peso inicial (kg)', paciente.peso)
        hoja.addRow([])
        seccion('MEDIDAS DE LA REVISIÓN')
        dato('Fecha revisión', fecha)
        dato('Peso (kg)', revision.peso)
        dato('Envergadura (cm)', revision.envergadura)
        const medidas = [...PLIEGUES, ...PERIMETROS].map((campo) => revision[campo])
        ETIQUETAS_MEDIDAS.forEach((etiqueta, i) => dato(etiqueta, medidas[i] ?? null))
        dato('Notas', revision.notas)

        const nombre = paciente.nombre.replaceAll(' ', '_')
        return enviar(libro, `revision_${nombre}_${fecha === '' ? 'sin_fecha' : fecha}.xlsx`)
      },
      { params: idParams },
    )
}
