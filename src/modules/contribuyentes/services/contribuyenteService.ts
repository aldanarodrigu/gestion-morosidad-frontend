import { http } from '@/shared/api/http'
import type { DeudaApi } from '@/modules/cartera/types/cartera'

export interface ContribuyenteResumenResponse {
  contribuyenteId: number
  cm: string | null
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

export function obtenerResumenDesdeDeudas(
  deudas: DeudaApi[],
  deudaSeleccionadaId?: number | null,
): ContribuyenteResumenResponse | null {
  const primeraDeuda = deudas[0]

  if (!primeraDeuda) {
    return null
  }

  const deudaSeleccionada = deudas.find((deuda) => deuda.id === deudaSeleccionadaId)

  const deudaParaMostrar = deudaSeleccionada ?? (deudas.length === 1 ? primeraDeuda : undefined)

  const masAtrasada = deudas.reduce(
    (max, deuda) => ((deuda.diasAtraso ?? -1) > (max.diasAtraso ?? -1) ? deuda : max),
    primeraDeuda,
  )

  const segmentoMasAvanzado = deudas.reduce<DeudaApi['segmentoMora']>((max, deuda) => {
    const segmento = deuda.segmentoMora
    return segmento && (!max || segmento.orden > max.orden) ? segmento : max
  }, null)

  const fechas = deudas
    .map((deuda) => deuda.deudaDesde)
    .filter((fecha): fecha is string => Boolean(fecha))
    .sort()

  const deudaTotal = deudas.reduce((suma, deuda) => suma + deuda.importe, 0)

  return {
    contribuyenteId: primeraDeuda.contribuyenteId,
    cm: deudaParaMostrar?.padron.cm ?? null,
    nombre: primeraDeuda.contribuyente.nombre,
    documento: primeraDeuda.contribuyente.documento,
    deudaTotal: Math.round(deudaTotal * 100) / 100,
    diasMaxVencido: masAtrasada.diasAtraso ?? null,
    deudaMasAntigua: fechas[0] ?? null,
    segmento: segmentoMasAvanzado?.nombre ?? null,
    cantidadDeudas: deudas.length,
    cantidadPadrones: new Set(
      deudas.map((deuda) => `${deuda.padron.origen ?? 'INTENDENCIA'}:${deuda.padron.cm}`),
    ).size,
  }
}
