import { http } from '@/shared/api/http'
import type { SegmentoMora } from './periodoMoraService'

export interface Accion {
  id: number
  nombre: string
  activo: boolean
  segmentos?: SegmentoMora[]
}

export async function obtenerAcciones(signal?: AbortSignal): Promise<Accion[]> {
  const { data } = await http.get<Accion[]>('/acciones', { signal })
  return data
}

export async function cambiarEstadoAccion(id: number, activo: boolean): Promise<Accion> {
  const { data } = await http.put<Accion>(`/acciones/${id}`, { activo })
  return data
}

export async function obtenerSegmentosAccion(signal?: AbortSignal): Promise<SegmentoMora[]> {
  const { data } = await http.get<SegmentoMora[]>('/segmentos-mora', { signal })
  return data
}
export async function crearAccion(nombre: string, segmentoId: number): Promise<Accion> {
  const { data } = await http.post<Accion>('/acciones', { nombre, segmentoId })
  return data
}
