// En los tests se usa el coste mínimo: bcrypt con coste 12 tarda unos 250 ms por hash.
export const COSTE_BCRYPT = process.env.NODE_ENV === 'test' ? 4 : 12

export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: 'bcrypt', cost: COSTE_BCRYPT })
}
