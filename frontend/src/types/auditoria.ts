// Entrada del registro de auditoría (RGPD). Espejo de models.AuditEntry (Go).
export interface AuditEntry {
  id: number
  fecha: string | null
  usuario: string | null
  metodo: string
  ruta: string
  estado: number
}
