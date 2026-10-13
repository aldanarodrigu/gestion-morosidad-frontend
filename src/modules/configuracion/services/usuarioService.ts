import { http } from '@/shared/api/http'
export type Rol = 'ADMINISTRADOR' | 'NOTIFICADOR' | 'ANALISTA'
export interface Usuario {
  id: number
  username: string
  roles: Rol[]
  activo: boolean
}
export interface UsuarioRequest {
  username: string
  password: string
  roles: Rol[]
}
export type UsuarioUpdateRequest = Omit<Usuario, 'id'>
export const rolesDisponibles: { value: Rol; label: string }[] = [
  { value: 'ADMINISTRADOR', label: 'Administrador' },
  { value: 'NOTIFICADOR', label: 'Notificador' },
  { value: 'ANALISTA', label: 'Analista' },
]
export async function obtenerUsuarios(signal?: AbortSignal) {
  const { data } = await http.get<Usuario[]>('/usuarios', { signal })
  return data
}
export async function crearUsuario(request: UsuarioRequest) {
  const { data } = await http.post<Usuario>('/usuarios', request)
  return data
}
export async function actualizarUsuario(id: number, request: UsuarioUpdateRequest) {
  const { data } = await http.put<Usuario>(`/usuarios/${id}`, request)
  return data
}
