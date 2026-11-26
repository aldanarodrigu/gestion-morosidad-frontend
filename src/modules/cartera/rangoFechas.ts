/** Desde posterior a hasta: no se consulta hasta que el usuario lo corrija. */
export function rangoFechasInvalido(f: { desde: string; hasta: string }) {
  return !!f.desde && !!f.hasta && f.desde > f.hasta
}
