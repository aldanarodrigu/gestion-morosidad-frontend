import { http } from '@/shared/api/http'

export type TipoContacto = 'EMAIL' | 'TELEFONO' | 'DOMICILIO'
export interface Contacto {
  id: number
  tipoContacto: TipoContacto
  valor: string
  esDeContribuyente: boolean
  origen: string
}
export type ContactoRequest = Omit<Contacto, 'id'> & { id?: number }
export async function obtenerContactos(cm: string, signal?: AbortSignal) {
  const { data } = await http.get<Contacto[]>(
    `/contribuyentes/${encodeURIComponent(cm)}/contactos`,
    { signal },
  )
  return data
}
export async function guardarContacto(cm: string, request: ContactoRequest) {
  const { data } = await http.put<Contacto>(
    `/contribuyentes/${encodeURIComponent(cm)}/contactos`,
    request,
  )
  return data
}
