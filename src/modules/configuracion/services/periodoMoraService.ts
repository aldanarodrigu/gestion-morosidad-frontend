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
  tipoPadron: string | null
}
export interface RangoMoraRequest {
  segmentoId: number
  diasDesde: number
  diasHasta: number | null
}
export async function obtenerPeriodos(signal?: AbortSignal, tipoPadron?: string) {
  const [segmentos, rangos] = await Promise.all([
    http.get<SegmentoMora[]>('/segmentos-mora', { signal }),
    http.get<RangoMora[]>('/configuraciones-segmento', { signal, params: { tipoPadron } }),
  ])
  return { segmentos: segmentos.data, rangos: rangos.data }
}
export async function guardarPeriodos(
  rangos: RangoMoraRequest[],
  tipoPadron?: string,
): Promise<RangoMora[]> {
  const { data } = await http.put<RangoMora[]>('/configuraciones-segmento', { rangos, tipoPadron })
  return data
}

export async function restaurarPeriodosBase(tipoPadron: string): Promise<void> {
  await http.delete(`/configuraciones-segmento/tipo-padron/${encodeURIComponent(tipoPadron)}`)
}

export async function obtenerTiposPadron(signal?: AbortSignal): Promise<string[]> {
  const { data } = await http.get<string[]>('/configuraciones-segmento/tipos-padron', { signal })
  return data
}
