import inicial from '../../drizzle/0000_inicial.sql' with { type: 'text' }

// Migraciones embebidas en el binario, en el orden de drizzle/meta/_journal.json.
// Al generar una nueva con `bun run db:generate`, añádela aquí (un test lo comprueba).
export const MIGRACIONES = [{ tag: '0000_inicial', sql: inicial }] as const
