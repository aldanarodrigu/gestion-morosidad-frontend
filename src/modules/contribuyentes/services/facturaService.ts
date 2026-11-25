import { http } from '@/shared/api/http'
export interface MontoUnidad {
  monto: string | null
  moneda: string | null
  unidad_codigo: number | null
}
export interface FacturaPadron extends MontoUnidad {
  factura_id: string
  cm: number
  tributo: string | null
  anio: number | null
  cuota: number | null
  total_cuotas: number | null
  estado: string | null
  vencida: boolean | null
  fecha_vencimiento: string | null
  periodo_desde: string | null
  periodo_hasta: string | null
  convenio_cm: number | null
  montos_por_unidad: MontoUnidad[] | null
}
export interface FacturasResponse {
  data: FacturaPadron[]
  meta: { total: number }
}
export interface FiltrosFactura {
  estado: string
  vencida: string
  incluirConvenios: boolean
}
export async function obtenerFacturas(
  deudaId: number,
  filtros: FiltrosFactura,
  signal?: AbortSignal,
) {
  const { data } = await http.get<FacturasResponse>(`/deudas/${deudaId}/facturas`, {
    signal,
    params: {
      estado: filtros.estado || undefined,
      vencida: filtros.vencida === '' ? undefined : filtros.vencida === 'true',
      incluirConvenios: filtros.incluirConvenios,
    },
  })
  return data
}

export async function obtenerFacturasCanceladas(cancelacionId: number, signal?: AbortSignal) {
  const { data } = await http.get<FacturasResponse>(`/cancelaciones/${cancelacionId}/facturas`, {
    signal,
  })
  return data
}
