import { http } from '@/shared/api/http'
export interface Tributo {
  id: number
  codigo: string
  descripcion: string | null
}
export async function obtenerTributos(signal?: AbortSignal): Promise<Tributo[]> {
  const { data } = await http.get<Tributo[]>('/tributos', { signal })
  return data
}

export async function actualizarTributo(id: number, descripcion: string): Promise<Tributo> {
  const { data } = await http.put<Tributo>(`/tributos/${id}`, { descripcion })
  return data
}

export async function crearTributo(codigo: string, descripcion: string): Promise<Tributo> {
  const { data } = await http.post<Tributo>('/tributos', { codigo, descripcion })
  return data
}
export async function eliminarTributo(id: number): Promise<void> {
  await http.delete(`/tributos/${id}`)
}
