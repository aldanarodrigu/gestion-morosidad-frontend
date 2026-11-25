/**
 * Formatos únicos para mostrar datos en pantalla (es-UY). Usar siempre estas funciones en lugar
 * de formatear a mano en cada componente.
 *
 *   importe(12500.5)                 → «$ 12.500,50»
 *   numero(1234)                     → «1.234»
 *   fecha('2026-11-25')              → «25/11/2026»
 *   fechaHora('2026-11-25T08:30:00') → «25/11/2026 08:30»
 *   origen('SUCIVE')                 → «SUCIVE»; cualquier otro valor → «Intendencia»
 *   claseSegmento('Mora Tardía')     → 'tardia'
 */
import { nivelMoraPorNombre } from './mora'

const NUMERO = new Intl.NumberFormat('es-UY')
const IMPORTE = new Intl.NumberFormat('es-UY', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const SIN_DATO = '—'

const dosDigitos = (n: number) => String(n).padStart(2, '0')

/** Importe en pesos uruguayos. Acepta números o textos numéricos (como los que manda la API). */
export function importe(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return SIN_DATO
  const n = typeof valor === 'number' ? valor : Number(valor)
  if (!Number.isFinite(n)) return String(valor)
  // El signo va antes del símbolo: «-$ 1.234,00»
  return `${n < 0 ? '-' : ''}$ ${IMPORTE.format(Math.abs(n))}`
}

/** Número con separador de miles. */
export function numero(valor: number | null | undefined): string {
  return valor === null || valor === undefined || !Number.isFinite(valor)
    ? SIN_DATO
    : NUMERO.format(valor)
}

// Una fecha con zona horaria explícita se convierte a la hora local; sin zona (LocalDateTime de la
// API) se respeta tal cual, sin que el navegador la desplace.
function partes(valor: string) {
  const conZona = /([zZ]|[+-]\d{2}:?\d{2})$/.test(valor)
  if (conZona) {
    const d = new Date(valor)
    if (Number.isNaN(d.getTime())) return null
    return {
      anio: d.getFullYear(),
      mes: d.getMonth() + 1,
      dia: d.getDate(),
      hora: d.getHours(),
      minuto: d.getMinutes(),
    }
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(valor)
  if (!m) return null
  return {
    anio: +m[1]!,
    mes: +m[2]!,
    dia: +m[3]!,
    hora: m[4] ? +m[4] : null,
    minuto: m[5] ? +m[5] : null,
  }
}

/** Fecha «dd/mm/aaaa». */
export function fecha(valor: string | null | undefined): string {
  if (!valor) return SIN_DATO
  const p = partes(valor)
  return p ? `${dosDigitos(p.dia)}/${dosDigitos(p.mes)}/${p.anio}` : valor
}

/** Fecha y hora «dd/mm/aaaa hh:mm»; si el valor no trae hora, solo la fecha. */
export function fechaHora(valor: string | null | undefined): string {
  if (!valor) return SIN_DATO
  const p = partes(valor)
  if (!p) return valor
  const dia = `${dosDigitos(p.dia)}/${dosDigitos(p.mes)}/${p.anio}`
  return p.hora === null ? dia : `${dia} ${dosDigitos(p.hora)}:${dosDigitos(p.minuto ?? 0)}`
}

/** Nombre del origen de los datos para mostrar. */
export function origen(codigo: string | null | undefined): string {
  return codigo?.toUpperCase() === 'SUCIVE' ? 'SUCIVE' : 'Intendencia'
}

/** Clase de color del segmento de mora a partir de su nombre. */
export const claseSegmento = nivelMoraPorNombre

/** @deprecated Usar importe(). */
export const formatoImporte = (valor: number) => importe(valor)
/** @deprecated Usar numero(). */
export const formatoNumero = (valor: number) => numero(valor)

/** Porcentaje con un decimal como máximo: 18.73 → «18,7 %». */
export function porcentaje(valor: number, decimales = 1): string {
  return `${valor.toLocaleString('es-UY', { maximumFractionDigits: decimales })} %`
}
