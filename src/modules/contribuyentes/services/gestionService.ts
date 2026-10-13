import { http } from '@/shared/api/http'
import type { DeudaApi } from '@/modules/cartera/types/cartera'
import type { ResultadoGestion } from '../utils/gestion'

export interface GestionResponse {
  id: number
  fecha: string
  resultado: ResultadoGestion
  observacion: string | null
  deudaId: number
  accionId: number
  accionNombre: string
  usuarioId: number | null
  usuarioNombre: string | null
  cm: string
  numeroPadron: string
  tributos: DeudaApi['tributos']
}
export interface GestionRequest {
  deudaId: number
  accionId: number
  resultado: ResultadoGestion
  observacion: string | null
}
export async function obtenerGestiones(deudaId: number, signal?: AbortSignal) {
  const { data } = await http.get<GestionResponse[]>(`/gestiones/deuda/${deudaId}`, { signal })
  return data
}
export async function obtenerAccionesDisponibles(deudaId: number, signal?: AbortSignal) {
  const { data } = await http.get<DeudaApi['accionesSugeridas']>(
    `/gestiones/deuda/${deudaId}/acciones-disponibles`,
    { signal },
  )
  return data
}
export async function guardarGestion(request: GestionRequest) {
  const { data } = await http.post<GestionResponse>('/gestiones', request)
  return data
}
