import { http } from '@/shared/api/http'
export type OrigenCaptura = 'INTENDENCIA' | 'SUCIVE'
export interface CuentaCaptura { cm: string; origen: OrigenCaptura }
export interface EstadoCuenta extends CuentaCaptura {
  numeroPadron: string | null; tipoPadron: string | null; nombre: string | null; documento: string | null;
  importe: number; estado: string; segmento: string | null; fechaSincronizacion: string | null;
  fechaUltimoCobro: string | null; importeUltimoCobro: number | null;
}
export interface CapturaResumen { id: number; nombre: string; fecha: string; usuario: string; cantidadCuentas: number }
export interface CapturaDetalle extends Omit<CapturaResumen, 'cantidadCuentas'> { cuentas: EstadoCuenta[] }
export async function listarCapturas(signal?: AbortSignal) {
  return (await http.get<CapturaResumen[]>('/capturas-cartera', { signal })).data
}
export async function obtenerCaptura(id: number, signal?: AbortSignal) {
  return (await http.get<CapturaDetalle>(`/capturas-cartera/${id}`, { signal })).data
}
export async function crearCaptura(nombre: string, cuentas: CuentaCaptura[]) {
  return (await http.post<CapturaDetalle>('/capturas-cartera', { nombre, cuentas })).data
}
export const claveCuenta = (c: CuentaCaptura) => `${c.origen}|${c.cm}`

/** La consulta existente distingue el CM por origen y devuelve 404 si no existe localmente. */
export async function validarCuenta(cuenta: CuentaCaptura, signal?: AbortSignal) {
  await http.get(`/contribuyentes/${encodeURIComponent(cuenta.cm)}`, {
    params: { origen: cuenta.origen }, signal,
  })
}
