import { http } from '@/shared/api/http'
import type { OrigenDatos } from '@/modules/cartera/types/cartera'

export type TipoContacto = 'EMAIL' | 'TELEFONO' | 'DOMICILIO'
export interface Contacto {
  id: number
  tipoContacto: TipoContacto
  valor: string
  esDeContribuyente: boolean
  origen: string
}
export type ContactoRequest = Omit<Contacto, 'id'> & { id?: number }
export async function obtenerContactos(cm: string, signal?: AbortSignal, origen: OrigenDatos = 'INTENDENCIA') {
  const { data } = await http.get<Contacto[]>(
    `/contribuyentes/${encodeURIComponent(cm)}/contactos`,
    { signal, ...(origen === 'SUCIVE' ? { params: { origen } } : {}) },
  )
  return data
}
export async function guardarContacto(cm: string, request: ContactoRequest, origen: OrigenDatos = 'INTENDENCIA') {
  const { data } = await http.put<Contacto>(
    `/contribuyentes/${encodeURIComponent(cm)}/contactos`,
    request,
    ...(origen === 'SUCIVE' ? [{ params: { origen } }] : []),
  )
  return data
}
