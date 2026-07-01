// Claves de query centralizadas para invalidaciones consistentes.
export const qk = {
  me: ['me'] as const,
  pacientes: ['pacientes'] as const,
  revisiones: (pid: number) => ['pacientes', pid, 'revisiones'] as const,
  fotos: (pid: number) => ['pacientes', pid, 'fotos'] as const,
  usuarios: ['usuarios'] as const,
  auditoria: ['auditoria'] as const,
  stock: {
    almacen: ['stock', 'almacen'] as const,
    productos: ['stock', 'productos'] as const,
    categorias: ['stock', 'categorias'] as const,
    proveedores: ['stock', 'proveedores'] as const,
    compras: ['stock', 'compras'] as const,
    ventas: ['stock', 'ventas'] as const,
    mermas: ['stock', 'mermas'] as const,
  },
}
