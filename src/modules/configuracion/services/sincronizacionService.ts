import { http } from '@/shared/api/http'
export interface ProgresoSincronizacion {
  etapa: 'PREPARANDO' | 'DEUDAS' | 'COBROS' | 'CONTACTOS' | 'GUARDANDO' | 'FINALIZADA'
  paginasDescargadas: number
  paginaActual: number | null
  registrosDescargados: number
  totalRegistros: number | null
  totalPaginas: number | null
  intento: number
  detalle: string
}
export interface EjecucionSincronizacion {
  id: string
  progreso?: ProgresoSincronizacion | null
  estado: 'EN_CURSO' | 'CANCELANDO' | 'CANCELADA' | 'COMPLETADA' | 'ERROR'
  origen: 'INTENDENCIA' | 'SUCIVE'
  anioMinimo: number | null
  inicio: string
  fin: string | null
  mensaje: string
  resultado: {
    pendientesRecibidas: number
    cobrosRecibidos: number
    deudasCreadas: number
    deudasActualizadas: number
    deudasCanceladas: number
    registrosOmitidos: number
    advertencias: string[]
  } | null
}
export async function obtenerPeriodo(signal?: AbortSignal) {
  return (
    await http.get<{ anioMinimo: number | null }>('/sincronizaciones/configuracion', { signal })
  ).data
}
export async function guardarPeriodo(anioMinimo: number | null) {
  return (
    await http.put<{ anioMinimo: number | null }>('/sincronizaciones/configuracion', { anioMinimo })
  ).data
}
export async function obtenerEjecucion(
  signal?: AbortSignal,
): Promise<EjecucionSincronizacion | null> {
  const r = await http.get<EjecucionSincronizacion>('/sincronizaciones/ejecucion', { signal })
  return r.status === 204 ? null : r.data
}
export async function iniciarSincronizacion(origen: string) {
  return (
    await http.post<EjecucionSincronizacion>('/sincronizaciones/ejecucion', null, {
      params: { origen },
    })
  ).data
}

export async function cancelarSincronizacion(
  id: string,
  signal?: AbortSignal,
): Promise<EjecucionSincronizacion> {
  return (
    await http.post<EjecucionSincronizacion>(
      '/sincronizaciones/ejecucion/cancelar',
      { id },
      { signal },
    )
  ).data
}
