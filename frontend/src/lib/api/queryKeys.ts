// Claves de query centralizadas para invalidaciones consistentes.
export const qk = {
  me: ['me'] as const,
  pacientes: ['pacientes'] as const,
  revisiones: (pid: number) => ['pacientes', pid, 'revisiones'] as const,
  historial: (pid: number) => ['pacientes', pid, 'historial'] as const,
  fotos: (pid: number) => ['pacientes', pid, 'fotos'] as const,
  usuarios: ['usuarios'] as const,
  auditoria: ['auditoria'] as const,
  inicio: ['inicio'] as const,
  stock: {
    almacen: ['stock', 'almacen'] as const,
    productos: ['stock', 'productos'] as const,
    categorias: ['stock', 'categorias'] as const,
    proveedores: ['stock', 'proveedores'] as const,
    compras: ['stock', 'compras'] as const,
    pedidos: ['stock', 'pedidos'] as const,
    mermas: ['stock', 'mermas'] as const,
    recuentos: ['stock', 'recuentos'] as const,
    // Cuelga del almacén: lo que invalida las existencias (compras, ventas, mermas) también lo alcanza.
    movimientos: (id: number) => ['stock', 'almacen', 'movimientos', id] as const,
  },
  ventas: {
    todas: ['ventas'] as const,
    lista: (pacienteId: number | null) => ['ventas', 'lista', pacienteId] as const,
    una: (id: number) => ['ventas', 'una', id] as const,
    estadisticas: (desde: string, hasta: string) => ['ventas', 'estadisticas', desde, hasta] as const,
  },
  caja: {
    todo: ['caja'] as const,
    dia: (fecha: string) => ['caja', 'dia', fecha] as const,
    cierres: ['caja', 'cierres'] as const,
  },
  tienda: ['tienda'] as const,
}
