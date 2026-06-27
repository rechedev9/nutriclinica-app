// Descargas de archivos servidos por el backend (cookie de sesión same-origin).
// Navegación directa: el navegador gestiona la descarga por Content-Disposition.

export function descargarExcelPacientes(pacienteId?: number) {
  const url = pacienteId ? `/api/exportar-excel?id=${pacienteId}` : '/api/exportar-excel'
  window.location.assign(url)
}

export function descargarExcelRevision(revisionId: number) {
  window.location.assign(`/api/exportar-revision/${revisionId}`)
}
