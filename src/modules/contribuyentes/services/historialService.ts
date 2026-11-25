import { http } from '@/shared/api/http'
export interface RelacionPadron {
  CM_PADRON: number
  NRO_PADRON: string | null
  TIPO_PADRON: string | null
  COD_CONTRIBUYENTE: number | null
  NOMBRE: string | null
  DOCUMENTO: string | null
  TELEFONO: string | null
  EMAIL: string | null
  DESCRIPCION_RELACION: string | null
  SITUACION_REGISTRO: string | null
}
export interface HistorialPadron {
  data: RelacionPadron[]
  meta: { total: number }
}
export async function obtenerHistorial(
  deudaId: number,
  signal?: AbortSignal,
): Promise<HistorialPadron> {
  return (
    await http.get<HistorialPadron>(`/deudas/${deudaId}/historial-contribuyentes`, { signal })
  ).data
}
