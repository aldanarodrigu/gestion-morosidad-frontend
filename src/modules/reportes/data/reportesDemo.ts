// Datos ficticios para revisar el diseño. No representan la base sincronizada.
export const segmentosReporte = [
  { id: 'temprana', nombre: 'Mora Temprana', color: 'var(--color-temprana)' },
  { id: 'inicial', nombre: 'Mora Inicial', color: 'var(--color-incial)' },
  { id: 'tardia', nombre: 'Mora Tardía', color: 'var(--color-tardia)' },
] as const

export type SegmentoReporte = (typeof segmentosReporte)[number]['id']
export type OrigenReporte = 'INTENDENCIA' | 'SUCIVE'

// Una fila representa una deuda de un padrón. Una persona puede tener varios.
export const deudasDemo = Array.from({ length: 36 }, (_, i) => ({
  id: i + 1,
  persona: `demo-${Math.floor(i / 2) + 1}`,
  origen: (i % 3 === 0 ? 'SUCIVE' : 'INTENDENCIA') as OrigenReporte,
  tipoPadron: i % 3 === 0 ? 'VEH' : i % 2 === 0 ? 'CIU' : 'CIR',
  segmento: segmentosReporte[Math.floor(i / 3) % segmentosReporte.length]!.id,
  importe: 12500 + ((i * 7919) % 85000) + (i % 4) * 0.25,
}))
