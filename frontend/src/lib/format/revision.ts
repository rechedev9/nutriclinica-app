import type { Revision } from '@/types'

function num(v: number | null): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}/

// Descarta valores numéricos no finitos y fechas mal formadas para no pintar NaN.
export function limpiaRevision(r: Revision): Revision {
  return {
    ...r,
    fecha: r.fecha && FECHA_ISO.test(r.fecha) && !Number.isNaN(new Date(r.fecha).getTime()) ? r.fecha : null,
    peso: num(r.peso),
    talla: num(r.talla),
    envergadura: num(r.envergadura),
    pl_bicipital: num(r.pl_bicipital),
    pl_tricipital: num(r.pl_tricipital),
    pl_subescapular: num(r.pl_subescapular),
    pl_supraespinal: num(r.pl_supraespinal),
    pl_supracrestal: num(r.pl_supracrestal),
    pl_abdominal: num(r.pl_abdominal),
    pl_muslo_int: num(r.pl_muslo_int),
    pl_pierna_med: num(r.pl_pierna_med),
    per_antebrazo: num(r.per_antebrazo),
    per_brazo_rel: num(r.per_brazo_rel),
    per_brazo_cont: num(r.per_brazo_cont),
    per_hombros: num(r.per_hombros),
    per_pecho: num(r.per_pecho),
    per_cintura: num(r.per_cintura),
    per_caderas: num(r.per_caderas),
    per_muslo: num(r.per_muslo),
    per_muslo_cont: num(r.per_muslo_cont),
    per_gemelo: num(r.per_gemelo),
  }
}
