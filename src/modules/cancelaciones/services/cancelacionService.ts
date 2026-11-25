import { http } from '@/shared/api/http'

export interface Cancelacion {
  id: number
  origen: 'INTENDENCIA' | 'SUCIVE'
  cm: string
  numeroCobro: string
  numeroPadron: string | null
  persona: string | null
  documento: string | null
  fechaCobro: string
  importeTotal: number | null
  motivo: string | null
}

export interface FiltrosCancelacion {
  origen: string
  buscar: string
  motivo: string
  desde: string
  hasta: string
}

export interface PaginaCancelaciones {
  contenido: Cancelacion[]
  pagina: number
  totalPaginas: number
  totalElementos: number
}

export const filtrosCancelacionesVacios: Readonly<FiltrosCancelacion> = {
  origen: '',
  buscar: '',
  motivo: '',
  desde: '',
  hasta: '',
}

export type FiltrosExportacionCancelaciones = Omit<FiltrosCancelacion, 'buscar'>

export type FormatoCancelaciones = 'xlsx' | 'csv'

function parametros(filtros: FiltrosExportacionCancelaciones) {
  return Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor.trim()))
}

export async function obtenerCancelaciones(
  filtros: FiltrosCancelacion,
  page: number,
  signal: AbortSignal,
) {
  const { data } = await http.get<PaginaCancelaciones>('/cancelaciones', {
    params: { ...parametros(filtros), page, size: 20 },
    signal,
  })
  return data
}

export async function exportarCancelaciones(
  filtros: FiltrosExportacionCancelaciones,
  formato: FormatoCancelaciones,
  signal: AbortSignal,
) {
  const { data } = await http.get<Blob>('/cancelaciones/exportar', {
    params: { ...parametros(filtros), formato: formato.toUpperCase() },
    responseType: 'blob',
    signal,
  })
  return data
}

export async function obtenerMotivosCancelaciones(signal: AbortSignal) {
  const { data } = await http.get<string[]>('/cancelaciones/motivos', { signal })
  return data
}
