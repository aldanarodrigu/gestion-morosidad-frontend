import { http } from '@/shared/api/http'
export interface FiltrosReporte {
  origen: '' | 'INTENDENCIA' | 'SUCIVE'
  tipoPadron: string
  segmento: number | ''
}
export interface ReporteCartera {
  generado: string
  totales: { importe: number; contribuyentes: number; padrones: number; deudas: number }
  porSegmento: {
    id: number | null
    nombre: string | null
    orden: number | null
    cantidad: number
    importe: number
  }[]
  porTipo: { tipo: string | null; cantidad: number; importe: number }[]
  resumen: {
    origen: string
    tipo: string | null
    personas: number
    cantidad: number
    importe: number
  }[]
}
export interface SegmentoReporte {
  id: number
  nombre: string
  orden: number
}
const parametros = (f: FiltrosReporte) => ({
  origen: f.origen || undefined,
  tipoPadron: f.tipoPadron || undefined,
  segmento: f.segmento === '' ? undefined : f.segmento,
})
export async function obtenerReporte(filtros: FiltrosReporte, signal?: AbortSignal) {
  return (
    await http.get<ReporteCartera>('/reportes/cartera', { params: parametros(filtros), signal })
  ).data
}
export async function obtenerCatalogosReporte(signal?: AbortSignal) {
  const [tipos, segmentos] = await Promise.all([
    http.get<string[]>('/deudas/tipos-padron', { signal }),
    http.get<SegmentoReporte[]>('/segmentos-mora', { signal }),
  ])
  return { tipos: tipos.data, segmentos: segmentos.data }
}
export async function exportarReporte(filtros: FiltrosReporte, signal?: AbortSignal) {
  return (
    await http.get<Blob>('/reportes/cartera/exportar', {
      params: parametros(filtros),
      responseType: 'blob',
      signal,
    })
  ).data
}
