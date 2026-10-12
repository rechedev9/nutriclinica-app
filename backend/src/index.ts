import { resolve } from 'node:path'
import { arrancar } from './arranque'
import { spaDeCarpeta } from './spa'

// Ejecución desde el código fuente: la SPA se sirve de frontend/dist si está construida.
// El binario compilado entra por build/compilar.ts, que embebe la SPA.
await arrancar(spaDeCarpeta(resolve(import.meta.dir, '../../frontend/dist')))
