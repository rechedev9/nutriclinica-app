import type { ClaveMedida, RevisionInput } from '@/types'

function numero(valor: string | undefined): number | null {
  if (valor === undefined || valor.trim() === '') return null
  return Number(valor)
}

export function cuerpoRevision(origen: { valores: Record<string, string>; talla: number | null }): RevisionInput {
  const v = origen.valores
  const medida = (clave: ClaveMedida) => numero(v[clave])
  return {
    fecha: v.fecha?.trim() || null,
    peso: numero(v.peso),
    talla: origen.talla,
    envergadura: numero(v.envergadura),
    notas: v.notas?.trim() || null,
    pl_bicipital: medida('pl_bicipital'),
    pl_tricipital: medida('pl_tricipital'),
    pl_subescapular: medida('pl_subescapular'),
    pl_supraespinal: medida('pl_supraespinal'),
    pl_supracrestal: medida('pl_supracrestal'),
    pl_abdominal: medida('pl_abdominal'),
    pl_muslo_int: medida('pl_muslo_int'),
    pl_pierna_med: medida('pl_pierna_med'),
    per_antebrazo: medida('per_antebrazo'),
    per_brazo_rel: medida('per_brazo_rel'),
    per_brazo_cont: medida('per_brazo_cont'),
    per_hombros: medida('per_hombros'),
    per_pecho: medida('per_pecho'),
    per_cintura: medida('per_cintura'),
    per_caderas: medida('per_caderas'),
    per_muslo: medida('per_muslo'),
    per_muslo_cont: medida('per_muslo_cont'),
    per_gemelo: medida('per_gemelo'),
  }
}
