import { Elysia } from 'elysia'
import type { Contexto } from '../contexto'
import { resumenInicio } from '../datos/inicio'
import { crearAcceso } from './acceso'

// Resumen de la página de Inicio: pulso de ventas, caja, última compra por cliente y hábitos.
export function moduloInicio(ctx: Contexto) {
  const { db } = ctx
  return new Elysia({ name: 'inicio', prefix: '/api/inicio' })
    .use(crearAcceso(ctx))
    .guard({ sesion: true })
    .get('/resumen', () => resumenInicio(db, new Date()))
}
