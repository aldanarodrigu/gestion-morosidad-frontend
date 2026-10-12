import { http } from '@/shared/api/http'
import type { DeudaApi } from '@/modules/cartera/types/cartera'

export interface ContribuyenteResumenResponse {
  contribuyenteId: number
  cm: string
  nombre: string
  documento: string | null
  deudaTotal: number
  diasMaxVencido: number | null
  deudaMasAntigua: string | null
  segmento: string | null
  cantidadDeudas: number
  cantidadPadrones: number
}

export async function obtenerDeudasPorContribuyenteId(
  contribuyenteId: number | string,
): Promise<DeudaApi[]> {
  const { data } = await http.get<DeudaApi[]>(
    `/contribuyentes/id/${encodeURIComponent(contribuyenteId)}/deudas`,
  )

  return data
}

export function obtenerResumenDesdeDeudas(deudas: DeudaApi[]): ContribuyenteResumenResponse | null {
  const primeraDeuda = deudas[0]

  if (!primeraDeuda) {
    return null
  }

  const masAtrasada = deudas.reduce(
    (max, deuda) => ((deuda.diasAtraso ?? -1) > (max.diasAtraso ?? -1) ? deuda : max),
    primeraDeuda,
  )

  const fechas = deudas
    .map((deuda) => deuda.deudaDesde)
    .filter((fecha): fecha is string => Boolean(fecha))
    .sort()

  const deudaTotal = deudas.reduce((suma, deuda) => suma + deuda.importe, 0)

  return {
    contribuyenteId: primeraDeuda.contribuyenteId,
    cm: primeraDeuda.padron.cm,
    nombre: primeraDeuda.contribuyente.nombre,
    documento: primeraDeuda.contribuyente.documento,
    deudaTotal: Math.round(deudaTotal * 100) / 100,
    diasMaxVencido: masAtrasada.diasAtraso ?? null,
    deudaMasAntigua: fechas[0] ?? null,
    segmento: masAtrasada.segmentoMora?.nombre ?? null,
    cantidadDeudas: deudas.length,
    cantidadPadrones: new Set(deudas.map((deuda) => deuda.padron.numeroPadron)).size,
  }
}
