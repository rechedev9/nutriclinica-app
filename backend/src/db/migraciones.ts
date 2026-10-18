import inicial from '../../drizzle/0000_inicial.sql' with { type: 'text' }
import trazaCliente from '../../drizzle/0001_first_ikaris.sql' with { type: 'text' }
import seccionVentas from '../../drizzle/0002_seccion_ventas.sql' with { type: 'text' }

// Migraciones embebidas en el binario, en el orden de drizzle/meta/_journal.json.
// Al generar una nueva con `bun run db:generate`, añádela aquí (un test lo comprueba).
export const MIGRACIONES = [
  { tag: '0000_inicial', sql: inicial },
  { tag: '0001_first_ikaris', sql: trazaCliente },
  { tag: '0002_seccion_ventas', sql: seccionVentas },
] as const
