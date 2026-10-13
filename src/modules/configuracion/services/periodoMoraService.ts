import { http } from '@/shared/api/http'
export interface SegmentoMora {
  id: number
  nombre: string
  descripcion: string | null
  orden: number
}
export interface RangoMora {
  id: number
  segmentoId: number
  segmentoNombre: string
  diasDesde: number
  diasHasta: number | null
  activa: boolean
  fechaCreacion: string
  tributoId: number | null
}
export interface RangoMoraRequest {
  segmentoId: number
  diasDesde: number
  diasHasta: number | null
}
export async function obtenerPeriodos(signal?: AbortSignal, tributoId?: number) {
  const [segmentos, rangos] = await Promise.all([
    http.get<SegmentoMora[]>('/segmentos-mora', { signal }),
    http.get<RangoMora[]>('/configuraciones-segmento', { signal, params: { tributoId } }),
  ])
  return { segmentos: segmentos.data, rangos: rangos.data }
}
export async function guardarPeriodos(
  rangos: RangoMoraRequest[],
  tributoId?: number,
): Promise<RangoMora[]> {
  const { data } = await http.put<RangoMora[]>('/configuraciones-segmento', { rangos, tributoId })
  return data
}

export async function restaurarPeriodosBase(tributoId: number): Promise<void> {
  await http.delete(`/configuraciones-segmento/tributo/${tributoId}`)
}
