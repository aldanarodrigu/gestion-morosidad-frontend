/** Nivel visual de un segmento de mora; '' cuando no tiene segmento o no se reconoce. */
export type NivelMora = 'temprana' | 'inicial' | 'tardia' | ''

/** Por nombre del segmento: «Mora Tardía» → 'tardia'. */
export function nivelMoraPorNombre(nombre?: string | null): NivelMora {
  switch (nombre?.trim().toLowerCase()) {
    case 'mora temprana':
      return 'temprana'
    case 'mora inicial':
      return 'inicial'
    case 'mora tardía':
    case 'mora tardia':
      return 'tardia'
    default:
      return ''
  }
}

/** Por orden del segmento: 1 temprana, 2 inicial, 3 tardía. */
export function nivelMoraPorOrden(orden?: number | null): NivelMora {
  return orden === 1 ? 'temprana' : orden === 2 ? 'inicial' : orden === 3 ? 'tardia' : ''
}
