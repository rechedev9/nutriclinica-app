export function fmtMoneda(n: number): string {
  const [ent, dec] = n.toFixed(2).split('.')
  const miles = ent!.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${miles},${dec} €`
}
