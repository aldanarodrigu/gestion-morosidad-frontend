import { http } from '@/shared/api/http'
export interface FiltrosConvenio {
  origen: 'INTENDENCIA' | 'SUCIVE'
  cm: string
  documento: string
  nombre: string
  desde: string
  hasta: string
}
export interface Convenio {
  CM: number
  NUMERO_CONVENIO: string | null
  PERSONA: string | null
  DOCUMENTO: string | null
  MATRICULA: string | null
  CANT_CUOTAS_VENC: number
  CANT_CUOTAS_CONVENIOS: number | null
  IMPORTE_DEUDA: string | null
  DEUDA_FACTURAS: string | null
  SALDO_A_FAVOR: string | null
  CREDITO_DESCONTADO: string | null
  DEUDA_DESDE: string | null
  ULTIMO_VENCIMIENTO: string | null
  TRIBUTOS_DEUDA: string | null
  TELEFONO: string | null
  EMAIL: string | null
  DIRECCION: string | null
  NUMERO_PUERTA: string | null
  LOCALIDAD: string | null
}
export interface PaginaConvenios {
  data: Convenio[]
  meta: { total: number; current_page: number; last_page: number; has_more: boolean }
}
export async function obtenerConvenios(f: FiltrosConvenio, pagina = 1, signal?: AbortSignal) {
  return (
    await http.get<PaginaConvenios>('/convenios', {
      params: {
        origen: f.origen,
        pagina,
        tamanio: 20,
        cm: f.cm.trim() || undefined,
        documento: f.documento.trim() || undefined,
        nombre: f.nombre.trim() || undefined,
        desde: f.desde || undefined,
        hasta: f.hasta || undefined,
      },
      signal,
    })
  ).data
}
